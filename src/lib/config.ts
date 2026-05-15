export const CONFIG = {
  CACHE_TTL: 5 * 60 * 1000,
  CACHE_MAX_SIZE: 100,
  MAX_KEYWORD_LENGTH: 50,
  SEARCH_TIMEOUT: 15000,
  BUNJANG_RESULTS_LIMIT: 100,
  BUNJANG_PAGES: 3,
  JOONGNA_PAGES: 3,
  BUNJANG_API_URL: 'https://api.bunjang.co.kr/api/1/find_v2.json',
  JOONGNA_BASE_URL: 'https://web.joongna.com',
  USER_AGENT:
    'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
} as const;
