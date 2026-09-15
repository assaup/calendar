import { useEffect, useRef, useState } from 'react';
import {
  Modal,
  TextInput,
  Textarea,
  SegmentedControl,
  Button,
  Group,
  Stack,
  Text,
  Checkbox,
  ActionIcon,
  Progress,
} from '@mantine/core';
import { DatePickerInput } from '@mantine/dates';
import { IconTrash, IconPlus, IconX } from '@tabler/icons-react';
import { useTaskEditor } from './taskEditor';
import { CategorySelect } from './CategorySelect';
import {
  useTasksStore,
  type TaskStatus,
  type Priority,
  type SubTask,
} from '../../store/tasks';
import { useWorkspaceStore } from '../../store/workspace';
import styles from './TaskModal.module.scss';

interface FormState {
  title: string;
  description: string;
  categoryId: string | null;
  status: TaskStatus;
  priority: Priority | null;
  subtasks: SubTask[];
  startDate: string | null;
  dueDate: string | null;
}

const blank: FormState = {
  title: '',
  description: '',
  categoryId: null,
  status: 'todo',
  priority: null,
  subtasks: [],
  startDate: null,
  dueDate: null,
};

const uid = () =>
  typeof crypto !== 'undefined' && 'randomUUID' in crypto
    ? crypto.randomUUID()
    : Math.random().toString(36).slice(2);

export function TaskModal() {
  const { opened, editingId, presetDate, presetStatus, close } =
    useTaskEditor();
  const addTask = useTasksStore((s) => s.addTask);
  const updateTask = useTasksStore((s) => s.updateTask);
  const deleteTask = useTasksStore((s) => s.deleteTask);
  const activeWorkspace = useWorkspaceStore((s) => s.activeId);

  const [form, setForm] = useState<FormState>(blank);
  const [subInput, setSubInput] = useState('');

  // менялось ли что-то с момента открытия (чтобы не сохранять зря)
  const dirty = useRef(false);
  // всегда актуальная форма — нужна, чтобы дописать изменения при закрытии
  const latest = useRef(form);
  useEffect(() => {
    latest.current = form;
  }, [form]);

  // Форму наполняем ТОЛЬКО при открытии: иначе автосохранение обновит стор,
  // а тот перезапишет форму прямо во время набора текста.
  useEffect(() => {
    if (!opened) return;
    setSubInput('');
    dirty.current = false;
    if (editingId) {
      const t = useTasksStore.getState().tasks.find((x) => x.id === editingId);
      if (t) {
        setForm({
          title: t.title,
          description: t.description,
          categoryId: t.categoryId,
          status: t.status,
          priority: t.priority ?? null,
          subtasks: t.subtasks ?? [],
          startDate: t.startDate,
          dueDate: t.dueDate,
        });
      }
    } else {
      setForm({
        ...blank,
        status: presetStatus ?? 'todo',
        startDate: presetDate ?? null,
        dueDate: presetDate ?? null,
      });
    }
  }, [opened, editingId, presetDate, presetStatus]);

  // Автосохранение при редактировании — кнопка «Сохранить» не нужна
  useEffect(() => {
    if (!opened || !editingId || !dirty.current) return;
    if (!form.title.trim()) return;
    const timer = setTimeout(() => {
      dirty.current = false;
      void updateTask(editingId, form);
    }, 500);
    return () => clearTimeout(timer);
  }, [form, opened, editingId, updateTask]);

  // Если закрыли раньше, чем сработала задержка, — дописываем сразу
  const flush = () => {
    if (!editingId || !dirty.current) return;
    if (!latest.current.title.trim()) return;
    dirty.current = false;
    void updateTask(editingId, latest.current);
  };

  const handleClose = () => {
    flush();
    close();
  };

  const set = <K extends keyof FormState>(key: K, value: FormState[K]) => {
    dirty.current = true;
    setForm((f) => ({ ...f, [key]: value }));
  };

  const addSub = () => {
    const title = subInput.trim();
    if (!title) return;
    set('subtasks', [...form.subtasks, { id: uid(), title, done: false }]);
    setSubInput('');
  };
  const toggleSub = (id: string) =>
    set(
      'subtasks',
      form.subtasks.map((s) => (s.id === id ? { ...s, done: !s.done } : s)),
    );
  const deleteSub = (id: string) =>
    set(
      'subtasks',
      form.subtasks.filter((s) => s.id !== id),
    );

  const doneCount = form.subtasks.filter((s) => s.done).length;
  const progress = form.subtasks.length
    ? (doneCount / form.subtasks.length) * 100
    : 0;

  const canSave = form.title.trim().length > 0;

  const handleCreate = async () => {
    if (!canSave) return;
    const id = await addTask({
      workspaceId: activeWorkspace,
      title: form.title,
      description: form.description,
      categoryId: form.categoryId,
      status: form.status,
      priority: form.priority,
      startDate: form.startDate,
      dueDate: form.dueDate,
    });
    if (form.subtasks.length) void updateTask(id, { subtasks: form.subtasks });
    close();
  };

  const handleDelete = () => {
    dirty.current = false;
    if (editingId) deleteTask(editingId);
    close();
  };

  return (
    <Modal
      opened={opened}
      onClose={handleClose}
      title={editingId ? 'Задача' : 'Новая задача'}
      centered
      size="lg"
    >
      <Stack gap="md">
        <div className={styles.grid}>
          {/* Левая колонка: суть задачи */}
          <div className={styles.col}>
            <TextInput
              label="Название"
              placeholder="Что нужно сделать?"
              value={form.title}
              onChange={(e) => set('title', e.currentTarget.value)}
              data-autofocus
              required
            />
            <Textarea
              label="Описание"
              placeholder="Детали, ссылки, заметки…"
              value={form.description}
              onChange={(e) => set('description', e.currentTarget.value)}
              autosize
              minRows={3}
              maxRows={5}
            />
          </div>

          {/* Правая колонка: свойства */}
          <div className={styles.col}>
            <CategorySelect
              value={form.categoryId}
              onChange={(v) => set('categoryId', v)}
            />
            <DatePickerInput
              label="Начало"
              placeholder="—"
              value={form.startDate}
              onChange={(v) => set('startDate', v)}
              valueFormat="D MMM YYYY"
              clearable
            />
            <DatePickerInput
              label="Срок"
              placeholder="—"
              value={form.dueDate}
              onChange={(v) => set('dueDate', v)}
              valueFormat="D MMM YYYY"
              clearable
            />
          </div>
        </div>

        {/* Приоритет и статус — во всю ширину, чтобы подписи не сжимались */}
        <div className={styles.grid}>
          <div>
            <Text size="sm" fw={500} mb={6}>
              Приоритет
            </Text>
            <SegmentedControl
              fullWidth
              size="xs"
              value={form.priority ?? 'none'}
              onChange={(v) =>
                set('priority', v === 'none' ? null : (v as Priority))
              }
              data={[
                { label: 'Нет', value: 'none' },
                { label: 'Низкий', value: 'low' },
                { label: 'Средний', value: 'medium' },
                { label: 'Высокий', value: 'high' },
              ]}
            />
          </div>
          <div>
            <Text size="sm" fw={500} mb={6}>
              Статус
            </Text>
            <SegmentedControl
              fullWidth
              size="xs"
              value={form.status}
              onChange={(v) => set('status', v as TaskStatus)}
              data={[
                { label: 'К выполнению', value: 'todo' },
                { label: 'В работе', value: 'in_progress' },
                { label: 'Готово', value: 'done' },
              ]}
            />
          </div>
        </div>

        {/* Подзадачи */}
        <div>
          <Group justify="space-between" mb={6}>
            <Text size="sm" fw={500}>
              Подзадачи
            </Text>
            {form.subtasks.length > 0 && (
              <Text size="xs" c="dimmed">
                {doneCount} из {form.subtasks.length}
              </Text>
            )}
          </Group>

          {form.subtasks.length > 0 && (
            <Progress value={progress} size="sm" radius="xl" mb="xs" />
          )}

          <Stack gap={6} className={styles.subList}>
            {form.subtasks.map((s) => (
              <Group key={s.id} gap="xs" wrap="nowrap">
                <Checkbox
                  size="sm"
                  checked={s.done}
                  onChange={() => toggleSub(s.id)}
                />
                <Text
                  size="sm"
                  style={{
                    flex: 1,
                    textDecoration: s.done ? 'line-through' : undefined,
                    color: s.done ? 'var(--app-text-dim)' : undefined,
                  }}
                >
                  {s.title}
                </Text>
                <ActionIcon
                  variant="subtle"
                  color="gray"
                  size="sm"
                  aria-label="Удалить подзадачу"
                  onClick={() => deleteSub(s.id)}
                >
                  <IconX size={14} />
                </ActionIcon>
              </Group>
            ))}
          </Stack>

          <TextInput
            mt="xs"
            placeholder="Добавить подзадачу и Enter"
            value={subInput}
            onChange={(e) => setSubInput(e.currentTarget.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                e.preventDefault();
                addSub();
              }
            }}
            rightSection={
              <ActionIcon
                variant="subtle"
                color="gray"
                aria-label="Добавить подзадачу"
                onClick={addSub}
              >
                <IconPlus size={16} />
              </ActionIcon>
            }
          />
        </div>

        <Group justify="space-between">
          {editingId ? (
            <Button
              variant="subtle"
              color="red"
              leftSection={<IconTrash size={16} />}
              onClick={handleDelete}
            >
              Удалить
            </Button>
          ) : (
            <span />
          )}

          {editingId ? (
            <Group gap="sm">
              <span className={styles.hint}>Изменения сохраняются сами</span>
              <Button onClick={handleClose}>Готово</Button>
            </Group>
          ) : (
            <Group gap="sm">
              <Button variant="default" onClick={close}>
                Отмена
              </Button>
              <Button onClick={handleCreate} disabled={!canSave}>
                Создать
              </Button>
            </Group>
          )}
        </Group>
      </Stack>
    </Modal>
  );
}
