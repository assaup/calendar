import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';

vi.mock('../../lib/resources', () => import('../../test/resourcesMock'));

import { DashboardPage } from './DashboardPage';
import { Donut } from './Donut';
import {
  makeCategory,
  makeTask,
  Providers,
  renderWithProviders,
  seedStores,
  WS_A,
  WS_B,
} from '../../test/utils';

/** Значение плитки по подписи. */
const tile = (label: string) => screen.getByText(label).nextElementSibling?.textContent;

beforeEach(() => {
  vi.useFakeTimers({ toFake: ['Date'] });
  vi.setSystemTime(new Date('2026-10-19T12:00:00'));
});
afterEach(() => vi.useRealTimers());

describe('DashboardPage', () => {
  it('пустое состояние', () => {
    seedStores({ tasks: [] });
    renderWithProviders(<DashboardPage />);
    expect(screen.getByText(/пока нет задач/)).toBeInTheDocument();
  });

  it('плитки: всего, выполнено с %, активные, просрочено', () => {
    seedStores({
      tasks: [
        makeTask({ status: 'done' }),
        makeTask({ status: 'in_progress', dueDate: '2026-10-01' }),
        makeTask({ status: 'todo' }),
        makeTask({ workspaceId: WS_B.id, status: 'done' }), // другая доска
      ],
    });
    renderWithProviders(<DashboardPage />);
    expect(tile('Всего задач')).toBe('3');
    expect(tile('Выполнено')).toBe('1');
    expect(screen.getByText('33% готово')).toBeInTheDocument(); // 1/3, округление
    expect(tile('Активных')).toBe('2');
    expect(tile('Просрочено')).toBe('1');
    expect(screen.getByText('1 из 3 задач выполнено')).toBeInTheDocument();
  });

  it('по категориям — только непустые + «Без категории», по убыванию', () => {
    const home = makeCategory({ id: 'c1', name: 'Дом' });
    const work = makeCategory({ id: 'c2', name: 'Работа' });
    const empty = makeCategory({ id: 'c3', name: 'Пустая' });
    seedStores({
      categories: [home, work, empty],
      tasks: [
        makeTask({ categoryId: 'c2' }),
        makeTask({ categoryId: 'c2' }),
        makeTask({ categoryId: 'c1' }),
        makeTask({ categoryId: null }),
      ],
    });
    renderWithProviders(<DashboardPage />);
    expect(screen.getByText('По категориям')).toBeInTheDocument();
    expect(screen.queryByText('Пустая')).toBeNull();
    const labels = ['Работа', 'Дом', 'Без категории'].map((l) => screen.getByText(l));
    // порядок в DOM соответствует убыванию
    expect(labels[0].compareDocumentPosition(labels[1]) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
  });

  it('в «Все доски» группировка по доскам', () => {
    seedStores({
      activeId: 'all',
      tasks: [makeTask({ workspaceId: WS_A.id }), makeTask({ workspaceId: WS_B.id })],
    });
    renderWithProviders(<DashboardPage />);
    expect(screen.getByText('По доскам')).toBeInTheDocument();
    expect(screen.getByText(WS_A.name)).toBeInTheDocument();
    expect(screen.getByText(WS_B.name)).toBeInTheDocument();
  });

  it('FE-11: одноимённые доски/категории не ломают список (уникальные key)', () => {
    const errors = vi.spyOn(console, 'error').mockImplementation(() => {});
    seedStores({
      workspaces: [WS_A, { ...WS_B, name: WS_A.name }],
      activeId: 'all',
      tasks: [makeTask({ workspaceId: WS_A.id }), makeTask({ workspaceId: WS_B.id })],
    });
    renderWithProviders(<DashboardPage />);
    const keyWarnings = errors.mock.calls.filter((c) => String(c[0]).includes('same key'));
    errors.mockRestore();
    expect(keyWarnings).toEqual([]);
  });
});

describe('Donut', () => {
  it('рисует сегмент на каждое ненулевое значение', () => {
    const { container } = render(
      <Providers>
        <Donut
          segments={[
            { value: 1, color: '#f00', label: 'a' },
            { value: 0, color: '#0f0', label: 'b' },
            { value: 3, color: '#00f', label: 'c' },
          ]}
          centerTop="25%"
          centerBottom="готово"
        />
      </Providers>,
    );
    // фон + 2 сегмента
    expect(container.querySelectorAll('circle')).toHaveLength(3);
    expect(screen.getByText('25%')).toBeInTheDocument();
  });

  it('без данных — только фоновое кольцо', () => {
    const { container } = render(
      <Donut segments={[{ value: 0, color: '#f00', label: 'a' }]} centerTop="0%" centerBottom="" />,
    );
    expect(container.querySelectorAll('circle')).toHaveLength(1);
  });
});
