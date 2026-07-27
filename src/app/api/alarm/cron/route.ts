import { NextRequest, NextResponse } from 'next/server';
import { fetchBunjangLatest } from '@/lib/scrapers/bunjang';
import { fetchJoongnaLatest } from '@/lib/scrapers/joongna';
import { verifyCronSecret } from '@/lib/alarm/auth';
import { ALARM } from '@/lib/alarm/constants';
import { sendDiscordAlert } from '@/lib/alarm/discord';
import { diffNewIds, getKeywords, markSeen, setLastRun } from '@/lib/alarm/redis';
import type {
  AlarmPlatform,
  AlarmProduct,
  KeywordRunResult,
  LastRunMeta,
  PlatformRunResult,
} from '@/lib/alarm/types';

export const dynamic = 'force-dynamic';
export const maxDuration = 60; // Vercel Hobby 상한

// 서버 타임존과 무관하게 KST 기준 날짜 문자열('YY-MM-DD') 계산
// (중고나라 이미지 경로 날짜는 KST 업로드일)
function kstDateStr(daysAgo: number): string {
  const d = new Date(Date.now() + 9 * 3600_000 - daysAgo * 86400_000);
  const yy = String(d.getUTCFullYear()).slice(-2);
  const mm = String(d.getUTCMonth() + 1).padStart(2, '0');
  const dd = String(d.getUTCDate()).padStart(2, '0');
  return `${yy}-${mm}-${dd}`;
}

// 2차 오탐 방지: 검색 결과에 새로 진입했지만 실제로는 오래된 상품(노출 순위
// 변동 등)을 거른다. 1차 기준은 seen-set diff.
function isFresh(platform: AlarmPlatform, p: AlarmProduct): boolean {
  if (platform === 'bunjang') {
    return p.timestamp >= Math.floor(Date.now() / 1000) - ALARM.BUNJANG_FRESH_WINDOW_SEC;
  }
  // 중고나라는 일 단위 근사(''=미상은 제외) → 오늘/어제만
  return p.update_time !== '' && (p.update_time === kstDateStr(0) || p.update_time === kstDateStr(1));
}

async function processPlatform(
  platform: AlarmPlatform,
  keyword: string,
): Promise<PlatformRunResult> {
  const result: PlatformRunResult = { fetched: 0, new: 0, seeded: false, notified: false };
  try {
    const products =
      platform === 'bunjang' ? await fetchBunjangLatest(keyword) : await fetchJoongnaLatest(keyword);
    result.fetched = products.length;
    // 스크래퍼 실패(빈 배열)를 시드로 오인해 seen을 오염시키지 않도록 skip
    if (products.length === 0) {
      result.error = 'empty(fetch 실패 가능)';
      return result;
    }
    const ids = products.map((p) => p.id);
    const { isFirstRun, newIds } = await diffNewIds(platform, keyword, ids);
    if (isFirstRun) {
      await markSeen(platform, keyword, ids);
      result.seeded = true;
      return result;
    }
    const newIdSet = new Set(newIds);
    const fresh = products.filter((p) => newIdSet.has(p.id) && isFresh(platform, p));
    result.new = fresh.length;
    if (fresh.length > 0) {
      result.notified = await sendDiscordAlert(keyword, fresh);
    }
    // fresh 여부 무관 전체 기록 → 다음 주기 재알림 원천 차단
    await markSeen(platform, keyword, ids);
    return result;
  } catch (e) {
    result.error = e instanceof Error ? e.message : String(e);
    return result;
  }
}

async function processKeyword(keyword: string): Promise<KeywordRunResult> {
  const [bunjang, joongna] = await Promise.all([
    processPlatform('bunjang', keyword),
    processPlatform('joongna', keyword),
  ]);
  return { keyword, bunjang, joongna };
}

export async function GET(req: NextRequest) {
  if (!verifyCronSecret(req)) {
    return NextResponse.json({ ok: false, error: 'unauthorized' }, { status: 401 });
  }
  const started = Date.now();
  try {
    const keywords = await getKeywords();
    if (keywords.length === 0) {
      return NextResponse.json({ ok: true, totalNew: 0, results: [] });
    }

    const results: KeywordRunResult[] = [];
    for (let i = 0; i < keywords.length; i += ALARM.CRON_BATCH_SIZE) {
      const batch = keywords.slice(i, i + ALARM.CRON_BATCH_SIZE);
      const settled = await Promise.allSettled(batch.map(processKeyword));
      settled.forEach((s, j) => {
        if (s.status === 'fulfilled') {
          results.push(s.value);
        } else {
          const error = s.reason instanceof Error ? s.reason.message : String(s.reason);
          const failed: PlatformRunResult = { fetched: 0, new: 0, seeded: false, notified: false, error };
          results.push({ keyword: batch[j], bunjang: failed, joongna: { ...failed } });
        }
      });
    }

    const totalNew = results.reduce((sum, r) => sum + r.bunjang.new + r.joongna.new, 0);
    const meta: LastRunMeta = {
      at: new Date().toISOString(),
      tookMs: Date.now() - started,
      totalNew,
      results,
    };
    try {
      await setLastRun(meta);
    } catch {
      // 메타 저장 실패가 크론 결과를 망치지 않도록 무시
    }
    return NextResponse.json({ ok: true, ...meta });
  } catch (e) {
    return NextResponse.json(
      { ok: false, error: e instanceof Error ? e.message : String(e) },
      { status: 500 },
    );
  }
}
