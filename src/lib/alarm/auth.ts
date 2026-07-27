import type { NextRequest } from 'next/server';

// env 미설정 시 무조건 거부 — 빈 값끼리 일치해 통과하는 사고 방지
// 헤더 값은 encodeURIComponent로 전달받는다 (HTTP 헤더는 한글 등 non-ASCII 불가)
export function verifyAlarmKey(req: NextRequest): boolean {
  const password = process.env.ALARM_PASSWORD;
  if (!password) return false;
  const raw = req.headers.get('x-alarm-key');
  if (!raw) return false;
  try {
    return decodeURIComponent(raw) === password;
  } catch {
    return false;
  }
}

export function verifyCronSecret(req: NextRequest): boolean {
  const secret = process.env.CRON_SECRET;
  if (!secret) return false;
  return req.headers.get('authorization') === `Bearer ${secret}`;
}
