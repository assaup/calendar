import { useState } from 'react';
import dayjs from 'dayjs';
import { ActionIcon, Button, Title } from '@mantine/core';
import {
  IconChevronLeft,
  IconChevronRight,
  IconPlus,
} from '@tabler/icons-react';
import { MonthCalendar } from './MonthCalendar';
import { useTaskEditor } from '../tasks/taskEditor';
import { useTasksStore } from '../../store/tasks';
import { useWorkspaceStore } from '../../store/workspace';
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
  const activeWorkspace = useWorkspaceStore((s) => s.activeId);

  const title = month.format('MMMM YYYY');
  const capitalized = title.charAt(0).toUpperCase() + title.slice(1);

  // сколько задач в этом месяце (по датам начала/срока)
  const monthCount = tasks.filter((t) => {
    if (t.workspaceId !== activeWorkspace) return false;
    const inMonth = (d: string | null) =>
      !!d && dayjs(d).isSame(month, 'month');
    return inMonth(t.startDate) || inMonth(t.dueDate);
  }).length;

  return (
    <div className={styles.page}>
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

        <Button
          leftSection={<IconPlus size={16} />}
          onClick={() => openNew({ date: dayjs().format('YYYY-MM-DD') })}
        >
          Новая задача
        </Button>
      </div>

      <MonthCalendar month={month} />
    </div>
  );
}
