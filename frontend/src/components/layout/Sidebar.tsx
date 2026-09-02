import { NavLink as RouterNavLink } from 'react-router-dom';
import {
  IconCalendar,
  IconLayoutKanban,
  IconChecklist,
  IconNote,
} from '@tabler/icons-react';
import styles from './Sidebar.module.scss';

const links = [
  { to: '/calendar', label: 'Календарь', icon: IconCalendar },
  { to: '/board', label: 'Доска', icon: IconLayoutKanban },
  { to: '/todo', label: 'Задачи', icon: IconChecklist },
  { to: '/notes', label: 'Заметки', icon: IconNote },
];

export function Sidebar({ onNavigate }: { onNavigate?: () => void }) {
  return (
    <div className={styles.sidebar}>
      <div className={styles.brand}>
        <span className={styles.logoDot} />
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
    </div>
  );
}
