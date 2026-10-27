import { test, type Page } from '@playwright/test';
import { apiCall, listWorkspaces, signUp } from './helpers';

// Скриншоты интерфейса для README на демо-данных (отдельная e2e-база,
// реальные данные не участвуют). Запуск: npm run screenshots
// Картинки кладутся в docs/screenshots/ в корне репозитория.

const OUT = '../docs/screenshots';

const pad = (n: number) => String(n).padStart(2, '0');
/** Дата со сдвигом от сегодня, 'YYYY-MM-DD' */
function day(offset: number) {
  const d = new Date();
  d.setDate(d.getDate() + offset);
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

type Status = 'todo' | 'in_progress' | 'done';
type Prio = 'low' | 'medium' | 'high' | null;
interface DemoTask {
  title: string;
  from?: number;
  to?: number;
  cat?: string;
  status?: Status;
  priority?: Prio;
  subtasks?: { title: string; done: boolean }[];
  description?: string;
}

const WORK: DemoTask[] = [
  {
    title: 'Квартальный отчёт для руководства: выручка, расходы и прогноз',
    from: -2,
    to: 1,
    cat: 'Отчёты',
    status: 'in_progress',
    priority: 'high',
    description: 'Свести данные из CRM и бухгалтерии, добавить графики.',
    subtasks: [
      { title: 'Выгрузить данные из CRM', done: true },
      { title: 'Свести расходы по отделам', done: true },
      { title: 'Построить графики', done: false },
      { title: 'Согласовать с финансовым директором', done: false },
    ],
  },
  { title: 'Созвон с командой дизайна', from: 0, cat: 'Встречи' },
  {
    title: 'Ревью макетов онбординга',
    from: 2,
    cat: 'Продукт',
    priority: 'medium',
  },
  {
    title: 'Презентация для клиента: кейсы и цены',
    from: 3,
    to: 5,
    cat: 'Продукт',
    priority: 'high',
  },
  {
    title: 'Обновить документацию API',
    from: -6,
    cat: 'Продукт',
    status: 'done',
  },
  { title: 'Планирование спринта', from: -8, cat: 'Встречи', status: 'done' },
  {
    title: 'Собеседование frontend-разработчика',
    from: -13,
    cat: 'Встречи',
    status: 'done',
  },
  { title: 'Ретро по релизу', from: -15, cat: 'Встречи', status: 'done' },
  {
    title: 'Миграция базы на новый сервер',
    from: -21,
    to: -18,
    cat: 'Продукт',
    status: 'done',
  },
  { title: 'Изучить новые возможности TypeScript', priority: 'low' },
];

const PERSONAL: DemoTask[] = [
  { title: 'Записаться к стоматологу', from: 1, cat: 'Быт' },
  {
    title: 'Купить подарок маме на день рождения',
    from: 4,
    cat: 'Дом',
    priority: 'high',
  },
  { title: 'Оплатить коммуналку', from: -3, cat: 'Быт', status: 'done' },
  { title: 'Тренировка в зале', from: -1, cat: 'Дом' },
  { title: 'Тренировка в зале', from: 2, cat: 'Дом' },
  { title: 'Отвезти машину на ТО', from: -10, cat: 'Быт', status: 'done' },
  {
    title: 'Прочитать «Атомные привычки»',
    from: -12,
    to: -5,
    cat: 'Дом',
    status: 'in_progress',
  },
  { title: 'Разобрать гардероб' },
];

const REPAIR: DemoTask[] = [
  {
    title: 'Заказать плитку для ванной и согласовать доставку',
    from: -4,
    to: -2,
    cat: 'Закупки',
    status: 'in_progress',
    priority: 'high',
  },
  { title: 'Встреча с прорабом на объекте', from: 0, cat: 'Бригада' },
  {
    title: 'Выбрать смеситель и раковину',
    from: 3,
    cat: 'Закупки',
    priority: 'medium',
  },
  {
    title: 'Демонтаж старой плитки',
    from: -17,
    to: -15,
    cat: 'Бригада',
    status: 'done',
  },
  { title: 'Найти электрика на проводку', priority: 'medium' },
];

const NOTES = [
  {
    title: 'Список покупок',
    pinned: true,
    folder: null,
    body:
      '<ul data-type="taskList">' +
      ['Молоко', 'Сыр', 'Овощи на неделю', 'Кофе в зёрнах']
        .map(
          (t, i) =>
            `<li data-type="taskItem" data-checked="${i < 2}"><p>${t}</p></li>`,
        )
        .join('') +
      '</ul>',
  },
  {
    title: 'Идеи для отпуска',
    pinned: false,
    folder: 'Путешествия',
    body:
      '<h2>Куда поехать весной</h2><p>Хочется <strong>море и горы</strong> в одной поездке.</p>' +
      '<ul><li><p>Грузия — Батуми и Местиа</p></li><li><p>Турция — Ликийская тропа</p></li>' +
      '<li><p>Алтай — Телецкое озеро</p></li></ul><p>Бюджет: до 150 000 ₽ на двоих.</p>',
  },
  {
    title: 'Книги на зиму',
    pinned: false,
    folder: 'Идеи',
    body: '<ol><li><p>«Атомные привычки»</p></li><li><p>«Думай медленно, решай быстро»</p></li><li><p>«Мастер и Маргарита»</p></li></ol>',
  },
  {
    title: 'Рецепт сырников',
    pinned: false,
    folder: 'Идеи',
    body: '<p>Творог 500 г, 1 яйцо, 2 ст. л. муки, сахар по вкусу. Жарить на среднем огне.</p>',
  },
];

async function seedTasks(page: Page, workspace: number, tasks: DemoTask[]) {
  const cats = (
    await apiCall<{ id: number; name: string }[]>(
      page,
      'get',
      `/api/categories/?workspace=${workspace}`,
    )
  ).body;
  for (const t of tasks) {
    const start = t.from === undefined ? null : day(t.from);
    const due = t.from === undefined ? null : day(t.to ?? t.from);
    await apiCall(page, 'post', '/api/tasks/', {
      workspace,
      title: t.title,
      description: t.description ?? '',
      category: cats.find((c) => c.name === t.cat)?.id ?? null,
      status: t.status ?? 'todo',
      priority: t.priority ?? null,
      start_date: start,
      due_date: due,
      subtasks: t.subtasks ?? [],
    });
  }
}

async function seedDemo(page: Page) {
  const [personal, work] = await listWorkspaces(page);
  const repair = (
    await apiCall<{ id: number }>(page, 'post', '/api/workspaces/', {
      name: 'Ремонт',
      color: '#e8590c',
    })
  ).body;
  const extraCats: [number, string, string][] = [
    [repair.id, 'Закупки', '#f59f00'],
    [repair.id, 'Бригада', '#1098ad'],
    [work.id, 'Продукт', '#4263eb'],
    [work.id, 'Отчёты', '#ae3ec9'],
  ];
  for (const [workspace, name, color] of extraCats) {
    await apiCall(page, 'post', '/api/categories/', { workspace, name, color });
  }
  await seedTasks(page, work.id, WORK);
  await seedTasks(page, personal.id, PERSONAL);
  await seedTasks(page, repair.id, REPAIR);

  const folders: Record<string, number> = {};
  for (const name of ['Идеи', 'Путешествия']) {
    folders[name] = (
      await apiCall<{ id: number }>(page, 'post', '/api/folders/', {
        workspace: personal.id,
        name,
      })
    ).body.id;
  }
  for (const n of NOTES) {
    await apiCall(page, 'post', '/api/notes/', {
      workspace: personal.id,
      folder: n.folder ? folders[n.folder] : null,
      title: n.title,
      body: n.body,
      is_pinned: n.pinned,
    });
  }
  return { personal: String(personal.id) };
}

/** Тема, выбор доски и вид календаря — как их хранит приложение */
interface Prefs {
  theme?: 'pink' | 'light' | 'dark';
  fullText?: boolean;
  scale?: 's' | 'm' | 'l';
}

async function setPrefs(page: Page, homeId: string, prefs: Prefs = {}) {
  const { theme = 'pink', fullText = false, scale = 'm' } = prefs;
  await page.evaluate(
    ({ theme, homeId, fullText, scale }) => {
      localStorage.setItem(
        'app-theme',
        JSON.stringify({ state: { theme }, version: 0 }),
      );
      localStorage.setItem(
        'workspace-store',
        JSON.stringify({ state: { activeId: 'all', homeId }, version: 0 }),
      );
      localStorage.setItem(
        'ui-store',
        JSON.stringify({
          state: {
            sidebarCollapsed: false,
            calendarFullText: fullText,
            calendarScale: scale,
          },
          version: 0,
        }),
      );
    },
    { theme, homeId, fullText, scale },
  );
}

async function shot(page: Page, name: string) {
  // дать дорисоваться анимациям Mantine
  await page.waitForTimeout(500);
  await page.mouse.move(0, 0);
  await page.screenshot({ path: `${OUT}/${name}.png` });
}

test('скриншоты для README', async ({ page }) => {
  test.setTimeout(120_000);
  await signUp(page, 'anna@example.com', 'Анна');
  const { personal } = await seedDemo(page);

  const calendarReady = () =>
    page.getByText('Созвон с командой дизайна').waitFor();
  const boardReady = () =>
    page.getByText('Найти электрика на проводку').waitFor();

  await setPrefs(page, personal);
  await page.goto('/calendar');
  await calendarReady();
  await shot(page, 'calendar');

  await page
    .getByText('Квартальный отчёт для руководства', { exact: false })
    .first()
    .click();
  await page.getByRole('dialog').waitFor();
  await shot(page, 'task');
  await page.keyboard.press('Escape');

  // режим «Полностью» — неделя растёт по тексту, поэтому кадр выше
  await setPrefs(page, personal, { fullText: true, scale: 's' });
  await page.setViewportSize({ width: 1440, height: 1100 });
  await page.goto('/calendar');
  await calendarReady();
  await shot(page, 'calendar-full');
  await page.setViewportSize({ width: 1440, height: 900 });

  await setPrefs(page, personal);
  await page.goto('/board');
  await boardReady();
  await shot(page, 'board');

  await page.goto('/notes');
  await page.getByRole('button', { name: /Идеи для отпуска/ }).click();
  await page.locator('.ProseMirror h2').waitFor();
  await shot(page, 'notes');

  await page.goto('/dashboard');
  await page.getByText('Всего задач').waitFor();
  await shot(page, 'dashboard');

  await setPrefs(page, personal, { theme: 'light' });
  await page.goto('/todo');
  await page.getByText(/Показано:/).waitFor();
  await shot(page, 'list-light');

  await setPrefs(page, personal, { theme: 'dark' });
  await page.goto('/calendar');
  await calendarReady();
  await shot(page, 'calendar-dark');

  // --- телефон: та же сессия, мобильный экран (как iPhone) ---
  const mobile = await page
    .context()
    .browser()!
    .newContext({
      baseURL: test.info().project.use.baseURL,
      storageState: await page.context().storageState(),
      viewport: { width: 390, height: 844 },
      deviceScaleFactor: 2,
      isMobile: true,
      hasTouch: true,
      locale: 'ru-RU',
      timezoneId: 'Europe/Moscow',
    });
  const phone = await mobile.newPage();
  await phone.goto('/board');
  await phone.getByText('Созвон с командой дизайна').waitFor();
  await shot(phone, 'mobile-board');

  // боковое меню, открытое бургером
  await phone.getByRole('button', { name: 'Меню', exact: true }).click();
  await shot(phone, 'mobile-menu');
  await mobile.close();
});
