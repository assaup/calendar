import { Badge, Button, Card } from '@mantine/core';
import { IconPlus } from '@tabler/icons-react';
import { PageShell } from '../../components/ui/PageShell';
import styles from './BoardPage.module.scss';

const columns = [
  {
    id: 'todo',
    title: 'To Do',
    cards: [
      { id: 1, title: 'Смонтировать ролик', cat: 'Работа', color: 'blue' },
      { id: 2, title: 'Купить продукты', cat: 'Дом', color: 'green' },
    ],
  },
  {
    id: 'doing',
    title: 'В работе',
    cards: [
      { id: 3, title: 'Сценарий для продюсера', cat: 'Работа', color: 'blue' },
    ],
  },
  {
    id: 'done',
    title: 'Готово',
    cards: [
      { id: 4, title: 'Созвон с командой', cat: 'Встречи', color: 'grape' },
    ],
  },
];

export function BoardPage() {
  return (
    <PageShell
      title="Доска"
      description="Канбан с перетаскиванием задач. Drag-and-drop подключим на Этапе 2."
      action={<Button leftSection={<IconPlus size={16} />}>Добавить</Button>}
    >
      <div className={styles.board}>
        {columns.map((col) => (
          <div key={col.id} className={styles.column}>
            <div className={styles.columnHead}>
              <span>{col.title}</span>
              <span className={styles.count}>{col.cards.length}</span>
            </div>
            <div className={styles.cards}>
              {col.cards.map((card) => (
                <Card
                  key={card.id}
                  withBorder
                  radius="md"
                  className={styles.card}
                >
                  <div className={styles.cardTitle}>{card.title}</div>
                  <Badge size="sm" variant="light" color={card.color} mt={8}>
                    {card.cat}
                  </Badge>
                </Card>
              ))}
            </div>
          </div>
        ))}
      </div>
    </PageShell>
  );
}
