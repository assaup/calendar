import { useState } from 'react';
import {
  Select,
  Group,
  ActionIcon,
  Popover,
  TextInput,
  Button,
  Stack,
  Text,
  Divider,
  Tooltip,
} from '@mantine/core';
import { modals } from '@mantine/modals';
import { IconPlus, IconTrash } from '@tabler/icons-react';
import { useTasksStore, type Category } from '../../store/tasks';
import { ColorSwatchPicker } from '../../components/ui/ColorSwatchPicker';
import { PALETTE_VALUES } from '../../lib/palette';

interface Props {
  value: string | null;
  onChange: (id: string | null) => void;
}

export function CategorySelect({ value, onChange }: Props) {
  const categories = useTasksStore((s) => s.categories);
  const addCategory = useTasksStore((s) => s.addCategory);
  const deleteCategory = useTasksStore((s) => s.deleteCategory);

  const [opened, setOpened] = useState(false);
  const [name, setName] = useState('');
  const [color, setColor] = useState(PALETTE_VALUES[0]);

  const data = categories.map((c) => ({ value: c.id, label: c.name }));

  const create = () => {
    const trimmed = name.trim();
    if (!trimmed) return;
    const id = addCategory(trimmed, color);
    onChange(id);
    setName('');
    setColor(PALETTE_VALUES[0]);
    setOpened(false);
  };

  const confirmDelete = (cat: Category) =>
    modals.openConfirmModal({
      title: 'Удалить категорию?',
      centered: true,
      children: (
        <Text size="sm">
          Категория «{cat.name}» будет удалена. Задачи с ней останутся, но
          потеряют эту категорию. Действие необратимо.
        </Text>
      ),
      labels: { confirm: 'Удалить', cancel: 'Отмена' },
      confirmProps: { color: 'red' },
      onConfirm: () => deleteCategory(cat.id),
    });

  return (
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

      <Popover
        opened={opened}
        onChange={setOpened}
        position="bottom-end"
        width={260}
        withArrow
        trapFocus
      >
        <Popover.Target>
          <Tooltip label="Категории" withArrow>
            <ActionIcon
              variant="light"
              size="lg"
              aria-label="Категории"
              onClick={() => setOpened((o) => !o)}
            >
              <IconPlus size={18} />
            </ActionIcon>
          </Tooltip>
        </Popover.Target>
        <Popover.Dropdown>
          <Stack gap="sm">
            {categories.length > 0 && (
              <Stack gap={4}>
                <Text size="xs" c="dimmed" fw={600}>
                  Твои категории
                </Text>
                {categories.map((c) => (
                  <Group key={c.id} justify="space-between" wrap="nowrap">
                    <Group gap={8} wrap="nowrap">
                      <span
                        style={{
                          width: 12,
                          height: 12,
                          borderRadius: 4,
                          background: c.color,
                          flexShrink: 0,
                        }}
                      />
                      <Text size="sm" truncate>
                        {c.name}
                      </Text>
                    </Group>
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
                ))}
                <Divider my={4} />
              </Stack>
            )}

            <Text size="xs" c="dimmed" fw={600}>
              Новая категория
            </Text>
            <TextInput
              placeholder="Например, Учёба"
              value={name}
              onChange={(e) => setName(e.currentTarget.value)}
              onKeyDown={(e) => e.key === 'Enter' && create()}
              data-autofocus
            />
            <ColorSwatchPicker label="Цвет" value={color} onChange={setColor} />
            <Button size="sm" onClick={create} disabled={!name.trim()}>
              Добавить
            </Button>
          </Stack>
        </Popover.Dropdown>
      </Popover>
    </Group>
  );
}
