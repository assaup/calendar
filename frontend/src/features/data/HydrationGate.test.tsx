import { beforeEach, describe, expect, it, vi } from 'vitest';
import { screen } from '@testing-library/react';

vi.mock('../../lib/resources', () => import('../../test/resourcesMock'));

import {
  categoriesApi,
  foldersApi,
  notesApi,
  tasksApi,
  workspacesApi,
} from '../../test/resourcesMock';
import { HydrationGate } from './HydrationGate';
import { useWorkspaceStore } from '../../store/workspace';
import { useTasksStore } from '../../store/tasks';
import { useNotesStore } from '../../store/notes';
import { makeCategory, makeNote, makeTask, renderWithProviders, seedStores, WS_A, WS_B } from '../../test/utils';

beforeEach(() => {
  vi.clearAllMocks();
  seedStores({ workspaces: [], activeId: '', homeId: '' });
});

describe('HydrationGate', () => {
  it('грузит всё параллельно, раскладывает по сторам и показывает приложение', async () => {
    workspacesApi.list.mockResolvedValueOnce([WS_A, WS_B]);
    categoriesApi.list.mockResolvedValueOnce([makeCategory()]);
    tasksApi.list.mockResolvedValueOnce([makeTask({ title: 'с сервера' })]);
    notesApi.list.mockResolvedValueOnce([makeNote()]);
    foldersApi.list.mockResolvedValueOnce([]);

    renderWithProviders(
      <HydrationGate>
        <div>приложение</div>
      </HydrationGate>,
    );
    expect(screen.queryByText('приложение')).toBeNull(); // пока лоадер
    expect(await screen.findByText('приложение')).toBeInTheDocument();
    expect(useWorkspaceStore.getState()).toMatchObject({ activeId: WS_A.id });
    expect(useTasksStore.getState().tasks[0].title).toBe('с сервера');
    expect(useTasksStore.getState().categories).toHaveLength(1);
    expect(useNotesStore.getState().notes).toHaveLength(1);
  });

  it('ошибка любого запроса — экран с кнопкой «Обновить»', async () => {
    tasksApi.list.mockRejectedValueOnce(new Error('500'));
    renderWithProviders(
      <HydrationGate>
        <div>приложение</div>
      </HydrationGate>,
    );
    expect(await screen.findByText('Не удалось загрузить данные.')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Обновить' })).toBeInTheDocument();
    expect(screen.queryByText('приложение')).toBeNull();
  });
});
