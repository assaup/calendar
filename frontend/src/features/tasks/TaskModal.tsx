import { useEffect, useState } from 'react';
import {
  Modal,
  TextInput,
  Textarea,
  Select,
  SegmentedControl,
  Button,
  Group,
  Stack,
  Text,
} from '@mantine/core';
import { DatePickerInput } from '@mantine/dates';
import { IconTrash } from '@tabler/icons-react';
import { useTaskEditor } from './taskEditor';
import { useTasksStore, type TaskStatus } from '../../store/tasks';
import { useWorkspaceStore } from '../../store/workspace';

interface FormState {
  title: string;
  description: string;
  categoryId: string | null;
  status: TaskStatus;
  startDate: string | null;
  dueDate: string | null;
}

const blank: FormState = {
  title: '',
  description: '',
  categoryId: null,
  status: 'todo',
  startDate: null,
  dueDate: null,
};

export function TaskModal() {
  const { opened, editingId, presetDate, presetStatus, close } =
    useTaskEditor();
  const { tasks, categories, addTask, updateTask, deleteTask } =
    useTasksStore();
  const activeWorkspace = useWorkspaceStore((s) => s.activeId);

  const [form, setForm] = useState<FormState>(blank);

  // Заполняем форму при открытии
  useEffect(() => {
    if (!opened) return;
    if (editingId) {
      const t = tasks.find((x) => x.id === editingId);
      if (t) {
        setForm({
          title: t.title,
          description: t.description,
          categoryId: t.categoryId,
          status: t.status,
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
  }, [opened, editingId, presetDate, presetStatus, tasks]);

  const set = <K extends keyof FormState>(key: K, value: FormState[K]) =>
    setForm((f) => ({ ...f, [key]: value }));

  const canSave = form.title.trim().length > 0;

  const handleSave = () => {
    if (!canSave) return;
    if (editingId) {
      updateTask(editingId, form);
    } else {
      addTask({ workspaceId: activeWorkspace, ...form });
    }
    close();
  };

  const handleDelete = () => {
    if (editingId) deleteTask(editingId);
    close();
  };

  const categoryData = categories.map((c) => ({ value: c.id, label: c.name }));

  return (
    <Modal
      opened={opened}
      onClose={close}
      title={editingId ? 'Задача' : 'Новая задача'}
      centered
      size="md"
    >
      <Stack gap="md">
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
          minRows={2}
          maxRows={6}
        />

        <Select
          label="Категория"
          placeholder="Без категории"
          data={categoryData}
          value={form.categoryId}
          onChange={(v) => set('categoryId', v)}
          clearable
          renderOption={({ option }) => {
            const cat = categories.find((c) => c.id === option.value);
            return (
              <Group gap={8}>
                <span
                  style={{
                    width: 10,
                    height: 10,
                    borderRadius: 3,
                    background: cat?.color,
                    display: 'inline-block',
                  }}
                />
                <span>{option.label}</span>
              </Group>
            );
          }}
        />

        <div>
          <Text size="sm" fw={500} mb={6}>
            Статус
          </Text>
          <SegmentedControl
            fullWidth
            value={form.status}
            onChange={(v) => set('status', v as TaskStatus)}
            data={[
              { label: 'К выполнению', value: 'todo' },
              { label: 'В работе', value: 'in_progress' },
              { label: 'Готово', value: 'done' },
            ]}
          />
        </div>

        <Group grow>
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
        </Group>

        <Group justify="space-between" mt="sm">
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
          <Group gap="sm">
            <Button variant="default" onClick={close}>
              Отмена
            </Button>
            <Button onClick={handleSave} disabled={!canSave}>
              Сохранить
            </Button>
          </Group>
        </Group>
      </Stack>
    </Modal>
  );
}
