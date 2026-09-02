import { useState } from 'react';
import {
  DndContext,
  DragOverlay,
  PointerSensor,
  useSensor,
  useSensors,
  useDraggable,
  useDroppable,
  type DragEndEvent,
  type DragStartEvent,
} from '@dnd-kit/core';
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

function DraggableCard({ task }: { task: Task }) {
  const openEdit = useTaskEditor((s) => s.openEdit);
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({
    id: task.id,
  });
  // роль/таб-индекс выносим явно (для читалок экрана и линтера доступности)
  const { role, tabIndex, ...a11y } = attributes;

  return (
    // роль и клавиатура заданы через dnd-kit (role/tabIndex/onKeyDown) — доступно
    // eslint-disable-next-line jsx-a11y/no-static-element-interactions
    <div
      ref={setNodeRef}
      role={role}
      tabIndex={tabIndex}
      className={styles.cardWrap}
      data-dragging={isDragging || undefined}
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
  status,
  title,
  tasks,
}: {
  status: TaskStatus;
  title: string;
  tasks: Task[];
}) {
  const openNew = useTaskEditor((s) => s.openNew);
  const { setNodeRef, isOver } = useDroppable({ id: status });

  return (
    <div
      ref={setNodeRef}
      className={styles.column}
      data-over={isOver || undefined}
    >
      <div className={styles.columnHead}>
        <span>{title}</span>
        <span className={styles.count}>{tasks.length}</span>
      </div>

      <div className={styles.cards}>
        {tasks.map((task) => (
          <DraggableCard key={task.id} task={task} />
        ))}
      </div>

      <button
        type="button"
        className={styles.addBtn}
        onClick={() => openNew({ status })}
      >
        <IconPlus size={16} />
        Добавить задачу
      </button>
    </div>
  );
}

export function BoardPage() {
  const tasks = useTasksStore((s) => s.tasks);
  const updateTask = useTasksStore((s) => s.updateTask);
  const activeWorkspace = useWorkspaceStore((s) => s.activeId);
  const [activeTask, setActiveTask] = useState<Task | null>(null);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
  );

  const visible = tasks.filter((t) => t.workspaceId === activeWorkspace);

  const onDragStart = (e: DragStartEvent) => {
    setActiveTask(visible.find((t) => t.id === e.active.id) ?? null);
  };

  const onDragEnd = (e: DragEndEvent) => {
    setActiveTask(null);
    const overId = e.over?.id as TaskStatus | undefined;
    if (!overId) return;
    const task = visible.find((t) => t.id === e.active.id);
    if (task && task.status !== overId) {
      updateTask(task.id, { status: overId });
    }
  };

  return (
    <PageShell
      title="Доска"
      description="Перетаскивай карточки между колонками. Клик — детали, галочка — готово."
    >
      <DndContext
        sensors={sensors}
        onDragStart={onDragStart}
        onDragEnd={onDragEnd}
      >
        <div className={styles.board}>
          {COLUMNS.map((col) => (
            <Column
              key={col.status}
              status={col.status}
              title={col.title}
              tasks={visible.filter((t) => t.status === col.status)}
            />
          ))}
        </div>

        <DragOverlay>
          {activeTask ? <CardContent task={activeTask} dragging /> : null}
        </DragOverlay>
      </DndContext>
    </PageShell>
  );
}
