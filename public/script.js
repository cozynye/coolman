const searchInput = document.getElementById("searchInput");
const searchButton = document.getElementById("searchButton");
const resultsContainer = document.getElementById("results");
const resultsSection = document.getElementById("resultsSection");
const loadingElement = document.getElementById("loading");
const loadingMore = document.getElementById("loadingMore");
const endMessage = document.getElementById("endMessage");
const resultsCount = document.getElementById("resultsCount");
const toastContainer = document.getElementById("toastContainer");

let allProducts = [];
let filteredProducts = [];
let displayedCount = 0;
const itemsPerLoad = 30;
let isLoading = false;
let currentPlatformFilter = 'all';
let currentStatusFilter = 'all';
let currentSort = 'latest';
let priceMin = 0;
let priceMax = Infinity;
let currentAbortController = null;
let currentKeyword = '';
const MAX_KEYWORD_LENGTH = 50;
const RECENT_SEARCHES_KEY = 'junggo_recent_searches';
const MAX_RECENT_SEARCHES = 10;

// === 유틸리티 함수 ===

// XSS 방지: HTML 이스케이프
function escapeHtml(str) {
  if (!str) return '';
  const div = document.createElement('div');
  div.appendChild(document.createTextNode(str));
  return div.innerHTML;
}

// URL 검증
function sanitizeUrl(url) {
  if (!url) return '#';
  try {
    const parsed = new URL(url);
    if (parsed.protocol === 'https:' || parsed.protocol === 'http:') return url;
  } catch (e) {}
  return '#';
}

// 가격 문자열에서 숫자 추출
function extractPrice(priceStr) {
  if (!priceStr || priceStr === '가격문의') return -1;
  const num = parseInt(priceStr.replace(/[^0-9]/g, ''), 10);
  return isNaN(num) ? -1 : num;
}

// 가격 포맷팅
function formatPrice(num) {
  if (num < 0) return '-';
  return num.toLocaleString('ko-KR') + '원';
}

// 검색어 하이라이팅 (escapeHtml 후 적용)
function highlightKeyword(escapedText, keyword) {
  if (!keyword || !escapedText) return escapedText;
  const words = keyword.trim().split(/\s+/).filter(w => w.length > 0);
  let result = escapedText;
  words.forEach(word => {
    const escapedWord = escapeHtml(word);
    const regex = new RegExp(`(${escapedWord.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})`, 'gi');
    result = result.replace(regex, '<span class="keyword-highlight">$1</span>');
  });
  return result;
}

// === 토스트 알림 ===
function showToast(message, type = 'error', duration = 3000) {
  const toast = document.createElement('div');
  toast.className = `toast toast-${type}`;
  toast.textContent = message;
  toastContainer.appendChild(toast);

  setTimeout(() => {
    toast.classList.add('toast-hide');
    toast.addEventListener('animationend', () => toast.remove());
  }, duration);
}

// === 최근 검색어 ===
function getRecentSearches() {
  try {
    return JSON.parse(localStorage.getItem(RECENT_SEARCHES_KEY)) || [];
  } catch {
    return [];
  }
}

function saveRecentSearch(keyword) {
  const searches = getRecentSearches().filter(s => s !== keyword);
  searches.unshift(keyword);
  localStorage.setItem(RECENT_SEARCHES_KEY, JSON.stringify(searches.slice(0, MAX_RECENT_SEARCHES)));
  renderRecentSearches();
}

function removeRecentSearch(keyword) {
  const searches = getRecentSearches().filter(s => s !== keyword);
  localStorage.setItem(RECENT_SEARCHES_KEY, JSON.stringify(searches));
  renderRecentSearches();
}

function clearRecentSearches() {
  localStorage.removeItem(RECENT_SEARCHES_KEY);
  renderRecentSearches();
}

function renderRecentSearches() {
  const container = document.getElementById('recentSearches');
  const chipsContainer = document.getElementById('recentChips');
  const searches = getRecentSearches();

  if (searches.length === 0) {
    container.style.display = 'none';
    return;
  }

  container.style.display = 'block';
  chipsContainer.innerHTML = searches.map(s => {
    const safe = escapeHtml(s);
    const isActive = s === currentKeyword;
    return `<span class="recent-chip${isActive ? ' active' : ''}" data-keyword="${safe}">
      ${safe}
      <button class="recent-chip-remove" data-remove="${safe}" aria-label="삭제">×</button>
    </span>`;
  }).join('');
}

// === 스켈레톤 로딩 ===
function showSkeletons(count = 6) {
  resultsSection.style.display = "block";
  resultsContainer.innerHTML = '';
  resultsCount.innerHTML = '';
  endMessage.classList.remove("show");
  document.getElementById('priceStats').style.display = 'none';

  const fragment = document.createDocumentFragment();
  for (let i = 0; i < count; i++) {
    const skeleton = document.createElement('div');
    skeleton.className = 'product-card skeleton';
    skeleton.innerHTML = `
      <div class="skeleton-image"></div>
      <div class="skeleton-content">
        <div class="skeleton-line skeleton-title"></div>
        <div class="skeleton-line skeleton-price"></div>
        <div class="skeleton-line skeleton-meta"></div>
      </div>
    `;
    fragment.appendChild(skeleton);
  }
  resultsContainer.appendChild(fragment);
}

// === 정렬 ===
function sortProducts(products) {
  const sorted = [...products];
  switch (currentSort) {
    case 'price-asc':
      sorted.sort((a, b) => {
        const pa = extractPrice(a.price);
        const pb = extractPrice(b.price);
        if (pa === -1 && pb === -1) return 0;
        if (pa === -1) return 1;
        if (pb === -1) return -1;
        return pa - pb;
      });
      break;
    case 'price-desc':
      sorted.sort((a, b) => {
        const pa = extractPrice(a.price);
        const pb = extractPrice(b.price);
        if (pa === -1 && pb === -1) return 0;
        if (pa === -1) return 1;
        if (pb === -1) return -1;
        return pb - pa;
      });
      break;
    case 'latest':
    default:
      sorted.sort((a, b) => (b.timestamp || 0) - (a.timestamp || 0));
      break;
  }
  return sorted;
}

// === 필터 + 정렬 ===
function applyFilter() {
  filteredProducts = allProducts.filter(product => {
    // 플랫폼 필터
    if (currentPlatformFilter !== 'all' && product.platform !== currentPlatformFilter) {
      return false;
    }
    // 상태 필터
    if (currentStatusFilter !== 'all' && product.status !== currentStatusFilter) {
      return false;
    }
    // 가격 필터
    if (priceMin > 0 || priceMax < Infinity) {
      const price = extractPrice(product.price);
      if (price === -1) return true; // "가격문의"는 가격 필터 무시하고 항상 표시
      if (priceMin > 0 && price < priceMin) return false;
      if (priceMax < Infinity && price > priceMax) return false;
    }
    return true;
  });

  // 정렬 적용
  filteredProducts = sortProducts(filteredProducts);

  displayedCount = 0;
  resultsContainer.innerHTML = "";
  endMessage.classList.remove("show");
  updateResultsCount();
  updatePriceStats();
  loadMoreItems();
}

// === 가격 통계 ===
function updatePriceStats() {
  const statsEl = document.getElementById('priceStats');
  const prices = filteredProducts
    .map(p => extractPrice(p.price))
    .filter(p => p > 0);

  if (prices.length === 0) {
    statsEl.style.display = 'none';
    return;
  }

  const minPrice = Math.min(...prices);
  const maxPrice = Math.max(...prices);
  const avgPrice = Math.round(prices.reduce((a, b) => a + b, 0) / prices.length);

  document.getElementById('statMinPrice').textContent = formatPrice(minPrice);
  document.getElementById('statAvgPrice').textContent = formatPrice(avgPrice);
  document.getElementById('statMaxPrice').textContent = formatPrice(maxPrice);
  statsEl.style.display = 'flex';
}

// === 플랫폼 검색 상태 UI ===
const platformSearchStatus = document.getElementById('platformSearchStatus');
const statusBunjang = document.getElementById('statusBunjang');
const statusJoongna = document.getElementById('statusJoongna');
const statusBunjangLabel = document.getElementById('statusBunjangLabel');
const statusJoongnaLabel = document.getElementById('statusJoongnaLabel');

function showPlatformStatus() {
  statusBunjang.className = 'platform-status-item';
  statusJoongna.className = 'platform-status-item';
  statusBunjangLabel.textContent = '검색 중';
  statusJoongnaLabel.textContent = '검색 중';
  platformSearchStatus.classList.add('show');
}

function updatePlatformStatusDone(bunjangCount, joongnaCount, bunjangFailed, joongnaFailed) {
  if (bunjangFailed) {
    statusBunjang.classList.add('failed');
    statusBunjangLabel.textContent = '실패';
  } else {
    statusBunjang.classList.add('done');
    statusBunjangLabel.textContent = `${bunjangCount}개`;
  }
  if (joongnaFailed) {
    statusJoongna.classList.add('failed');
    statusJoongnaLabel.textContent = '실패';
  } else {
    statusJoongna.classList.add('done');
    statusJoongnaLabel.textContent = `${joongnaCount}개`;
  }
  setTimeout(() => {
    platformSearchStatus.style.transition = 'opacity 0.4s';
    platformSearchStatus.style.opacity = '0';
    setTimeout(() => {
      platformSearchStatus.classList.remove('show');
      platformSearchStatus.style.opacity = '';
      platformSearchStatus.style.transition = '';
    }, 400);
  }, 2500);
}

function hidePlatformStatus() {
  platformSearchStatus.classList.remove('show');
}

// === 검색 ===
async function searchProducts() {
  const keyword = searchInput.value.trim().substring(0, MAX_KEYWORD_LENGTH);
  if (!keyword) {
    showToast("검색어를 입력해주세요", "warning");
    return;
  }

  currentKeyword = keyword;

  // 자동완성 닫기
  hideAutocomplete();

  // 최근 검색어 저장
  saveRecentSearch(keyword);

  // URL에 검색어 추가
  const url = new URL(window.location);
  url.searchParams.set('q', keyword);
  window.history.pushState({}, '', url);

  // 모바일 키보드 숨기기
  searchInput.blur();

  // 이전 요청 취소
  if (currentAbortController) {
    currentAbortController.abort();
  }
  currentAbortController = new AbortController();

  // 검색 중 상태 표시
  showPlatformStatus();
  loadingElement.classList.remove("show");
  showSkeletons();
  allProducts = [];
  filteredProducts = [];
  displayedCount = 0;

  try {
    const response = await fetch("/api/search", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ keyword }),
      signal: currentAbortController.signal,
    });

    const data = await response.json();

    if (response.ok) {
      allProducts = data.results || [];

      const bunjangCount = allProducts.filter(p => p.platform === '번개장터').length;
      const joongnaCount = allProducts.filter(p => p.platform === '중고나라').length;
      const bunjangFailed = data.meta?.bunjang === 'failed';
      const joongnaFailed = data.meta?.joonggo === 'failed';

      updatePlatformStatusDone(bunjangCount, joongnaCount, bunjangFailed, joongnaFailed);

      applyFilter();
      resultsSection.style.display = "block";
    } else {
      hidePlatformStatus();
      throw new Error(data.error || "검색 중 오류가 발생했습니다.");
    }
  } catch (error) {
    if (error.name === 'AbortError') { hidePlatformStatus(); return; }
    hidePlatformStatus();
    resultsSection.style.display = "none";
    showToast(error.message, "error");
  } finally {
    loadingElement.classList.remove("show");
    currentAbortController = null;
  }
}

// === 더보기 (무한 스크롤) ===
function loadMoreItems() {
  if (isLoading || displayedCount >= filteredProducts.length) {
    if (displayedCount >= filteredProducts.length && displayedCount > 0) {
      endMessage.classList.add("show");
    }
    return;
  }

  if (filteredProducts.length === 0) {
    resultsContainer.innerHTML = `
      <div class="empty-state" style="grid-column: 1 / -1;">
        <div class="empty-state-icon"><iconify-icon icon="solar:box-minimalistic-linear" width="48"></iconify-icon></div>
        <div class="empty-state-text">검색 결과가 없습니다</div>
      </div>
    `;
    return;
  }

  isLoading = true;
  loadingMore.classList.add("show");

  setTimeout(() => {
    const nextItems = filteredProducts.slice(
      displayedCount,
      displayedCount + itemsPerLoad
    );

    // DocumentFragment로 배치 삽입 (성능 최적화)
    const fragment = document.createDocumentFragment();
    nextItems.forEach((product, index) => {
      const card = createProductCard(product);
      card.style.animationDelay = `${index * 0.04}s`;
      fragment.appendChild(card);
    });
    resultsContainer.appendChild(fragment);

    displayedCount += nextItems.length;
    updateResultsCount();

    loadingMore.classList.remove("show");
    isLoading = false;

    if (displayedCount >= filteredProducts.length) {
      endMessage.classList.add("show");
    }
  }, 150);
}

// === 상품 카드 생성 ===
function createProductCard(product) {
  const card = document.createElement("div");
  card.className = "product-card";

  const safeLink = sanitizeUrl(product.link);
  card.onclick = (e) => {
    if (e.target.tagName !== "A" && !e.target.closest('.recent-chip-remove')) {
      window.open(safeLink, "_blank", "noopener");
    }
  };

  const platformClass =
    product.platform === "번개장터"
      ? "platform-bunjang"
      : "platform-joongna";

  const safeTitle = escapeHtml(product.title);
  const highlightedTitle = highlightKeyword(safeTitle, currentKeyword);
  const safePrice = escapeHtml(product.price);
  const safePlatform = escapeHtml(product.platform);
  const safeImage = sanitizeUrl(product.image) !== '#' ? product.image : '';
  const safeUpdateTime = escapeHtml(product.update_time);

  const imageHtml = safeImage
    ? `<img class="product-image" src="${safeImage}" alt="${safeTitle}" loading="lazy" onerror="this.parentElement.innerHTML='<div class=\\'product-image-placeholder\\'><iconify-icon icon=\\'solar:gallery-minimalistic-linear\\' width=\\'32\\'></iconify-icon><span>${safePlatform}</span></div>'" />`
    : `<div class="product-image-placeholder"><iconify-icon icon="solar:gallery-minimalistic-linear" width="32"></iconify-icon><span>${safePlatform}</span></div>`;

  card.innerHTML = `
    <div class="product-image-wrapper">
      <span class="platform-badge ${platformClass}">${safePlatform}</span>
      ${imageHtml}
    </div>
    <div class="product-content">
      <h3><a href="${safeLink}" target="_blank" rel="noopener noreferrer" onclick="event.stopPropagation()">${highlightedTitle}</a></h3>
      <div class="product-price">${safePrice}</div>
      <div class="product-meta">
        <div class="meta-item">
          <span>${safeUpdateTime}</span>
        </div>
      </div>
    </div>
  `;
  return card;
}

// === 결과 카운트 ===
function updateResultsCount() {
  if (filteredProducts.length > 0) {
    resultsCount.innerHTML = `총 <strong>${filteredProducts.length}개</strong> 검색 결과`;
  } else {
    resultsCount.innerHTML = '';
  }
}

// === 스크롤 쓰로틀링 (성능 최적화) ===
let scrollTicking = false;
window.addEventListener("scroll", () => {
  if (!scrollTicking) {
    scrollTicking = true;
    requestAnimationFrame(() => {
      const scrollPosition = window.innerHeight + window.scrollY;
      const threshold = document.documentElement.scrollHeight - 300;
      if (scrollPosition >= threshold && !isLoading && displayedCount < filteredProducts.length) {
        loadMoreItems();
      }
      scrollTicking = false;
    });
  }
}, { passive: true });

// === 자동완성 ===
const autocompleteDropdown = document.getElementById('autocompleteDropdown');
let autocompleteActiveIndex = -1;

function showAutocomplete(typed) {
  const recent = getRecentSearches();
  const keyword = typed.trim();
  const matches = keyword
    ? recent.filter(s => s.toLowerCase().includes(keyword.toLowerCase())).slice(0, 8)
    : recent.slice(0, 8);

  if (matches.length === 0) {
    hideAutocomplete();
    return;
  }

  autocompleteDropdown.innerHTML =
    `<div class="autocomplete-header">최근 검색</div>` +
    matches.map((s, i) => {
      const safe = escapeHtml(s);
      const highlighted = keyword ? highlightKeyword(safe, keyword) : safe;
      return `<div class="autocomplete-item" data-keyword="${safe}" data-index="${i}">
        <iconify-icon icon="solar:history-linear" width="14"></iconify-icon>
        <span>${highlighted}</span>
      </div>`;
    }).join('');

  autocompleteDropdown.classList.add('show');
  autocompleteActiveIndex = -1;
}

function hideAutocomplete() {
  autocompleteDropdown.classList.remove('show');
  autocompleteActiveIndex = -1;
}

function navigateAutocomplete(direction) {
  const items = autocompleteDropdown.querySelectorAll('.autocomplete-item');
  if (!items.length) return;
  items[autocompleteActiveIndex]?.classList.remove('focused');
  autocompleteActiveIndex = Math.max(-1, Math.min(items.length - 1, autocompleteActiveIndex + direction));
  if (autocompleteActiveIndex >= 0) {
    items[autocompleteActiveIndex].classList.add('focused');
    searchInput.value = items[autocompleteActiveIndex].dataset.keyword;
  }
}

searchInput.addEventListener('input', () => {
  if (getRecentSearches().length > 0) showAutocomplete(searchInput.value);
  else hideAutocomplete();
});

searchInput.addEventListener('focus', () => {
  if (getRecentSearches().length > 0) showAutocomplete(searchInput.value);
});

searchInput.addEventListener('keydown', (e) => {
  if (!autocompleteDropdown.classList.contains('show')) return;
  if (e.key === 'ArrowDown') { e.preventDefault(); navigateAutocomplete(1); }
  else if (e.key === 'ArrowUp') { e.preventDefault(); navigateAutocomplete(-1); }
  else if (e.key === 'Escape') { hideAutocomplete(); }
});

// mousedown으로 처리해야 input blur보다 먼저 실행됨
autocompleteDropdown.addEventListener('mousedown', (e) => {
  const item = e.target.closest('.autocomplete-item');
  if (!item) return;
  e.preventDefault();
  searchInput.value = item.dataset.keyword;
  hideAutocomplete();
  searchProducts();
});

document.addEventListener('click', (e) => {
  if (!e.target.closest('.search-input-container')) hideAutocomplete();
});

// === 이벤트 리스너 ===
searchButton.addEventListener("click", () => { hideAutocomplete(); searchProducts(); });
searchInput.addEventListener("keypress", (e) => {
  if (e.key === "Enter") { hideAutocomplete(); searchProducts(); }
});

// Header title click - 초기 화면으로
const headerTitle = document.querySelector(".header-title");
headerTitle.addEventListener("click", () => {
  const url = new URL(window.location);
  url.searchParams.delete('q');
  window.history.pushState({}, '', url);

  searchInput.value = "";
  currentKeyword = '';
  resultsSection.style.display = "none";
  allProducts = [];
  filteredProducts = [];
  displayedCount = 0;
  resultsContainer.innerHTML = "";
  resultsCount.innerHTML = "";
  document.getElementById('priceStats').style.display = 'none';

  renderRecentSearches();
  searchInput.scrollIntoView({ behavior: "smooth", block: "center" });
  setTimeout(() => searchInput.focus(), 500);
});

// View size toggle
const viewSizeBtns = document.querySelectorAll(".view-size-btn");
viewSizeBtns.forEach((btn) => {
  btn.addEventListener("click", () => {
    const size = btn.dataset.size;
    viewSizeBtns.forEach((b) => b.classList.remove("active"));
    btn.classList.add("active");
    if (size === "small") {
      resultsContainer.classList.add("compact");
    } else {
      resultsContainer.classList.remove("compact");
    }
  });
});

// Platform filter toggle
const platformFilterBtns = document.querySelectorAll(".platform-filter-btn");
platformFilterBtns.forEach((btn) => {
  btn.addEventListener("click", () => {
    platformFilterBtns.forEach((b) => b.classList.remove("active"));
    btn.classList.add("active");
    currentPlatformFilter = btn.dataset.platform;
    applyFilter();
  });
});

// === 정렬 필터 ===
const sortToggleBtn = document.getElementById("sortToggleBtn");
const sortDropdown = document.getElementById("sortDropdown");
const sortOptionBtns = document.querySelectorAll(".sort-option-btn");

sortToggleBtn.addEventListener("click", (e) => {
  e.stopPropagation();
  sortDropdown.classList.toggle("show");
  // 다른 드롭다운 닫기
  document.getElementById("priceDropdown").classList.remove("show");
});

sortOptionBtns.forEach((btn) => {
  btn.addEventListener("click", () => {
    sortOptionBtns.forEach((b) => b.classList.remove("active"));
    btn.classList.add("active");
    currentSort = btn.dataset.sort;
    sortToggleBtn.classList.toggle("active", currentSort !== 'latest');
    sortDropdown.classList.remove("show");
    if (allProducts.length > 0) applyFilter();
  });
});

// === 상태 필터 ===
const statusFilterBtns = document.querySelectorAll(".status-filter-btn");
statusFilterBtns.forEach((btn) => {
  btn.addEventListener("click", () => {
    statusFilterBtns.forEach((b) => b.classList.remove("active"));
    btn.classList.add("active");
    currentStatusFilter = btn.dataset.status;
    if (allProducts.length > 0) applyFilter();
  });
});

// === 가격 필터 ===
const priceToggleBtn = document.getElementById("priceToggleBtn");
const priceDropdown = document.getElementById("priceDropdown");
const pricePresetBtns = document.querySelectorAll(".price-preset-btn");
const priceMinInput = document.getElementById("priceMin");
const priceMaxInput = document.getElementById("priceMax");
const priceApplyBtn = document.getElementById("priceApplyBtn");

priceToggleBtn.addEventListener("click", (e) => {
  e.stopPropagation();
  priceDropdown.classList.toggle("show");
  priceToggleBtn.classList.toggle("active", priceDropdown.classList.contains("show"));
  // 다른 드롭다운 닫기
  sortDropdown.classList.remove("show");
});

// 드롭다운 외부 클릭 시 닫기
document.addEventListener("click", (e) => {
  if (!priceDropdown.contains(e.target) && e.target !== priceToggleBtn) {
    priceDropdown.classList.remove("show");
    priceToggleBtn.classList.remove("active");
  }
  if (!sortDropdown.contains(e.target) && e.target !== sortToggleBtn) {
    sortDropdown.classList.remove("show");
  }
});

pricePresetBtns.forEach((btn) => {
  btn.addEventListener("click", () => {
    pricePresetBtns.forEach((b) => b.classList.remove("active"));
    btn.classList.add("active");

    const min = parseInt(btn.dataset.min, 10) || 0;
    const max = parseInt(btn.dataset.max, 10) || 0;

    priceMin = min;
    priceMax = max > 0 ? max : Infinity;
    priceMinInput.value = min > 0 ? min : '';
    priceMaxInput.value = max > 0 ? max : '';

    // 가격 필터 활성 상태 표시
    priceToggleBtn.classList.toggle("active", priceMin > 0 || priceMax < Infinity);

    if (allProducts.length > 0) applyFilter();
    priceDropdown.classList.remove("show");
  });
});

priceApplyBtn.addEventListener("click", () => {
  const min = parseInt(priceMinInput.value, 10);
  const max = parseInt(priceMaxInput.value, 10);
  priceMin = isNaN(min) || min < 0 ? 0 : min;
  priceMax = isNaN(max) || max <= 0 ? Infinity : max;

  // 프리셋 버튼 비활성화
  pricePresetBtns.forEach((b) => b.classList.remove("active"));
  priceToggleBtn.classList.toggle("active", priceMin > 0 || priceMax < Infinity);

  if (allProducts.length > 0) applyFilter();
  priceDropdown.classList.remove("show");
});

// === 공유 버튼 ===
document.getElementById("shareBtn").addEventListener("click", async () => {
  try {
    await navigator.clipboard.writeText(window.location.href);
    showToast("검색 결과 링크가 복사되었습니다", "success", 2000);
  } catch {
    // Fallback for older browsers
    const input = document.createElement('input');
    input.value = window.location.href;
    document.body.appendChild(input);
    input.select();
    document.execCommand('copy');
    document.body.removeChild(input);
    showToast("검색 결과 링크가 복사되었습니다", "success", 2000);
  }
});

// === 최근 검색어 이벤트 ===
document.getElementById('recentChips').addEventListener('click', (e) => {
  const removeBtn = e.target.closest('.recent-chip-remove');
  if (removeBtn) {
    removeRecentSearch(removeBtn.dataset.remove);
    return;
  }
  const chip = e.target.closest('.recent-chip');
  if (chip) {
    const keyword = chip.dataset.keyword; // DOM 변경 전에 먼저 캡처
    searchInput.value = keyword;
    hideAutocomplete();
    searchProducts();
  }
});

document.getElementById('clearRecentBtn').addEventListener('click', clearRecentSearches);

// === 브라우저 뒤로가기 대응 ===
window.addEventListener('popstate', () => {
  const urlParams = new URLSearchParams(window.location.search);
  const keyword = urlParams.get('q');
  if (keyword) {
    searchInput.value = keyword;
    searchProducts();
  } else {
    searchInput.value = '';
    currentKeyword = '';
    resultsSection.style.display = 'none';
    allProducts = [];
    filteredProducts = [];
    displayedCount = 0;
    resultsContainer.innerHTML = '';
    resultsCount.innerHTML = '';
    document.getElementById('priceStats').style.display = 'none';
    renderRecentSearches();
  }
});

// === 페이지 로드 시 초기화 ===
window.addEventListener('DOMContentLoaded', () => {
  renderRecentSearches();

  const urlParams = new URLSearchParams(window.location.search);
  const keyword = urlParams.get('q');
  if (keyword) {
    searchInput.value = keyword;
    searchProducts();
  }
});
