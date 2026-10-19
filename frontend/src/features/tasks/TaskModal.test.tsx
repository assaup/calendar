import { beforeEach, describe, expect, it, vi } from 'vitest';
import { act, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

vi.mock('../../lib/resources', () => import('../../test/resourcesMock'));

import { tasksApi } from '../../test/resourcesMock';
import { TaskModal } from './TaskModal';
import { useTaskEditor } from './taskEditor';
import {
  makeCategory,
  makeTask,
  renderWithProviders,
  seedStores,
  WS_A,
  WS_B,
} from '../../test/utils';

const editor = () => useTaskEditor.getState();

beforeEach(() => {
  vi.clearAllMocks();
  seedStores();
});

function openNew(opts?: Parameters<ReturnType<typeof editor>['openNew']>[0]) {
  act(() => editor().openNew(opts));
}
function openEdit(id: string) {
  act(() => editor().openEdit(id));
}

describe('TaskModal: создание', () => {
  it('без названия создать нельзя', async () => {
    renderWithProviders(<TaskModal />);
    openNew();
    expect(await screen.findByRole('button', { name: 'Создать' })).toBeDisabled();
  });

  it('создаёт задачу с датой из календаря и статусом из колонки', async () => {
    const user = userEvent.setup();
    renderWithProviders(<TaskModal />);
    openNew({ date: '2026-10-15', status: 'in_progress' });
    await user.type(await screen.findByLabelText(/Название/), 'Купить краску');
    await user.click(screen.getByRole('radio', { name: 'Высокий' }));
    await user.click(screen.getByRole('button', { name: 'Создать' }));
    expect(tasksApi.create).toHaveBeenCalledWith(
      expect.objectContaining({
        workspaceId: WS_A.id,
        title: 'Купить краску',
        status: 'in_progress',
        priority: 'high',
        startDate: '2026-10-15',
        dueDate: '2026-10-15',
      }),
    );
    await waitFor(() => expect(editor().opened).toBe(false));
  });

  it('в режиме «Все доски» задача создаётся на последнюю выбранную доску', async () => {
    const user = userEvent.setup();
    seedStores({ activeId: 'all', homeId: WS_B.id });
    renderWithProviders(<TaskModal />);
    openNew();
    await user.type(await screen.findByLabelText(/Название/), 'X');
    await user.click(screen.getByRole('button', { name: 'Создать' }));
    expect(tasksApi.create).toHaveBeenCalledWith(expect.objectContaining({ workspaceId: WS_B.id }));
  });

  it('FE-16: подзадачи сохраняются вместе с задачей одним запросом', async () => {
    // сейчас: create без подзадач + отдельный PATCH. Если второй запрос упал —
    // подзадачи молча теряются (ошибка не обрабатывается)
    const user = userEvent.setup();
    renderWithProviders(<TaskModal />);
    openNew();
    await user.type(await screen.findByLabelText(/Название/), 'С чеклистом');
    await user.type(screen.getByPlaceholderText('Добавить подзадачу и Enter'), 'шаг 1{Enter}');
    await user.click(screen.getByRole('button', { name: 'Создать' }));
    expect(tasksApi.create).toHaveBeenCalledWith(
      expect.objectContaining({
        subtasks: [expect.objectContaining({ title: 'шаг 1', done: false })],
      }),
    );
  });

  it('FE-17: начало позже срока — форма показывает ошибку', async () => {
    // сервер такое принимает (BUG-05), форма тоже: даты выбираются независимо
    seedStores({
      tasks: [makeTask({ id: 'e1', startDate: '2026-10-25', dueDate: '2026-10-20' })],
    });
    renderWithProviders(<TaskModal />);
    openEdit('e1');
    await screen.findByLabelText(/Название/);
    expect(screen.getByText(/раньше|позже|не может/i)).toBeInTheDocument();
  });
});

describe('TaskModal: редактирование', () => {
  const task = () =>
    makeTask({
      id: 'e1',
      title: 'Старое',
      workspaceId: WS_A.id,
      categoryId: 'ca',
      subtasks: [{ id: 's1', title: 'пункт', done: false }],
    });

  beforeEach(() => {
    seedStores({
      tasks: [task()],
      categories: [
        makeCategory({ id: 'ca', workspaceId: WS_A.id, name: 'Дом' }),
        makeCategory({ id: 'cb', workspaceId: WS_B.id, name: 'Дом' }),
        makeCategory({ id: 'cc', workspaceId: WS_B.id, name: 'Офис' }),
      ],
    });
  });

  it('форма заполняется из задачи; кнопки «Создать» нет — автосохранение', async () => {
    renderWithProviders(<TaskModal />);
    openEdit('e1');
    expect(await screen.findByLabelText(/Название/)).toHaveValue('Старое');
    expect(screen.getByText('Изменения сохраняются сами')).toBeInTheDocument();
    expect(screen.getByText('0 из 1')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Создать' })).toBeNull();
  });

  it('автосохранение через ~500 мс после правки, без лишних запросов', async () => {
    const user = userEvent.setup();
    renderWithProviders(<TaskModal />);
    openEdit('e1');
    const title = await screen.findByLabelText(/Название/);
    await user.clear(title);
    await user.type(title, 'Новое');
    expect(tasksApi.update).not.toHaveBeenCalled();
    await waitFor(() => expect(tasksApi.update).toHaveBeenCalledTimes(1), { timeout: 2000 });
    expect(tasksApi.update).toHaveBeenCalledWith('e1', expect.objectContaining({ title: 'Новое' }));
  });

  it('открытие без правок ничего не сохраняет', async () => {
    const user = userEvent.setup();
    renderWithProviders(<TaskModal />);
    openEdit('e1');
    await user.click(await screen.findByRole('button', { name: 'Готово' }));
    await new Promise((r) => setTimeout(r, 700));
    expect(tasksApi.update).not.toHaveBeenCalled();
  });

  it('«Готово» сразу дописывает несохранённые правки', async () => {
    const user = userEvent.setup();
    renderWithProviders(<TaskModal />);
    openEdit('e1');
    await user.type(await screen.findByLabelText(/Описание/), 'детали');
    await user.click(screen.getByRole('button', { name: 'Готово' }));
    expect(tasksApi.update).toHaveBeenCalledWith(
      'e1',
      expect.objectContaining({ description: 'детали' }),
    );
    expect(editor().opened).toBe(false);
  });

  it('пустое название не сохраняется', async () => {
    const user = userEvent.setup();
    renderWithProviders(<TaskModal />);
    openEdit('e1');
    await user.clear(await screen.findByLabelText(/Название/));
    await user.click(screen.getByRole('button', { name: 'Готово' }));
    await new Promise((r) => setTimeout(r, 700));
    expect(tasksApi.update).not.toHaveBeenCalled();
  });

  it('подзадачи: отметить и удалить', async () => {
    const user = userEvent.setup();
    renderWithProviders(<TaskModal />);
    openEdit('e1');
    await screen.findByText('пункт');
    const checkboxes = screen.getAllByRole('checkbox');
    await user.click(checkboxes[checkboxes.length - 1]);
    expect(screen.getByText('1 из 1')).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Удалить подзадачу' }));
    expect(screen.queryByText('пункт')).toBeNull();
  });

  it('перенос на другую доску берёт одноимённую категорию', async () => {
    const user = userEvent.setup();
    renderWithProviders(<TaskModal />);
    openEdit('e1');
    await screen.findByText('пункт');
    const boardSelect = screen
      .getAllByLabelText('Доска')
      .find((el) => el.tagName === 'INPUT') as HTMLElement;
    await user.click(boardSelect);
    await user.click(await screen.findByRole('option', { name: WS_B.name, hidden: true }));
    await user.click(screen.getByRole('button', { name: 'Готово' }));
    expect(tasksApi.update).toHaveBeenCalledWith(
      'e1',
      expect.objectContaining({ workspaceId: WS_B.id, categoryId: 'cb' }),
    );
  });

  it('удаление из окна', async () => {
    const user = userEvent.setup();
    renderWithProviders(<TaskModal />);
    openEdit('e1');
    await user.click(await screen.findByRole('button', { name: 'Удалить' }));
    expect(tasksApi.remove).toHaveBeenCalledWith('e1');
    expect(editor().opened).toBe(false);
  });
});
