import { useState } from 'react';
import dayjs from 'dayjs';
import {
  ActionIcon,
  Button,
  SegmentedControl,
  Title,
  Tooltip,
} from '@mantine/core';
import {
  IconChevronLeft,
  IconChevronRight,
  IconPlus,
  IconLayoutList,
  IconTextWrap,
} from '@tabler/icons-react';
import { MonthCalendar } from './MonthCalendar';
import { useTaskEditor } from '../tasks/taskEditor';
import { useTasksStore } from '../../store/tasks';
import { useWorkspaceScope } from '../../store/workspace';
import { useUiStore, type CalendarScale } from '../../store/ui';
import styles from './CalendarPage.module.scss';

function plural(n: number): string {
  const mod10 = n % 10;
  const mod100 = n % 100;
  if (mod10 === 1 && mod100 !== 11) return 'задача';
  if (mod10 >= 2 && mod10 <= 4 && (mod100 < 10 || mod100 >= 20))
    return 'задачи';
  return 'задач';
}

export function CalendarPage() {
  const [month, setMonth] = useState(() => dayjs().startOf('month'));
  const openNew = useTaskEditor((s) => s.openNew);
  const tasks = useTasksStore((s) => s.tasks);
  const { inScope } = useWorkspaceScope();
  // при свёрнутом меню календарь растягивается во всю ширину
  const sidebarCollapsed = useUiStore((s) => s.sidebarCollapsed);
  const fullText = useUiStore((s) => s.calendarFullText);
  const setFullText = useUiStore((s) => s.setCalendarFullText);
  const scale = useUiStore((s) => s.calendarScale);
  const setScale = useUiStore((s) => s.setCalendarScale);

  const title = month.format('MMMM YYYY');
  const capitalized = title.charAt(0).toUpperCase() + title.slice(1);

  // сколько задач видно в этом месяце: диапазон «начало–срок» пересекается
  // с месяцем (задача может идти через весь месяц)
  const monthStart = month.startOf('month').format('YYYY-MM-DD');
  const monthEnd = month.endOf('month').format('YYYY-MM-DD');
  const monthCount = tasks.filter((t) => {
    if (!inScope(t.workspaceId)) return false;
    const a = t.startDate ?? t.dueDate;
    const b = t.dueDate ?? t.startDate;
    if (!a || !b) return false;
    const [from, to] = a <= b ? [a, b] : [b, a];
    return from <= monthEnd && to >= monthStart;
  }).length;

  return (
    <div className={styles.page} data-wide={sidebarCollapsed || undefined}>
      <div className={styles.toolbar}>
        <div className={styles.left}>
          <Title order={2} className={styles.month}>
            {capitalized}
          </Title>
          <span className={styles.count}>
            {monthCount} {plural(monthCount)}
          </span>
          <div className={styles.nav}>
            <ActionIcon
              variant="subtle"
              color="gray"
              size="md"
              aria-label="Предыдущий месяц"
              onClick={() => setMonth((m) => m.subtract(1, 'month'))}
            >
              <IconChevronLeft size={18} />
            </ActionIcon>
            <button
              type="button"
              className={styles.todayBtn}
              onClick={() => setMonth(dayjs().startOf('month'))}
            >
              Сегодня
            </button>
            <ActionIcon
              variant="subtle"
              color="gray"
              size="md"
              aria-label="Следующий месяц"
              onClick={() => setMonth((m) => m.add(1, 'month'))}
            >
              <IconChevronRight size={18} />
            </ActionIcon>
          </div>
        </div>

        <div className={styles.right}>
          {/* вид карточек: в одну строку или с полным текстом */}
          <SegmentedControl
            size="xs"
            radius="xl"
            value={fullText ? 'full' : 'short'}
            onChange={(v) => setFullText(v === 'full')}
            aria-label="Вид задач"
            data={[
              {
                value: 'short',
                label: (
                  <Tooltip label="Кратко: одна строка" withArrow>
                    <span className={styles.segLabel}>
                      <IconLayoutList size={15} />
                      Кратко
                    </span>
                  </Tooltip>
                ),
              },
              {
                value: 'full',
                label: (
                  <Tooltip label="Полный текст задачи" withArrow>
                    <span className={styles.segLabel}>
                      <IconTextWrap size={15} />
                      Полностью
                    </span>
                  </Tooltip>
                ),
              },
            ]}
          />
          {/* размер шрифта задач */}
          <SegmentedControl
            size="xs"
            radius="xl"
            value={scale}
            onChange={(v) => setScale(v as CalendarScale)}
            aria-label="Размер шрифта"
            data={[
              {
                value: 's',
                label: (
                  <span className={styles.fontS} title="Мелкий шрифт">
                    A
                  </span>
                ),
              },
              {
                value: 'm',
                label: (
                  <span className={styles.fontM} title="Обычный шрифт">
                    A
                  </span>
                ),
              },
              {
                value: 'l',
                label: (
                  <span className={styles.fontL} title="Крупный шрифт">
                    A
                  </span>
                ),
              },
            ]}
          />
          <Button
            leftSection={<IconPlus size={16} />}
            onClick={() => openNew({ date: dayjs().format('YYYY-MM-DD') })}
          >
            Новая задача
          </Button>
        </div>
      </div>

      <MonthCalendar month={month} />
    </div>
  );
}
