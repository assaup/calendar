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
import { Checkbox, ActionIcon, Menu } from '@mantine/core';
import {
  IconPlus,
  IconDots,
  IconPencil,
  IconTrash,
  IconCalendar,
  IconListCheck,
} from '@tabler/icons-react';
import dayjs from 'dayjs';
import { PageShell } from '../../components/ui/PageShell';
import { CategoryBadge } from '../../components/ui/CategoryBadge';
import { PriorityFlag } from '../../components/ui/PriorityFlag';
import { useTasksStore, isOverdue, type Task } from '../../store/tasks';
import { useWorkspaceStore } from '../../store/workspace';
import { useTaskEditor } from '../tasks/taskEditor';
import styles from './BoardPage.module.scss';

type ColumnId = 'month' | 'backlog';
const TODAY = dayjs().format('YYYY-MM-DD');
const MONTH_KEY = dayjs().format('YYYY-MM');
const inThisMonth = (t: Task) => !!t.dueDate && t.dueDate.startsWith(MONTH_KEY);

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
  quickOpen,
  onQuickOpen,
  quickText,
  onQuickText,
  onQuickSubmit,
  onQuickCancel,
}: {
  id: ColumnId;
  title: string;
  hint: string;
  tasks: Task[];
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
    >
      <div className={styles.columnHead}>
        <div>
          <div className={styles.columnTitle}>{title}</div>
          <div className={styles.columnHint}>{hint}</div>
        </div>
        <span className={styles.count}>{tasks.length}</span>
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

  const [activeTask, setActiveTask] = useState<Task | null>(null);
  const [quickCol, setQuickCol] = useState<ColumnId | null>(null);
  const [quickText, setQuickText] = useState('');

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
  );

  // на доске показываем невыполненные задачи пространства
  const visible = tasks.filter(
    (t) => t.workspaceId === activeWorkspace && t.status !== 'done',
  );
  const monthTasks = visible.filter(inThisMonth);
  const backlogTasks = visible.filter((t) => !inThisMonth(t));

  const columnOf = (t: Task): ColumnId =>
    inThisMonth(t) ? 'month' : 'backlog';

  const submitQuick = () => {
    const title = quickText.trim();
    if (title && quickCol) {
      addTask({
        workspaceId: activeWorkspace,
        title,
        dueDate: quickCol === 'month' ? TODAY : null,
      });
    }
    setQuickCol(null);
    setQuickText('');
  };

  const onDragStart = (e: DragStartEvent) => {
    setActiveTask(visible.find((t) => t.id === e.active.id) ?? null);
  };

  const onDragEnd = (e: DragEndEvent) => {
    setActiveTask(null);
    if (!e.over) return;
    const active = visible.find((t) => t.id === e.active.id);
    if (!active) return;
    const overId = String(e.over.id);

    // целевая колонка: либо сама колонка, либо колонка задачи под курсором
    let target: ColumnId;
    const overTask = visible.find((t) => t.id === overId);
    if (overId === 'month' || overId === 'backlog') {
      target = overId;
    } else if (overTask) {
      target = columnOf(overTask);
    } else {
      return;
    }

    // при переносе между колонками меняем только срок (статус не трогаем)
    if (target === 'month' && !inThisMonth(active)) {
      updateTask(active.id, { dueDate: TODAY });
    } else if (target === 'backlog' && inThisMonth(active)) {
      updateTask(active.id, { dueDate: null });
    }

    if (overTask && overTask.id !== active.id) {
      moveTask(active.id, overTask.id);
    }
  };

  const monthLabel = dayjs().format('MMMM');

  return (
    <PageShell
      title="Доска"
      description="Перетаскивай задачи в «Этот месяц», чтобы взять их в работу. Статус не меняется."
    >
      <DndContext
        sensors={sensors}
        collisionDetection={closestCorners}
        onDragStart={onDragStart}
        onDragEnd={onDragEnd}
      >
        <div className={styles.board}>
          <Column
            id="month"
            title="В этом месяце"
            hint={monthLabel.charAt(0).toUpperCase() + monthLabel.slice(1)}
            tasks={monthTasks}
            quickOpen={quickCol === 'month'}
            onQuickOpen={() => {
              setQuickCol('month');
              setQuickText('');
            }}
            quickText={quickText}
            onQuickText={setQuickText}
            onQuickSubmit={submitQuick}
            onQuickCancel={() => {
              setQuickCol(null);
              setQuickText('');
            }}
          />
          <Column
            id="backlog"
            title="К выполнению"
            hint="Без срока в этом месяце"
            tasks={backlogTasks}
            quickOpen={quickCol === 'backlog'}
            onQuickOpen={() => {
              setQuickCol('backlog');
              setQuickText('');
            }}
            quickText={quickText}
            onQuickText={setQuickText}
            onQuickSubmit={submitQuick}
            onQuickCancel={() => {
              setQuickCol(null);
              setQuickText('');
            }}
          />
        </div>

        <DragOverlay>
          {activeTask ? <CardContent task={activeTask} dragging /> : null}
        </DragOverlay>
      </DndContext>
    </PageShell>
  );
}
