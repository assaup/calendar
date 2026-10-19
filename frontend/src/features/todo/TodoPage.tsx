import { useState } from 'react';
import {
  Button,
  Checkbox,
  ActionIcon,
  Menu,
  TextInput,
  Select,
  SegmentedControl,
  Chip,
} from '@mantine/core';
import {
  IconPlus,
  IconDots,
  IconPencil,
  IconTrash,
  IconCalendar,
  IconSearch,
  IconListCheck,
} from '@tabler/icons-react';
import dayjs from 'dayjs';
import { PageShell } from '../../components/ui/PageShell';
import { CategoryBadge } from '../../components/ui/CategoryBadge';
import { PriorityBadge } from '../../components/ui/PriorityBadge';
import { useTasksStore, isOverdue, PRIORITY_META } from '../../store/tasks';
import { useWorkspaceStore, useWorkspaceScope } from '../../store/workspace';
import { WorkspaceBadge } from '../../components/ui/WorkspaceBadge';
import { useTaskEditor } from '../tasks/taskEditor';
import { cardFocus } from '../tasks/cardFocus';
import styles from './TodoPage.module.scss';

type StatusFilter = 'all' | 'active' | 'done';
type SortBy = 'due' | 'priority' | 'created';

export function TodoPage() {
  const tasks = useTasksStore((s) => s.tasks);
  const categories = useTasksStore((s) => s.categories);
  const toggleDone = useTasksStore((s) => s.toggleDone);
  const deleteTask = useTasksStore((s) => s.deleteTask);
  const workspaces = useWorkspaceStore((s) => s.workspaces);
  const { isAll, inScope } = useWorkspaceScope();
  const openNew = useTaskEditor((s) => s.openNew);
  const openEdit = useTaskEditor((s) => s.openEdit);

  const [search, setSearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<string | null>(null);
  const [priorityFilter, setPriorityFilter] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');
  const [overdueOnly, setOverdueOnly] = useState(false);
  const [sortBy, setSortBy] = useState<SortBy>('due');

  const query = search.trim().toLowerCase();

  const inWorkspace = tasks.filter((t) => inScope(t.workspaceId));
  const overdueCount = inWorkspace.filter(isOverdue).length;

  const visible = inWorkspace
    .filter((t) =>
      statusFilter === 'all'
        ? true
        : statusFilter === 'done'
          ? t.status === 'done'
          : t.status !== 'done',
    )
    .filter((t) =>
      !categoryFilter
        ? true
        : categoryFilter === 'none'
          ? t.categoryId === null
          : t.categoryId === categoryFilter,
    )
    .filter((t) =>
      !priorityFilter
        ? true
        : priorityFilter === 'none'
          ? !t.priority
          : t.priority === priorityFilter,
    )
    .filter((t) => !overdueOnly || isOverdue(t))
    .filter((t) => !query || t.title.toLowerCase().includes(query))
    .sort((a, b) => {
      const doneA = a.status === 'done' ? 1 : 0;
      const doneB = b.status === 'done' ? 1 : 0;
      if (doneA !== doneB) return doneA - doneB;
      if (sortBy === 'priority') {
        const pa = a.priority ? PRIORITY_META[a.priority].order : 99;
        const pb = b.priority ? PRIORITY_META[b.priority].order : 99;
        if (pa !== pb) return pa - pb;
      } else if (sortBy === 'created') {
        return b.createdAt - a.createdAt;
      }
      return (a.dueDate ?? '9999').localeCompare(b.dueDate ?? '9999');
    });

  const categoryOptions = [
    { value: 'none', label: 'Без категории' },
    ...categories
      .filter((c) => inScope(c.workspaceId))
      .map((c) => ({
        value: c.id,
        // в «Все доски» одноимённые категории разных досок различаем по доске
        label: isAll
          ? `${c.name} · ${workspaces.find((w) => w.id === c.workspaceId)?.name ?? ''}`
          : c.name,
      })),
  ];

  return (
    <PageShell
      title="Задачи"
      description={
        isAll
          ? 'Задачи всех досок одним списком.'
          : 'Все задачи доски одним списком.'
      }
      action={
        <Button leftSection={<IconPlus size={16} />} onClick={() => openNew()}>
          Добавить
        </Button>
      }
    >
      <div className={styles.filters}>
        <TextInput
          className={styles.search}
          placeholder="Поиск по названию"
          leftSection={<IconSearch size={16} />}
          value={search}
          onChange={(e) => setSearch(e.currentTarget.value)}
        />
        <Select
          placeholder="Все категории"
          data={categoryOptions}
          value={categoryFilter}
          onChange={setCategoryFilter}
          clearable
          w={170}
        />
        <Select
          placeholder="Приоритет"
          data={[
            { value: 'high', label: 'Высокий' },
            { value: 'medium', label: 'Средний' },
            { value: 'low', label: 'Низкий' },
            { value: 'none', label: 'Без приоритета' },
          ]}
          value={priorityFilter}
          onChange={setPriorityFilter}
          clearable
          w={160}
        />
        <Select
          data={[
            { value: 'due', label: 'По сроку' },
            { value: 'priority', label: 'По приоритету' },
            { value: 'created', label: 'Новые сверху' },
          ]}
          value={sortBy}
          onChange={(v) => setSortBy((v as SortBy) ?? 'due')}
          w={160}
          aria-label="Сортировка"
        />
      </div>

      <div className={styles.filters2}>
        <SegmentedControl
          value={statusFilter}
          onChange={(v) => setStatusFilter(v as StatusFilter)}
          data={[
            { label: 'Все', value: 'all' },
            { label: 'Активные', value: 'active' },
            { label: 'Готово', value: 'done' },
          ]}
        />
        <Chip
          checked={overdueOnly}
          onChange={setOverdueOnly}
          color="red"
          variant="outline"
          disabled={overdueCount === 0}
        >
          Просрочено{overdueCount > 0 ? ` · ${overdueCount}` : ''}
        </Chip>
      </div>

      {inWorkspace.length === 0 ? (
        <div className={styles.empty}>
          Пока пусто. Нажми «Добавить», чтобы создать первую задачу.
        </div>
      ) : visible.length === 0 ? (
        <div className={styles.empty}>
          Ничего не найдено. Измени фильтры или поиск.
        </div>
      ) : (
        <>
          <div className={styles.resultCount}>
            Показано: {visible.length} из {inWorkspace.length}
          </div>
          <div
            className={styles.tableWrap}
            onMouseEnter={() => cardFocus.enterTarget({})}
            onMouseLeave={cardFocus.leaveTarget}
          >
            <div className={styles.table}>
              <div className={styles.tableHead}>
                <span />
                <span>Задача</span>
                <span>Приоритет</span>
                <span>Категория</span>
                <span>Срок</span>
                <span />
              </div>

              {visible.map((task) => {
                const subs = task.subtasks ?? [];
                const subsDone = subs.filter((s) => s.done).length;
                const overdue = isOverdue(task);
                return (
                  <div
                    key={task.id}
                    className={styles.tableRow}
                    onMouseEnter={() => cardFocus.enterTask(task.id)}
                    onMouseLeave={() => cardFocus.leaveTask(task.id)}
                  >
                    <Checkbox
                      size="sm"
                      checked={task.status === 'done'}
                      onChange={() => toggleDone(task.id)}
                      aria-label="Готово"
                    />
                    <button
                      type="button"
                      className={styles.titleCell}
                      onClick={() => openEdit(task.id)}
                    >
                      <span
                        className={styles.title}
                        data-done={task.status === 'done' || undefined}
                      >
                        {task.title}
                      </span>
                      {isAll && (
                        <WorkspaceBadge workspaceId={task.workspaceId} />
                      )}
                      {subs.length > 0 && (
                        <span className={styles.subs}>
                          <IconListCheck size={13} />
                          {subsDone}/{subs.length}
                        </span>
                      )}
                    </button>

                    <span className={styles.cell}>
                      {task.priority ? (
                        <PriorityBadge priority={task.priority} />
                      ) : (
                        <span className={styles.dash}>—</span>
                      )}
                    </span>

                    <span className={styles.cell}>
                      {task.categoryId ? (
                        <CategoryBadge categoryId={task.categoryId} />
                      ) : (
                        <span className={styles.dash}>—</span>
                      )}
                    </span>

                    <span className={styles.cell}>
                      {task.dueDate ? (
                        <span
                          className={styles.due}
                          data-overdue={overdue || undefined}
                        >
                          <IconCalendar size={13} />
                          {dayjs(task.dueDate).format('D MMM')}
                        </span>
                      ) : (
                        <span className={styles.dash}>—</span>
                      )}
                    </span>

                    <Menu shadow="md" position="bottom-end" width={160}>
                      <Menu.Target>
                        <ActionIcon
                          variant="subtle"
                          color="gray"
                          size="sm"
                          aria-label="Меню задачи"
                        >
                          <IconDots size={16} />
                        </ActionIcon>
                      </Menu.Target>
                      <Menu.Dropdown>
                        <Menu.Item
                          leftSection={<IconPencil size={15} />}
                          onClick={() => openEdit(task.id)}
                        >
                          Редактировать
                        </Menu.Item>
                        <Menu.Item
                          color="red"
                          leftSection={<IconTrash size={15} />}
                          onClick={() => deleteTask(task.id)}
                        >
                          Удалить
                        </Menu.Item>
                      </Menu.Dropdown>
                    </Menu>
                  </div>
                );
              })}
            </div>
          </div>
        </>
      )}
    </PageShell>
  );
}
