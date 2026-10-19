import { expect, test } from '@playwright/test';
import { PASSWORD, apiCall, signUp, uniqueEmail } from './helpers';

test.describe('Авторизация', () => {
  test('регистрация через форму -> календарь с двумя досками по умолчанию', async ({ page }) => {
    const email = uniqueEmail('reg');
    await page.goto('/');
    await expect(page.getByRole('heading', { name: 'С возвращением' })).toBeVisible();
    await page.getByRole('button', { name: 'Создать' }).click();
    await page.getByLabel('Имя').fill('Маша');
    await page.getByLabel('Email').fill(email);
    await page.getByLabel('Пароль').fill(PASSWORD);
    await page.getByRole('button', { name: 'Зарегистрироваться' }).click();

    await expect(page).toHaveURL(/\/calendar$/);
    await expect(page.getByRole('button', { name: 'Доска' })).toContainText('Личное');
    await page.getByRole('button', { name: 'Доска' }).click();
    await expect(page.getByRole('menuitem', { name: /Работа/ })).toBeVisible();
    await expect(page.getByText('Маша')).toBeVisible(); // в сайдбаре
  });

  test('сессия переживает перезагрузку; выход возвращает на экран входа', async ({ page }) => {
    const email = await signUp(page);
    await page.reload();
    await expect(page.getByRole('button', { name: 'Доска' })).toBeVisible();
    await page.getByText(email).click();
    await page.getByRole('menuitem', { name: 'Выйти' }).click();
    await expect(page.getByRole('heading', { name: 'С возвращением' })).toBeVisible();
    await page.reload();
    await expect(page.getByRole('heading', { name: 'С возвращением' })).toBeVisible();
  });

  test('вход: неверный пароль -> ошибка, верный -> приложение', async ({ page, browser }) => {
    const email = await signUp(page);
    const ctx = await browser.newContext();
    const p2 = await ctx.newPage();
    await p2.goto('/');
    await p2.getByLabel('Email').fill(email.toUpperCase());
    await p2.getByLabel('Пароль').fill('wrong-password');
    await p2.getByRole('button', { name: 'Войти' }).click();
    await expect(p2.getByText('Неверный email или пароль.')).toBeVisible();
    await p2.getByLabel('Пароль').fill(PASSWORD);
    await p2.getByRole('button', { name: 'Войти' }).click();
    await expect(p2.getByRole('button', { name: 'Доска' })).toBeVisible();
    await ctx.close();
  });

  test('регистрация с занятым email и слабым паролем показывает ошибки', async ({ page }) => {
    const email = await signUp(page);
    await page.context().clearCookies();
    await page.goto('/');
    await page.getByRole('button', { name: 'Создать' }).click();
    await page.getByLabel('Email').fill(email);
    await page.getByLabel('Пароль').fill(PASSWORD);
    await page.getByRole('button', { name: 'Зарегистрироваться' }).click();
    await expect(page.getByText('Пользователь с таким email уже есть.')).toBeVisible();

    await page.getByLabel('Email').fill(uniqueEmail('weak'));
    await page.getByLabel('Пароль').fill('123');
    await page.getByRole('button', { name: 'Зарегистрироваться' }).click();
    await expect(page.locator('form')).toContainText(/пароль/i);
  });

  test('FE-06: истёкшая сессия -> приложение возвращает на экран входа', async ({ page }) => {
    await signUp(page);
    // имитируем истечение сессии на сервере
    await page.context().clearCookies({ name: 'sessionid' });
    await page.getByRole('button', { name: 'Новая задача' }).click();
    await page.getByLabel('Название').fill('после истечения сессии');
    await page.getByRole('button', { name: 'Создать' }).click();
    // ожидание: пользователь увидит форму входа (сейчас — ничего не происходит,
    // окно не закрывается, ошибка только в консоли)
    await expect(page.getByRole('heading', { name: 'С возвращением' })).toBeVisible();
  });

  test('BUG-11/FE-05: «Выйти» при истёкшей сессии всё равно выходит', async ({ page }) => {
    const email = await signUp(page);
    await page.context().clearCookies({ name: 'sessionid' });
    await page.getByText(email).click();
    await page.getByRole('menuitem', { name: 'Выйти' }).click();
    await expect(page.getByRole('heading', { name: 'С возвращением' })).toBeVisible();
  });
});

test.describe('API безопасность (через реальный сервер)', () => {
  test('BUG-01: нельзя привязать заметку к папке чужого пользователя', async ({ page, browser }) => {
    // жертва создаёт папку
    const victimCtx = await browser.newContext();
    const victim = await victimCtx.newPage();
    await signUp(victim);
    const [vws] = (await apiCall<{ id: number }[]>(victim, 'get', '/api/workspaces/')).body;
    const folder = await apiCall<{ id: number }>(victim, 'post', '/api/folders/', {
      workspace: vws.id,
      name: 'Личное жертвы',
    });

    // атакующий
    await signUp(page);
    const [aws] = (await apiCall<{ id: number }[]>(page, 'get', '/api/workspaces/')).body;
    const r = await apiCall(page, 'post', '/api/notes/', {
      workspace: aws.id,
      folder: folder.body.id,
      title: 'подброшено',
    });
    expect(r.status).toBe(400);
    await victimCtx.close();
  });

  test('чужие задачи недоступны по id', async ({ page, browser }) => {
    const otherCtx = await browser.newContext();
    const other = await otherCtx.newPage();
    await signUp(other);
    const [ows] = (await apiCall<{ id: number }[]>(other, 'get', '/api/workspaces/')).body;
    const t = await apiCall<{ id: number }>(other, 'post', '/api/tasks/', {
      workspace: ows.id,
      title: 'секрет',
    });

    await signUp(page);
    expect((await apiCall(page, 'get', `/api/tasks/${t.body.id}/`)).status).toBe(404);
    expect((await apiCall(page, 'delete', `/api/tasks/${t.body.id}/`)).status).toBe(404);
    await otherCtx.close();
  });
});
