import { useEffect, useState } from 'react';
import { ActionIcon, Menu, TextInput, Tooltip } from '@mantine/core';
import { modals } from '@mantine/modals';
import {
  DndContext,
  DragOverlay,
  MouseSensor,
  TouchSensor,
  useSensor,
  useSensors,
  useDraggable,
  useDroppable,
  pointerWithin,
  type DragStartEvent,
  type DragEndEvent,
} from '@dnd-kit/core';
import {
  IconPlus,
  IconTrash,
  IconChevronLeft,
  IconNote,
  IconNotes,
  IconInbox,
  IconFolder,
  IconFolderPlus,
  IconPencil,
  IconPin,
  IconPinFilled,
  IconCheck,
  IconX,
} from '@tabler/icons-react';
import dayjs from 'dayjs';
import { useNotesStore, type Note } from '../../store/notes';
import { useWorkspaceScope, useWorkspace } from '../../store/workspace';
import { NoteEditor } from './NoteEditor';
import styles from './NotesPage.module.scss';

const stripHtml = (html: string) =>
  html
    .replace(/<[^>]+>/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();

// 'all' = все заметки доски, null = без папки, string = id папки
type FolderFilter = 'all' | string | null;

// id зон сброса: сентинел для «Без папки» + `folder-<id>` для папок
const NONE_DROP = 'folder-none';
const FOLDER_PREFIX = 'folder-';

// заметка, которую можно перетащить
function DraggableNoteItem({
  note,
  selected,
  onSelect,
}: {
  note: Note;
  selected: boolean;
  onSelect: (id: string) => void;
}) {
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({
    id: note.id,
  });
  const preview = stripHtml(note.body) || 'Нет текста';
  return (
    <button
      ref={setNodeRef}
      type="button"
      className={styles.item}
      data-active={selected || undefined}
      data-dragging={isDragging || undefined}
      onClick={() => onSelect(note.id)}
      {...listeners}
      {...attributes}
    >
      <div className={styles.itemTitleRow}>
        {note.isPinned && <IconPinFilled size={13} className={styles.pin} />}
        <span className={styles.itemTitle}>
          {note.title.trim() || 'Без названия'}
        </span>
      </div>
      <div className={styles.itemMeta}>
        <span className={styles.itemDate}>
          {dayjs(note.updatedAt).format('D MMM')}
        </span>
        <span className={styles.itemPreview}>{preview}</span>
      </div>
    </button>
  );
}

// «Без папки» — тоже зона сброса
function NoFolderTarget({
  active,
  count,
  onSelect,
}: {
  active: boolean;
  count: number;
  onSelect: () => void;
}) {
  const { setNodeRef, isOver } = useDroppable({ id: NONE_DROP });
  return (
    <button
      ref={setNodeRef}
      type="button"
      className={styles.folder}
      data-active={active || undefined}
      data-over={isOver || undefined}
      onClick={onSelect}
    >
      <IconInbox size={16} />
      <span className={styles.folderName}>Без папки</span>
      <span className={styles.folderCount}>{count}</span>
    </button>
  );
}

// строка папки — зона сброса + фильтр + переименование/удаление
function FolderTargetRow({
  id,
  name,
  active,
  count,
  onSelect,
  onEdit,
  onDelete,
}: {
  id: string;
  name: string;
  active: boolean;
  count: number;
  onSelect: () => void;
  onEdit: () => void;
  onDelete: () => void;
}) {
  const { setNodeRef, isOver } = useDroppable({ id: `${FOLDER_PREFIX}${id}` });
  return (
    <div
      ref={setNodeRef}
      className={styles.folderRow}
      data-over={isOver || undefined}
    >
      <button
        type="button"
        className={styles.folder}
        data-active={active || undefined}
        onClick={onSelect}
      >
        <IconFolder size={16} />
        <span className={styles.folderName}>{name}</span>
        <span className={styles.folderCount}>{count}</span>
      </button>
      <span className={styles.folderActions}>
        <ActionIcon
          variant="subtle"
          color="gray"
          size="sm"
          aria-label={`Переименовать папку ${name}`}
          onClick={onEdit}
        >
          <IconPencil size={14} />
        </ActionIcon>
        <ActionIcon
          variant="subtle"
          color="red"
          size="sm"
          aria-label={`Удалить папку ${name}`}
          onClick={onDelete}
        >
          <IconTrash size={14} />
        </ActionIcon>
      </span>
    </div>
  );
}

export function NotesPage() {
  const notes = useNotesStore((s) => s.notes);
  const folders = useNotesStore((s) => s.folders);
  const addNote = useNotesStore((s) => s.addNote);
  const updateNote = useNotesStore((s) => s.updateNote);
  const deleteNote = useNotesStore((s) => s.deleteNote);
  const moveNote = useNotesStore((s) => s.moveNote);
  const togglePin = useNotesStore((s) => s.togglePin);
  const addFolder = useNotesStore((s) => s.addFolder);
  const renameFolder = useNotesStore((s) => s.renameFolder);
  const deleteFolder = useNotesStore((s) => s.deleteFolder);
  // заметки и папки у каждой доски свои; в «Все доски» показываем
  // последнюю выбранную доску
  const { isAll, targetId: activeWorkspace } = useWorkspaceScope();
  const homeName = useWorkspace(activeWorkspace)?.name;

  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [folderFilter, setFolderFilter] = useState<FolderFilter>('all');
  const [creatingFolder, setCreatingFolder] = useState(false);
  const [folderName, setFolderName] = useState('');
  const [renamingId, setRenamingId] = useState<string | null>(null);
  const [renameValue, setRenameValue] = useState('');
  const [dragId, setDragId] = useState<string | null>(null);

  // мышь — тянем сразу после сдвига; тач — после лёгкого удержания (чтобы
  // не мешать прокрутке списка на телефоне)
  const sensors = useSensors(
    useSensor(MouseSensor, { activationConstraint: { distance: 6 } }),
    useSensor(TouchSensor, {
      activationConstraint: { delay: 200, tolerance: 6 },
    }),
  );

  // при смене доски сбрасываем выбор — папки и заметки у каждой доски свои
  useEffect(() => {
    setFolderFilter('all');
    setSelectedId(null);
  }, [activeWorkspace]);

  const wsFolders = folders.filter((f) => f.workspaceId === activeWorkspace);
  const wsNotes = notes.filter((n) => n.workspaceId === activeWorkspace);

  const countIn = (filter: FolderFilter) =>
    filter === 'all'
      ? wsNotes.length
      : wsNotes.filter((n) => n.folderId === filter).length;

  const visible = wsNotes
    .filter((n) => folderFilter === 'all' || n.folderId === folderFilter)
    .sort((a, b) => {
      if (a.isPinned !== b.isPinned) return a.isPinned ? -1 : 1;
      return b.updatedAt - a.updatedAt;
    });

  const selected = wsNotes.find((n) => n.id === selectedId) ?? null;
  const selectedFolderName = selected?.folderId
    ? (wsFolders.find((f) => f.id === selected.folderId)?.name ?? 'Без папки')
    : 'Без папки';
  const draggedNote = dragId ? wsNotes.find((n) => n.id === dragId) : null;

  const createNote = async () => {
    const folderId = folderFilter === 'all' ? null : folderFilter;
    const id = await addNote(activeWorkspace, folderId);
    setSelectedId(id);
  };

  const removeSelected = () => {
    if (selected) {
      deleteNote(selected.id);
      setSelectedId(null);
    }
  };

  const submitNewFolder = async () => {
    const trimmed = folderName.trim();
    setFolderName('');
    setCreatingFolder(false);
    if (!trimmed) return;
    const id = await addFolder(activeWorkspace, trimmed);
    setFolderFilter(id);
  };

  const submitRename = async () => {
    const trimmed = renameValue.trim();
    const id = renamingId;
    setRenamingId(null);
    if (id && trimmed) await renameFolder(id, trimmed);
  };

  const confirmDeleteFolder = (id: string, name: string) =>
    modals.openConfirmModal({
      title: 'Удалить папку?',
      centered: true,
      children: (
        <span style={{ fontSize: 14 }}>
          Папка «{name}» будет удалена. Заметки из неё не пропадут — они станут
          «Без папки».
        </span>
      ),
      labels: { confirm: 'Удалить', cancel: 'Отмена' },
      confirmProps: { color: 'red' },
      onConfirm: () => {
        if (folderFilter === id) setFolderFilter('all');
        deleteFolder(id);
      },
    });

  const onDragEnd = (e: DragEndEvent) => {
    setDragId(null);
    const { active, over } = e;
    if (!over) return;
    const noteId = String(active.id);
    const overId = String(over.id);
    const target: string | null =
      overId === NONE_DROP ? null : overId.slice(FOLDER_PREFIX.length);
    const note = wsNotes.find((n) => n.id === noteId);
    if (note && note.folderId !== target) void moveNote(noteId, target);
  };

  return (
    <div className={styles.notes} data-detail={selected ? 'true' : undefined}>
      {/* Список заметок */}
      <aside className={styles.list}>
        <div className={styles.listHead}>
          <div>
            <h2 className={styles.heading}>Заметки</h2>
            {isAll && homeName && (
              <div className={styles.headingHint}>
                Заметки у каждой доски свои — показана «{homeName}»
              </div>
            )}
          </div>
          <ActionIcon
            variant="light"
            size="lg"
            aria-label="Новая заметка"
            onClick={createNote}
          >
            <IconPlus size={18} />
          </ActionIcon>
        </div>

        <DndContext
          sensors={sensors}
          collisionDetection={pointerWithin}
          onDragStart={(e: DragStartEvent) => setDragId(String(e.active.id))}
          onDragCancel={() => setDragId(null)}
          onDragEnd={onDragEnd}
        >
          {/* Папки */}
          <div className={styles.folders}>
            <button
              type="button"
              className={styles.folder}
              data-active={folderFilter === 'all' || undefined}
              onClick={() => setFolderFilter('all')}
            >
              <IconNotes size={16} />
              <span className={styles.folderName}>Все заметки</span>
              <span className={styles.folderCount}>{countIn('all')}</span>
            </button>

            <NoFolderTarget
              active={folderFilter === null}
              count={countIn(null)}
              onSelect={() => setFolderFilter(null)}
            />

            {wsFolders.map((f) =>
              renamingId === f.id ? (
                <TextInput
                  key={f.id}
                  className={styles.folderInput}
                  size="xs"
                  value={renameValue}
                  autoFocus
                  onChange={(e) => setRenameValue(e.currentTarget.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') submitRename();
                    if (e.key === 'Escape') setRenamingId(null);
                  }}
                  onBlur={submitRename}
                  rightSection={
                    <ActionIcon
                      variant="subtle"
                      size="sm"
                      aria-label="Сохранить название"
                      onMouseDown={(e) => e.preventDefault()}
                      onClick={submitRename}
                    >
                      <IconCheck size={14} />
                    </ActionIcon>
                  }
                />
              ) : (
                <FolderTargetRow
                  key={f.id}
                  id={f.id}
                  name={f.name}
                  active={folderFilter === f.id}
                  count={countIn(f.id)}
                  onSelect={() => setFolderFilter(f.id)}
                  onEdit={() => {
                    setRenamingId(f.id);
                    setRenameValue(f.name);
                  }}
                  onDelete={() => confirmDeleteFolder(f.id, f.name)}
                />
              ),
            )}

            {creatingFolder ? (
              <TextInput
                className={styles.folderInput}
                size="xs"
                placeholder="Название папки"
                value={folderName}
                autoFocus
                onChange={(e) => setFolderName(e.currentTarget.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') submitNewFolder();
                  if (e.key === 'Escape') {
                    setCreatingFolder(false);
                    setFolderName('');
                  }
                }}
                onBlur={submitNewFolder}
                rightSection={
                  <ActionIcon
                    variant="subtle"
                    size="sm"
                    aria-label="Отменить"
                    onMouseDown={(e) => e.preventDefault()}
                    onClick={() => {
                      setCreatingFolder(false);
                      setFolderName('');
                    }}
                  >
                    <IconX size={14} />
                  </ActionIcon>
                }
              />
            ) : (
              <button
                type="button"
                className={styles.addFolder}
                onClick={() => setCreatingFolder(true)}
              >
                <IconFolderPlus size={16} />
                <span>Новая папка</span>
              </button>
            )}
          </div>

          {visible.length === 0 ? (
            <div className={styles.emptyList}>
              Пока нет заметок. Нажми ＋, чтобы создать.
            </div>
          ) : (
            <div className={styles.items}>
              {visible.map((note) => (
                <DraggableNoteItem
                  key={note.id}
                  note={note}
                  selected={note.id === selectedId}
                  onSelect={setSelectedId}
                />
              ))}
            </div>
          )}

          <DragOverlay>
            {draggedNote ? (
              <div className={styles.dragChip}>
                {draggedNote.isPinned && (
                  <IconPinFilled size={13} className={styles.pin} />
                )}
                <span>{draggedNote.title.trim() || 'Без названия'}</span>
              </div>
            ) : null}
          </DragOverlay>
        </DndContext>
      </aside>

      {/* Редактор */}
      <section className={styles.editor}>
        {selected ? (
          <>
            <div className={styles.editorBar}>
              <ActionIcon
                className={styles.backBtn}
                variant="subtle"
                color="gray"
                onClick={() => setSelectedId(null)}
                aria-label="Назад"
              >
                <IconChevronLeft size={20} />
              </ActionIcon>

              <Menu shadow="md" width={220} position="bottom-start">
                <Menu.Target>
                  <ActionIcon
                    variant="subtle"
                    color="gray"
                    aria-label="Папка заметки"
                    style={{ width: 'auto', padding: '0 8px', gap: 6 }}
                  >
                    <IconFolder size={16} />
                    <span style={{ fontSize: 13 }}>{selectedFolderName}</span>
                  </ActionIcon>
                </Menu.Target>
                <Menu.Dropdown>
                  <Menu.Label>Переместить в папку</Menu.Label>
                  <Menu.Item
                    leftSection={<IconInbox size={16} />}
                    rightSection={
                      !selected.folderId ? <IconCheck size={14} /> : null
                    }
                    onClick={() => moveNote(selected.id, null)}
                  >
                    Без папки
                  </Menu.Item>
                  {wsFolders.map((f) => (
                    <Menu.Item
                      key={f.id}
                      leftSection={<IconFolder size={16} />}
                      rightSection={
                        selected.folderId === f.id ? (
                          <IconCheck size={14} />
                        ) : null
                      }
                      onClick={() => moveNote(selected.id, f.id)}
                    >
                      {f.name}
                    </Menu.Item>
                  ))}
                </Menu.Dropdown>
              </Menu>

              <span className={styles.editorDate}>
                {dayjs(selected.updatedAt).format('D MMMM YYYY, HH:mm')}
              </span>

              <Tooltip
                label={selected.isPinned ? 'Открепить' : 'Закрепить'}
                withArrow
              >
                <ActionIcon
                  variant="subtle"
                  color={selected.isPinned ? 'yellow' : 'gray'}
                  onClick={() => togglePin(selected.id)}
                  aria-label="Закрепить заметку"
                >
                  {selected.isPinned ? (
                    <IconPinFilled size={18} />
                  ) : (
                    <IconPin size={18} />
                  )}
                </ActionIcon>
              </Tooltip>

              <ActionIcon
                variant="subtle"
                color="red"
                onClick={removeSelected}
                aria-label="Удалить заметку"
              >
                <IconTrash size={18} />
              </ActionIcon>
            </div>

            <input
              className={styles.titleInput}
              placeholder="Заголовок"
              value={selected.title}
              onChange={(e) =>
                updateNote(selected.id, { title: e.currentTarget.value })
              }
            />
            <NoteEditor
              key={selected.id}
              content={selected.body}
              onChange={(html) => updateNote(selected.id, { body: html })}
            />
          </>
        ) : (
          <div className={styles.editorEmpty}>
            <IconNote size={40} stroke={1.3} />
            <p>Выбери заметку слева или создай новую</p>
          </div>
        )}
      </section>
    </div>
  );
}
