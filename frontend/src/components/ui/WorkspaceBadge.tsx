import { useWorkspace } from '../../store/workspace';
import styles from './WorkspaceBadge.module.scss';

// Подпись «с какой доски задача» — нужна в режиме «Все доски»
export function WorkspaceBadge({ workspaceId }: { workspaceId: string }) {
  const ws = useWorkspace(workspaceId);
  if (!ws) return null;
  return (
    <span className={styles.badge} title={`Доска: ${ws.name}`}>
      <span className={styles.dot} style={{ background: ws.color }} />
      {ws.name}
    </span>
  );
}
