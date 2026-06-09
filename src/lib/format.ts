// 한국 통화 표기 (만/억 단위). 가격 인사이트·필터 등에서 공용 사용.
export function formatKRW(n: number): string {
  if (n >= 100_000_000) {
    const eok = Math.floor(n / 100_000_000);
    const man = Math.round((n % 100_000_000) / 10_000);
    return man > 0 ? `${eok}억 ${man}만원` : `${eok}억원`;
  }
  if (n >= 10_000) {
    const man = n / 10_000;
    return (Number.isInteger(man) ? man : man.toFixed(1)) + '만원';
  }
  return n.toLocaleString() + '원';
}
