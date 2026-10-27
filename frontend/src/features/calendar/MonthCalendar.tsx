import { useMemo, useState } from 'react';
import dayjs, { type Dayjs } from 'dayjs';
import {
  DndContext,
  DragOverlay,
  PointerSensor,
  pointerWithin,
  useSensor,
  useSensors,
  useDraggable,
  useDroppable,
  type DragEndEvent,
  type DragStartEvent,
} from '@dnd-kit/core';
import { IconCheck } from '@tabler/icons-react';
import { useTasksStore, PRIORITY_META, type Task } from '../../store/tasks';
import { useWorkspaceScope, useWorkspaceStore } from '../../store/workspace';
import { useUiStore, type CalendarScale } from '../../store/ui';
import { useTaskEditor } from '../tasks/taskEditor';
import { contrastText } from '../../lib/palette';
import { cardFocus } from '../tasks/cardFocus';
import styles from './MonthCalendar.module.scss';

const DATE_ROW_H = 34;
const BAR_GAP = 5;
// размер текста и высота однострочной карточки для каждого масштаба
const SCALES: Record<CalendarScale, { font: number; bar: number }> = {
  s: { font: 12, bar: 24 },
  m: { font: 13.5, bar: 28 },
  l: { font: 15.5, bar: 32 },
};
const MIN_LANES = 2;
const ISO_RE = /^\d{4}-\d{2}-\d{2}$/;

interface Segment {
  task: Task;
  lane: number;
  colStart: number;
  colEnd: number;
  continuesLeft: boolean;
  continuesRight: boolean;
}

interface WeekData {
  days: Dayjs[];
  segments: Segment[];
  lanes: number;
}

function taskRange(task: Task): { start: Dayjs; end: Dayjs } | null {
  const s = task.startDate ?? task.dueDate;
  const e = task.dueDate ?? task.startDate;
  if (!s || !e) return null;
  let start = dayjs(s);
  let end = dayjs(e);
  if (end.isBefore(start)) [start, end] = [end, start];
  return { start, end };
}

function buildWeeks(month: Dayjs, tasks: Task[]): WeekData[] {
  const gridStart = month.startOf('month').startOf('week');
  const gridEnd = month.endOf('month').endOf('week');
  const totalDays = gridEnd.diff(gridStart, 'day') + 1;

  const weeks: WeekData[] = [];

  for (let w = 0; w < totalDays / 7; w += 1) {
    const weekStart = gridStart.add(w * 7, 'day');
    const weekEnd = weekStart.add(6, 'day');
    const days = Array.from({ length: 7 }, (_, i) => weekStart.add(i, 'day'));

    const raw = tasks
      .map((task, index) => {
        const range = taskRange(task);
        if (!range) return null;
        if (range.end.isBefore(weekStart) || range.start.isAfter(weekEnd)) {
          return null;
        }
        const segStart = range.start.isBefore(weekStart)
          ? weekStart
          : range.start;
        const segEnd = range.end.isAfter(weekEnd) ? weekEnd : range.end;
        return {
          task,
          index, // порядок в общем списке — задаёт очередность внутри дня
          colStart: segStart.diff(weekStart, 'day'),
          colEnd: segEnd.diff(weekStart, 'day'),
          continuesLeft: range.start.isBefore(weekStart),
          continuesRight: range.end.isAfter(weekEnd),
        };
      })
      .filter((x): x is Omit<Segment, 'lane'> & { index: number } => x !== null)
      // многодневные сверху; при равенстве — по порядку в списке
      .sort(
        (a, b) =>
          a.colStart - b.colStart ||
          b.colEnd - b.colStart - (a.colEnd - a.colStart) ||
          a.index - b.index,
      );

    const laneEnds: number[] = [];
    const segments: Segment[] = raw.map((seg) => {
      let lane = laneEnds.findIndex((end) => seg.colStart > end);
      if (lane === -1) {
        lane = laneEnds.length;
        laneEnds.push(seg.colEnd);
      } else {
        laneEnds[lane] = seg.colEnd;
      }
      return { ...seg, lane };
    });

    weeks.push({
      days,
      segments,
      lanes: Math.max(MIN_LANES, laneEnds.length),
    });
  }

  return weeks;
}

const WEEKDAYS = ['Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб', 'Вс'];

function DayCell({
  iso,
  dayNum,
  outside,
  isToday,
  onQuickAdd,
}: {
  iso: string;
  dayNum: number;
  outside: boolean;
  isToday: boolean;
  onQuickAdd: (iso: string) => void;
}) {
  const { setNodeRef, isOver } = useDroppable({ id: iso });
  return (
    <button
      ref={setNodeRef}
      type="button"
      className={styles.dayCell}
      data-outside={outside || undefined}
      data-over={isOver || undefined}
      onMouseEnter={() =>
        cardFocus.enterTarget({ startDate: iso, dueDate: iso })
      }
      onMouseLeave={cardFocus.leaveTarget}
      onClick={() => onQuickAdd(iso)}
      aria-label="Добавить задачу"
    >
      <span className={styles.dayNumber} data-today={isToday || undefined}>
        {dayNum}
      </span>
    </button>
  );
}

function TaskBar({
  seg,
  color,
  wsColor,
  onOpen,
}: {
  seg: Segment;
  color: string | null;
  /** цвет доски — показываем метку в режиме «Все доски» */
  wsColor?: string;
  onOpen: (id: string) => void;
}) {
  const toggleDone = useTasksStore((s) => s.toggleDone);
  const drag = useDraggable({ id: seg.task.id });
  const drop = useDroppable({ id: seg.task.id });
  const { role, tabIndex, ...a11y } = drag.attributes;
  const span = seg.colEnd - seg.colStart + 1;
  const done = seg.task.status === 'done';

  const setRef = (el: HTMLDivElement | null) => {
    drag.setNodeRef(el);
    drop.setNodeRef(el);
  };

  return (
    // роль и клавиатура заданы через dnd-kit (role/tabIndex/onKeyDown) — доступно
    // eslint-disable-next-line jsx-a11y/no-static-element-interactions
    <div
      ref={setRef}
      role={role}
      tabIndex={tabIndex}
      className={styles.bar}
      data-done={done || undefined}
      data-cont-left={seg.continuesLeft || undefined}
      data-cont-right={seg.continuesRight || undefined}
      data-dragging={drag.isDragging || undefined}
      data-over={drop.isOver && !drag.isDragging ? 'true' : undefined}
      data-prio={seg.task.priority || undefined}
      data-plain={!color || undefined}
      style={{
        // строка 1 сетки — номера дней, дорожки задач начинаются со 2-й
        gridRow: seg.lane + 2,
        gridColumn: `${seg.colStart + 1} / span ${span}`,
        // без категории цвет задаёт тема через CSS
        ...(color ? { background: color, color: contrastText(color) } : {}),
        ...(seg.task.priority
          ? { ['--prio']: PRIORITY_META[seg.task.priority].color }
          : {}),
      }}
      onMouseEnter={() => cardFocus.enterTask(seg.task.id)}
      onMouseLeave={() => cardFocus.leaveTask(seg.task.id)}
      onClick={() => onOpen(seg.task.id)}
      onKeyDown={(e) => {
        if (e.key === 'Enter') {
          e.preventDefault();
          onOpen(seg.task.id);
        }
      }}
      {...drag.listeners}
      {...a11y}
    >
      <button
        type="button"
        className={styles.barCheck}
        data-checked={done || undefined}
        aria-pressed={done}
        aria-label="Отметить выполненной"
        onClick={(e) => {
          e.stopPropagation();
          toggleDone(seg.task.id);
        }}
        onPointerDown={(e) => e.stopPropagation()}
      >
        {done && <IconCheck size={12} stroke={3.5} />}
      </button>
      {wsColor && (
        <span
          className={styles.barWs}
          style={{ background: wsColor }}
          aria-hidden
        />
      )}
      <span className={styles.barTitle} title={seg.task.title}>
        {seg.task.title}
      </span>
    </div>
  );
}

export function MonthCalendar({ month }: { month: Dayjs }) {
  const tasks = useTasksStore((s) => s.tasks);
  const categories = useTasksStore((s) => s.categories);
  const addTask = useTasksStore((s) => s.addTask);
  const updateTask = useTasksStore((s) => s.updateTask);
  const moveTask = useTasksStore((s) => s.moveTask);
  const workspaces = useWorkspaceStore((s) => s.workspaces);
  const { isAll, targetId } = useWorkspaceScope();
  const fullText = useUiStore((s) => s.calendarFullText);
  const scale = SCALES[useUiStore((s) => s.calendarScale)];
  const openEdit = useTaskEditor((s) => s.openEdit);

  const [quickDate, setQuickDate] = useState<string | null>(null);
  const [quickText, setQuickText] = useState('');
  const [dragTask, setDragTask] = useState<Task | null>(null);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
  );

  const visibleTasks = useMemo(
    () => tasks.filter((t) => isAll || t.workspaceId === targetId),
    [tasks, isAll, targetId],
  );

  const weeks = useMemo(
    () => buildWeeks(month, visibleTasks),
    [month, visibleTasks],
  );

  // null = категории нет: цвет возьмётся из темы (см. .bar[data-plain]),
  // а не серый хардкодом
  const catColor = (id: string | null): string | null =>
    categories.find((c) => c.id === id)?.color ?? null;

  const today = dayjs().format('YYYY-MM-DD');

  const startQuickAdd = (iso: string) => {
    setQuickDate(iso);
    setQuickText('');
  };

  const commitQuickAdd = () => {
    const title = quickText.trim();
    if (title && quickDate) {
      void addTask({
        workspaceId: targetId,
        title,
        startDate: quickDate,
        dueDate: quickDate,
      });
    }
    setQuickDate(null);
    setQuickText('');
  };

  const onDragStart = (e: DragStartEvent) => {
    setDragTask(visibleTasks.find((t) => t.id === e.active.id) ?? null);
  };

  const onDragEnd = (e: DragEndEvent) => {
    setDragTask(null);
    if (!e.over) return;
    const active = visibleTasks.find((t) => t.id === e.active.id);
    if (!active) return;
    const overId = String(e.over.id);

    if (ISO_RE.test(overId)) {
      // брошено на день — переносим (с сохранением длительности)
      const range = taskRange(active);
      if (!range) return;
      const dur = range.end.diff(range.start, 'day');
      updateTask(active.id, {
        startDate: overId,
        dueDate: dayjs(overId).add(dur, 'day').format('YYYY-MM-DD'),
      });
      return;
    }

    // брошено на другую задачу — меняем порядок (и день, если он другой)
    const overTask = visibleTasks.find((t) => t.id === overId);
    if (!overTask) return;
    const overStart = overTask.startDate ?? overTask.dueDate;
    const activeStart = active.startDate ?? active.dueDate;
    if (overStart && activeStart && overStart !== activeStart) {
      const range = taskRange(active);
      const dur = range ? range.end.diff(range.start, 'day') : 0;
      updateTask(active.id, {
        startDate: overStart,
        dueDate: dayjs(overStart).add(dur, 'day').format('YYYY-MM-DD'),
      });
    }
    moveTask(active.id, overTask.id);
  };

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={pointerWithin}
      onDragStart={onDragStart}
      onDragEnd={onDragEnd}
    >
      <div
        className={styles.calendar}
        data-full={fullText || undefined}
        style={{
          ['--bar-h' as string]: `${scale.bar}px`,
          ['--bar-font' as string]: `${scale.font}px`,
          ['--bar-gap' as string]: `${BAR_GAP}px`,
          ['--date-row' as string]: `${DATE_ROW_H - BAR_GAP}px`,
        }}
      >
        <div className={styles.weekdays}>
          {WEEKDAYS.map((d) => (
            <div key={d} className={styles.weekday}>
              {d}
            </div>
          ))}
        </div>

        <div className={styles.grid}>
          {weeks.map((week, wi) => {
            const quickCol = week.days.findIndex(
              (d) => d.format('YYYY-MM-DD') === quickDate,
            );
            // минимальная высота недели; в режиме «полный текст» неделя
            // растёт дальше сама — карточки лежат в сетке, а не абсолютно
            const rowHeight =
              DATE_ROW_H +
              week.lanes * (scale.bar + BAR_GAP) +
              BAR_GAP +
              (quickCol !== -1 ? scale.bar + BAR_GAP : 0);

            return (
              <div
                key={wi}
                className={styles.week}
                style={{ minHeight: rowHeight }}
              >
                <div className={styles.dayRow}>
                  {week.days.map((day) => {
                    const iso = day.format('YYYY-MM-DD');
                    return (
                      <DayCell
                        key={iso}
                        iso={iso}
                        dayNum={day.date()}
                        outside={day.month() !== month.month()}
                        isToday={iso === today}
                        onQuickAdd={startQuickAdd}
                      />
                    );
                  })}
                </div>

                <div className={styles.bars}>
                  {week.segments.map((seg) => (
                    <TaskBar
                      key={seg.task.id}
                      seg={seg}
                      color={catColor(seg.task.categoryId)}
                      wsColor={
                        isAll
                          ? workspaces.find(
                              (w) => w.id === seg.task.workspaceId,
                            )?.color
                          : undefined
                      }
                      onOpen={openEdit}
                    />
                  ))}

                  {quickCol !== -1 && (
                    <input
                      className={styles.quickInput}
                      style={{
                        gridRow: week.lanes + 2,
                        gridColumn: quickCol + 1,
                      }}
                      // eslint-disable-next-line jsx-a11y/no-autofocus
                      autoFocus
                      placeholder="Задача…"
                      value={quickText}
                      onChange={(e) => setQuickText(e.currentTarget.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') commitQuickAdd();
                        if (e.key === 'Escape') {
                          setQuickDate(null);
                          setQuickText('');
                        }
                      }}
                      onBlur={commitQuickAdd}
                    />
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      <DragOverlay dropAnimation={null}>
        {dragTask ? (
          <div className={styles.dragGhost}>{dragTask.title}</div>
        ) : null}
      </DragOverlay>
    </DndContext>
  );
}
