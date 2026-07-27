import type { Product } from '@/lib/types';

export type AlarmPlatform = 'bunjang' | 'joongna';

// id = 번개장터 pid | 중고나라 seq — seen-set diff의 dedup 키
export type AlarmProduct = Product & { id: string };

export interface PlatformRunResult {
  fetched: number;
  new: number;
  seeded: boolean;
  notified: boolean;
  error?: string;
}

export interface KeywordRunResult {
  keyword: string;
  bunjang: PlatformRunResult;
  joongna: PlatformRunResult;
}

export interface LastRunMeta {
  at: string; // ISO
  tookMs: number;
  totalNew: number;
  results: KeywordRunResult[];
}
