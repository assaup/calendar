import { useState } from 'react';
import {
  Select,
  Group,
  ActionIcon,
  Modal,
  TextInput,
  Button,
  Stack,
  Text,
  Divider,
  Tooltip,
  ScrollArea,
} from '@mantine/core';
import { modals } from '@mantine/modals';
import { IconSettings, IconTrash, IconPencil } from '@tabler/icons-react';
import { useTasksStore, type Category } from '../../store/tasks';
import { ColorSwatchPicker } from '../../components/ui/ColorSwatchPicker';
import { PALETTE_VALUES } from '../../lib/palette';

interface Props {
  /** доска задачи — категории у каждой доски свои */
  workspaceId: string;
  value: string | null;
  onChange: (id: string | null) => void;
}

export function CategorySelect({ workspaceId, value, onChange }: Props) {
  const allCategories = useTasksStore((s) => s.categories);
  const addCategory = useTasksStore((s) => s.addCategory);
  const updateCategory = useTasksStore((s) => s.updateCategory);
  const deleteCategory = useTasksStore((s) => s.deleteCategory);
  // категории принадлежат конкретной доске
  const categories = allCategories.filter((c) => c.workspaceId === workspaceId);

  const [manageOpen, setManageOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [name, setName] = useState('');
  const [color, setColor] = useState(PALETTE_VALUES[0]);

  const data = categories.map((c) => ({ value: c.id, label: c.name }));

  const resetForm = () => {
    setEditingId(null);
    setName('');
    setColor(PALETTE_VALUES[0]);
  };

  const startEdit = (cat: Category) => {
    setEditingId(cat.id);
    setName(cat.name);
    setColor(cat.color);
  };

  const submit = async () => {
    const trimmed = name.trim();
    if (!trimmed) return;
    if (editingId) {
      await updateCategory(editingId, { name: trimmed, color });
    } else {
      const id = await addCategory(trimmed, color, workspaceId);
      onChange(id);
    }
    resetForm();
  };

  const confirmDelete = (cat: Category) =>
    modals.openConfirmModal({
      title: 'Удалить категорию?',
      centered: true,
      zIndex: 400,
      children: (
        <Text size="sm">
          Категория «{cat.name}» будет удалена. Задачи с ней останутся, но
          потеряют эту категорию. Действие необратимо.
        </Text>
      ),
      labels: { confirm: 'Удалить', cancel: 'Отмена' },
      confirmProps: { color: 'red' },
      onConfirm: () => {
        if (editingId === cat.id) resetForm();
        deleteCategory(cat.id);
      },
    });

  const closeManage = () => {
    setManageOpen(false);
    resetForm();
  };

  return (
    <>
      <Group gap="xs" align="flex-end" wrap="nowrap">
        <Select
          label="Категория"
          placeholder="Без категории"
          data={data}
          value={value}
          onChange={onChange}
          clearable
          style={{ flex: 1 }}
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

        <Tooltip label="Категории" withArrow>
          <ActionIcon
            variant="light"
            size="lg"
            aria-label="Управление категориями"
            onClick={() => setManageOpen(true)}
          >
            <IconSettings size={18} />
          </ActionIcon>
        </Tooltip>
      </Group>

      <Modal
        opened={manageOpen}
        onClose={closeManage}
        title="Категории этой доски"
        centered
        zIndex={350}
        size="sm"
      >
        <Stack gap="md">
          {categories.length > 0 && (
            <Stack gap={6}>
              <Text size="xs" c="dimmed" fw={600}>
                Категории
              </Text>
              <ScrollArea.Autosize mah={240}>
                <Stack gap={4}>
                  {categories.map((c) => (
                    <Group key={c.id} justify="space-between" wrap="nowrap">
                      <Group gap={8} wrap="nowrap">
                        <span
                          style={{
                            width: 14,
                            height: 14,
                            borderRadius: 4,
                            background: c.color,
                            flexShrink: 0,
                          }}
                        />
                        <Text size="sm" truncate>
                          {c.name}
                        </Text>
                      </Group>
                      <Group gap={2} wrap="nowrap">
                        <ActionIcon
                          variant="subtle"
                          color="gray"
                          size="sm"
                          aria-label={`Переименовать категорию ${c.name}`}
                          onClick={() => startEdit(c)}
                        >
                          <IconPencil size={15} />
                        </ActionIcon>
                        <ActionIcon
                          variant="subtle"
                          color="red"
                          size="sm"
                          aria-label={`Удалить категорию ${c.name}`}
                          onClick={() => confirmDelete(c)}
                        >
                          <IconTrash size={15} />
                        </ActionIcon>
                      </Group>
                    </Group>
                  ))}
                </Stack>
              </ScrollArea.Autosize>
            </Stack>
          )}

          <Divider
            label={editingId ? 'Изменить категорию' : 'Новая категория'}
            labelPosition="left"
          />

          <TextInput
            label="Название"
            placeholder="Например, Фундамент"
            value={name}
            onChange={(e) => setName(e.currentTarget.value)}
            onKeyDown={(e) => e.key === 'Enter' && submit()}
            data-autofocus
          />
          <ColorSwatchPicker label="Цвет" value={color} onChange={setColor} />
          <Group gap="xs">
            <Button
              onClick={submit}
              disabled={!name.trim()}
              style={{ flex: 1 }}
            >
              {editingId ? 'Сохранить' : 'Добавить категорию'}
            </Button>
            {editingId && (
              <Button variant="default" onClick={resetForm}>
                Отмена
              </Button>
            )}
          </Group>
        </Stack>
      </Modal>
    </>
  );
}
