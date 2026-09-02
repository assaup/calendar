import { Menu, UnstyledButton, Group, Text } from '@mantine/core';
import { IconChevronDown, IconCheck } from '@tabler/icons-react';
import { useWorkspaceStore } from '../../store/workspace';
import styles from './WorkspaceSwitcher.module.scss';

export function WorkspaceSwitcher() {
  const { workspaces, activeId, setActive } = useWorkspaceStore();
  const active = workspaces.find((w) => w.id === activeId) ?? workspaces[0];

  return (
    <Menu shadow="md" width={220} position="bottom-start">
      <Menu.Target>
        <UnstyledButton className={styles.trigger}>
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
        <Menu.Label>Пространство</Menu.Label>
        {workspaces.map((w) => (
          <Menu.Item
            key={w.id}
            onClick={() => setActive(w.id)}
            leftSection={
              <span className={styles.dot} style={{ background: w.color }} />
            }
            rightSection={w.id === active.id ? <IconCheck size={16} /> : null}
          >
            <Group gap={6}>{w.name}</Group>
          </Menu.Item>
        ))}
      </Menu.Dropdown>
    </Menu>
  );
}
