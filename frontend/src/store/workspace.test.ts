import { beforeEach, describe, expect, it, vi } from 'vitest';
import { renderHook } from '@testing-library/react';

vi.mock('../lib/resources', () => import('../test/resourcesMock'));

import { workspacesApi } from '../test/resourcesMock';
import {
  ALL_WORKSPACES,
  useWorkspaceScope,
  useWorkspaceStore,
} from './workspace';
import { useTasksStore } from './tasks';
import { useNotesStore } from './notes';
import {
  makeCategory,
  makeNote,
  makeTask,
  seedStores,
  WS_A,
  WS_B,
} from '../test/utils';

const state = () => useWorkspaceStore.getState();

beforeEach(() => {
  vi.clearAllMocks();
  seedStores({ workspaces: [], activeId: '', homeId: '' });
});

describe('hydrate', () => {
  it('первая загрузка: выбирается первая доска', () => {
    state().hydrate([WS_A, WS_B]);
    expect(state()).toMatchObject({ activeId: WS_A.id, homeId: WS_A.id });
  });

  it('сохранённый выбор сохраняется, если доска ещё существует', () => {
    useWorkspaceStore.setState({ activeId: WS_B.id, homeId: WS_B.id });
    state().hydrate([WS_A, WS_B]);
    expect(state()).toMatchObject({ activeId: WS_B.id, homeId: WS_B.id });
  });

  it('«Все доски» сохраняются; homeId чинится, если доски больше нет', () => {
    useWorkspaceStore.setState({ activeId: ALL_WORKSPACES, homeId: 'deleted' });
    state().hydrate([WS_A, WS_B]);
    expect(state()).toMatchObject({ activeId: ALL_WORKSPACES, homeId: WS_A.id });
  });

  it('выбор чужой/удалённой доски (например, другой пользователь в том же браузере)', () => {
    useWorkspaceStore.setState({ activeId: '999', homeId: '999' });
    state().hydrate([WS_A, WS_B]);
    expect(state()).toMatchObject({ activeId: WS_A.id, homeId: WS_A.id });
  });

  it('persist хранит только выбор, а не список досок', () => {
    state().hydrate([WS_A, WS_B]);
    state().setActive(WS_B.id);
    const saved = JSON.parse(localStorage.getItem('workspace-store') ?? '{}');
    expect(saved.state).toEqual({ activeId: WS_B.id, homeId: WS_B.id });
  });
});

describe('setActive / scope', () => {
  beforeEach(() => state().hydrate([WS_A, WS_B]));

  it('«Все доски» не трогает homeId — туда создаются новые задачи', () => {
    state().setActive(WS_B.id);
    state().setActive(ALL_WORKSPACES);
    expect(state()).toMatchObject({ activeId: ALL_WORKSPACES, homeId: WS_B.id });
    const { result } = renderHook(() => useWorkspaceScope());
    expect(result.current.isAll).toBe(true);
    expect(result.current.targetId).toBe(WS_B.id);
    expect(result.current.inScope(WS_A.id)).toBe(true);
  });

  it('обычная доска: inScope только для неё', () => {
    state().setActive(WS_A.id);
    const { result } = renderHook(() => useWorkspaceScope());
    expect(result.current.inScope(WS_A.id)).toBe(true);
    expect(result.current.inScope(WS_B.id)).toBe(false);
  });
});

describe('add / update / delete', () => {
  beforeEach(() => state().hydrate([WS_A, WS_B]));

  it('addWorkspace делает новую доску активной', async () => {
    const id = await state().addWorkspace('Стройка', '#000000');
    expect(workspacesApi.create).toHaveBeenCalledWith('Стройка', '#000000');
    expect(state()).toMatchObject({ activeId: id, homeId: id });
    expect(state().workspaces).toHaveLength(3);
  });

  it('updateWorkspace переименовывает', async () => {
    await state().updateWorkspace(WS_A.id, { name: 'Дом' });
    expect(state().workspaces[0].name).toBe('Дом');
    expect(workspacesApi.update).toHaveBeenCalledWith(WS_A.id, { name: 'Дом' });
  });

  it('удаление активной доски переключает на оставшуюся', async () => {
    state().setActive(WS_A.id);
    await state().deleteWorkspace(WS_A.id);
    expect(state().workspaces).toEqual([WS_B]);
    expect(state()).toMatchObject({ activeId: WS_B.id, homeId: WS_B.id });
    expect(workspacesApi.remove).toHaveBeenCalledWith(WS_A.id);
  });

  it('последнюю доску удалить нельзя', async () => {
    await state().deleteWorkspace(WS_A.id);
    await state().deleteWorkspace(WS_B.id);
    expect(state().workspaces).toEqual([WS_B]);
    expect(workspacesApi.remove).toHaveBeenCalledTimes(1);
  });

  it('FE-02: после удаления доски её задачи/категории/заметки уходят из сторов', async () => {
    // на сервере они удаляются каскадом, а локально остаются и видны в «Все доски»
    useTasksStore.setState({
      tasks: [makeTask({ workspaceId: WS_A.id }), makeTask({ workspaceId: WS_B.id })],
      categories: [makeCategory({ workspaceId: WS_A.id })],
    });
    useNotesStore.setState({ notes: [makeNote({ workspaceId: WS_A.id })], folders: [] });
    await state().deleteWorkspace(WS_A.id);
    expect(useTasksStore.getState().tasks.every((t) => t.workspaceId !== WS_A.id)).toBe(true);
    expect(useTasksStore.getState().categories).toEqual([]);
    expect(useNotesStore.getState().notes).toEqual([]);
  });

  it('FE-01: если сервер не удалил доску — она возвращается в список', async () => {
    workspacesApi.remove.mockRejectedValueOnce(new Error('500'));
    await state()
      .deleteWorkspace(WS_A.id)
      .catch(() => {});
    expect(state().workspaces.map((w) => w.id)).toContain(WS_A.id);
  });
});
