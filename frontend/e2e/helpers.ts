import { expect, type APIRequestContext, type Page } from '@playwright/test';

export const PASSWORD = 'E2e-Strong-Pass-2026';

let counter = 0;
/** Уникальный email — тесты не мешают друг другу в общей e2e-базе. */
export function uniqueEmail(prefix = 'user') {
  counter += 1;
  return `${prefix}-${Date.now()}-${counter}@e2e.test`;
}

/** CSRF-токен из куки (ставится GET /api/auth/me/). */
async function csrf(request: APIRequestContext): Promise<string> {
  await request.get('/api/auth/me/');
  const state = await request.storageState();
  return state.cookies.find((c) => c.name === 'csrftoken')?.value ?? '';
}

/** Запрос к API от имени текущей сессии страницы (с CSRF). */
export async function apiCall<T = unknown>(
  page: Page,
  method: 'get' | 'post' | 'patch' | 'delete',
  url: string,
  data?: unknown,
): Promise<{ status: number; body: T }> {
  const token = await csrf(page.request);
  const resp = await page.request[method](url, {
    data,
    headers: { 'X-CSRFToken': token },
  });
  const text = await resp.text();
  return { status: resp.status(), body: (text ? JSON.parse(text) : null) as T };
}

/** Регистрирует пользователя через API (быстро) и открывает приложение. */
export async function signUp(page: Page, email = uniqueEmail(), name = 'Тестер') {
  await page.goto('/');
  const r = await apiCall(page, 'post', '/api/auth/register/', {
    email,
    password: PASSWORD,
    name,
  });
  expect(r.status, JSON.stringify(r.body)).toBe(201);
  await page.goto('/calendar');
  await expect(page.getByRole('button', { name: 'Доска' })).toBeVisible();
  return email;
}

export interface SrvTask {
  id: number;
  workspace: number;
  title: string;
  status: string;
  priority: string | null;
  category: number | null;
  start_date: string | null;
  due_date: string | null;
  description: string;
  subtasks: { id: number; title: string; done: boolean }[];
}

export const listTasks = async (page: Page) =>
  (await apiCall<SrvTask[]>(page, 'get', '/api/tasks/')).body;

export const listWorkspaces = async (page: Page) =>
  (await apiCall<{ id: number; name: string }[]>(page, 'get', '/api/workspaces/')).body;

/** Создаёт задачу через API и перезагружает страницу, чтобы она подтянулась. */
export async function seedTask(page: Page, patch: Partial<SrvTask> & { title: string }) {
  const [ws] = await listWorkspaces(page);
  const r = await apiCall<SrvTask>(page, 'post', '/api/tasks/', { workspace: ws.id, ...patch });
  expect(r.status, JSON.stringify(r.body)).toBe(201);
  return r.body;
}

export const today = () => {
  const d = new Date();
  const p = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
};

/** Перетаскивание для dnd-kit: нужен плавный ход мыши (activationConstraint 6px). */
export async function dragTo(page: Page, from: { x: number; y: number }, to: { x: number; y: number }) {
  await page.mouse.move(from.x, from.y);
  await page.mouse.down();
  await page.mouse.move(from.x + 10, from.y + 10, { steps: 5 });
  await page.mouse.move(to.x, to.y, { steps: 20 });
  await page.mouse.move(to.x + 1, to.y + 1, { steps: 2 });
  await page.mouse.up();
}

export async function centerOf(page: Page, selector: ReturnType<Page['locator']>) {
  const box = await selector.boundingBox();
  if (!box) throw new Error('элемент не виден');
  return { x: box.x + box.width / 2, y: box.y + box.height / 2 };
}
