// Логотип-марка: градиентный скруглённый квадрат с галочкой.
// Используется в сайдбаре и на экране входа.
export function LogoMark({ size = 24 }: { size?: number }) {
  const id = 'logo-grad';
  return (
    <svg width={size} height={size} viewBox="0 0 32 32" aria-hidden>
      <defs>
        <linearGradient id={id} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#5c7cfa" />
          <stop offset="1" stopColor="#9c6fd6" />
        </linearGradient>
      </defs>
      <rect width="32" height="32" rx="8" fill={`url(#${id})`} />
      <path
        d="M9 16.5l4.2 4.2L23 10.5"
        fill="none"
        stroke="#fff"
        strokeWidth="3"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}
