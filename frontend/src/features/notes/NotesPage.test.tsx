import { beforeEach, describe, expect, it, vi } from 'vitest';
import { act, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

vi.mock('../../lib/resources', () => import('../../test/resourcesMock'));
// Tiptap в jsdom тяжёлый и не нужен для логики страницы — подменяем textarea
vi.mock('./NoteEditor', () => ({
  NoteEditor: ({ content, onChange }: { content: string; onChange: (h: string) => void }) => (
    <textarea aria-label="Текст заметки" value={content} onChange={(e) => onChange(e.target.value)} />
  ),
}));

import { foldersApi, notesApi } from '../../test/resourcesMock';
import { NotesPage } from './NotesPage';
import { useNotesStore } from '../../store/notes';
import { useWorkspaceStore } from '../../store/workspace';
import { makeNote, renderWithProviders, seedStores, WS_A, WS_B } from '../../test/utils';

const FOLDER = { id: 'f1', workspaceId: WS_A.id, name: 'Идеи' };

beforeEach(() => {
  vi.clearAllMocks();
  seedStores({
    folders: [FOLDER, { id: 'f2', workspaceId: WS_B.id, name: 'Чужая папка' }],
    notes: [
      makeNote({ id: 'n1', title: 'Список покупок', body: '<p>молоко</p>', updatedAt: 3 }),
      makeNote({ id: 'n2', title: '', body: '<p>в папке</p>', folderId: 'f1', updatedAt: 2 }),
      makeNote({ id: 'n3', title: 'Закреп', isPinned: true, updatedAt: 1 }),
      makeNote({ id: 'n4', title: 'С другой доски', workspaceId: WS_B.id }),
    ],
  });
});

const listTitles = () =>
  Array.from(document.querySelectorAll('[class*="_itemTitle_"]')).map((e) => e.textContent);

describe('NotesPage: список', () => {
  it('заметки активной доски: закреплённые сверху, затем по дате изменения', () => {
    renderWithProviders(<NotesPage />);
    expect(listTitles()).toEqual(['Закреп', 'Список покупок', 'Без названия']);
    expect(screen.queryByText('С другой доски')).toBeNull();
    expect(screen.queryByText('Чужая папка')).toBeNull();
  });

  it('превью — текст без HTML', () => {
    renderWithProviders(<NotesPage />);
    expect(screen.getByText('молоко')).toBeInTheDocument();
    expect(screen.queryByText(/<p>/)).toBeNull();
  });

  it('FE-18: в превью HTML-сущности раскодируются', () => {
    seedStores({ notes: [makeNote({ body: '<p>Tom &amp; Jerry &lt;3&nbsp;!</p>' })] });
    renderWithProviders(<NotesPage />);
    expect(screen.getByText('Tom & Jerry <3 !')).toBeInTheDocument();
  });

  it('фильтр по папкам и счётчики', async () => {
    const user = userEvent.setup();
    renderWithProviders(<NotesPage />);
    const folders = screen.getByText('Все заметки').closest('div')!;
    expect(within(folders).getByText('Все заметки').nextSibling).toHaveTextContent('3');
    await user.click(screen.getByText('Идеи'));
    expect(listTitles()).toEqual(['Без названия']);
    await user.click(screen.getByText('Без папки'));
    expect(listTitles()).toEqual(['Закреп', 'Список покупок']);
  });

  it('в «Все доски» показываются заметки последней доски и подсказка', () => {
    seedStores({
      activeId: 'all',
      homeId: WS_B.id,
      notes: useNotesStore.getState().notes,
      folders: useNotesStore.getState().folders,
    });
    renderWithProviders(<NotesPage />);
    expect(listTitles()).toEqual(['С другой доски']);
    expect(screen.getByText(new RegExp(`показана «${WS_B.name}»`))).toBeInTheDocument();
  });

  it('при смене доски выбор заметки сбрасывается', async () => {
    const user = userEvent.setup();
    renderWithProviders(<NotesPage />);
    await user.click(screen.getByText('Список покупок'));
    expect(screen.getByPlaceholderText('Заголовок')).toBeInTheDocument();
    act(() => useWorkspaceStore.getState().setActive(WS_B.id));
    expect(screen.queryByPlaceholderText('Заголовок')).toBeNull();
  });
});

describe('NotesPage: редактирование', () => {
  it('новая заметка создаётся в выбранной папке и открывается', async () => {
    const user = userEvent.setup();
    renderWithProviders(<NotesPage />);
    await user.click(screen.getByText('Идеи'));
    await user.click(screen.getByRole('button', { name: 'Новая заметка' }));
    expect(notesApi.create).toHaveBeenCalledWith(WS_A.id, 'f1');
    expect(await screen.findByPlaceholderText('Заголовок')).toHaveValue('');
  });

  it('правка заголовка и текста идёт в стор', async () => {
    const user = userEvent.setup();
    renderWithProviders(<NotesPage />);
    await user.click(screen.getByText('Список покупок'));
    await user.type(screen.getByPlaceholderText('Заголовок'), '!');
    expect(useNotesStore.getState().notes.find((n) => n.id === 'n1')?.title).toBe(
      'Список покупок!',
    );
  });

  it('закрепление и перенос в папку через меню', async () => {
    const user = userEvent.setup();
    renderWithProviders(<NotesPage />);
    await user.click(screen.getByText('Список покупок'));
    await user.click(screen.getByRole('button', { name: 'Закрепить заметку' }));
    expect(notesApi.update).toHaveBeenCalledWith('n1', { isPinned: true });

    await user.click(screen.getByRole('button', { name: 'Папка заметки' }));
    await user.click(await screen.findByRole('menuitem', { name: 'Идеи', hidden: true }));
    expect(notesApi.update).toHaveBeenCalledWith('n1', { folderId: 'f1' });
  });

  it('удаление заметки', async () => {
    const user = userEvent.setup();
    renderWithProviders(<NotesPage />);
    await user.click(screen.getByText('Список покупок'));
    await user.click(screen.getByRole('button', { name: 'Удалить заметку' }));
    expect(notesApi.remove).toHaveBeenCalledWith('n1');
    expect(screen.queryByText('Список покупок')).toBeNull();
  });
});

describe('NotesPage: папки', () => {
  it('создание папки по Enter; пустое имя игнорируется', async () => {
    const user = userEvent.setup();
    renderWithProviders(<NotesPage />);
    await user.click(screen.getByText('Новая папка'));
    await user.keyboard('   {Enter}');
    expect(foldersApi.create).not.toHaveBeenCalled();
    await user.click(screen.getByText('Новая папка'));
    await user.keyboard('Рецепты{Enter}');
    expect(foldersApi.create).toHaveBeenCalledTimes(1);
    expect(foldersApi.create).toHaveBeenCalledWith(WS_A.id, 'Рецепты');
  });

  it('переименование папки', async () => {
    const user = userEvent.setup();
    renderWithProviders(<NotesPage />);
    await user.click(screen.getByRole('button', { name: 'Переименовать папку Идеи' }));
    await user.keyboard('{Control>}a{/Control}Планы{Enter}');
    await waitFor(() => expect(foldersApi.update).toHaveBeenCalledWith('f1', { name: 'Планы' }));
    expect(foldersApi.update).toHaveBeenCalledTimes(1);
  });

  it('удаление папки — с подтверждением, заметки остаются', async () => {
    const user = userEvent.setup();
    renderWithProviders(<NotesPage />);
    await user.click(screen.getByRole('button', { name: 'Удалить папку Идеи' }));
    expect(foldersApi.remove).not.toHaveBeenCalled();
    await user.click(await screen.findByRole('button', { name: 'Удалить', hidden: true }));
    expect(foldersApi.remove).toHaveBeenCalledWith('f1');
    expect(useNotesStore.getState().notes.find((n) => n.id === 'n2')?.folderId).toBeNull();
  });
});
