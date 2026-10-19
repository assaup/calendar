import { expect, test } from '@playwright/test';
import { apiCall, centerOf, dragTo, listWorkspaces, seedTask, signUp, today } from './helpers';

test.beforeEach(async ({ page }) => {
  await signUp(page);
});

test.describe('Доски (workspaces)', () => {
  test('новая доска: свои категории, задачи не смешиваются, «Все доски» видят всё', async ({
    page,
  }) => {
    await seedTask(page, { title: 'Личная задача', due_date: today() });
    await page.reload();

    await page.getByRole('button', { name: 'Доска' }).click();
    await page.getByRole('menuitem', { name: 'Новая доска' }).click();
    await page.getByLabel('Название').fill('Стройка');
    await page.getByRole('button', { name: 'Создать' }).click();
    await expect(page.getByRole('button', { name: 'Доска' })).toContainText('Стройка');
    await expect(page.getByTitle('Личная задача')).toBeHidden();

    const ws = await listWorkspaces(page);
    expect(ws.map((w) => w.name)).toContain('Стройка');
    const stroika = ws.find((w) => w.name === 'Стройка')!;
    const cats = await apiCall<unknown[]>(page, 'get', `/api/categories/?workspace=${stroika.id}`);
    expect(cats.body).toHaveLength(4);

    await page.getByRole('button', { name: 'Доска' }).click();
    await page.getByRole('menuitem', { name: /Все доски/ }).click();
    await expect(page.getByTitle('Личная задача')).toBeVisible();
  });

  test('выбор доски запоминается после перезагрузки', async ({ page }) => {
    await page.getByRole('button', { name: 'Доска' }).click();
    await page.getByRole('menuitem', { name: /^Работа/ }).click();
    await page.reload();
    await expect(page.getByRole('button', { name: 'Доска' })).toContainText('Работа');
  });

  test('переименование доски через карандаш — можно сразу печатать и нажать Enter', async ({
    page,
  }) => {
    await page.getByRole('button', { name: 'Доска' }).click();
    await page.getByLabel('Переименовать доску Работа').click();
    const input = page.getByRole('dialog').getByLabel('Название');
    await expect(input).toBeFocused();
    await page.keyboard.press('Control+a');
    await page.keyboard.type('Офис');
    await page.keyboard.press('Enter');
    await expect(page.getByRole('dialog')).toBeHidden();
    await expect.poll(async () => (await listWorkspaces(page)).map((w) => w.name)).toContain('Офис');
  });

  test('FE-12: удаление доски спрашивает подтверждение', async ({ page }) => {
    await page.getByRole('button', { name: 'Доска' }).click();
    await page.getByLabel('Удалить доску Работа').click();
    await expect(page.getByRole('dialog')).toBeVisible();
    expect((await listWorkspaces(page)).map((w) => w.name)).toContain('Работа');
  });
});

test.describe('Заметки', () => {
  test('создание заметки: заголовок и rich-text сохраняются (дебаунс) и переживают reload', async ({
    page,
  }) => {
    await page.getByRole('link', { name: 'Заметки' }).click();
    await page.getByRole('button', { name: 'Новая заметка' }).click();
    await page.getByPlaceholder('Заголовок').fill('План ремонта');
    const editor = page.locator('.ProseMirror');
    await editor.click();
    await page.keyboard.type('Купить ');
    await page.keyboard.press('Control+b');
    await page.keyboard.type('плитку');
    await page.waitForTimeout(1200);
    await page.reload();
    await page.getByText('План ремонта').click();
    await expect(page.locator('.ProseMirror strong')).toHaveText('плитку');
  });

  test('FE-04: правка, сделанная прямо перед закрытием вкладки, не теряется', async ({ page }) => {
    await page.getByRole('link', { name: 'Заметки' }).click();
    await page.getByRole('button', { name: 'Новая заметка' }).click();
    await page.getByPlaceholder('Заголовок').fill('Срочно');
    // уходим со страницы раньше 600 мс дебаунса
    await page.goto('/calendar');
    const notes = await apiCall<{ title: string }[]>(page, 'get', '/api/notes/');
    expect(notes.body.map((n) => n.title)).toContain('Срочно');
  });

  test('папки: создать, перетащить заметку, удалить папку с подтверждением', async ({ page }) => {
    const [ws] = await listWorkspaces(page);
    await apiCall(page, 'post', '/api/notes/', { workspace: ws.id, title: 'Перетаскиваемая' });
    await page.goto('/notes');

    await page.getByText('Новая папка').click();
    await page.getByPlaceholder('Название папки').fill('Идеи');
    await page.getByPlaceholder('Название папки').press('Enter');
    await expect(page.getByRole('button', { name: /^Идеи \d+$/ })).toBeVisible();

    await page.getByRole('button', { name: /Все заметки/ }).click();
    await dragTo(
      page,
      await centerOf(page, page.getByRole('button', { name: /Перетаскиваемая/ })),
      await centerOf(page, page.getByRole('button', { name: /^Идеи \d+$/ })),
    );
    await expect
      .poll(async () => {
        const notes = await apiCall<{ title: string; folder: number | null }[]>(page, 'get', '/api/notes/');
        return notes.body.find((n) => n.title === 'Перетаскиваемая')?.folder;
      })
      .not.toBeNull();

    await page.getByLabel('Удалить папку Идеи').click();
    await page.getByRole('dialog').getByRole('button', { name: 'Удалить' }).click();
    await expect(page.getByRole('button', { name: /^Идеи \d+$/ })).toBeHidden();
    await expect(page.getByText('Перетаскиваемая')).toBeVisible();
  });
});
