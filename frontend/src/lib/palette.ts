// Палитра доступных цветов для категорий и пространств.
// Все цвета достаточно тёмные, чтобы белый текст поверх них читался
// (контраст с белым >= 4.5:1, требование WCAG AA). Свободный выбор цвета
// убран специально — так текст всегда виден.
export const PALETTE: { value: string; name: string }[] = [
  { value: '#364fc7', name: 'Индиго' },
  { value: '#1864ab', name: 'Синий' },
  { value: '#0b7285', name: 'Голубой' },
  { value: '#087f5b', name: 'Бирюзовый' },
  { value: '#2b8a3e', name: 'Зелёный' },
  { value: '#d9480f', name: 'Оранжевый' },
  { value: '#c92a2a', name: 'Красный' },
  { value: '#a61e4d', name: 'Розовый' },
  { value: '#862e9c', name: 'Фиолетовый' },
  { value: '#5f3dc4', name: 'Сиреневый' },
  { value: '#343a40', name: 'Серый' },
];

export const PALETTE_VALUES = PALETTE.map((c) => c.value);
