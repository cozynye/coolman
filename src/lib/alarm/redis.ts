import { Redis } from '@upstash/redis';
import { CONFIG } from '@/lib/config';
import { ALARM } from './constants';
import type { AlarmPlatform, LastRunMeta } from './types';

const KEYWORDS_KEY = 'alarm:keywords';
const LAST_RUN_KEY = 'alarm:meta:last_run';

let client: Redis | null = null;

export function getRedis(): Redis {
  if (client) return client;
  // Vercel Marketplace 통합이 KV_* 이름으로 주입하는 경우 대비 폴백
  const url = process.env.UPSTASH_REDIS_REST_URL ?? process.env.KV_REST_API_URL;
  const token = process.env.UPSTASH_REDIS_REST_TOKEN ?? process.env.KV_REST_API_TOKEN;
  if (!url || !token) {
    throw new Error('Redis 환경변수 미설정 (UPSTASH_REDIS_REST_URL / UPSTASH_REDIS_REST_TOKEN)');
  }
  client = new Redis({ url, token });
  return client;
}

function seenKey(platform: AlarmPlatform, keyword: string): string {
  return `alarm:seen:${platform}:${encodeURIComponent(keyword)}`;
}

export async function getKeywords(): Promise<string[]> {
  const keywords = await getRedis().smembers(KEYWORDS_KEY);
  return keywords.sort((a, b) => a.localeCompare(b, 'ko'));
}

export async function addKeyword(
  raw: string,
): Promise<{ ok: boolean; error?: 'invalid' | 'limit' }> {
  const keyword = raw.trim();
  if (!keyword || keyword.length > CONFIG.MAX_KEYWORD_LENGTH) return { ok: false, error: 'invalid' };
  const redis = getRedis();
  const count = await redis.scard(KEYWORDS_KEY);
  if (count >= ALARM.MAX_KEYWORDS) return { ok: false, error: 'limit' };
  await redis.sadd(KEYWORDS_KEY, keyword);
  return { ok: true };
}

export async function removeKeyword(raw: string): Promise<void> {
  const keyword = raw.trim();
  if (!keyword) return;
  const p = getRedis().pipeline();
  p.srem(KEYWORDS_KEY, keyword);
  p.del(seenKey('bunjang', keyword), seenKey('joongna', keyword));
  await p.exec();
}

export async function diffNewIds(
  platform: AlarmPlatform,
  keyword: string,
  ids: string[],
): Promise<{ isFirstRun: boolean; newIds: string[] }> {
  const redis = getRedis();
  const key = seenKey(platform, keyword);
  const exists = await redis.exists(key);
  if (!exists) return { isFirstRun: true, newIds: ids };
  if (ids.length === 0) return { isFirstRun: false, newIds: [] };
  const scores = (await redis.zmscore(key, ids)) ?? [];
  return { isFirstRun: false, newIds: ids.filter((_, i) => scores[i] == null) };
}

export async function markSeen(
  platform: AlarmPlatform,
  keyword: string,
  ids: string[],
): Promise<void> {
  if (ids.length === 0) return; // ZADD 빈 인자 에러 방지
  const key = seenKey(platform, keyword);
  const now = Date.now();
  const members = ids.map((id) => ({ score: now, member: id }));
  const p = getRedis().pipeline();
  p.zadd(key, members[0], ...members.slice(1));
  p.zremrangebyrank(key, 0, -(ALARM.SEEN_MAX + 1)); // 최근 SEEN_MAX개만 유지
  p.expire(key, ALARM.SEEN_TTL_SEC); // 키워드 삭제·방치 시 orphan 자동 정리
  await p.exec();
}

export async function getLastRun(): Promise<LastRunMeta | null> {
  return getRedis().get<LastRunMeta>(LAST_RUN_KEY);
}

export async function setLastRun(meta: LastRunMeta): Promise<void> {
  await getRedis().set(LAST_RUN_KEY, meta);
}
