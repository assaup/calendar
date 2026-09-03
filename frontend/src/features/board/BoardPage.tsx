import { useState } from 'react';
import {
  DndContext,
  DragOverlay,
  PointerSensor,
  closestCorners,
  useSensor,
  useSensors,
  useDroppable,
  type DragEndEvent,
  type DragStartEvent,
} from '@dnd-kit/core';
import {
  SortableContext,
  verticalListSortingStrategy,
  useSortable,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { Checkbox, ActionIcon, Menu, Title } from '@mantine/core';
import {
  IconPlus,
  IconDots,
  IconPencil,
  IconTrash,
  IconCalendar,
  IconListCheck,
  IconChevronLeft,
  IconChevronRight,
} from '@tabler/icons-react';
import dayjs, { type Dayjs } from 'dayjs';
import { PageShell } from '../../components/ui/PageShell';
import { CategoryBadge } from '../../components/ui/CategoryBadge';
import { PriorityFlag } from '../../components/ui/PriorityFlag';
import {
  useTasksStore,
  isOverdue,
  type Task,
  type TaskStatus,
} from '../../store/tasks';
import { useWorkspaceStore } from '../../store/workspace';
import { useTaskEditor } from '../tasks/taskEditor';
import styles from './BoardPage.module.scss';

type ColumnId = TaskStatus | 'nodate';

const STATUS_COLUMNS: { id: TaskStatus; title: string }[] = [
  { id: 'todo', title: 'К выполнению' },
  { id: 'in_progress', title: 'В работе' },
  { id: 'done', title: 'Готово' },
];
const ALL_IDS: ColumnId[] = ['todo', 'in_progress', 'done', 'nodate'];

function CardContent({ task, dragging }: { task: Task; dragging?: boolean }) {
  const toggleDone = useTasksStore((s) => s.toggleDone);
  const deleteTask = useTasksStore((s) => s.deleteTask);
  const category = useTasksStore((s) =>
    s.categories.find((c) => c.id === task.categoryId),
  );
  const openEdit = useTaskEditor((s) => s.openEdit);

  const tint = category
    ? {
        background: `color-mix(in srgb, ${category.color} 15%, var(--app-surface))`,
        borderColor: `color-mix(in srgb, ${category.color} 45%, var(--app-border))`,
      }
    : undefined;

  return (
    <div
      className={styles.card}
      data-dragging={dragging || undefined}
      style={tint}
    >
      <div className={styles.cardTop}>
        <Checkbox
          size="sm"
          checked={task.status === 'done'}
          onChange={() => toggleDone(task.id)}
          onClick={(e) => e.stopPropagation()}
          onPointerDown={(e) => e.stopPropagation()}
          aria-label="Готово"
        />
        <PriorityFlag priority={task.priority} />
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
              onPointerDown={(e) => e.stopPropagation()}
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

      {(task.categoryId ||
        task.dueDate ||
        (task.subtasks?.length ?? 0) > 0) && (
        <div className={styles.cardMeta}>
          <CategoryBadge categoryId={task.categoryId} />
          {(task.subtasks?.length ?? 0) > 0 && (
            <span className={styles.subs}>
              <IconListCheck size={13} />
              {task.subtasks.filter((s) => s.done).length}/
              {task.subtasks.length}
            </span>
          )}
          {task.dueDate && (
            <span
              className={styles.due}
              data-overdue={isOverdue(task) || undefined}
            >
              <IconCalendar size={13} />
              {dayjs(task.dueDate).format('D MMM')}
            </span>
          )}
        </div>
      )}
    </div>
  );
}

function SortableCard({ task }: { task: Task }) {
  const openEdit = useTaskEditor((s) => s.openEdit);
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: task.id });
  const { role, tabIndex, ...a11y } = attributes;

  return (
    // роль и клавиатура заданы через dnd-kit — доступно
    // eslint-disable-next-line jsx-a11y/no-static-element-interactions
    <div
      ref={setNodeRef}
      role={role}
      tabIndex={tabIndex}
      className={styles.cardWrap}
      data-dragging={isDragging || undefined}
      style={{ transform: CSS.Transform.toString(transform), transition }}
      onClick={() => openEdit(task.id)}
      onKeyDown={(e) => {
        if (e.key === 'Enter') {
          e.preventDefault();
          openEdit(task.id);
        }
      }}
      {...listeners}
      {...a11y}
    >
      <CardContent task={task} />
    </div>
  );
}

function Column({
  id,
  title,
  hint,
  tasks,
  onCollapse,
  quickOpen,
  onQuickOpen,
  quickText,
  onQuickText,
  onQuickSubmit,
  onQuickCancel,
}: {
  id: ColumnId;
  title: string;
  hint?: string;
  tasks: Task[];
  onCollapse?: () => void;
  quickOpen: boolean;
  onQuickOpen: () => void;
  quickText: string;
  onQuickText: (v: string) => void;
  onQuickSubmit: () => void;
  onQuickCancel: () => void;
}) {
  const { setNodeRef, isOver } = useDroppable({ id });

  return (
    <div
      ref={setNodeRef}
      className={styles.column}
      data-over={isOver || undefined}
      data-nodate={id === 'nodate' || undefined}
    >
      <div className={styles.columnHead}>
        <div>
          <div className={styles.columnTitle}>{title}</div>
          {hint && <div className={styles.columnHint}>{hint}</div>}
        </div>
        <div className={styles.columnHeadRight}>
          <span className={styles.count}>{tasks.length}</span>
          {onCollapse && (
            <ActionIcon
              variant="subtle"
              color="gray"
              size="sm"
              aria-label="Свернуть колонку"
              onClick={onCollapse}
            >
              <IconChevronRight size={16} />
            </ActionIcon>
          )}
        </div>
      </div>

      <SortableContext
        items={tasks.map((t) => t.id)}
        strategy={verticalListSortingStrategy}
      >
        <div className={styles.cards}>
          {tasks.map((task) => (
            <SortableCard key={task.id} task={task} />
          ))}
        </div>
      </SortableContext>

      {quickOpen ? (
        <input
          className={styles.quickInput}
          // eslint-disable-next-line jsx-a11y/no-autofocus
          autoFocus
          placeholder="Название задачи…"
          value={quickText}
          onChange={(e) => onQuickText(e.currentTarget.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') onQuickSubmit();
            if (e.key === 'Escape') onQuickCancel();
          }}
          onBlur={onQuickSubmit}
        />
      ) : (
        <button type="button" className={styles.addBtn} onClick={onQuickOpen}>
          <IconPlus size={16} />
          Добавить задачу
        </button>
      )}
    </div>
  );
}

export function BoardPage() {
  const tasks = useTasksStore((s) => s.tasks);
  const addTask = useTasksStore((s) => s.addTask);
  const updateTask = useTasksStore((s) => s.updateTask);
  const moveTask = useTasksStore((s) => s.moveTask);
  const activeWorkspace = useWorkspaceStore((s) => s.activeId);

  const [month, setMonth] = useState<Dayjs>(() => dayjs().startOf('month'));
  const [noDateCollapsed, setNoDateCollapsed] = useState(false);
  const [activeTask, setActiveTask] = useState<Task | null>(null);
  const [quickCol, setQuickCol] = useState<ColumnId | null>(null);
  const [quickText, setQuickText] = useState('');

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
  );

  const monthKey = month.format('YYYY-MM');
  const inMonth = (t: Task) => !!t.dueDate && t.dueDate.startsWith(monthKey);
  // дата по умолчанию при переносе в месяц: сегодня (если текущий) или 1-е число
  const monthDefaultDate = month.isSame(dayjs(), 'month')
    ? dayjs().format('YYYY-MM-DD')
    : month.startOf('month').format('YYYY-MM-DD');

  const wsTasks = tasks.filter((t) => t.workspaceId === activeWorkspace);
  const tasksOf = (id: ColumnId): Task[] =>
    id === 'nodate'
      ? wsTasks.filter((t) => !t.dueDate && t.status !== 'done')
      : wsTasks.filter((t) => inMonth(t) && t.status === id);

  const columnOf = (t: Task): ColumnId =>
    !t.dueDate ? 'nodate' : (t.status as ColumnId);

  const submitQuick = () => {
    const title = quickText.trim();
    if (title && quickCol) {
      if (quickCol === 'nodate') {
        addTask({ workspaceId: activeWorkspace, title, dueDate: null });
      } else {
        addTask({
          workspaceId: activeWorkspace,
          title,
          status: quickCol,
          dueDate: monthDefaultDate,
        });
      }
    }
    setQuickCol(null);
    setQuickText('');
  };

  const onDragStart = (e: DragStartEvent) => {
    setActiveTask(wsTasks.find((t) => t.id === e.active.id) ?? null);
  };

  const onDragEnd = (e: DragEndEvent) => {
    setActiveTask(null);
    if (!e.over) return;
    const active = wsTasks.find((t) => t.id === e.active.id);
    if (!active) return;
    const overId = String(e.over.id);

    let target: ColumnId;
    const overTask = wsTasks.find((t) => t.id === overId);
    if ((ALL_IDS as string[]).includes(overId)) {
      target = overId as ColumnId;
    } else if (overTask) {
      target = columnOf(overTask);
    } else {
      return;
    }

    if (target === 'nodate') {
      if (active.dueDate) updateTask(active.id, { dueDate: null });
    } else {
      // статус-колонка
      const patch: Partial<Omit<Task, 'id'>> = {};
      if (!active.dueDate) patch.dueDate = monthDefaultDate;
      if (active.status !== target) patch.status = target;
      if (Object.keys(patch).length) updateTask(active.id, patch);
    }

    if (overTask && overTask.id !== active.id) {
      moveTask(active.id, overTask.id);
    }
  };

  const monthTitle = month.format('MMMM YYYY');
  const monthLabel = monthTitle.charAt(0).toUpperCase() + monthTitle.slice(1);
  const noDateTasks = tasksOf('nodate');

  const quickProps = (id: ColumnId) => ({
    quickOpen: quickCol === id,
    onQuickOpen: () => {
      setQuickCol(id);
      setQuickText('');
    },
    quickText,
    onQuickText: setQuickText,
    onQuickSubmit: submitQuick,
    onQuickCancel: () => {
      setQuickCol(null);
      setQuickText('');
    },
  });

  return (
    <PageShell
      title="Доска"
      description="Колонки по статусу для выбранного месяца + бэклог без срока."
    >
      <div className={styles.toolbar}>
        <ActionIcon
          variant="subtle"
          color="gray"
          size="lg"
          aria-label="Предыдущий месяц"
          onClick={() => setMonth((m) => m.subtract(1, 'month'))}
        >
          <IconChevronLeft size={18} />
        </ActionIcon>
        <Title order={4} className={styles.monthLabel}>
          {monthLabel}
        </Title>
        <ActionIcon
          variant="subtle"
          color="gray"
          size="lg"
          aria-label="Следующий месяц"
          onClick={() => setMonth((m) => m.add(1, 'month'))}
        >
          <IconChevronRight size={18} />
        </ActionIcon>
        <button
          type="button"
          className={styles.todayBtn}
          onClick={() => setMonth(dayjs().startOf('month'))}
        >
          Текущий
        </button>
      </div>

      <DndContext
        sensors={sensors}
        collisionDetection={closestCorners}
        onDragStart={onDragStart}
        onDragEnd={onDragEnd}
      >
        <div className={styles.board}>
          {STATUS_COLUMNS.map((col) => (
            <Column
              key={col.id}
              id={col.id}
              title={col.title}
              tasks={tasksOf(col.id)}
              {...quickProps(col.id)}
            />
          ))}

          {noDateCollapsed ? (
            <button
              type="button"
              className={styles.collapsedCol}
              onClick={() => setNoDateCollapsed(false)}
              aria-label="Развернуть «Без срока»"
            >
              <IconChevronLeft size={16} />
              <span className={styles.collapsedLabel}>Без срока</span>
              <span className={styles.count}>{noDateTasks.length}</span>
            </button>
          ) : (
            <Column
              id="nodate"
              title="Без срока"
              hint="Бэклог — без даты"
              tasks={noDateTasks}
              onCollapse={() => setNoDateCollapsed(true)}
              {...quickProps('nodate')}
            />
          )}
        </div>

        <DragOverlay>
          {activeTask ? <CardContent task={activeTask} dragging /> : null}
        </DragOverlay>
      </DndContext>
    </PageShell>
  );
}
