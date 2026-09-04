import { useState } from 'react';
import {
  Menu,
  UnstyledButton,
  Text,
  Modal,
  TextInput,
  Button,
  Stack,
  ActionIcon,
} from '@mantine/core';
import {
  IconChevronDown,
  IconCheck,
  IconPlus,
  IconTrash,
} from '@tabler/icons-react';
import { useWorkspaceStore } from '../../store/workspace';
import { ColorSwatchPicker } from '../ui/ColorSwatchPicker';
import { PALETTE_VALUES } from '../../lib/palette';
import styles from './WorkspaceSwitcher.module.scss';

export function WorkspaceSwitcher() {
  const { workspaces, activeId, setActive, addWorkspace, deleteWorkspace } =
    useWorkspaceStore();
  const active = workspaces.find((w) => w.id === activeId) ?? workspaces[0];

  const [createOpen, setCreateOpen] = useState(false);
  const [name, setName] = useState('');
  const [color, setColor] = useState(PALETTE_VALUES[0]);

  const create = async () => {
    const trimmed = name.trim();
    if (!trimmed) return;
    setName('');
    setColor(PALETTE_VALUES[0]);
    setCreateOpen(false);
    await addWorkspace(trimmed, color);
  };

  return (
    <>
      <Menu shadow="md" width={240} position="bottom-start">
        <Menu.Target>
          <UnstyledButton
            className={styles.trigger}
            aria-label="Рабочее пространство"
          >
            <span
              className={styles.dot}
              style={{ background: active.color }}
              aria-hidden
            />
            <Text fw={600} size="sm">
              {active.name}
            </Text>
            <IconChevronDown size={16} className={styles.chevron} />
          </UnstyledButton>
        </Menu.Target>

        <Menu.Dropdown>
          <Menu.Label>Пространства</Menu.Label>
          {workspaces.map((w) => (
            <Menu.Item
              key={w.id}
              onClick={() => setActive(w.id)}
              leftSection={
                <span className={styles.dot} style={{ background: w.color }} />
              }
              rightSection={
                <span className={styles.itemRight}>
                  {w.id === active.id && <IconCheck size={16} />}
                  {workspaces.length > 1 && (
                    <ActionIcon
                      component="div"
                      variant="subtle"
                      color="red"
                      size="sm"
                      aria-label={`Удалить пространство ${w.name}`}
                      onClick={(e) => {
                        e.stopPropagation();
                        void deleteWorkspace(w.id);
                      }}
                    >
                      <IconTrash size={14} />
                    </ActionIcon>
                  )}
                </span>
              }
            >
              {w.name}
            </Menu.Item>
          ))}
          <Menu.Divider />
          <Menu.Item
            leftSection={<IconPlus size={16} />}
            onClick={() => setCreateOpen(true)}
          >
            Новое пространство
          </Menu.Item>
        </Menu.Dropdown>
      </Menu>

      <Modal
        opened={createOpen}
        onClose={() => setCreateOpen(false)}
        title="Новое пространство"
        centered
        size="sm"
      >
        <Stack gap="md">
          <TextInput
            label="Название"
            placeholder="Например, Учёба или Спорт"
            value={name}
            onChange={(e) => setName(e.currentTarget.value)}
            onKeyDown={(e) => e.key === 'Enter' && create()}
            data-autofocus
          />
          <ColorSwatchPicker label="Цвет" value={color} onChange={setColor} />
          <Button onClick={create} disabled={!name.trim()}>
            Создать
          </Button>
        </Stack>
      </Modal>
    </>
  );
}
