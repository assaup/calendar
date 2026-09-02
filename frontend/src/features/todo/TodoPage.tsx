import { Badge, Button, Card, Checkbox } from '@mantine/core';
import { IconPlus } from '@tabler/icons-react';
import { PageShell } from '../../components/ui/PageShell';
import styles from './TodoPage.module.scss';

const tasks = [
  {
    id: 1,
    title: 'Смонтировать ролик',
    due: 'Сегодня',
    cat: 'Работа',
    color: 'blue',
    done: false,
  },
  {
    id: 2,
    title: 'Купить продукты',
    due: 'Завтра',
    cat: 'Дом',
    color: 'green',
    done: false,
  },
  {
    id: 3,
    title: 'Оплатить интернет',
    due: '5 сен',
    cat: 'Быт',
    color: 'orange',
    done: true,
  },
];

export function TodoPage() {
  return (
    <PageShell
      title="Задачи"
      description="Плоский список со сроками и категориями. Фильтры — на Этапе 4."
      action={<Button leftSection={<IconPlus size={16} />}>Добавить</Button>}
    >
      <Card withBorder radius="md" p={0}>
        {tasks.map((t) => (
          <div key={t.id} className={styles.row}>
            <Checkbox defaultChecked={t.done} />
            <span className={t.done ? styles.titleDone : styles.title}>
              {t.title}
            </span>
            <Badge size="sm" variant="light" color={t.color}>
              {t.cat}
            </Badge>
            <span className={styles.due}>{t.due}</span>
          </div>
        ))}
      </Card>
    </PageShell>
  );
}
