import { useState } from 'react';
import { ActionIcon } from '@mantine/core';
import {
  IconPlus,
  IconTrash,
  IconChevronLeft,
  IconNote,
} from '@tabler/icons-react';
import dayjs from 'dayjs';
import { useNotesStore } from '../../store/notes';
import { useWorkspaceStore } from '../../store/workspace';
import styles from './NotesPage.module.scss';

export function NotesPage() {
  const notes = useNotesStore((s) => s.notes);
  const addNote = useNotesStore((s) => s.addNote);
  const updateNote = useNotesStore((s) => s.updateNote);
  const deleteNote = useNotesStore((s) => s.deleteNote);
  const activeWorkspace = useWorkspaceStore((s) => s.activeId);

  const [selectedId, setSelectedId] = useState<string | null>(null);

  const visible = notes
    .filter((n) => n.workspaceId === activeWorkspace)
    .sort((a, b) => b.updatedAt - a.updatedAt);

  const selected = visible.find((n) => n.id === selectedId) ?? null;

  const createNote = () => {
    const id = addNote(activeWorkspace);
    setSelectedId(id);
  };

  const removeSelected = () => {
    if (selected) {
      deleteNote(selected.id);
      setSelectedId(null);
    }
  };

  return (
    <div className={styles.notes} data-detail={selected ? 'true' : undefined}>
      {/* Список заметок */}
      <aside className={styles.list}>
        <div className={styles.listHead}>
          <h2 className={styles.heading}>Заметки</h2>
          <ActionIcon
            variant="light"
            size="lg"
            aria-label="Новая заметка"
            onClick={createNote}
          >
            <IconPlus size={18} />
          </ActionIcon>
        </div>

        {visible.length === 0 ? (
          <div className={styles.emptyList}>
            Пока нет заметок. Нажми ＋, чтобы создать.
          </div>
        ) : (
          <div className={styles.items}>
            {visible.map((note) => {
              const preview =
                note.body.split('\n').find((l) => l.trim()) || 'Нет текста';
              return (
                <button
                  key={note.id}
                  type="button"
                  className={styles.item}
                  data-active={note.id === selectedId || undefined}
                  onClick={() => setSelectedId(note.id)}
                >
                  <div className={styles.itemTitle}>
                    {note.title.trim() || 'Без названия'}
                  </div>
                  <div className={styles.itemMeta}>
                    <span className={styles.itemDate}>
                      {dayjs(note.updatedAt).format('D MMM')}
                    </span>
                    <span className={styles.itemPreview}>{preview}</span>
                  </div>
                </button>
              );
            })}
          </div>
        )}
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
              <span className={styles.editorDate}>
                {dayjs(selected.updatedAt).format('D MMMM YYYY, HH:mm')}
              </span>
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
            <textarea
              className={styles.bodyInput}
              placeholder="Начни писать…"
              value={selected.body}
              onChange={(e) =>
                updateNote(selected.id, { body: e.currentTarget.value })
              }
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
