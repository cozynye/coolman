const searchInput = document.getElementById("searchInput");
const searchButton = document.getElementById("searchButton");
const resultsContainer = document.getElementById("results");
const resultsSection = document.getElementById("resultsSection");
const loadingElement = document.getElementById("loading");
const loadingMore = document.getElementById("loadingMore");
const endMessage = document.getElementById("endMessage");
const resultsCount = document.getElementById("resultsCount");

let allProducts = [];
let filteredProducts = [];
let displayedCount = 0;
const itemsPerLoad = 30;
let isLoading = false;

function applyFilter() {
  // 필터 제거 - 모든 결과 표시
  filteredProducts = allProducts;

  displayedCount = 0;
  resultsContainer.innerHTML = "";
  endMessage.classList.remove("show");
  updateResultsCount();
  loadMoreItems();
}

async function searchProducts() {
  const keyword = searchInput.value.trim();
  if (!keyword) {
    alert("검색어를 입력해주세요");
    return;
  }

  // 모바일 키보드 숨기기
  searchInput.blur();

  loadingElement.classList.add("show");
  resultsSection.style.display = "none";
  resultsContainer.innerHTML = "";
  endMessage.classList.remove("show");
  allProducts = [];
  filteredProducts = [];
  displayedCount = 0;

  try {
    const response = await fetch("/api/search", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ keyword }),
    });

    const data = await response.json();

    if (response.ok) {
      allProducts = data.results || [];
      applyFilter();
      resultsSection.style.display = "block";
    } else {
      throw new Error(data.error || "검색 중 오류가 발생했습니다.");
    }
  } catch (error) {
    alert(error.message);
  } finally {
    loadingElement.classList.remove("show");
  }
}

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

    nextItems.forEach((product, index) => {
      const card = createProductCard(product);
      // Add stagger delay for animation
      card.style.animationDelay = `${(index % 6) * 0.05}s`;
      resultsContainer.appendChild(card);
    });

    displayedCount += nextItems.length;
    updateResultsCount();

    loadingMore.classList.remove("show");
    isLoading = false;

    if (displayedCount >= filteredProducts.length) {
      endMessage.classList.add("show");
    }
  }, 300);
}

function createProductCard(product) {
  const card = document.createElement("div");
  card.className = "product-card";

  // 카드 전체 클릭 시 상품 상세 페이지로 이동
  card.onclick = (e) => {
    // 링크 클릭이 아닌 경우에만 동작 (링크는 자체적으로 처리)
    if (e.target.tagName !== "A") {
      window.open(product.link, "_blank");
    }
  };

  const platformClass =
    product.platform === "번개장터"
      ? "platform-bunjang"
      : "platform-joongna";

  card.innerHTML = `
    <div class="product-image-wrapper">
      <span class="platform-badge ${platformClass}">${
    product.platform
  }</span>
      <img
        class="product-image"
        src="${
          product.image ||
          "https://via.placeholder.com/300x300?text=No+Image"
        }"
        alt="${product.title}"
        loading="lazy"
        onerror="this.src='https://via.placeholder.com/300x300?text=No+Image'"
      />
    </div>
    <div class="product-content">
      <h3><a href="${
        product.link
      }" target="_blank" onclick="event.stopPropagation()">${
    product.title
  }</a></h3>
      <div class="product-price">${product.price}</div>
      <div class="product-meta">
        <div class="meta-item">
          <span>🕐</span>
          <span>${product.update_time}</span>
        </div>
      </div>
    </div>
  `;
  return card;
}

function updateResultsCount() {
  if (filteredProducts.length > 0) {
    resultsCount.innerHTML = `
      총 <strong>${filteredProducts.length}개</strong> <span style="color: #999; font-weight: 400;">검색 결과</span>
    `;
  }
}

// Infinite scroll
window.addEventListener("scroll", () => {
  const scrollPosition = window.innerHeight + window.scrollY;
  const threshold = document.documentElement.scrollHeight - 300;

  if (
    scrollPosition >= threshold &&
    !isLoading &&
    displayedCount < filteredProducts.length
  ) {
    loadMoreItems();
  }
});

searchButton.addEventListener("click", searchProducts);
searchInput.addEventListener("keypress", (e) => {
  if (e.key === "Enter") searchProducts();
});

// Header search icon click
const headerSearchBtn = document.getElementById("headerSearchBtn");
headerSearchBtn.addEventListener("click", () => {
  searchInput.scrollIntoView({ behavior: "smooth", block: "center" });
  setTimeout(() => {
    searchInput.focus();
  }, 500);
});

// View size toggle
const viewSizeBtns = document.querySelectorAll(".view-size-btn");
viewSizeBtns.forEach((btn) => {
  btn.addEventListener("click", () => {
    const size = btn.dataset.size;

    // Update button states
    viewSizeBtns.forEach((b) => b.classList.remove("active"));
    btn.classList.add("active");

    // Toggle grid size
    if (size === "small") {
      resultsContainer.classList.add("compact");
    } else {
      resultsContainer.classList.remove("compact");
    }
  });
});
