'use client';

// 최근 검색어 외부 스토어 (useSyncExternalStore용).
// 모든 SearchBar 인스턴스(Hero/헤더)가 이 스토어를 구독 → 검색/삭제 시 자동 동기화.
const RECENT_KEY = 'junggo_recent_v2';
export const MAX_RECENT = 30;

const EMPTY: readonly string[] = [];
const listeners = new Set<() => void>();

function read(): string[] {
  try {
    const v = JSON.parse(localStorage.getItem(RECENT_KEY) || '[]');
    return Array.isArray(v) ? v.filter((x) => typeof x === 'string') : [];
  } catch {
    return [];
  }
}

// getSnapshot은 동일 데이터면 동일 참조를 반환해야 한다(무한 루프 방지).
// snapshot은 commit/스토리지 이벤트에서만 새 배열로 교체된다.
let snapshot: readonly string[] = typeof window === 'undefined' ? EMPTY : read();

function emit() {
  for (const l of listeners) l();
}

function commit(next: string[]) {
  try {
    localStorage.setItem(RECENT_KEY, JSON.stringify(next));
  } catch {
    /* quota 등 무시 */
  }
  snapshot = next;
  emit();
}

export const recentStore = {
  subscribe(cb: () => void) {
    listeners.add(cb);
    const onStorage = (e: StorageEvent) => {
      if (e.key === RECENT_KEY) {
        snapshot = read();
        emit();
      }
    };
    window.addEventListener('storage', onStorage);
    return () => {
      listeners.delete(cb);
      window.removeEventListener('storage', onStorage);
    };
  },
  getSnapshot(): readonly string[] {
    return snapshot;
  },
  getServerSnapshot(): readonly string[] {
    return EMPTY;
  },
  save(keyword: string) {
    const k = keyword.trim();
    if (!k) return;
    commit([k, ...read().filter((x) => x !== k)].slice(0, MAX_RECENT));
  },
  remove(keyword: string) {
    commit(read().filter((x) => x !== keyword));
  },
  clear() {
    commit([]);
  },
};
