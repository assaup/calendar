import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

vi.mock('../../lib/resources', () => import('../../test/resourcesMock'));

import { tasksApi } from '../../test/resourcesMock';
import { BoardPage } from './BoardPage';
import { makeTask, renderWithProviders, seedStores, WS_A, WS_B } from '../../test/utils';

beforeEach(() => {
  vi.clearAllMocks();
  vi.useFakeTimers({ toFake: ['Date'] });
  vi.setSystemTime(new Date('2026-10-19T12:00:00'));
  seedStores();
});
afterEach(() => vi.useRealTimers());

describe('BoardPage', () => {
  it('раскладывает задачи месяца по статусам, без срока — в бэклог', () => {
    seedStores({
      tasks: [
        makeTask({ title: 'todo-окт', dueDate: '2026-10-05' }),
        makeTask({ title: 'wip-окт', dueDate: '2026-10-06', status: 'in_progress' }),
        makeTask({ title: 'done-окт', dueDate: '2026-10-07', status: 'done' }),
        makeTask({ title: 'todo-ноя', dueDate: '2026-11-05' }),
        makeTask({ title: 'бэклог' }),
        makeTask({ title: 'чужая', workspaceId: WS_B.id, dueDate: '2026-10-05' }),
      ],
    });
    renderWithProviders(<BoardPage />);
    expect(screen.getByText('todo-окт')).toBeInTheDocument();
    expect(screen.getByText('wip-окт')).toBeInTheDocument();
    expect(screen.getByText('done-окт')).toBeInTheDocument();
    expect(screen.getByText('бэклог')).toBeInTheDocument();
    expect(screen.queryByText('todo-ноя')).toBeNull();
    expect(screen.queryByText('чужая')).toBeNull();
  });

  it('листание месяцев', async () => {
    const user = userEvent.setup();
    seedStores({ tasks: [makeTask({ title: 'ноябрьская', dueDate: '2026-11-05' })] });
    renderWithProviders(<BoardPage />);
    expect(screen.getByRole('heading', { name: 'Октябрь 2026' })).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Следующий месяц' }));
    expect(screen.getByRole('heading', { name: 'Ноябрь 2026' })).toBeInTheDocument();
    expect(screen.getByText('ноябрьская')).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Текущий' }));
    expect(screen.getByRole('heading', { name: 'Октябрь 2026' })).toBeInTheDocument();
  });

  it('FE-09: выполненная задача без срока не исчезает с доски', () => {
    // бэклог прячет done, а колонки статусов требуют срок в этом месяце —
    // отметил задачу из бэклога галочкой, и её больше нигде на доске нет
    seedStores({ tasks: [makeTask({ title: 'сделано без срока', status: 'done' })] });
    renderWithProviders(<BoardPage />);
    expect(screen.getByText('сделано без срока')).toBeInTheDocument();
  });

  it('быстрое добавление в колонку «В работе» ставит статус и срок = сегодня', async () => {
    const user = userEvent.setup();
    renderWithProviders(<BoardPage />);
    const addButtons = screen.getAllByRole('button', { name: /Добавить задачу/ });
    await user.click(addButtons[1]); // колонки: К выполнению, В работе, Готово, Без срока
    await user.keyboard('Созвон{Enter}');
    expect(tasksApi.create).toHaveBeenCalledTimes(1);
    expect(tasksApi.create).toHaveBeenCalledWith(
      expect.objectContaining({
        workspaceId: WS_A.id,
        title: 'Созвон',
        status: 'in_progress',
        dueDate: '2026-10-19',
      }),
    );
  });

  it('быстрое добавление в бэклог — без срока; в прошлом месяце — 1-е число', async () => {
    const user = userEvent.setup();
    renderWithProviders(<BoardPage />);
    await user.click(screen.getAllByRole('button', { name: /Добавить задачу/ })[3]);
    await user.keyboard('Идея{Enter}');
    expect(tasksApi.create).toHaveBeenLastCalledWith(
      expect.objectContaining({ title: 'Идея', dueDate: null }),
    );
    await user.click(screen.getByRole('button', { name: 'Предыдущий месяц' }));
    await user.click(screen.getAllByRole('button', { name: /Добавить задачу/ })[0]);
    await user.keyboard('Отчёт{Enter}');
    expect(tasksApi.create).toHaveBeenLastCalledWith(
      expect.objectContaining({ title: 'Отчёт', dueDate: '2026-09-01' }),
    );
  });

  it('галочка на карточке переключает «Готово» и не открывает карточку', async () => {
    const user = userEvent.setup();
    const t = makeTask({ title: 'Карточка', dueDate: '2026-10-10' });
    seedStores({ tasks: [t] });
    renderWithProviders(<BoardPage />);
    const card = screen.getByText('Карточка').closest('[role="button"]') as HTMLElement;
    await user.click(within(card).getByRole('checkbox', { name: 'Готово' }));
    expect(tasksApi.update).toHaveBeenCalledWith(t.id, { status: 'done' });
  });

  it('в «Все доски» на карточке видна доска', () => {
    seedStores({
      activeId: 'all',
      tasks: [makeTask({ title: 'X', workspaceId: WS_B.id, dueDate: '2026-10-10' })],
    });
    renderWithProviders(<BoardPage />);
    expect(screen.getByTitle(`Доска: ${WS_B.name}`)).toBeInTheDocument();
  });

  it('бэклог сворачивается и показывает счётчик', async () => {
    const user = userEvent.setup();
    seedStores({ tasks: [makeTask(), makeTask()] });
    renderWithProviders(<BoardPage />);
    await user.click(screen.getByRole('button', { name: 'Свернуть колонку' }));
    const collapsed = screen.getByRole('button', { name: 'Развернуть «Без срока»' });
    expect(collapsed).toHaveTextContent('2');
  });
});
