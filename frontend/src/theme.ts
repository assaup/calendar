import { createTheme, type MantineColorsTuple } from '@mantine/core';

// Основной акцентный цвет приложения (индиго). Поменяешь тут — поменяется везде.
const brand: MantineColorsTuple = [
  '#edf2ff',
  '#dbe4ff',
  '#bac8ff',
  '#91a7ff',
  '#748ffc',
  '#5c7cfa',
  '#4c6ef5',
  '#4263eb',
  '#3b5bdb',
  '#364fc7',
];

export const theme = createTheme({
  primaryColor: 'brand',
  colors: { brand },
  fontFamily:
    '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif',
  defaultRadius: 'md',
  cursorType: 'pointer',
});
