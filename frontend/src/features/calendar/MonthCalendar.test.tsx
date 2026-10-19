import { beforeEach, describe, expect, it, vi } from 'vitest';
import { screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import dayjs from 'dayjs';

vi.mock('../../lib/resources', () => import('../../test/resourcesMock'));

import { tasksApi } from '../../test/resourcesMock';
import { MonthCalendar } from './MonthCalendar';
import { useTaskEditor } from '../tasks/taskEditor';
import {
  makeCategory,
  makeTask,
  renderWithProviders,
  seedStores,
  WS_A,
  WS_B,
} from '../../test/utils';

// Октябрь 2026: 1-е — четверг. Сетка: пн 28 сен … вс 1 ноя = 5 недель.
const OCT = dayjs('2026-10-01');

/** Все полоски задачи с данным названием (по одной на каждую неделю). */
const barsOf = (title: string) =>
  screen.getAllByTitle(title).map((span) => span.parentElement as HTMLElement);

const gridColumn = (el: HTMLElement) => el.style.getPropertyValue('grid-column');

beforeEach(() => {
  vi.clearAllMocks();
  seedStores();
});

describe('MonthCalendar: сетка', () => {
  it('5 недель по 7 дней, неделя с понедельника', () => {
    renderWithProviders(<MonthCalendar month={OCT} />);
    expect(screen.getAllByRole('button', { name: 'Добавить задачу' })).toHaveLength(35);
    const days = screen
      .getAllByRole('button', { name: 'Добавить задачу' })
      .map((b) => b.textContent);
    expect(days.slice(0, 5)).toEqual(['28', '29', '30', '1', '2']);
    expect(days.at(-1)).toBe('1');
  });

  it('однодневная задача — в своей колонке', () => {
    seedStores({ tasks: [makeTask({ title: 'Чт', dueDate: '2026-10-01', startDate: '2026-10-01' })] });
    renderWithProviders(<MonthCalendar month={OCT} />);
    const [bar] = barsOf('Чт');
    expect(gridColumn(bar)).toBe('4 / span 1');
  });

  it('задача только со сроком или только с началом всё равно видна', () => {
    seedStores({
      tasks: [
        makeTask({ title: 'Только срок', dueDate: '2026-10-07' }),
        makeTask({ title: 'Только начало', startDate: '2026-10-08' }),
        makeTask({ title: 'Без дат' }),
      ],
    });
    renderWithProviders(<MonthCalendar month={OCT} />);
    expect(barsOf('Только срок')).toHaveLength(1);
    expect(barsOf('Только начало')).toHaveLength(1);
    expect(screen.queryByTitle('Без дат')).toBeNull();
  });

  it('многодневная задача через выходные разбивается на две полоски', () => {
    seedStores({
      tasks: [makeTask({ title: 'Ремонт', startDate: '2026-10-03', dueDate: '2026-10-06' })],
    });
    renderWithProviders(<MonthCalendar month={OCT} />);
    const [first, second] = barsOf('Ремонт');
    expect(gridColumn(first)).toBe('6 / span 2');
    expect(first).toHaveAttribute('data-cont-right', 'true');
    expect(first).not.toHaveAttribute('data-cont-left');
    expect(gridColumn(second)).toBe('1 / span 2');
    expect(second).toHaveAttribute('data-cont-left', 'true');
  });

  it('начало позже срока — диапазон всё равно рисуется (даты меняются местами)', () => {
    seedStores({
      tasks: [makeTask({ title: 'Наоборот', startDate: '2026-10-14', dueDate: '2026-10-12' })],
    });
    renderWithProviders(<MonthCalendar month={OCT} />);
    expect(gridColumn(barsOf('Наоборот')[0])).toBe('1 / span 3');
  });

  it('пересекающиеся задачи раскладываются по разным дорожкам', () => {
    seedStores({
      tasks: [
        makeTask({ title: 'A', startDate: '2026-10-12', dueDate: '2026-10-14' }),
        makeTask({ title: 'B', startDate: '2026-10-13', dueDate: '2026-10-13' }),
        makeTask({ title: 'C', startDate: '2026-10-15', dueDate: '2026-10-15' }),
      ],
    });
    renderWithProviders(<MonthCalendar month={OCT} />);
    const row = (t: string) => barsOf(t)[0].style.getPropertyValue('grid-row');
    expect(row('A')).not.toBe(row('B'));
    expect(row('C')).toBe(row('A')); // C начинается после конца A — та же дорожка
  });

  it('показывает только задачи активной доски; в «Все доски» — все с меткой доски', () => {
    const tasks = [
      makeTask({ title: 'Своя', workspaceId: WS_A.id, dueDate: '2026-10-20' }),
      makeTask({ title: 'Чужая', workspaceId: WS_B.id, dueDate: '2026-10-20' }),
    ];
    seedStores({ tasks });
    const { unmount } = renderWithProviders(<MonthCalendar month={OCT} />);
    expect(screen.getByTitle('Своя')).toBeInTheDocument();
    expect(screen.queryByTitle('Чужая')).toBeNull();
    unmount();

    seedStores({ tasks, activeId: 'all', homeId: WS_A.id });
    renderWithProviders(<MonthCalendar month={OCT} />);
    expect(screen.getByTitle('Чужая')).toBeInTheDocument();
  });

  it('цвет полоски — цвет категории, текст контрастный', () => {
    const cat = makeCategory({ color: '#000000' });
    seedStores({
      categories: [cat],
      tasks: [makeTask({ title: 'Цвет', categoryId: cat.id, dueDate: '2026-10-20' })],
    });
    renderWithProviders(<MonthCalendar month={OCT} />);
    const bar = barsOf('Цвет')[0];
    expect(bar.style.background).toMatch(/rgb\(0, 0, 0\)|#000000/);
    expect(bar.style.color).toMatch(/rgb\(255, 255, 255\)|#ffffff/);
  });
});

describe('MonthCalendar: действия', () => {
  it('клик по дню -> быстрый ввод -> Enter создаёт ОДНУ задачу на этот день', async () => {
    const user = userEvent.setup();
    renderWithProviders(<MonthCalendar month={OCT} />);
    const day15 = screen
      .getAllByRole('button', { name: 'Добавить задачу' })
      .find((b) => b.textContent === '15')!;
    await user.click(day15);
    await user.keyboard('Позвонить{Enter}');
    expect(tasksApi.create).toHaveBeenCalledTimes(1);
    expect(tasksApi.create).toHaveBeenCalledWith(
      expect.objectContaining({
        workspaceId: WS_A.id,
        title: 'Позвонить',
        startDate: '2026-10-15',
        dueDate: '2026-10-15',
      }),
    );
    expect(screen.queryByPlaceholderText('Задача…')).toBeNull();
  });

  it('Escape и пустой ввод ничего не создают', async () => {
    const user = userEvent.setup();
    renderWithProviders(<MonthCalendar month={OCT} />);
    const days = screen.getAllByRole('button', { name: 'Добавить задачу' });
    await user.click(days[10]);
    await user.keyboard('черновик{Escape}');
    await user.click(days[11]);
    await user.keyboard('   {Enter}');
    expect(tasksApi.create).not.toHaveBeenCalled();
  });

  it('галочка отмечает задачу выполненной, клик по полоске открывает её', async () => {
    const user = userEvent.setup();
    const t = makeTask({ title: 'Сделать', dueDate: '2026-10-20' });
    seedStores({ tasks: [t] });
    renderWithProviders(<MonthCalendar month={OCT} />);
    const bar = barsOf('Сделать')[0];
    await user.click(within(bar).getByRole('button', { name: 'Отметить выполненной' }));
    expect(tasksApi.update).toHaveBeenCalledWith(t.id, { status: 'done' });
    expect(useTaskEditor.getState().opened).toBe(false); // галочка не открывает карточку
    await user.click(screen.getByTitle('Сделать'));
    expect(useTaskEditor.getState()).toMatchObject({ opened: true, editingId: t.id });
  });
});
