import { useEffect, useRef } from 'react';
import { IconCheck } from '@tabler/icons-react';
import { useQuickCategory } from './quickCategory';
import { useTasksStore } from '../../store/tasks';
import styles from './QuickCategoryMenu.module.scss';

const MENU_W = 240;
const MENU_H = 320;

export function QuickCategoryMenu() {
  const { taskId, x, y, close } = useQuickCategory();
  const tasks = useTasksStore((s) => s.tasks);
  const categories = useTasksStore((s) => s.categories);
  const updateTask = useTasksStore((s) => s.updateTask);
  const firstRef = useRef<HTMLButtonElement>(null);

  const task = taskId ? tasks.find((t) => t.id === taskId) : null;

  useEffect(() => {
    if (!taskId) return;
    firstRef.current?.focus();
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        close();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [taskId, close]);

  if (!taskId || !task) return null;

  const list = categories.filter((c) => c.workspaceId === task.workspaceId);

  // не даём меню вылезти за экран
  const left = Math.min(x, window.innerWidth - MENU_W - 12);
  const top = Math.min(y, window.innerHeight - MENU_H - 12);

  const pick = (categoryId: string | null) => {
    void updateTask(task.id, { categoryId });
    close();
  };

  return (
    <>
      <div className={styles.backdrop} onClick={close} aria-hidden />
      <div
        className={styles.menu}
        style={{ left: Math.max(8, left), top: Math.max(8, top) }}
        role="menu"
        aria-label="Категория задачи"
      >
        <div className={styles.title}>Категория</div>

        <button
          ref={firstRef}
          type="button"
          role="menuitem"
          className={styles.item}
          data-current={task.categoryId === null || undefined}
          onClick={() => pick(null)}
        >
          <span
            className={styles.dot}
            style={{ background: 'var(--app-text-dim)' }}
          />
          <span className={styles.name}>Без категории</span>
          {task.categoryId === null && <IconCheck size={14} />}
        </button>

        {list.length === 0 ? (
          <div className={styles.empty}>
            У этой доски пока нет категорий. Добавь их в карточке задачи.
          </div>
        ) : (
          list.map((c) => (
            <button
              key={c.id}
              type="button"
              role="menuitem"
              className={styles.item}
              data-current={task.categoryId === c.id || undefined}
              onClick={() => pick(c.id)}
            >
              <span className={styles.dot} style={{ background: c.color }} />
              <span className={styles.name}>{c.name}</span>
              {task.categoryId === c.id && <IconCheck size={14} />}
            </button>
          ))
        )}
      </div>
    </>
  );
}
