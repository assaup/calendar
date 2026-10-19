import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('../lib/resources', () => import('../test/resourcesMock'));

import { tasksApi, categoriesApi } from '../test/resourcesMock';
import { isOverdue, useTasksStore } from './tasks';
import { makeCategory, makeTask, seedStores, WS_A } from '../test/utils';

const state = () => useTasksStore.getState();

beforeEach(() => {
  vi.clearAllMocks();
  seedStores();
});

describe('isOverdue', () => {
  beforeEach(() => {
    vi.useFakeTimers({ toFake: ['Date'] });
    vi.setSystemTime(new Date('2026-10-19T12:00:00'));
  });
  afterEach(() => vi.useRealTimers());

  it.each([
    [{ dueDate: '2026-10-18' }, true],
    [{ dueDate: '2026-10-19' }, false], // сегодня — ещё не просрочено
    [{ dueDate: '2026-10-20' }, false],
    [{ dueDate: null }, false],
    [{ dueDate: '2026-10-01', status: 'done' as const }, false],
    [{ dueDate: '2026-10-01', status: 'in_progress' as const }, true],
  ])('%o -> %s', (patch, expected) => {
    expect(isOverdue(makeTask(patch))).toBe(expected);
  });
});

describe('useTasksStore', () => {
  it('addTask: дефолты и задача в конце списка', async () => {
    const existing = makeTask();
    seedStores({ tasks: [existing] });
    const id = await state().addTask({ workspaceId: WS_A.id });
    expect(tasksApi.create).toHaveBeenCalledWith({
      workspaceId: WS_A.id,
      title: 'Новая задача',
      description: '',
      categoryId: null,
      status: 'todo',
      priority: null,
      startDate: null,
      dueDate: null,
    });
    expect(state().tasks.map((t) => t.id)).toEqual([existing.id, id]);
  });

  it('addTask: при ошибке сервера стор не меняется, ошибка пробрасывается', async () => {
    tasksApi.create.mockRejectedValueOnce(new Error('400'));
    await expect(state().addTask({ workspaceId: WS_A.id })).rejects.toThrow();
    expect(state().tasks).toEqual([]);
  });

  it('updateTask: оптимистично меняет стор и шлёт PATCH', async () => {
    const t = makeTask({ title: 'old' });
    seedStores({ tasks: [t] });
    const p = state().updateTask(t.id, { title: 'new' });
    expect(state().tasks[0].title).toBe('new'); // до ответа сервера
    await p;
    expect(tasksApi.update).toHaveBeenCalledWith(t.id, { title: 'new' });
  });

  it('FE-01: updateTask откатывает изменение, если сервер вернул ошибку', async () => {
    const t = makeTask({ title: 'old' });
    seedStores({ tasks: [t] });
    tasksApi.update.mockRejectedValueOnce(new Error('500'));
    await state()
      .updateTask(t.id, { title: 'new' })
      .catch(() => {});
    expect(state().tasks[0].title).toBe('old');
  });

  it('FE-01: deleteTask возвращает задачу, если удаление на сервере не удалось', async () => {
    const t = makeTask();
    seedStores({ tasks: [t] });
    tasksApi.remove.mockRejectedValueOnce(new Error('500'));
    await state()
      .deleteTask(t.id)
      .catch(() => {});
    expect(state().tasks.map((x) => x.id)).toEqual([t.id]);
  });

  it('toggleDone: todo <-> done', async () => {
    const t = makeTask({ status: 'in_progress' });
    seedStores({ tasks: [t] });
    await state().toggleDone(t.id);
    expect(state().tasks[0].status).toBe('done');
    expect(tasksApi.update).toHaveBeenLastCalledWith(t.id, { status: 'done' });
    await state().toggleDone(t.id);
    // из «Готово» задача возвращается в «К выполнению» (не в «В работе»)
    expect(state().tasks[0].status).toBe('todo');
  });

  it('toggleDone по несуществующему id ничего не делает', async () => {
    await state().toggleDone('nope');
    expect(tasksApi.update).not.toHaveBeenCalled();
  });

  it('moveTask: переставляет и сохраняет позиции сдвинутого диапазона', () => {
    const [a, b, c, d] = [makeTask(), makeTask(), makeTask(), makeTask()];
    seedStores({ tasks: [a, b, c, d] });
    state().moveTask(d.id, b.id);
    expect(state().tasks.map((t) => t.id)).toEqual([a.id, d.id, b.id, c.id]);
    expect(tasksApi.setPosition.mock.calls).toEqual([
      [d.id, 1],
      [b.id, 2],
      [c.id, 3],
    ]);
  });

  it('moveTask: на себя или по неизвестному id — no-op', () => {
    const [a, b] = [makeTask(), makeTask()];
    seedStores({ tasks: [a, b] });
    state().moveTask(a.id, a.id);
    state().moveTask('x', b.id);
    expect(state().tasks).toEqual([a, b]);
    expect(tasksApi.setPosition).not.toHaveBeenCalled();
  });

  it('категории: add/update/delete; удаление отвязывает задачи', async () => {
    const cat = makeCategory();
    const t = makeTask({ categoryId: cat.id });
    seedStores({ tasks: [t], categories: [cat] });

    const newId = await state().addCategory('Кровля', '#478bff', WS_A.id);
    expect(categoriesApi.create).toHaveBeenCalledWith('Кровля', '#478bff', WS_A.id);
    expect(state().categories.map((c) => c.id)).toContain(newId);

    await state().updateCategory(cat.id, { name: 'Дача' });
    expect(state().categories.find((c) => c.id === cat.id)?.name).toBe('Дача');

    await state().deleteCategory(cat.id);
    expect(state().categories.find((c) => c.id === cat.id)).toBeUndefined();
    expect(state().tasks[0].categoryId).toBeNull();
    expect(categoriesApi.remove).toHaveBeenCalledWith(cat.id);
  });
});
