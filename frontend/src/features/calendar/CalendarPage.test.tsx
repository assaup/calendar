import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

vi.mock('../../lib/resources', () => import('../../test/resourcesMock'));

import { CalendarPage } from './CalendarPage';
import { useTaskEditor } from '../tasks/taskEditor';
import { useUiStore } from '../../store/ui';
import { makeTask, renderWithProviders, seedStores } from '../../test/utils';

const nTasksInOctober = (n: number) =>
  Array.from({ length: n }, (_, i) => makeTask({ dueDate: `2026-10-${String((i % 28) + 1).padStart(2, '0')}` }));

beforeEach(() => {
  vi.useFakeTimers({ toFake: ['Date'] });
  vi.setSystemTime(new Date('2026-10-19T12:00:00'));
  seedStores();
  useUiStore.setState({ calendarFullText: false, calendarScale: 'm' });
});
afterEach(() => vi.useRealTimers());

describe('CalendarPage', () => {
  it('заголовок текущего месяца с большой буквы и навигация', async () => {
    const user = userEvent.setup();
    renderWithProviders(<CalendarPage />);
    expect(screen.getByRole('heading', { name: 'Октябрь 2026' })).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Следующий месяц' }));
    expect(screen.getByRole('heading', { name: 'Ноябрь 2026' })).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Предыдущий месяц' }));
    await user.click(screen.getByRole('button', { name: 'Предыдущий месяц' }));
    expect(screen.getByRole('heading', { name: 'Сентябрь 2026' })).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Сегодня' }));
    expect(screen.getByRole('heading', { name: 'Октябрь 2026' })).toBeInTheDocument();
  });

  it.each([
    [0, '0 задач'],
    [1, '1 задача'],
    [2, '2 задачи'],
    [5, '5 задач'],
    [11, '11 задач'],
    [21, '21 задача'],
    [22, '22 задачи'],
  ])('счётчик: %i -> «%s»', (n, label) => {
    seedStores({ tasks: nTasksInOctober(n) });
    renderWithProviders(<CalendarPage />);
    expect(screen.getByText(label)).toBeInTheDocument();
  });

  it('FE-08: счётчик учитывает задачи, которые идут через весь месяц', () => {
    // 20 сент -> 5 нояб: видна в октябре на каждой неделе, но в счётчик не попадает
    seedStores({ tasks: [makeTask({ startDate: '2026-09-20', dueDate: '2026-11-05' })] });
    renderWithProviders(<CalendarPage />);
    expect(screen.getByText('1 задача')).toBeInTheDocument();
  });

  it('«Новая задача» открывает редактор с сегодняшней датой', async () => {
    const user = userEvent.setup();
    renderWithProviders(<CalendarPage />);
    await user.click(screen.getByRole('button', { name: 'Новая задача' }));
    expect(useTaskEditor.getState()).toMatchObject({
      opened: true,
      editingId: null,
      presetDate: '2026-10-19',
    });
  });

  it('переключатели вида сохраняются в ui-store', async () => {
    const user = userEvent.setup();
    renderWithProviders(<CalendarPage />);
    await user.click(screen.getByText('Полностью'));
    expect(useUiStore.getState().calendarFullText).toBe(true);
    await user.click(screen.getByTitle('Крупный шрифт'));
    expect(useUiStore.getState().calendarScale).toBe('l');
  });
});
