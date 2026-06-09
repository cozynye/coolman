'use client';

import { useSyncExternalStore } from 'react';
import type { PlatformStore, PlatformEntry } from '@/lib/platformStore';

// 플랫폼 스토어를 구독해 현재 키워드의 엔트리를 반환(읽기 전용 — fetch는 ensure가 담당).
export function usePlatformSearch(store: PlatformStore, keyword: string): PlatformEntry {
  return useSyncExternalStore(
    store.subscribe,
    () => store.get(keyword),
    () => store.get(''), // 서버 스냅샷 = EMPTY_ENTRY (안정 참조)
  );
}
