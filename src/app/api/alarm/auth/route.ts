import { NextRequest, NextResponse } from 'next/server';

// 항상 200 + { ok } — 기존 라우트의 "실패해도 200" 컨벤션 유지
export async function POST(req: NextRequest) {
  try {
    const { password } = await req.json();
    const expected = process.env.ALARM_PASSWORD;
    return NextResponse.json({ ok: Boolean(expected) && password === expected });
  } catch {
    return NextResponse.json({ ok: false });
  }
}
