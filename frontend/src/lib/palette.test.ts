import { describe, expect, it } from 'vitest';
import { PALETTE, PALETTE_VALUES, contrastText } from './palette';

const WHITE = '#ffffff';
const DARK = '#1f1420';

// WCAG-контраст для проверки, что выбранный цвет текста действительно лучший
function lum(hex: string) {
  const c = hex.replace('#', '');
  const ch = (i: number) => {
    const s = parseInt(c.slice(i, i + 2), 16) / 255;
    return s <= 0.03928 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4;
  };
  return 0.2126 * ch(0) + 0.7152 * ch(2) + 0.0722 * ch(4);
}
const ratio = (a: string, b: string) => {
  const [hi, lo] = [lum(a), lum(b)].sort((x, y) => y - x);
  return (hi + 0.05) / (lo + 0.05);
};

describe('palette', () => {
  it('16 уникальных цветов в формате #rrggbb с названиями', () => {
    expect(PALETTE).toHaveLength(16);
    expect(new Set(PALETTE_VALUES).size).toBe(16);
    for (const c of PALETTE) {
      expect(c.value).toMatch(/^#[0-9a-f]{6}$/);
      expect(c.name.trim()).not.toBe('');
    }
  });

  it.each([
    ['#000000', WHITE],
    ['#ffffff', DARK],
    ['#bb1816', WHITE], // тёмно-красный
    ['#f59f00', DARK], // янтарный — светлый фон
    ['#5ec974', DARK],
  ])('contrastText(%s) = %s', (bg, expected) => {
    expect(contrastText(bg)).toBe(expected);
  });

  it('для каждого цвета палитры выбирает вариант с наибольшим контрастом', () => {
    for (const { value } of PALETTE) {
      const chosen = contrastText(value);
      const other = chosen === WHITE ? DARK : WHITE;
      expect(ratio(value, chosen)).toBeGreaterThanOrEqual(ratio(value, other));
    }
  });

  it('работает без решётки и в верхнем регистре', () => {
    expect(contrastText('000000')).toBe(WHITE);
    expect(contrastText('#FFFFFF')).toBe(DARK);
  });

  it('FE-14: короткая запись #rgb обрабатывается как #rrggbb', () => {
    // '#fff' парсится как r=ff, g=f, b=NaN -> результат случаен
    expect(contrastText('#000')).toBe(contrastText('#000000'));
    expect(contrastText('#fff')).toBe(contrastText('#ffffff'));
  });
});
