import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: '알림 관리 | 중고모아',
  robots: { index: false, follow: false }, // 개인용 관리자 페이지 — 검색엔진 노출 차단
};

export default function AlarmLayout({ children }: { children: React.ReactNode }) {
  return children;
}
