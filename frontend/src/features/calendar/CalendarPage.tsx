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
import styles from './CalendarPage.module.scss';

export function CalendarPage() {
  const [month, setMonth] = useState(() => dayjs().startOf('month'));
  const openNew = useTaskEditor((s) => s.openNew);

  const title = month.format('MMMM YYYY');
  const capitalized = title.charAt(0).toUpperCase() + title.slice(1);

  return (
    <div className={styles.page}>
      <div className={styles.toolbar}>
        <div className={styles.left}>
          <Title order={2} className={styles.month}>
            {capitalized}
          </Title>
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
