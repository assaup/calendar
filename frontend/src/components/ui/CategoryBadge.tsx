import { useTasksStore } from '../../store/tasks';
import styles from './CategoryBadge.module.scss';

export function CategoryBadge({ categoryId }: { categoryId: string | null }) {
  const category = useTasksStore((s) =>
    s.categories.find((c) => c.id === categoryId),
  );
  if (!category) return null;
  return (
    <span
      className={styles.badge}
      style={{
        // цвет текста подмешиваем к цвету темы — читается на светлых цветах
        color: `color-mix(in srgb, ${category.color} 72%, var(--app-text))`,
        background: `color-mix(in srgb, ${category.color} 20%, transparent)`,
      }}
    >
      {category.name}
    </span>
  );
}
