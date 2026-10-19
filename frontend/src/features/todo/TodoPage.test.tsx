import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { act, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

vi.mock('../../lib/resources', () => import('../../test/resourcesMock'));

import { tasksApi } from '../../test/resourcesMock';
import { TodoPage } from './TodoPage';
import { useTaskEditor } from '../tasks/taskEditor';
import { useWorkspaceStore } from '../../store/workspace';
import {
  makeCategory,
  makeTask,
  renderWithProviders,
  seedStores,
  WS_A,
  WS_B,
} from '../../test/utils';

/** Названия задач в порядке отображения. */
const rows = () =>
  Array.from(document.querySelectorAll('[class*="_tableRow_"]')).map(
    (row) => row.querySelector('[class*="_title_"]')?.textContent,
  );

const TASKS = () => [
  makeTask({ title: 'Купить молоко', dueDate: '2026-10-25', priority: 'low', createdAt: 1 }),
  makeTask({ title: 'Сдать отчёт', dueDate: '2026-10-10', priority: 'high', createdAt: 2 }),
  makeTask({ title: 'Позвонить маме', priority: 'medium', createdAt: 3 }),
  makeTask({ title: 'Оплатить', dueDate: '2026-10-01', status: 'done', createdAt: 4 }),
  makeTask({ title: 'Рабочая', workspaceId: WS_B.id, createdAt: 5 }),
];

beforeEach(() => {
  vi.clearAllMocks();
  vi.useFakeTimers({ toFake: ['Date'] });
  vi.setSystemTime(new Date('2026-10-19T12:00:00'));
  seedStores({ tasks: TASKS() });
});
afterEach(() => vi.useRealTimers());

describe('TodoPage', () => {
  it('по умолчанию: задачи доски, сортировка по сроку, выполненные внизу', () => {
    renderWithProviders(<TodoPage />);
    expect(rows()).toEqual(['Сдать отчёт', 'Купить молоко', 'Позвонить маме', 'Оплатить']);
    expect(screen.getByText('Показано: 4 из 4')).toBeInTheDocument();
  });

  it('поиск по названию без учёта регистра', async () => {
    const user = userEvent.setup();
    renderWithProviders(<TodoPage />);
    await user.type(screen.getByPlaceholderText('Поиск по названию'), '  ОТЧ');
    expect(rows()).toEqual(['Сдать отчёт']);
    await user.clear(screen.getByPlaceholderText('Поиск по названию'));
    await user.type(screen.getByPlaceholderText('Поиск по названию'), 'xyz');
    expect(screen.getByText('Ничего не найдено. Измени фильтры или поиск.')).toBeInTheDocument();
  });

  it('фильтр статуса', async () => {
    const user = userEvent.setup();
    renderWithProviders(<TodoPage />);
    await user.click(screen.getByRole('radio', { name: 'Готово' }));
    expect(rows()).toEqual(['Оплатить']);
    await user.click(screen.getByRole('radio', { name: 'Активные' }));
    expect(rows()).toHaveLength(3);
  });

  it('чип «Просрочено» показывает количество и фильтрует', async () => {
    const user = userEvent.setup();
    renderWithProviders(<TodoPage />);
    // «Сдать отчёт» (10 окт) просрочена; «Оплатить» (1 окт) уже выполнена — не считается
    const chip = screen.getByText(/Просрочено · 1/);
    await user.click(chip);
    expect(rows()).toEqual(['Сдать отчёт']);
  });

  it('чип «Просрочено» выключен, если просроченных нет', () => {
    seedStores({ tasks: [makeTask({ dueDate: '2026-12-01' })] });
    renderWithProviders(<TodoPage />);
    expect(screen.getByRole('checkbox', { name: 'Просрочено' })).toBeDisabled();
  });

  it('пустая доска', () => {
    seedStores({ tasks: [] });
    renderWithProviders(<TodoPage />);
    expect(screen.getByText(/Пока пусто/)).toBeInTheDocument();
  });

  it('«Все доски» показывают задачи всех досок с меткой доски', () => {
    seedStores({ tasks: TASKS(), activeId: 'all' });
    renderWithProviders(<TodoPage />);
    expect(rows()).toHaveLength(5);
    expect(screen.getByTitle(`Доска: ${WS_B.name}`)).toBeInTheDocument();
  });

  it('галочка, открытие и удаление из меню', async () => {
    const user = userEvent.setup();
    const t = makeTask({ title: 'Одна' });
    seedStores({ tasks: [t] });
    renderWithProviders(<TodoPage />);
    await user.click(screen.getByRole('checkbox', { name: 'Готово' }));
    expect(tasksApi.update).toHaveBeenCalledWith(t.id, { status: 'done' });

    await user.click(screen.getByText('Одна'));
    expect(useTaskEditor.getState()).toMatchObject({ opened: true, editingId: t.id });

    await user.click(screen.getByRole('button', { name: 'Меню задачи' }));
    await user.click(await screen.findByRole('menuitem', { name: 'Удалить' }));
    expect(tasksApi.remove).toHaveBeenCalledWith(t.id);
  });

  it('FE-10: фильтр категории сбрасывается при смене доски', async () => {
    const user = userEvent.setup();
    const cat = makeCategory({ id: 'c1', workspaceId: WS_A.id, name: 'Дом' });
    seedStores({
      categories: [cat, makeCategory({ id: 'c2', workspaceId: WS_B.id, name: 'Офис' })],
      tasks: [
        makeTask({ title: 'дома', categoryId: 'c1' }),
        makeTask({ title: 'в офисе', workspaceId: WS_B.id, categoryId: 'c2' }),
      ],
    });
    renderWithProviders(<TodoPage />);
    await user.click(screen.getByPlaceholderText('Все категории'));
    await user.click(await screen.findByRole('option', { name: 'Дом', hidden: true }));
    expect(rows()).toEqual(['дома']);

    act(() => useWorkspaceStore.getState().setActive(WS_B.id));
    // фильтр по категории чужой доски остаётся, список пуст, а в селекте — пусто
    expect(rows()).toEqual(['в офисе']);
  });
});
