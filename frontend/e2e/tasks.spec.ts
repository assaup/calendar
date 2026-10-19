import { expect, test } from '@playwright/test';
import { centerOf, dragTo, listTasks, seedTask, signUp, today } from './helpers';

test.beforeEach(async ({ page }) => {
  await signUp(page);
});

test.describe('Календарь', () => {
  test('быстрое добавление: клик по дню, Enter -> ровно одна задача, сохраняется после reload', async ({
    page,
  }) => {
    const day = String(new Date().getDate());
    await page
      .getByRole('button', { name: 'Добавить задачу' })
      .filter({ hasText: new RegExp(`^${day}$`) })
      .filter({ hasNot: page.locator('[data-outside]') })
      .first()
      .click();
    await page.getByPlaceholder('Задача…').fill('Быстрая задача');
    await page.getByPlaceholder('Задача…').press('Enter');
    await expect(page.getByTitle('Быстрая задача')).toBeVisible();

    // Enter + blur не должны создавать дубликат
    await page.waitForTimeout(500);
    const tasks = (await listTasks(page)).filter((t) => t.title === 'Быстрая задача');
    expect(tasks).toHaveLength(1);
    expect(tasks[0].due_date).toBe(today());

    await page.reload();
    await expect(page.getByTitle('Быстрая задача')).toBeVisible();
  });

  test('быстрое добавление: потеря фокуса тоже сохраняет (без дубля)', async ({ page }) => {
    await page.getByRole('button', { name: 'Добавить задачу' }).nth(10).click();
    await page.getByPlaceholder('Задача…').fill('По блюру');
    await page.getByRole('heading').first().click();
    await expect(page.getByTitle('По блюру')).toBeVisible();
    await page.waitForTimeout(500);
    expect((await listTasks(page)).filter((t) => t.title === 'По блюру')).toHaveLength(1);
  });

  test('создание через окно задачи: приоритет, категория, подзадачи', async ({ page }) => {
    await page.getByRole('button', { name: 'Новая задача' }).click();
    const dialog = page.getByRole('dialog');
    await dialog.getByLabel('Название').fill('Полная задача');
    await dialog.getByLabel('Описание').fill('детали');
    await dialog.getByText('Высокий', { exact: true }).click();
    await dialog.getByPlaceholder('Без категории').click();
    await page.getByRole('option', { name: 'Дом' }).click();
    await dialog.getByPlaceholder('Добавить подзадачу и Enter').fill('шаг 1');
    await dialog.getByPlaceholder('Добавить подзадачу и Enter').press('Enter');
    await dialog.getByRole('button', { name: 'Создать' }).click();
    await expect(dialog).toBeHidden();

    await expect
      .poll(async () => (await listTasks(page)).find((t) => t.title === 'Полная задача'))
      .toMatchObject({
        priority: 'high',
        description: 'детали',
        due_date: today(),
        subtasks: [expect.objectContaining({ title: 'шаг 1' })],
      });
  });

  test('редактирование: автосохранение без кнопки, переживает reload', async ({ page }) => {
    await seedTask(page, { title: 'Редактируемая', due_date: today(), start_date: today() });
    await page.reload();
    await page.getByTitle('Редактируемая').click();
    const dialog = page.getByRole('dialog');
    await dialog.getByLabel('Название').fill('Отредактированная');
    await page.waitForTimeout(900); // дебаунс 500 мс
    await page.reload();
    await expect(page.getByTitle('Отредактированная')).toBeVisible();
  });

  test('галочка на полоске отмечает задачу выполненной', async ({ page }) => {
    const t = await seedTask(page, { title: 'Отметить', due_date: today() });
    await page.reload();
    const bar = page.getByTitle('Отметить').locator('..');
    await bar.getByRole('button', { name: 'Отметить выполненной' }).click();
    await expect(bar).toHaveAttribute('data-done', 'true');
    await expect.poll(async () => (await listTasks(page)).find((x) => x.id === t.id)?.status).toBe('done');
  });

  test('перетаскивание задачи на другой день сохраняет длительность', async ({ page }) => {
    // задача на 2 дня в середине месяца
    const d = new Date();
    const p = (n: number) => String(n).padStart(2, '0');
    const ym = `${d.getFullYear()}-${p(d.getMonth() + 1)}`;
    const t = await seedTask(page, {
      title: 'Тащи меня',
      start_date: `${ym}-10`,
      due_date: `${ym}-11`,
    });
    await page.reload();
    const target = page
      .getByRole('button', { name: 'Добавить задачу' })
      .filter({ hasText: /^20$/ })
      .filter({ hasNot: page.locator('[data-outside]') })
      .first();
    await dragTo(page, await centerOf(page, page.getByTitle('Тащи меня').first()), await centerOf(page, target));
    await expect
      .poll(async () => {
        const x = (await listTasks(page)).find((y) => y.id === t.id);
        return [x?.start_date, x?.due_date];
      })
      .toEqual([`${ym}-20`, `${ym}-21`]);
  });

  test('Delete над полоской удаляет, «Отменить» возвращает', async ({ page }) => {
    await seedTask(page, { title: 'Удаляемая', due_date: today() });
    await page.reload();
    await page.getByTitle('Удаляемая').hover();
    await page.keyboard.press('Delete');
    await expect(page.getByTitle('Удаляемая')).toBeHidden();
    await page.getByRole('button', { name: 'Отменить' }).click();
    await expect(page.getByTitle('Удаляемая')).toBeVisible();
    await expect.poll(async () => (await listTasks(page)).filter((t) => t.title === 'Удаляемая').length).toBe(1);
  });

  test('Ctrl+C / Ctrl+V копирует задачу на другой день', async ({ page }) => {
    await seedTask(page, { title: 'Копия', due_date: today(), start_date: today() });
    await page.reload();
    await page.getByTitle('Копия').hover();
    await page.keyboard.press('Control+c');
    await page.getByRole('button', { name: 'Добавить задачу' }).nth(3).hover();
    await page.keyboard.press('Control+v');
    await expect(page.getByTitle('Копия')).toHaveCount(2);
    await expect.poll(async () => (await listTasks(page)).filter((t) => t.title === 'Копия').length).toBe(2);
  });
});

test.describe('Доска', () => {
  test('быстрое добавление в колонку и перенос между колонками', async ({ page }) => {
    await page.getByRole('link', { name: 'Доска' }).click();
    await page.getByRole('button', { name: 'Добавить задачу' }).first().click();
    await page.getByPlaceholder('Название задачи…').fill('Канбан');
    await page.getByPlaceholder('Название задачи…').press('Enter');
    const card = page.getByText('Канбан', { exact: true });
    await expect(card).toBeVisible();
    await page.waitForTimeout(400);
    expect((await listTasks(page)).filter((t) => t.title === 'Канбан')).toHaveLength(1);

    const doneColumn = page.getByText('Готово', { exact: true }).first();
    await dragTo(page, await centerOf(page, card), await centerOf(page, doneColumn));
    await expect
      .poll(async () => (await listTasks(page)).find((t) => t.title === 'Канбан')?.status)
      .toBe('done');
  });

  test('FE-09: задача из бэклога, отмеченная галочкой, остаётся на доске', async ({ page }) => {
    await seedTask(page, { title: 'Из бэклога' });
    await page.goto('/board');
    const card = page.getByText('Из бэклога', { exact: true });
    await expect(card).toBeVisible();
    await card.locator('xpath=ancestor::*[@role="button"][1]').getByRole('checkbox', { name: 'Готово' }).click();
    await expect(page.getByText('Из бэклога', { exact: true })).toBeVisible();
  });
});

test.describe('Список задач и панель', () => {
  test('фильтры списка и статистика панели согласованы', async ({ page }) => {
    await seedTask(page, { title: 'Просрочена', due_date: '2020-01-01', priority: 'high' });
    await seedTask(page, { title: 'Готова', status: 'done' });
    await seedTask(page, { title: 'Обычная' });
    await page.goto('/todo');
    await expect(page.getByText('Показано: 3 из 3')).toBeVisible();
    await page.getByText(/Просрочено · 1/).click();
    await expect(page.getByText('Показано: 1 из 3')).toBeVisible();
    await page.getByPlaceholder('Поиск по названию').fill('нет такой');
    await expect(page.getByText('Ничего не найдено')).toBeVisible();

    await page.getByRole('link', { name: 'Панель' }).click();
    const tile = (label: string) => page.getByText(label, { exact: true }).locator('..');
    await expect(tile('Всего задач')).toContainText('3');
    await expect(tile('Выполнено')).toContainText('33% готово');
    await expect(tile('Просрочено')).toContainText('1');
  });
});
