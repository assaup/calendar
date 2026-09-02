import { Button, Card } from '@mantine/core';
import { IconPlus } from '@tabler/icons-react';
import { PageShell } from '../../components/ui/PageShell';
import styles from './NotesPage.module.scss';

const notes = [
  {
    id: 1,
    title: 'Идеи для роликов',
    text: 'Разбор трендов, короткие форматы, интро...',
  },
  { id: 2, title: 'Список покупок', text: 'Молоко, хлеб, кофе, овсянка' },
  { id: 3, title: 'Черновик', text: 'Быстрая запись мысли на потом' },
];

export function NotesPage() {
  return (
    <PageShell
      title="Заметки"
      description="Быстрые заметки как в телефоне. Появятся на Этапе 5."
      action={<Button leftSection={<IconPlus size={16} />}>Заметка</Button>}
    >
      <div className={styles.grid}>
        {notes.map((n) => (
          <Card key={n.id} withBorder radius="md" className={styles.note}>
            <div className={styles.noteTitle}>{n.title}</div>
            <div className={styles.noteText}>{n.text}</div>
          </Card>
        ))}
      </div>
    </PageShell>
  );
}
