import { PageShell } from '../../components/ui/PageShell';
import { Donut } from './Donut';
import {
  useTasksStore,
  isOverdue,
  PRIORITY_META,
  type Priority,
} from '../../store/tasks';
import { useWorkspaceStore, useWorkspaceScope } from '../../store/workspace';
import styles from './DashboardPage.module.scss';

const STATUS_COLORS = {
  todo: '#adb5bd',
  in_progress: '#f08c00',
  done: '#40c057',
};

function StatTile({
  label,
  value,
  sub,
  accent,
}: {
  label: string;
  value: number | string;
  sub?: string;
  accent?: string;
}) {
  return (
    <div className={styles.tile}>
      <div className={styles.tileLabel}>{label}</div>
      <div
        className={styles.tileValue}
        style={accent ? { color: accent } : undefined}
      >
        {value}
      </div>
      {sub && <div className={styles.tileSub}>{sub}</div>}
    </div>
  );
}

export function DashboardPage() {
  const tasks = useTasksStore((s) => s.tasks);
  const categories = useTasksStore((s) => s.categories);
  const workspaces = useWorkspaceStore((s) => s.workspaces);
  const { isAll, inScope } = useWorkspaceScope();

  const items = tasks.filter((t) => inScope(t.workspaceId));
  const total = items.length;
  const done = items.filter((t) => t.status === 'done').length;
  const inProgress = items.filter((t) => t.status === 'in_progress').length;
  const todo = items.filter((t) => t.status === 'todo').length;
  const overdue = items.filter(isOverdue).length;
  const rate = total ? Math.round((done / total) * 100) : 0;

  const statusSegments = [
    { value: todo, color: STATUS_COLORS.todo, label: 'К выполнению' },
    { value: inProgress, color: STATUS_COLORS.in_progress, label: 'В работе' },
    { value: done, color: STATUS_COLORS.done, label: 'Готово' },
  ];

  // по категориям (только непустые, по убыванию); в «Все доски» — по доскам
  const catCounts = (
    isAll
      ? workspaces.map((w) => ({
          label: w.name,
          color: w.color,
          count: items.filter((t) => t.workspaceId === w.id).length,
        }))
      : categories
          .map((c) => ({
            label: c.name,
            color: c.color,
            count: items.filter((t) => t.categoryId === c.id).length,
          }))
          .concat({
            label: 'Без категории',
            color: 'var(--app-text-dim)',
            count: items.filter((t) => t.categoryId === null).length,
          })
  )
    .filter((c) => c.count > 0)
    .sort((a, b) => b.count - a.count);
  const catMax = Math.max(1, ...catCounts.map((c) => c.count));

  // по приоритету
  const priorityRows = (['high', 'medium', 'low'] as Priority[]).map((p) => ({
    label: PRIORITY_META[p].label,
    color: PRIORITY_META[p].color,
    count: items.filter((t) => t.priority === p).length,
  }));
  const prioMax = Math.max(1, ...priorityRows.map((p) => p.count));

  if (total === 0) {
    return (
      <PageShell
        title="Панель"
        description={isAll ? 'Статистика всех досок' : 'Статистика доски'}
      >
        <div className={styles.empty}>
          В этом пространстве пока нет задач — добавь их, и здесь появится
          статистика.
        </div>
      </PageShell>
    );
  }

  return (
    <PageShell
      title="Панель"
      description={isAll ? 'Статистика всех досок' : 'Статистика доски'}
    >
      <div className={styles.tiles}>
        <StatTile label="Всего задач" value={total} />
        <StatTile
          label="Выполнено"
          value={done}
          sub={`${rate}% готово`}
          accent="#40c057"
        />
        <StatTile label="Активных" value={todo + inProgress} />
        <StatTile
          label="Просрочено"
          value={overdue}
          accent={overdue > 0 ? '#fa5252' : undefined}
        />
      </div>

      <div className={styles.grid}>
        <div className={styles.card}>
          <div className={styles.cardTitle}>По статусу</div>
          <Donut
            segments={statusSegments}
            centerTop={`${rate}%`}
            centerBottom="готово"
          />
        </div>

        <div className={styles.card}>
          <div className={styles.cardTitle}>
            {isAll ? 'По доскам' : 'По категориям'}
          </div>
          <div className={styles.bars}>
            {catCounts.map((c) => (
              <div key={c.label} className={styles.barRow}>
                <span className={styles.barLabel}>{c.label}</span>
                <div className={styles.barTrack}>
                  <div
                    className={styles.barFill}
                    style={{
                      width: `${(c.count / catMax) * 100}%`,
                      background: c.color,
                    }}
                  />
                </div>
                <span className={styles.barValue}>{c.count}</span>
              </div>
            ))}
          </div>
        </div>

        <div className={styles.card}>
          <div className={styles.cardTitle}>По приоритету</div>
          <div className={styles.bars}>
            {priorityRows.map((p) => (
              <div key={p.label} className={styles.barRow}>
                <span className={styles.barLabel}>{p.label}</span>
                <div className={styles.barTrack}>
                  <div
                    className={styles.barFill}
                    style={{
                      width: `${(p.count / prioMax) * 100}%`,
                      background: p.color,
                    }}
                  />
                </div>
                <span className={styles.barValue}>{p.count}</span>
              </div>
            ))}
          </div>
        </div>

        <div className={styles.card}>
          <div className={styles.cardTitle}>Прогресс</div>
          <div className={styles.progressBig}>
            <div className={styles.progressNum}>{rate}%</div>
            <div className={styles.progressText}>
              {done} из {total} задач выполнено
            </div>
            <div className={styles.progressTrack}>
              <div
                className={styles.progressFill}
                style={{ width: `${rate}%` }}
              />
            </div>
          </div>
        </div>
      </div>
    </PageShell>
  );
}
