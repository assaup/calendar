import { Button, Checkbox, ActionIcon, Menu } from '@mantine/core';
import {
  IconPlus,
  IconDots,
  IconPencil,
  IconTrash,
  IconCalendar,
} from '@tabler/icons-react';
import dayjs from 'dayjs';
import { PageShell } from '../../components/ui/PageShell';
import { CategoryBadge } from '../../components/ui/CategoryBadge';
import { useTasksStore } from '../../store/tasks';
import { useWorkspaceStore } from '../../store/workspace';
import { useTaskEditor } from '../tasks/taskEditor';
import styles from './TodoPage.module.scss';

export function TodoPage() {
  const tasks = useTasksStore((s) => s.tasks);
  const categories = useTasksStore((s) => s.categories);
  const toggleDone = useTasksStore((s) => s.toggleDone);
  const deleteTask = useTasksStore((s) => s.deleteTask);
  const activeWorkspace = useWorkspaceStore((s) => s.activeId);
  const openNew = useTaskEditor((s) => s.openNew);
  const openEdit = useTaskEditor((s) => s.openEdit);

  const catColor = (id: string | null) =>
    categories.find((c) => c.id === id)?.color ?? 'transparent';

  const visible = tasks
    .filter((t) => t.workspaceId === activeWorkspace)
    .sort((a, b) => {
      const doneA = a.status === 'done' ? 1 : 0;
      const doneB = b.status === 'done' ? 1 : 0;
      if (doneA !== doneB) return doneA - doneB;
      return (a.dueDate ?? '9999').localeCompare(b.dueDate ?? '9999');
    });

  return (
    <PageShell
      title="Задачи"
      description="Все задачи пространства одним списком."
      action={
        <Button leftSection={<IconPlus size={16} />} onClick={() => openNew()}>
          Добавить
        </Button>
      }
    >
      {visible.length === 0 ? (
        <div className={styles.empty}>
          Пока пусто. Нажми «Добавить», чтобы создать первую задачу.
        </div>
      ) : (
        <div className={styles.list}>
          {visible.map((task) => (
            <div
              key={task.id}
              className={styles.row}
              style={{ borderLeftColor: catColor(task.categoryId) }}
              onClick={() => openEdit(task.id)}
              role="button"
              tabIndex={0}
              onKeyDown={(e) => e.key === 'Enter' && openEdit(task.id)}
            >
              <Checkbox
                size="sm"
                checked={task.status === 'done'}
                onChange={() => toggleDone(task.id)}
                onClick={(e) => e.stopPropagation()}
                aria-label="Готово"
              />
              <div className={styles.main}>
                <span
                  className={styles.title}
                  data-done={task.status === 'done' || undefined}
                >
                  {task.title}
                </span>
                <CategoryBadge categoryId={task.categoryId} />
              </div>

              {task.dueDate && (
                <span className={styles.due}>
                  <IconCalendar size={13} />
                  {dayjs(task.dueDate).format('D MMM')}
                </span>
              )}

              <Menu shadow="md" position="bottom-end" width={160}>
                <Menu.Target>
                  <ActionIcon
                    variant="subtle"
                    color="gray"
                    size="sm"
                    onClick={(e) => e.stopPropagation()}
                    aria-label="Меню задачи"
                  >
                    <IconDots size={16} />
                  </ActionIcon>
                </Menu.Target>
                <Menu.Dropdown onClick={(e) => e.stopPropagation()}>
                  <Menu.Item
                    leftSection={<IconPencil size={15} />}
                    onClick={() => openEdit(task.id)}
                  >
                    Редактировать
                  </Menu.Item>
                  <Menu.Item
                    color="red"
                    leftSection={<IconTrash size={15} />}
                    onClick={() => deleteTask(task.id)}
                  >
                    Удалить
                  </Menu.Item>
                </Menu.Dropdown>
              </Menu>
            </div>
          ))}
        </div>
      )}
    </PageShell>
  );
}
