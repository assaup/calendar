import { PRIORITY_META, type Priority } from '../../store/tasks';
import styles from './PriorityBadge.module.scss';

// Приоритет подписью-пилюлей (Высокий / Средний / Низкий).
export function PriorityBadge({
  priority,
}: {
  priority: Priority | null | undefined;
}) {
  if (!priority) return null;
  const m = PRIORITY_META[priority];
  return (
    <span
      className={styles.badge}
      style={{
        color: `color-mix(in srgb, ${m.color} 78%, var(--app-text))`,
        background: `color-mix(in srgb, ${m.color} 20%, transparent)`,
      }}
    >
      {m.label}
    </span>
  );
}
