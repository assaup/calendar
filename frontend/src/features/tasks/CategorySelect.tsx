import { useState } from 'react';
import {
  Select,
  Group,
  ActionIcon,
  Popover,
  TextInput,
  Button,
  Stack,
} from '@mantine/core';
import { IconPlus } from '@tabler/icons-react';
import { useTasksStore } from '../../store/tasks';
import { ColorSwatchPicker } from '../../components/ui/ColorSwatchPicker';
import { PALETTE_VALUES } from '../../lib/palette';

interface Props {
  value: string | null;
  onChange: (id: string | null) => void;
}

export function CategorySelect({ value, onChange }: Props) {
  const categories = useTasksStore((s) => s.categories);
  const addCategory = useTasksStore((s) => s.addCategory);

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
        width={230}
        withArrow
        trapFocus
      >
        <Popover.Target>
          <ActionIcon
            variant="light"
            size="lg"
            aria-label="Новая категория"
            onClick={() => setOpened((o) => !o)}
          >
            <IconPlus size={18} />
          </ActionIcon>
        </Popover.Target>
        <Popover.Dropdown>
          <Stack gap="sm">
            <TextInput
              label="Название категории"
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
