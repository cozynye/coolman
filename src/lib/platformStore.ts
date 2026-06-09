'use client';

import type { Product } from './types';

// 플랫폼별 검색 데이터 외부 스토어 (useSyncExternalStore용, 무의존성).
// - 키워드별로 결과를 보관 → 늦게 도착한 A 응답이 현재 화면 B를 덮어쓰는 레이스 구조적 차단.
// - L1: 메모리 Map(세션), L2: localStorage(30분 TTL, 플랫폼별 10개 LRU) → SWR 체감 보존.
// - fetch는 컴포넌트 밖(ensure)에서만 실행, getSnapshot은 순수 읽기.

export type PlatformStatus = 'idle' | 'loading' | 'success' | 'failed';
export interface PlatformEntry {
  status: PlatformStatus;
  data: Product[];
}

const EMPTY_ENTRY: PlatformEntry = { status: 'idle', data: [] };
const TTL = 30 * 60 * 1000; // 30분
const LS_MAX = 10;

function createPlatformStore(platform: 'bunjang' | 'joongna') {
  const endpoint = `/api/search/${platform}`;
  const LS_PREFIX = `moajung_${platform}_`;
  const LS_KEYS = `moajung_${platform}_keys`;
  const mem = new Map<string, PlatformEntry>();
  const listeners = new Set<() => void>();
  const inflight = new Set<string>();

  const emit = () => {
    for (const l of listeners) l();
  };

  function lsGet(key: string): Product[] | null {
    try {
      const raw = localStorage.getItem(LS_PREFIX + key);
      if (!raw) return null;
      const e = JSON.parse(raw);
      if (Date.now() - e.t > TTL) {
        localStorage.removeItem(LS_PREFIX + key);
        return null;
      }
      return e.d as Product[];
    } catch {
      return null;
    }
  }

  function lsSet(key: string, data: Product[]) {
    try {
      localStorage.setItem(LS_PREFIX + key, JSON.stringify({ d: data, t: Date.now() }));
      let keys: string[] = [];
      try {
        keys = JSON.parse(localStorage.getItem(LS_KEYS) || '[]');
      } catch {
        keys = [];
      }
      keys = [key, ...keys.filter((k) => k !== key)];
      if (keys.length > LS_MAX) {
        keys.slice(LS_MAX).forEach((k) => localStorage.removeItem(LS_PREFIX + k));
        keys = keys.slice(0, LS_MAX);
      }
      localStorage.setItem(LS_KEYS, JSON.stringify(keys));
    } catch {
      /* quota 등 무시 */
    }
  }

  function set(key: string, entry: PlatformEntry) {
    mem.set(key, entry);
    emit();
  }

  async function doFetch(keyword: string): Promise<PlatformEntry> {
    try {
      const res = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ keyword }),
      });
      const data = await res.json();
      // 라우트는 실패해도 HTTP 200 + {status:'failed'}를 반환하므로 status로 판별.
      if (!res.ok || data?.status === 'failed') return { status: 'failed', data: [] };
      return { status: 'success', data: (data?.results ?? []) as Product[] };
    } catch {
      return { status: 'failed', data: [] };
    }
  }

  return {
    subscribe(cb: () => void) {
      listeners.add(cb);
      return () => {
        listeners.delete(cb);
      };
    },
    get(keyword: string): PlatformEntry {
      const key = keyword.trim().toLowerCase();
      if (!key) return EMPTY_ENTRY;
      return mem.get(key) ?? EMPTY_ENTRY;
    },
    async ensure(keyword: string, force = false) {
      const kw = keyword.trim();
      const key = kw.toLowerCase();
      if (!key || inflight.has(key)) return;

      const current = mem.get(key);
      // 세션 내 이미 최신(success) 보유 & 강제 아님 → 재요청 안 함
      if (!force && current && current.status === 'success') return;

      // L2 캐시 시드 → 즉시 표시(stale), 없으면 로딩 표시
      if (!current || current.status !== 'success') {
        const cached = lsGet(key);
        set(key, cached ? { status: 'success', data: cached } : { status: 'loading', data: [] });
      }

      // (백그라운드) fetch
      inflight.add(key);
      const result = await doFetch(kw);
      inflight.delete(key);

      if (result.status === 'success') {
        set(key, result);
        lsSet(key, result.data);
      } else {
        // fetch 실패: 스테일 캐시가 있으면 화면 비우지 말고 유지
        const cur = mem.get(key);
        if (!(cur && cur.status === 'success' && cur.data.length > 0)) {
          set(key, { status: 'failed', data: [] });
        }
      }
    },
  };
}

export const bunjangStore = createPlatformStore('bunjang');
export const joongnaStore = createPlatformStore('joongna');
export type PlatformStore = ReturnType<typeof createPlatformStore>;
