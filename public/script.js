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
let priceMin = 0;
let priceMax = Infinity;
let currentAbortController = null;
const MAX_KEYWORD_LENGTH = 50;

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

// === 스켈레톤 로딩 ===
function showSkeletons(count = 6) {
  resultsSection.style.display = "block";
  resultsContainer.innerHTML = '';
  resultsCount.innerHTML = '';
  endMessage.classList.remove("show");

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

// === 필터 ===
function applyFilter() {
  filteredProducts = allProducts.filter(product => {
    // 플랫폼 필터
    if (currentPlatformFilter !== 'all' && product.platform !== currentPlatformFilter) {
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

  displayedCount = 0;
  resultsContainer.innerHTML = "";
  endMessage.classList.remove("show");
  updateResultsCount();
  loadMoreItems();
}

// === 검색 ===
async function searchProducts() {
  const keyword = searchInput.value.trim().substring(0, MAX_KEYWORD_LENGTH);
  if (!keyword) {
    showToast("검색어를 입력해주세요", "warning");
    return;
  }

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

  // 스켈레톤 표시
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

      // 플랫폼별 상태 표시
      if (data.meta) {
        if (data.meta.bunjang === 'failed') {
          showToast("번개장터 검색에 실패했습니다", "warning");
        }
        if (data.meta.joonggo === 'failed') {
          showToast("중고나라 검색에 실패했습니다", "warning");
        }
      }

      applyFilter();
      resultsSection.style.display = "block";
    } else {
      throw new Error(data.error || "검색 중 오류가 발생했습니다.");
    }
  } catch (error) {
    if (error.name === 'AbortError') return; // 사용자가 새 검색을 시작한 경우
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
        <div class="empty-state-icon">📭</div>
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
    if (e.target.tagName !== "A") {
      window.open(safeLink, "_blank", "noopener");
    }
  };

  const platformClass =
    product.platform === "번개장터"
      ? "platform-bunjang"
      : "platform-joongna";

  const safeTitle = escapeHtml(product.title);
  const safePrice = escapeHtml(product.price);
  const safePlatform = escapeHtml(product.platform);
  const safeImage = sanitizeUrl(product.image) !== '#' ? product.image : '';
  const safeUpdateTime = escapeHtml(product.update_time);

  card.innerHTML = `
    <div class="product-image-wrapper">
      <span class="platform-badge ${platformClass}">${safePlatform}</span>
      ${safeImage ? `<img class="product-image" src="${safeImage}" alt="${safeTitle}" loading="lazy" onerror="this.style.display='none'" />` : ''}
    </div>
    <div class="product-content">
      <h3><a href="${safeLink}" target="_blank" rel="noopener noreferrer" onclick="event.stopPropagation()">${safeTitle}</a></h3>
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

// === 결과 카운트 (2.2 버그 수정) ===
function updateResultsCount() {
  if (filteredProducts.length > 0) {
    resultsCount.innerHTML = `
      총 <strong>${filteredProducts.length}개</strong> <span style="color: #999; font-weight: 400;">검색 결과</span>
    `;
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

// === 이벤트 리스너 ===
searchButton.addEventListener("click", searchProducts);
searchInput.addEventListener("keypress", (e) => {
  if (e.key === "Enter") searchProducts();
});

// Header title click - 초기 화면으로
const headerTitle = document.querySelector(".header-title");
headerTitle.addEventListener("click", () => {
  const url = new URL(window.location);
  url.searchParams.delete('q');
  window.history.pushState({}, '', url);

  searchInput.value = "";
  resultsSection.style.display = "none";
  allProducts = [];
  filteredProducts = [];
  displayedCount = 0;
  resultsContainer.innerHTML = "";
  resultsCount.innerHTML = "";

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
});

// 드롭다운 외부 클릭 시 닫기
document.addEventListener("click", (e) => {
  if (!priceDropdown.contains(e.target) && e.target !== priceToggleBtn) {
    priceDropdown.classList.remove("show");
    priceToggleBtn.classList.remove("active");
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

// === 브라우저 뒤로가기 대응 ===
window.addEventListener('popstate', () => {
  const urlParams = new URLSearchParams(window.location.search);
  const keyword = urlParams.get('q');
  if (keyword) {
    searchInput.value = keyword;
    searchProducts();
  } else {
    searchInput.value = '';
    resultsSection.style.display = 'none';
    allProducts = [];
    filteredProducts = [];
    displayedCount = 0;
    resultsContainer.innerHTML = '';
    resultsCount.innerHTML = '';
  }
});

// === 페이지 로드 시 URL에서 검색어 확인 ===
window.addEventListener('DOMContentLoaded', () => {
  const urlParams = new URLSearchParams(window.location.search);
  const keyword = urlParams.get('q');
  if (keyword) {
    searchInput.value = keyword;
    searchProducts();
  }
});
