/**
 * @typedef {Object} SearchResult
 * @property {string} platform - 플랫폼 이름 (예: "번개장터", "중고나라")
 * @property {string} title - 상품 제목
 * @property {string} price - 가격 (예: "1,000,000원")
 * @property {string} link - 상품 링크 URL
 * @property {string} update_time - 업데이트 시간 (예: "2025. 12. 16. 오후 4:01:14")
 * @property {string} status - 판매 상태 (예: "판매중", "예약중", "판매완료")
 */

/**
 * @typedef {Object} SearchResponse
 * @property {string} keyword - 검색 키워드
 * @property {string} timestamp - 검색 실행 시간 (ISO 8601 형식)
 * @property {SearchResult[]} results - 검색 결과 배열
 */

/**
 * 중고나라 API 응답 타입
 * @typedef {Object} JoongnaItem
 * @property {number} seq - 상품 ID
 * @property {number} productPositionNo - 상품 위치 번호
 * @property {number} platformType - 플랫폼 타입 (1: 앱, 2: 카페)
 * @property {number} price - 가격
 * @property {number} parcelFee - 배송비 (0: 별도, 1: 포함)
 * @property {string} url - 이미지 URL
 * @property {string} title - 상품 제목
 * @property {number} state - 상품 상태 (0: 판매중, 1: 예약중, 2: 판매완료)
 * @property {string} sortDate - 정렬 날짜
 * @property {string} mainLocationName - 주요 지역명
 * @property {number} articleSeq - 카페 글 번호
 * @property {string} articleUrl - 카페 글 URL
 * @property {string} videoProductYn - 비디오 상품 여부
 * @property {number} wishCount - 찜 개수
 * @property {boolean} jnPayBadgeFlag - 중나페이 뱃지
 * @property {boolean} pickupBadgeFlag - 픽업 뱃지
 * @property {string} highlightedTitle - 하이라이트 제목
 * @property {number} storeSeq - 상점 번호
 * @property {number} chatCount - 채팅 개수
 * @property {boolean} selfAuditFlag - 자체 감사 플래그
 * @property {number} userType - 사용자 타입
 * @property {boolean} certifySellerFlag - 인증 판매자 플래그
 * @property {string} detailImgUrl - 상세 이미지 URL
 * @property {string[]} locationNames - 지역명 배열
 * @property {string} objectType - 객체 타입
 * @property {number} wishYn - 찜 여부
 */

/**
 * @typedef {Object} JoongnaApiResponse
 * @property {Object} meta - 메타 정보
 * @property {number} meta.code - 응답 코드
 * @property {string} meta.message - 응답 메시지
 * @property {Object} data - 데이터
 * @property {string} data.transactionId - 트랜잭션 ID
 * @property {number} data.size - 결과 크기
 * @property {number} data.totalSize - 전체 크기
 * @property {string} data.searchStartDT - 검색 시작 시간
 * @property {JoongnaItem[]} data.items - 상품 목록
 */

module.exports = {};
