// Палитра цветов для категорий и пространств (по кругу оттенков).
export const PALETTE: { value: string; name: string }[] = [
  { value: '#bb1816', name: 'Красный' },
  { value: '#e8590c', name: 'Терракотовый' },
  { value: '#ff8604', name: 'Оранжевый' },
  { value: '#f59f00', name: 'Янтарный' },
  { value: '#12992d', name: 'Травяной' },
  { value: '#0ca678', name: 'Изумрудный' },
  { value: '#5ec974', name: 'Зелёный' },
  { value: '#1098ad', name: 'Бирюзовый' },
  { value: '#478bff', name: 'Синий' },
  { value: '#4263eb', name: 'Индиго' },
  { value: '#9068fd', name: 'Фиолетовый' },
  { value: '#ae3ec9', name: 'Сиреневый' },
  { value: '#f57aba', name: 'Розовый' },
  { value: '#d6336c', name: 'Малиновый' },
  { value: '#eb8f7f', name: 'Коралловый' },
  { value: '#868e96', name: 'Серый' },
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
  let c = hex.replace('#', '');
  // короткая запись #rgb -> #rrggbb
  if (c.length === 3) c = [...c].map((ch) => ch + ch).join('');
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
