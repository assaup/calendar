import { createTheme, type MantineColorsTuple } from '@mantine/core';

// Основной акцентный цвет приложения. Поменяешь тут — поменяется везде.
const brand: MantineColorsTuple = [
  '#eef3ff',
  '#dce4f5',
  '#b9c7e2',
  '#94a8d0',
  '#748dc0',
  '#5f7cb7',
  '#5474b4',
  '#44639f',
  '#3a5890',
  '#2c4b80',
];

export const theme = createTheme({
  primaryColor: 'brand',
  colors: { brand },
  fontFamily:
    '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif',
  defaultRadius: 'md',
  cursorType: 'pointer',
});
