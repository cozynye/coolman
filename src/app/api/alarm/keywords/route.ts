import { NextRequest, NextResponse } from 'next/server';
import { verifyAlarmKey } from '@/lib/alarm/auth';
import { addKeyword, getKeywords, getLastRun, removeKeyword } from '@/lib/alarm/redis';

function unauthorized() {
  return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
}

function serverError(e: unknown) {
  return NextResponse.json(
    { error: e instanceof Error ? e.message : 'server error' },
    { status: 500 },
  );
}

export async function GET(req: NextRequest) {
  if (!verifyAlarmKey(req)) return unauthorized();
  try {
    const [keywords, lastRun] = await Promise.all([getKeywords(), getLastRun()]);
    return NextResponse.json({ keywords, lastRun });
  } catch (e) {
    return serverError(e);
  }
}

export async function POST(req: NextRequest) {
  if (!verifyAlarmKey(req)) return unauthorized();
  try {
    const { keyword } = await req.json();
    const result = await addKeyword(String(keyword ?? ''));
    if (!result.ok) {
      return NextResponse.json({ ok: false, error: result.error }, { status: 400 });
    }
    return NextResponse.json({ ok: true, keywords: await getKeywords() });
  } catch (e) {
    return serverError(e);
  }
}

export async function DELETE(req: NextRequest) {
  if (!verifyAlarmKey(req)) return unauthorized();
  try {
    const { keyword } = await req.json();
    await removeKeyword(String(keyword ?? ''));
    return NextResponse.json({ ok: true, keywords: await getKeywords() });
  } catch (e) {
    return serverError(e);
  }
}
