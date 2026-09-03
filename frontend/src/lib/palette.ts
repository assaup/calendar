// Палитра цветов для категорий и пространств.
export const PALETTE: { value: string; name: string }[] = [
  { value: '#bb1816', name: 'Красный' },
  { value: '#eb8f7f', name: 'Коралловый' },
  { value: '#f57aba', name: 'Розовый' },
  { value: '#9068fd', name: 'Фиолетовый' },
  { value: '#478bff', name: 'Синий' },
  { value: '#5ec974', name: 'Зелёный' },
  { value: '#12992d', name: 'Травяной' },
  { value: '#ff8604', name: 'Оранжевый' },
];

export const PALETTE_VALUES = PALETTE.map((c) => c.value);

// --- Доступность: подбираем цвет текста (белый или тёмный) под фон,
// чтобы контраст был достаточным при любом цвете категории (WCAG). ---
const DARK_TEXT = '#1f1420';

function channel(v: number): number {
  const s = v / 255;
  return s <= 0.03928 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4;
}

function luminance(hex: string): number {
  const c = hex.replace('#', '');
  const r = parseInt(c.slice(0, 2), 16);
  const g = parseInt(c.slice(2, 4), 16);
  const b = parseInt(c.slice(4, 6), 16);
  return 0.2126 * channel(r) + 0.7152 * channel(g) + 0.0722 * channel(b);
}

function ratio(a: number, b: number): number {
  const hi = Math.max(a, b);
  const lo = Math.min(a, b);
  return (hi + 0.05) / (lo + 0.05);
}

// Возвращает белый или тёмный текст — что читается лучше на данном фоне.
export function contrastText(hex: string): string {
  const bg = luminance(hex);
  const white = ratio(bg, 1);
  const dark = ratio(bg, luminance(DARK_TEXT));
  return white >= dark ? '#ffffff' : DARK_TEXT;
}
