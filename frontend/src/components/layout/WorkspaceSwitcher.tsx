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
  IconPencil,
} from '@tabler/icons-react';
import { useWorkspaceStore, type Workspace } from '../../store/workspace';
import { ColorSwatchPicker } from '../ui/ColorSwatchPicker';
import { PALETTE_VALUES } from '../../lib/palette';
import styles from './WorkspaceSwitcher.module.scss';

export function WorkspaceSwitcher() {
  const {
    workspaces,
    activeId,
    setActive,
    addWorkspace,
    updateWorkspace,
    deleteWorkspace,
  } = useWorkspaceStore();
  const active = workspaces.find((w) => w.id === activeId) ?? workspaces[0];

  // null = модалка закрыта; 'new' = создание; Workspace = редактирование
  const [editing, setEditing] = useState<Workspace | 'new' | null>(null);
  const [name, setName] = useState('');
  const [color, setColor] = useState(PALETTE_VALUES[0]);

  const openCreate = () => {
    setName('');
    setColor(PALETTE_VALUES[0]);
    setEditing('new');
  };

  const openEdit = (w: Workspace) => {
    setName(w.name);
    setColor(w.color);
    setEditing(w);
  };

  const submit = async () => {
    const trimmed = name.trim();
    if (!trimmed || !editing) return;
    const target = editing;
    setEditing(null);
    if (target === 'new') {
      await addWorkspace(trimmed, color);
    } else {
      await updateWorkspace(target.id, { name: trimmed, color });
    }
  };

  return (
    <>
      <Menu shadow="md" width={300} position="bottom-start">
        <Menu.Target>
          <UnstyledButton className={styles.trigger} aria-label="Доска">
            <span
              className={styles.dot}
              style={{ background: active.color }}
              aria-hidden
            />
            <Text fw={600} size="md" className={styles.triggerName} truncate>
              {active.name}
            </Text>
            <IconChevronDown size={18} className={styles.chevron} />
          </UnstyledButton>
        </Menu.Target>

        <Menu.Dropdown>
          <Menu.Label>Доски</Menu.Label>
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
                  <ActionIcon
                    component="div"
                    variant="subtle"
                    color="gray"
                    size="sm"
                    aria-label={`Переименовать доску ${w.name}`}
                    onClick={(e) => {
                      e.stopPropagation();
                      openEdit(w);
                    }}
                  >
                    <IconPencil size={14} />
                  </ActionIcon>
                  {workspaces.length > 1 && (
                    <ActionIcon
                      component="div"
                      variant="subtle"
                      color="red"
                      size="sm"
                      aria-label={`Удалить доску ${w.name}`}
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
          <Menu.Item leftSection={<IconPlus size={16} />} onClick={openCreate}>
            Новая доска
          </Menu.Item>
        </Menu.Dropdown>
      </Menu>

      <Modal
        opened={editing !== null}
        onClose={() => setEditing(null)}
        title={editing === 'new' ? 'Новая доска' : 'Переименовать доску'}
        centered
        size="sm"
      >
        <Stack gap="md">
          <TextInput
            label="Название"
            placeholder="Например, Стройка или Отпуск"
            value={name}
            onChange={(e) => setName(e.currentTarget.value)}
            onKeyDown={(e) => e.key === 'Enter' && submit()}
            data-autofocus
          />
          <ColorSwatchPicker label="Цвет" value={color} onChange={setColor} />
          <Button onClick={submit} disabled={!name.trim()}>
            {editing === 'new' ? 'Создать' : 'Сохранить'}
          </Button>
        </Stack>
      </Modal>
    </>
  );
}
