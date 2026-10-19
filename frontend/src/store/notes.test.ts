import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('../lib/resources', () => import('../test/resourcesMock'));

import { foldersApi, notesApi } from '../test/resourcesMock';
import { useNotesStore } from './notes';
import { makeNote, seedStores, WS_A } from '../test/utils';

const state = () => useNotesStore.getState();

beforeEach(() => {
  vi.clearAllMocks();
  seedStores();
});

describe('автосохранение заметки (дебаунс 600 мс)', () => {
  beforeEach(() => vi.useFakeTimers());
  afterEach(() => vi.useRealTimers());

  it('серия правок -> один PATCH с актуальными title и body', () => {
    seedStores({ notes: [makeNote({ id: 'n1', title: '', body: '' })] });
    state().updateNote('n1', { title: 'П' });
    state().updateNote('n1', { title: 'Пр' });
    state().updateNote('n1', { body: '<p>текст</p>' });
    vi.advanceTimersByTime(599);
    expect(notesApi.update).not.toHaveBeenCalled();
    vi.advanceTimersByTime(1);
    expect(notesApi.update).toHaveBeenCalledTimes(1);
    expect(notesApi.update).toHaveBeenCalledWith('n1', {
      title: 'Пр',
      body: '<p>текст</p>',
    });
  });

  it('дебаунс раздельный для разных заметок', () => {
    seedStores({ notes: [makeNote({ id: 'n1' }), makeNote({ id: 'n2' })] });
    state().updateNote('n1', { title: 'a' });
    state().updateNote('n2', { title: 'b' });
    vi.advanceTimersByTime(600);
    expect(notesApi.update).toHaveBeenCalledTimes(2);
  });

  it('updatedAt обновляется сразу (для сортировки списка)', () => {
    vi.setSystemTime(new Date('2026-10-19T12:00:00Z'));
    seedStores({ notes: [makeNote({ id: 'n1', updatedAt: 0 })] });
    state().updateNote('n1', { title: 'x' });
    expect(state().notes[0].updatedAt).toBe(Date.parse('2026-10-19T12:00:00Z'));
  });

  it('FE-03: удаление заметки отменяет отложенное сохранение (иначе PATCH на удалённую -> 404)', async () => {
    seedStores({ notes: [makeNote({ id: 'n1' })] });
    state().updateNote('n1', { title: 'x' });
    await state().deleteNote('n1');
    vi.advanceTimersByTime(1000);
    expect(notesApi.remove).toHaveBeenCalledWith('n1');
    expect(notesApi.update).not.toHaveBeenCalled();
  });

  it('FE-04: несохранённые правки дописываются при закрытии вкладки', () => {
    seedStores({ notes: [makeNote({ id: 'n1' })] });
    state().updateNote('n1', { title: 'важное' });
    window.dispatchEvent(new Event('beforeunload'));
    window.dispatchEvent(new Event('pagehide'));
    expect(notesApi.update).toHaveBeenCalledWith('n1', expect.objectContaining({ title: 'важное' }));
  });
});

describe('заметки и папки', () => {
  it('addNote кладёт новую заметку первой', async () => {
    seedStores({ notes: [makeNote({ id: 'old' })] });
    const id = await state().addNote(WS_A.id, null);
    expect(notesApi.create).toHaveBeenCalledWith(WS_A.id, null);
    expect(state().notes[0].id).toBe(id);
  });

  it('togglePin и moveNote', async () => {
    seedStores({ notes: [makeNote({ id: 'n1', isPinned: false })] });
    await state().togglePin('n1');
    expect(state().notes[0].isPinned).toBe(true);
    expect(notesApi.update).toHaveBeenLastCalledWith('n1', { isPinned: true });
    await state().moveNote('n1', 'f1');
    expect(state().notes[0].folderId).toBe('f1');
    expect(notesApi.update).toHaveBeenLastCalledWith('n1', { folderId: 'f1' });
  });

  it('deleteFolder: заметки становятся «без папки»', async () => {
    seedStores({
      folders: [{ id: 'f1', workspaceId: WS_A.id, name: 'Идеи' }],
      notes: [makeNote({ id: 'n1', folderId: 'f1' }), makeNote({ id: 'n2', folderId: null })],
    });
    await state().deleteFolder('f1');
    expect(state().folders).toEqual([]);
    expect(state().notes.map((n) => n.folderId)).toEqual([null, null]);
    expect(foldersApi.remove).toHaveBeenCalledWith('f1');
  });

  it('addFolder / renameFolder', async () => {
    const id = await state().addFolder(WS_A.id, 'Идеи');
    await state().renameFolder(id, 'Планы');
    expect(state().folders).toEqual([{ id, workspaceId: WS_A.id, name: 'Планы' }]);
    expect(foldersApi.update).toHaveBeenCalledWith(id, { name: 'Планы' });
  });
});
