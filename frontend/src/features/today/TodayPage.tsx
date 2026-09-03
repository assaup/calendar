import { Checkbox, ActionIcon } from '@mantine/core';
import {
  IconCalendar,
  IconListCheck,
  IconChevronRight,
} from '@tabler/icons-react';
import dayjs from 'dayjs';
import { PageShell } from '../../components/ui/PageShell';
import { CategoryBadge } from '../../components/ui/CategoryBadge';
import { PriorityFlag } from '../../components/ui/PriorityFlag';
import { useTasksStore, isOverdue, type Task } from '../../store/tasks';
import { useWorkspaceStore } from '../../store/workspace';
import { useTaskEditor } from '../tasks/taskEditor';
import styles from './TodayPage.module.scss';

function TaskRow({ task }: { task: Task }) {
  const toggleDone = useTasksStore((s) => s.toggleDone);
  const categories = useTasksStore((s) => s.categories);
  const openEdit = useTaskEditor((s) => s.openEdit);
  const color =
    categories.find((c) => c.id === task.categoryId)?.color ?? 'transparent';
  const subs = task.subtasks ?? [];

  return (
    <div className={styles.row} style={{ borderLeftColor: color }}>
      <Checkbox
        size="sm"
        checked={task.status === 'done'}
        onChange={() => toggleDone(task.id)}
        aria-label="Готово"
      />
      <button
        type="button"
        className={styles.main}
        onClick={() => openEdit(task.id)}
      >
        <PriorityFlag priority={task.priority} />
        <span
          className={styles.title}
          data-done={task.status === 'done' || undefined}
        >
          {task.title}
        </span>
        <CategoryBadge categoryId={task.categoryId} />
        {subs.length > 0 && (
          <span className={styles.subs}>
            <IconListCheck size={13} />
            {subs.filter((s) => s.done).length}/{subs.length}
          </span>
        )}
      </button>
      {task.dueDate && (
        <span
          className={styles.due}
          data-overdue={isOverdue(task) || undefined}
        >
          <IconCalendar size={13} />
          {dayjs(task.dueDate).format('D MMM')}
        </span>
      )}
      <ActionIcon
        variant="subtle"
        color="gray"
        size="sm"
        aria-label="Открыть"
        onClick={() => openEdit(task.id)}
      >
        <IconChevronRight size={16} />
      </ActionIcon>
    </div>
  );
}

function Section({ title, tasks }: { title: string; tasks: Task[] }) {
  if (tasks.length === 0) return null;
  return (
    <section className={styles.section}>
      <div className={styles.sectionHead}>
        <span>{title}</span>
        <span className={styles.count}>{tasks.length}</span>
      </div>
      <div className={styles.list}>
        {tasks.map((t) => (
          <TaskRow key={t.id} task={t} />
        ))}
      </div>
    </section>
  );
}

export function TodayPage() {
  const tasks = useTasksStore((s) => s.tasks);
  const activeWorkspace = useWorkspaceStore((s) => s.activeId);

  const today = dayjs();
  const todayIso = today.format('YYYY-MM-DD');
  const in7 = today.add(7, 'day').format('YYYY-MM-DD');

  const active = tasks.filter(
    (t) => t.workspaceId === activeWorkspace && t.status !== 'done',
  );

  const byDue = (t: Task) => t.dueDate ?? '9999';
  const overdue = active
    .filter(isOverdue)
    .sort((a, b) => byDue(a).localeCompare(byDue(b)));
  const todayTasks = active
    .filter((t) => t.dueDate === todayIso)
    .sort((a, b) => byDue(a).localeCompare(byDue(b)));
  const upcoming = active
    .filter((t) => t.dueDate && t.dueDate > todayIso && t.dueDate <= in7)
    .sort((a, b) => byDue(a).localeCompare(byDue(b)));

  const nothing = overdue.length + todayTasks.length + upcoming.length === 0;

  const dateLabel = today.format('dddd, D MMMM');

  return (
    <PageShell
      title="Сегодня"
      description={dateLabel.charAt(0).toUpperCase() + dateLabel.slice(1)}
    >
      {nothing ? (
        <div className={styles.empty}>
          На сегодня и ближайшую неделю задач нет. Свободно 🎉
        </div>
      ) : (
        <>
          <Section title="Просрочено" tasks={overdue} />
          <Section title="Сегодня" tasks={todayTasks} />
          <Section title="Ближайшие 7 дней" tasks={upcoming} />
        </>
      )}
    </PageShell>
  );
}
