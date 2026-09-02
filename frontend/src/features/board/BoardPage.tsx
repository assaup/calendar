import { Checkbox, ActionIcon, Menu } from '@mantine/core';
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
import { useTasksStore, type Task, type TaskStatus } from '../../store/tasks';
import { useWorkspaceStore } from '../../store/workspace';
import { useTaskEditor } from '../tasks/taskEditor';
import styles from './BoardPage.module.scss';

const COLUMNS: { status: TaskStatus; title: string }[] = [
  { status: 'todo', title: 'К выполнению' },
  { status: 'in_progress', title: 'В работе' },
  { status: 'done', title: 'Готово' },
];

function TaskCard({ task }: { task: Task }) {
  const toggleDone = useTasksStore((s) => s.toggleDone);
  const deleteTask = useTasksStore((s) => s.deleteTask);
  const openEdit = useTaskEditor((s) => s.openEdit);

  return (
    <div
      className={styles.card}
      onClick={() => openEdit(task.id)}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => e.key === 'Enter' && openEdit(task.id)}
    >
      <div className={styles.cardTop}>
        <Checkbox
          size="sm"
          checked={task.status === 'done'}
          onChange={() => toggleDone(task.id)}
          onClick={(e) => e.stopPropagation()}
          aria-label="Готово"
        />
        <span
          className={styles.cardTitle}
          data-done={task.status === 'done' || undefined}
        >
          {task.title}
        </span>
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

      <div className={styles.cardMeta}>
        <CategoryBadge categoryId={task.categoryId} />
        {task.dueDate && (
          <span className={styles.due}>
            <IconCalendar size={13} />
            {dayjs(task.dueDate).format('D MMM')}
          </span>
        )}
      </div>
    </div>
  );
}

export function BoardPage() {
  const tasks = useTasksStore((s) => s.tasks);
  const activeWorkspace = useWorkspaceStore((s) => s.activeId);
  const openNew = useTaskEditor((s) => s.openNew);

  const visible = tasks.filter((t) => t.workspaceId === activeWorkspace);

  return (
    <PageShell
      title="Доска"
      description="Задачи по статусам. Отметь галочкой, нажми для деталей, добавь новую."
    >
      <div className={styles.board}>
        {COLUMNS.map((col) => {
          const items = visible.filter((t) => t.status === col.status);
          return (
            <div key={col.status} className={styles.column}>
              <div className={styles.columnHead}>
                <span>{col.title}</span>
                <span className={styles.count}>{items.length}</span>
              </div>

              <div className={styles.cards}>
                {items.map((task) => (
                  <TaskCard key={task.id} task={task} />
                ))}
              </div>

              <button
                type="button"
                className={styles.addBtn}
                onClick={() => openNew({ status: col.status })}
              >
                <IconPlus size={16} />
                Добавить задачу
              </button>
            </div>
          );
        })}
      </div>
    </PageShell>
  );
}
