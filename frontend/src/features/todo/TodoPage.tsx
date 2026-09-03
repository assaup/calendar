import { useState } from 'react';
import {
  Button,
  Checkbox,
  ActionIcon,
  Menu,
  TextInput,
  Select,
  SegmentedControl,
} from '@mantine/core';
import {
  IconPlus,
  IconDots,
  IconPencil,
  IconTrash,
  IconCalendar,
  IconSearch,
} from '@tabler/icons-react';
import dayjs from 'dayjs';
import { PageShell } from '../../components/ui/PageShell';
import { CategoryBadge } from '../../components/ui/CategoryBadge';
import { useTasksStore } from '../../store/tasks';
import { useWorkspaceStore } from '../../store/workspace';
import { useTaskEditor } from '../tasks/taskEditor';
import styles from './TodoPage.module.scss';

type StatusFilter = 'all' | 'active' | 'done';

export function TodoPage() {
  const tasks = useTasksStore((s) => s.tasks);
  const categories = useTasksStore((s) => s.categories);
  const toggleDone = useTasksStore((s) => s.toggleDone);
  const deleteTask = useTasksStore((s) => s.deleteTask);
  const activeWorkspace = useWorkspaceStore((s) => s.activeId);
  const openNew = useTaskEditor((s) => s.openNew);
  const openEdit = useTaskEditor((s) => s.openEdit);

  const [search, setSearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');

  const catColor = (id: string | null) =>
    categories.find((c) => c.id === id)?.color ?? 'transparent';

  const query = search.trim().toLowerCase();

  const visible = tasks
    .filter((t) => t.workspaceId === activeWorkspace)
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
    .filter((t) => !query || t.title.toLowerCase().includes(query))
    .sort((a, b) => {
      const doneA = a.status === 'done' ? 1 : 0;
      const doneB = b.status === 'done' ? 1 : 0;
      if (doneA !== doneB) return doneA - doneB;
      return (a.dueDate ?? '9999').localeCompare(b.dueDate ?? '9999');
    });

  const totalInWorkspace = tasks.filter(
    (t) => t.workspaceId === activeWorkspace,
  ).length;

  const categoryOptions = [
    { value: 'none', label: 'Без категории' },
    ...categories.map((c) => ({ value: c.id, label: c.name })),
  ];

  return (
    <PageShell
      title="Задачи"
      description="Все задачи пространства одним списком."
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
          w={190}
        />
        <SegmentedControl
          value={statusFilter}
          onChange={(v) => setStatusFilter(v as StatusFilter)}
          data={[
            { label: 'Все', value: 'all' },
            { label: 'Активные', value: 'active' },
            { label: 'Готово', value: 'done' },
          ]}
        />
      </div>

      {totalInWorkspace === 0 ? (
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
            Показано: {visible.length} из {totalInWorkspace}
          </div>
          <div className={styles.list}>
            {visible.map((task) => (
              <div
                key={task.id}
                className={styles.row}
                style={{ borderLeftColor: catColor(task.categoryId) }}
              >
                <Checkbox
                  size="sm"
                  checked={task.status === 'done'}
                  onChange={() => toggleDone(task.id)}
                  aria-label="Готово"
                />
                <button
                  type="button"
                  className={styles.main}
                  onClick={() => openEdit(task.id)}
                >
                  <span
                    className={styles.title}
                    data-done={task.status === 'done' || undefined}
                  >
                    {task.title}
                  </span>
                  <CategoryBadge categoryId={task.categoryId} />
                </button>

                {task.dueDate && (
                  <span className={styles.due}>
                    <IconCalendar size={13} />
                    {dayjs(task.dueDate).format('D MMM')}
                  </span>
                )}

                <Menu shadow="md" position="bottom-end" width={160}>
                  <Menu.Target>
                    <ActionIcon
                      variant="subtle"
                      color="gray"
                      size="sm"
                      onClick={(e) => e.stopPropagation()}
                      aria-label="Меню задачи"
                    >
                      <IconDots size={16} />
                    </ActionIcon>
                  </Menu.Target>
                  <Menu.Dropdown onClick={(e) => e.stopPropagation()}>
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
            ))}
          </div>
        </>
      )}
    </PageShell>
  );
}
