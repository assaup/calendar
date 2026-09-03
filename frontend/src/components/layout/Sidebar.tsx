import { NavLink as RouterNavLink } from 'react-router-dom';
import { Menu, UnstyledButton, Avatar, Text } from '@mantine/core';
import {
  IconCalendar,
  IconLayoutKanban,
  IconChecklist,
  IconNote,
  IconLogout,
  IconSun,
  IconChartPie,
} from '@tabler/icons-react';
import { useAuth } from '../../features/auth/useAuth';
import { LogoMark } from '../ui/LogoMark';
import styles from './Sidebar.module.scss';

const links = [
  { to: '/today', label: 'Сегодня', icon: IconSun },
  { to: '/calendar', label: 'Календарь', icon: IconCalendar },
  { to: '/board', label: 'Доска', icon: IconLayoutKanban },
  { to: '/todo', label: 'Задачи', icon: IconChecklist },
  { to: '/notes', label: 'Заметки', icon: IconNote },
  { to: '/dashboard', label: 'Панель', icon: IconChartPie },
];

export function Sidebar({ onNavigate }: { onNavigate?: () => void }) {
  const user = useAuth((s) => s.user);
  const logout = useAuth((s) => s.logout);

  const displayName = user?.name || user?.email || '';
  const initial = displayName.charAt(0).toUpperCase();

  return (
    <div className={styles.sidebar}>
      <div className={styles.brand}>
        <LogoMark size={26} />
        <span className={styles.brandName}>Планер</span>
      </div>

      <nav className={styles.nav}>
        {links.map(({ to, label, icon: Icon }) => (
          <RouterNavLink
            key={to}
            to={to}
            onClick={onNavigate}
            className={({ isActive }) =>
              isActive ? `${styles.link} ${styles.linkActive}` : styles.link
            }
          >
            <Icon size={20} stroke={1.7} />
            <span>{label}</span>
          </RouterNavLink>
        ))}
      </nav>

      <Menu shadow="md" width={200} position="top-start">
        <Menu.Target>
          <UnstyledButton className={styles.user}>
            <Avatar color="brand" radius="xl" size={32}>
              {initial}
            </Avatar>
            <div className={styles.userInfo}>
              <Text size="sm" fw={600} truncate>
                {user?.name || 'Аккаунт'}
              </Text>
              <Text size="xs" c="dimmed" truncate>
                {user?.email}
              </Text>
            </div>
          </UnstyledButton>
        </Menu.Target>
        <Menu.Dropdown>
          <Menu.Item
            color="red"
            leftSection={<IconLogout size={16} />}
            onClick={() => logout()}
          >
            Выйти
          </Menu.Item>
        </Menu.Dropdown>
      </Menu>
    </div>
  );
}
