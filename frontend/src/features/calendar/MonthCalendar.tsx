import { useMemo, useState } from 'react';
import dayjs, { type Dayjs } from 'dayjs';
import { useTasksStore, type Task } from '../../store/tasks';
import { useWorkspaceStore } from '../../store/workspace';
import { useTaskEditor } from '../tasks/taskEditor';
import styles from './MonthCalendar.module.scss';

const DATE_ROW_H = 36;
const BAR_H = 22;
const BAR_GAP = 4;
const MIN_LANES = 2;

interface Segment {
  task: Task;
  lane: number;
  colStart: number; // 0..6
  colEnd: number; // 0..6
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
      .map((task) => {
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
          colStart: segStart.diff(weekStart, 'day'),
          colEnd: segEnd.diff(weekStart, 'day'),
          continuesLeft: range.start.isBefore(weekStart),
          continuesRight: range.end.isAfter(weekEnd),
        };
      })
      .filter((x): x is Omit<Segment, 'lane'> => x !== null)
      .sort((a, b) => a.colStart - b.colStart || b.colEnd - a.colEnd);

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

export function MonthCalendar({ month }: { month: Dayjs }) {
  const tasks = useTasksStore((s) => s.tasks);
  const categories = useTasksStore((s) => s.categories);
  const addTask = useTasksStore((s) => s.addTask);
  const activeWorkspace = useWorkspaceStore((s) => s.activeId);
  const openEdit = useTaskEditor((s) => s.openEdit);

  // Быстрое добавление: в каком дне открыт инпут и его текст
  const [quickDate, setQuickDate] = useState<string | null>(null);
  const [quickText, setQuickText] = useState('');

  const visibleTasks = useMemo(
    () => tasks.filter((t) => t.workspaceId === activeWorkspace),
    [tasks, activeWorkspace],
  );

  const weeks = useMemo(
    () => buildWeeks(month, visibleTasks),
    [month, visibleTasks],
  );

  const catColor = (id: string | null) =>
    categories.find((c) => c.id === id)?.color ?? '#868e96';

  const today = dayjs().format('YYYY-MM-DD');

  const startQuickAdd = (iso: string) => {
    setQuickDate(iso);
    setQuickText('');
  };

  const commitQuickAdd = () => {
    const title = quickText.trim();
    if (title && quickDate) {
      addTask({
        workspaceId: activeWorkspace,
        title,
        startDate: quickDate,
        dueDate: quickDate,
      });
    }
    setQuickDate(null);
    setQuickText('');
  };

  return (
    <div className={styles.calendar}>
      <div className={styles.weekdays}>
        {WEEKDAYS.map((d) => (
          <div key={d} className={styles.weekday}>
            {d}
          </div>
        ))}
      </div>

      <div className={styles.grid}>
        {weeks.map((week, wi) => {
          const rowHeight =
            DATE_ROW_H + week.lanes * (BAR_H + BAR_GAP) + BAR_GAP;
          const quickCol = week.days.findIndex(
            (d) => d.format('YYYY-MM-DD') === quickDate,
          );

          return (
            <div
              key={wi}
              className={styles.week}
              style={{ minHeight: rowHeight }}
            >
              {/* фон — кликабельные ячейки дней */}
              <div className={styles.dayRow}>
                {week.days.map((day) => {
                  const iso = day.format('YYYY-MM-DD');
                  const outside = day.month() !== month.month();
                  const isToday = iso === today;
                  return (
                    <div
                      key={iso}
                      className={styles.dayCell}
                      data-outside={outside || undefined}
                      onClick={() => startQuickAdd(iso)}
                      role="button"
                      tabIndex={-1}
                      title="Добавить задачу"
                    >
                      <span
                        className={styles.dayNumber}
                        data-today={isToday || undefined}
                      >
                        {day.date()}
                      </span>
                    </div>
                  );
                })}
              </div>

              {/* полосы задач */}
              <div className={styles.bars}>
                {week.segments.map((seg) => {
                  const span = seg.colEnd - seg.colStart + 1;
                  const done = seg.task.status === 'done';
                  return (
                    <button
                      key={seg.task.id}
                      type="button"
                      className={styles.bar}
                      data-done={done || undefined}
                      data-cont-left={seg.continuesLeft || undefined}
                      data-cont-right={seg.continuesRight || undefined}
                      style={{
                        top: DATE_ROW_H + seg.lane * (BAR_H + BAR_GAP),
                        left: `calc(${(seg.colStart / 7) * 100}% + 4px)`,
                        width: `calc(${(span / 7) * 100}% - 8px)`,
                        height: BAR_H,
                        borderLeft: `3px solid ${catColor(seg.task.categoryId)}`,
                      }}
                      onClick={() => openEdit(seg.task.id)}
                    >
                      <span className={styles.barTitle}>{seg.task.title}</span>
                    </button>
                  );
                })}

                {/* инпут быстрого добавления */}
                {quickCol !== -1 && (
                  <input
                    className={styles.quickInput}
                    style={{
                      top: DATE_ROW_H + week.lanes * (BAR_H + BAR_GAP),
                      left: `calc(${(quickCol / 7) * 100}% + 4px)`,
                      width: `calc(${(1 / 7) * 100}% - 8px)`,
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
  );
}
