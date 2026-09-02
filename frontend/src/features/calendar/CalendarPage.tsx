import { useState } from 'react';
import dayjs from 'dayjs';
import { ActionIcon, Button, Group, Title } from '@mantine/core';
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
        <Group gap="sm">
          <Title order={2} className={styles.month}>
            {capitalized}
          </Title>
          <Group gap={4}>
            <ActionIcon
              variant="default"
              size="lg"
              aria-label="Предыдущий месяц"
              onClick={() => setMonth((m) => m.subtract(1, 'month'))}
            >
              <IconChevronLeft size={18} />
            </ActionIcon>
            <ActionIcon
              variant="default"
              size="lg"
              aria-label="Следующий месяц"
              onClick={() => setMonth((m) => m.add(1, 'month'))}
            >
              <IconChevronRight size={18} />
            </ActionIcon>
          </Group>
          <Button
            variant="subtle"
            size="sm"
            onClick={() => setMonth(dayjs().startOf('month'))}
          >
            Сегодня
          </Button>
        </Group>

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
