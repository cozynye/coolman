import type { Product } from './types';

const PREFIX = 'moajung_cache_';
const KEYS_KEY = 'moajung_cache_keys';
const TTL = 30 * 60 * 1000; // 30분
const MAX_ENTRIES = 10;

interface CacheEntry {
  bunjang: Product[];
  joongna: Product[];
  savedAt: number;
}

function getKeys(): string[] {
  try {
    return JSON.parse(localStorage.getItem(KEYS_KEY) || '[]');
  } catch {
    return [];
  }
}

function setKeys(keys: string[]) {
  try {
    localStorage.setItem(KEYS_KEY, JSON.stringify(keys));
  } catch {}
}

export function getCached(keyword: string): CacheEntry | null {
  try {
    const raw = localStorage.getItem(PREFIX + keyword.toLowerCase());
    if (!raw) return null;
    const entry: CacheEntry = JSON.parse(raw);
    if (Date.now() - entry.savedAt > TTL) {
      localStorage.removeItem(PREFIX + keyword.toLowerCase());
      return null;
    }
    return entry;
  } catch {
    return null;
  }
}

export function setCached(keyword: string, bunjang: Product[], joongna: Product[]) {
  try {
    const key = keyword.toLowerCase();
    const entry: CacheEntry = { bunjang, joongna, savedAt: Date.now() };
    localStorage.setItem(PREFIX + key, JSON.stringify(entry));

    // LRU 키 목록 관리
    const keys = getKeys().filter((k) => k !== key);
    keys.unshift(key);
    if (keys.length > MAX_ENTRIES) {
      const removed = keys.splice(MAX_ENTRIES);
      removed.forEach((k) => localStorage.removeItem(PREFIX + k));
    }
    setKeys(keys);
  } catch {
    // localStorage quota exceeded
  }
}
