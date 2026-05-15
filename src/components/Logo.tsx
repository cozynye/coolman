interface Props {
  size?: number;
  className?: string;
}

export default function Logo({ size = 28, className = '' }: Props) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 28 28"
      fill="none"
      className={className}
      aria-label="중고모아 로고"
    >
      <rect width="28" height="28" rx="7" fill="#14b8a6" />
      {/* 왼쪽 원 (번개장터) */}
      <circle cx="10.5" cy="14" r="5" stroke="white" strokeWidth="2" />
      {/* 오른쪽 원 (중고나라) */}
      <circle cx="17.5" cy="14" r="5" stroke="white" strokeWidth="2" />
      {/* 교차점 강조 */}
      <circle cx="14" cy="14" r="2" fill="white" />
    </svg>
  );
}
