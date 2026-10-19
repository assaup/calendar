import { beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

vi.mock('../../lib/resources', () => import('../../test/resourcesMock'));

import { workspacesApi } from '../../test/resourcesMock';
import { WorkspaceSwitcher } from './WorkspaceSwitcher';
import { useWorkspaceStore, ALL_WORKSPACES } from '../../store/workspace';
import { renderWithProviders, seedStores, WS_A, WS_B } from '../../test/utils';

const state = () => useWorkspaceStore.getState();

beforeEach(() => {
  vi.clearAllMocks();
  seedStores();
});

async function openMenu(user: ReturnType<typeof userEvent.setup>) {
  await user.click(screen.getByRole('button', { name: 'Доска' }));
  return screen.findByRole('menu', { hidden: true });
}

describe('WorkspaceSwitcher', () => {
  it('показывает активную доску и переключает', async () => {
    const user = userEvent.setup();
    renderWithProviders(<WorkspaceSwitcher />);
    expect(screen.getByRole('button', { name: 'Доска' })).toHaveTextContent(WS_A.name);
    await openMenu(user);
    await user.click(screen.getByRole('menuitem', { name: new RegExp(WS_B.name), hidden: true }));
    expect(state().activeId).toBe(WS_B.id);
  });

  it('режим «Все доски»', async () => {
    const user = userEvent.setup();
    renderWithProviders(<WorkspaceSwitcher />);
    await openMenu(user);
    await user.click(screen.getByRole('menuitem', { name: /Все доски/, hidden: true }));
    expect(state().activeId).toBe(ALL_WORKSPACES);
    expect(screen.getByRole('button', { name: 'Доска' })).toHaveTextContent('Все доски');
  });

  it('создание доски: пустое имя нельзя, имя триммится', async () => {
    const user = userEvent.setup();
    renderWithProviders(<WorkspaceSwitcher />);
    await openMenu(user);
    await user.click(screen.getByRole('menuitem', { name: 'Новая доска', hidden: true }));
    const create = await screen.findByRole('button', { name: 'Создать' });
    expect(create).toBeDisabled();
    await user.type(screen.getByLabelText('Название'), '  Стройка  ');
    await user.click(screen.getByRole('button', { name: 'Индиго' }));
    await user.click(create);
    expect(workspacesApi.create).toHaveBeenCalledWith('Стройка', '#4263eb');
    await waitFor(() => expect(state().workspaces).toHaveLength(3));
  });

  it('переименование по карандашу', async () => {
    const user = userEvent.setup();
    renderWithProviders(<WorkspaceSwitcher />);
    await openMenu(user);
    await user.click(screen.getByLabelText(`Переименовать доску ${WS_B.name}`));
    const input = await screen.findByLabelText('Название');
    expect(input).toHaveValue(WS_B.name);
    // в jsdom Menu возвращает фокус на кнопку после первого символа (в браузере
    // такого нет — проверено e2e), поэтому меняем значение напрямую
    fireEvent.change(input, { target: { value: 'Офис' } });
    await user.click(screen.getByRole('button', { name: 'Сохранить' }));
    expect(workspacesApi.update).toHaveBeenCalledWith(WS_B.id, { name: 'Офис', color: WS_B.color });
    // клик по карандашу не переключает доску
    expect(state().activeId).toBe(WS_A.id);
  });

  it('у единственной доски нет кнопки удаления', async () => {
    const user = userEvent.setup();
    seedStores({ workspaces: [WS_A] });
    renderWithProviders(<WorkspaceSwitcher />);
    await openMenu(user);
    expect(screen.queryByLabelText(`Удалить доску ${WS_A.name}`)).toBeNull();
  });

  it('FE-12: удаление доски (каскадом со всеми задачами и заметками) требует подтверждения', async () => {
    const user = userEvent.setup();
    renderWithProviders(<WorkspaceSwitcher />);
    await openMenu(user);
    await user.click(screen.getByLabelText(`Удалить доску ${WS_B.name}`));
    // сейчас доска удаляется мгновенно, без диалога и без отмены
    expect(workspacesApi.remove).not.toHaveBeenCalled();
    expect(await screen.findByRole('dialog')).toBeInTheDocument();
  });

  it('FE-13: не падает, если досок нет (все удалены / ошибка гидрации)', () => {
    seedStores({ workspaces: [], activeId: '', homeId: '' });
    expect(() => renderWithProviders(<WorkspaceSwitcher />)).not.toThrow();
  });
});
