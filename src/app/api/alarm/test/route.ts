import { NextRequest, NextResponse } from 'next/server';
import { verifyAlarmKey } from '@/lib/alarm/auth';
import { sendTestMessage } from '@/lib/alarm/discord';

export async function POST(req: NextRequest) {
  if (!verifyAlarmKey(req)) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }
  const ok = await sendTestMessage();
  return NextResponse.json({ ok });
}
