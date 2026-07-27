export const ALARM = {
  MAX_KEYWORDS: 10,
  // 키워드·플랫폼당 seen ZSET 최대 크기. 번개장터 1페이지 50개 기준 10회분 이상
  // 보관되므로 정상 주기(30분)에서 재알림이 발생할 수 없는 수준.
  SEEN_MAX: 500,
  SEEN_TTL_SEC: 30 * 24 * 3600,
  // 번개장터는 timestamp(unix 초)가 신뢰 가능 → 이 윈도우 밖이면 검색 결과에
  // 새로 진입했어도(노출 순위 변동 등) 신상품으로 보지 않는다.
  BUNJANG_FRESH_WINDOW_SEC: 24 * 3600,
  CRON_BATCH_SIZE: 3,
  DISCORD_EMBEDS_PER_MESSAGE: 10,
  MAX_NOTIFY_PER_KEYWORD: 20,
} as const;
