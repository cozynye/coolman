import { ALARM } from './constants';
import type { AlarmProduct } from './types';

interface DiscordEmbed {
  title: string;
  url: string;
  color: number;
  thumbnail?: { url: string };
  fields: { name: string; value: string; inline: boolean }[];
}

function toEmbed(p: AlarmProduct): DiscordEmbed {
  return {
    title: p.title.slice(0, 100),
    url: p.link,
    color: p.platform === '번개장터' ? 0xff5b59 : 0x60c053,
    // 빈 썸네일 URL은 Discord가 400으로 거부 → 있을 때만 포함
    ...(p.image ? { thumbnail: { url: p.image } } : {}),
    fields: [
      { name: '가격', value: p.price, inline: true },
      { name: '플랫폼', value: p.platform, inline: true },
      { name: '등록', value: p.update_time || '미상', inline: true },
    ],
  };
}

async function postWebhook(payload: { content?: string; embeds?: DiscordEmbed[] }): Promise<boolean> {
  const url = process.env.DISCORD_WEBHOOK_URL;
  if (!url) return false;
  try {
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(payload),
    });
    return res.ok;
  } catch {
    return false;
  }
}

// 실패해도 throw하지 않는다 — 크론은 다음 키워드를 계속 처리해야 함
export async function sendDiscordAlert(keyword: string, products: AlarmProduct[]): Promise<boolean> {
  if (products.length === 0) return true;
  const capped = products.slice(0, ALARM.MAX_NOTIFY_PER_KEYWORD);
  const overflow = products.length - capped.length;

  let allOk = true;
  for (let i = 0; i < capped.length; i += ALARM.DISCORD_EMBEDS_PER_MESSAGE) {
    const chunk = capped.slice(i, i + ALARM.DISCORD_EMBEDS_PER_MESSAGE);
    const payload: { content?: string; embeds: DiscordEmbed[] } = { embeds: chunk.map(toEmbed) };
    if (i === 0) {
      payload.content =
        `🔔 **"${keyword}"** 새 상품 ${products.length}건` +
        (overflow > 0 ? ` (${capped.length}건 표시, 외 ${overflow}건)` : '');
    }
    if (!(await postWebhook(payload))) allOk = false;
    // 웹훅 rate limit(5req/2s) 여유 확보
    if (i + ALARM.DISCORD_EMBEDS_PER_MESSAGE < capped.length) {
      await new Promise((r) => setTimeout(r, 400));
    }
  }
  return allOk;
}

export async function sendTestMessage(): Promise<boolean> {
  return postWebhook({ content: '✅ 중고모아 알림 웹훅 연결 테스트' });
}
