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
        color: category.color,
        background: `color-mix(in srgb, ${category.color} 14%, transparent)`,
      }}
    >
      {category.name}
    </span>
  );
}
