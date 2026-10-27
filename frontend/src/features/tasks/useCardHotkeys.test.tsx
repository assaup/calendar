import { beforeEach, describe, expect, it, vi } from 'vitest';
import { act, fireEvent, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { notifications } from '@mantine/notifications';

vi.mock('../../lib/resources', () => import('../../test/resourcesMock'));

import { tasksApi } from '../../test/resourcesMock';
import { useCardHotkeys } from './useCardHotkeys';
import { cardFocus } from './cardFocus';
import { useQuickCategory } from './quickCategory';
import { QuickCategoryMenu } from './QuickCategoryMenu';
import { useTaskEditor } from './taskEditor';
import { useTasksStore } from '../../store/tasks';
import {
  makeCategory,
  makeTask,
  renderWithProviders,
  seedStores,
  WS_A,
  WS_B,
} from '../../test/utils';

function Harness() {
  useCardHotkeys();
  return (
    <>
      <input aria-label="поле" />
      <QuickCategoryMenu />
    </>
  );
}

const press = (init: KeyboardEventInit, target: Element | Window = window) =>
  act(() => {
    fireEvent.keyDown(target, init);
  });
const ctrl = (code: string, key: string) => press({ code, key, ctrlKey: true });

const SRC = () =>
  makeTask({
    id: 'src',
    title: 'Оригинал',
    workspaceId: WS_A.id,
    categoryId: 'ca',
    priority: 'high',
    dueDate: '2026-10-10',
    subtasks: [{ id: 's1', title: 'пункт', done: true }],
  });

beforeEach(() => {
  vi.clearAllMocks();
  notifications.clean();
  seedStores({
    tasks: [SRC()],
    categories: [
      makeCategory({ id: 'ca', workspaceId: WS_A.id, name: 'Дом' }),
      makeCategory({ id: 'cb', workspaceId: WS_B.id, name: 'Дом' }),
    ],
  });
  cardFocus.leaveTask(cardFocus.getTask() ?? '');
  cardFocus.leaveTarget();
  cardFocus.copy(null as never);
  window.getSelection()?.removeAllRanges();
});

describe('горячие клавиши карточек', () => {
  it('Ctrl+C над карточкой копирует, Ctrl+V вставляет копию с полями области', async () => {
    renderWithProviders(<Harness />);
    cardFocus.enterTask('src');
    ctrl('KeyC', 'c');
    expect(cardFocus.getClipboard()?.id).toBe('src');

    cardFocus.leaveTask('src');
    cardFocus.enterTarget({ status: 'done' });
    ctrl('KeyV', 'v');
    await waitFor(() => expect(tasksApi.create).toHaveBeenCalled());
    expect(tasksApi.create).toHaveBeenCalledWith(
      expect.objectContaining({
        workspaceId: WS_A.id,
        title: 'Оригинал',
        categoryId: 'ca',
        priority: 'high',
        dueDate: '2026-10-10',
        status: 'done',
      }),
    );
    // подзадачи копируются (отдельным запросом)
    await waitFor(() =>
      expect(tasksApi.update).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({ subtasks: [expect.objectContaining({ title: 'пункт' })] }),
      ),
    );
  });

  it('работает в русской раскладке (физическая клавиша)', () => {
    renderWithProviders(<Harness />);
    cardFocus.enterTask('src');
    ctrl('KeyC', 'с'); // кириллическая «с»
    expect(cardFocus.getClipboard()?.id).toBe('src');
  });

  it('вставка на другую доску ищет одноимённую категорию', async () => {
    seedStores({
      activeId: WS_B.id,
      tasks: [SRC()],
      categories: useTasksStore.getState().categories,
    });
    renderWithProviders(<Harness />);
    cardFocus.copy(SRC());
    ctrl('KeyV', 'v');
    await waitFor(() =>
      expect(tasksApi.create).toHaveBeenCalledWith(
        expect.objectContaining({ workspaceId: WS_B.id, categoryId: 'cb' }),
      ),
    );
  });

  it('в «Все доски» копия остаётся на доске оригинала', async () => {
    seedStores({ activeId: 'all', tasks: [SRC()], categories: [] });
    renderWithProviders(<Harness />);
    cardFocus.copy(SRC());
    ctrl('KeyV', 'v');
    await waitFor(() =>
      expect(tasksApi.create).toHaveBeenCalledWith(
        expect.objectContaining({ workspaceId: WS_A.id }),
      ),
    );
  });

  it('при выделенном тексте Ctrl+C — обычное копирование', () => {
    renderWithProviders(<Harness />);
    const p = document.createElement('p');
    p.textContent = 'выделенный текст';
    document.body.appendChild(p);
    const range = document.createRange();
    range.selectNodeContents(p);
    window.getSelection()!.addRange(range);
    cardFocus.enterTask('src');
    ctrl('KeyC', 'c');
    expect(cardFocus.getClipboard()).toBeNull();
    p.remove();
  });

  it('в полях ввода и при открытом окне задачи клавиши не перехватываются', () => {
    renderWithProviders(<Harness />);
    cardFocus.enterTask('src');
    press({ key: 'Delete', code: 'Delete' }, screen.getByLabelText('поле'));
    expect(tasksApi.remove).not.toHaveBeenCalled();

    act(() => useTaskEditor.getState().openEdit('src'));
    press({ key: 'Delete', code: 'Delete' });
    expect(tasksApi.remove).not.toHaveBeenCalled();
  });

  it('Delete удаляет карточку под курсором, «Отменить» восстанавливает копию', async () => {
    const user = userEvent.setup();
    renderWithProviders(<Harness />);
    cardFocus.enterTask('src');
    press({ key: 'Delete', code: 'Delete' });
    await waitFor(() => expect(tasksApi.remove).toHaveBeenCalledWith('src'));
    expect(useTasksStore.getState().tasks).toEqual([]);

    await user.click(await screen.findByRole('button', { name: 'Отменить', hidden: true }));
    await waitFor(() =>
      expect(tasksApi.create).toHaveBeenCalledWith(
        expect.objectContaining({ title: 'Оригинал', categoryId: 'ca', dueDate: '2026-10-10' }),
      ),
    );
    expect(useTasksStore.getState().tasks).toHaveLength(1);
  });

  it('Delete без наведения ничего не делает', () => {
    renderWithProviders(<Harness />);
    press({ key: 'Delete', code: 'Delete' });
    expect(tasksApi.remove).not.toHaveBeenCalled();
  });
});

describe('меню категории по клавише C', () => {
  it('показывает категории только доски задачи и меняет категорию', async () => {
    const user = userEvent.setup();
    renderWithProviders(<Harness />);
    cardFocus.enterTask('src');
    press({ key: 'c', code: 'KeyC' });
    const menu = await screen.findByRole('menu', { name: 'Категория задачи' });
    // «Без категории» + «Дом» своей доски (не дубль с доски B)
    expect(menu.querySelectorAll('[role="menuitem"]')).toHaveLength(2);
    await user.click(screen.getByRole('menuitem', { name: 'Без категории' }));
    expect(tasksApi.update).toHaveBeenCalledWith('src', { categoryId: null });
    expect(useQuickCategory.getState().taskId).toBeNull();
  });

  it('Escape закрывает меню', async () => {
    renderWithProviders(<Harness />);
    act(() => useQuickCategory.getState().open('src', 10, 10));
    await screen.findByRole('menu', { name: 'Категория задачи' });
    press({ key: 'Escape', code: 'Escape' });
    expect(screen.queryByRole('menu', { name: 'Категория задачи' })).toBeNull();
  });
});
