import { Button, Card, Group, Badge } from '@mantine/core';
import { Calendar } from '@mantine/dates';
import { IconPlus } from '@tabler/icons-react';
import { PageShell } from '../../components/ui/PageShell';
import styles from './CalendarPage.module.scss';

export function CalendarPage() {
  return (
    <PageShell
      title="Календарь"
      description="Задачи со сроками появляются здесь автоматически."
      action={
        <Button leftSection={<IconPlus size={16} />}>Новая задача</Button>
      }
    >
      <div className={styles.layout}>
        <Card withBorder radius="md" className={styles.calendarCard}>
          <Calendar size="lg" static />
        </Card>

        <Card withBorder radius="md" className={styles.side}>
          <Group justify="space-between" mb="sm">
            <strong>Сегодня</strong>
            <Badge variant="light">демо</Badge>
          </Group>
          <div className={styles.empty}>
            Здесь будут задачи выбранного дня. Появится на Этапе 3.
          </div>
        </Card>
      </div>
    </PageShell>
  );
}
