import { expect, test } from '@playwright/test';
import { seedTask, signUp, today } from './helpers';

const PAGES = [
  { path: '/calendar', marker: 'Новая задача' },
  { path: '/board', marker: 'Без срока' },
  { path: '/todo', marker: 'Добавить' },
  { path: '/notes', marker: 'Заметки' },
  { path: '/dashboard', marker: 'Панель' },
];

test('все страницы открываются без ошибок в консоли', async ({ page }) => {
  await signUp(page);
  await seedTask(page, { title: 'Для смоука', due_date: today(), priority: 'medium' });
  // 401 от /api/auth/me/ до входа — норма, ошибки собираем уже в сессии
  const errors: string[] = [];
  page.on('pageerror', (e) => errors.push(`pageerror: ${e.message}`));
  page.on('console', (m) => {
    if (m.type() === 'error') errors.push(`console: ${m.text()}`);
  });
  for (const { path, marker } of PAGES) {
    await page.goto(path);
    await expect(page.getByText(marker, { exact: true }).first()).toBeVisible();
  }
  // все доски
  await page.getByRole('button', { name: 'Доска' }).click();
  await page.getByRole('menuitem', { name: /Все доски/ }).click();
  for (const { path, marker } of PAGES) {
    await page.goto(path);
    await expect(page.getByText(marker, { exact: true }).first()).toBeVisible();
  }
  expect(errors).toEqual([]);
});

test('корень редиректит на календарь, неизвестный путь — 404', async ({ page }) => {
  await signUp(page);
  await page.goto('/');
  await expect(page).toHaveURL(/\/calendar$/);
  await page.goto('/no-such-page');
  await expect(page.getByText('Такой страницы нет.')).toBeVisible();
  await page.getByRole('button', { name: 'На календарь' }).click();
  await expect(page).toHaveURL(/\/calendar$/);
});

test('тема переключается и запоминается', async ({ page }) => {
  await signUp(page);
  await page.getByRole('button', { name: 'Выбрать тему' }).click();
  await page.getByRole('menuitem', { name: 'Тёмная' }).click();
  await expect(page.locator('html')).toHaveAttribute('data-app-theme', 'dark');
  await page.reload();
  await expect(page.locator('html')).toHaveAttribute('data-app-theme', 'dark');
});

test.describe('мобильный экран', () => {
  test.use({ viewport: { width: 375, height: 812 }, hasTouch: true });

  test('бургер открывает меню, навигация работает, нет горизонтального скролла', async ({ page }) => {
    await signUp(page);
    await page.getByRole('button', { name: 'Меню' }).click();
    await page.getByRole('link', { name: 'Задачи' }).click();
    await expect(page).toHaveURL(/\/todo$/);
    for (const path of ['/calendar', '/board', '/todo', '/notes', '/dashboard']) {
      await page.goto(path);
      await page.waitForLoadState('networkidle');
      const overflow = await page.evaluate(
        () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
      );
      expect(overflow, `горизонтальный скролл на ${path}`).toBeLessThanOrEqual(1);
    }
  });
});
