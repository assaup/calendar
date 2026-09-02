import { useState } from 'react';
import { Outlet } from 'react-router-dom';
import { ActionIcon, Burger } from '@mantine/core';
import { IconLayoutSidebarLeftCollapse } from '@tabler/icons-react';
import { Sidebar } from './Sidebar';
import { WorkspaceSwitcher } from './WorkspaceSwitcher';
import { ThemeToggle } from './ThemeToggle';
import styles from './AppLayout.module.scss';

export function AppLayout() {
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <div className={styles.shell}>
      {/* Боковое меню */}
      <aside
        className={styles.sidebar}
        data-open={mobileOpen ? 'true' : undefined}
      >
        <Sidebar onNavigate={() => setMobileOpen(false)} />
      </aside>

      {/* Затемнение под меню на мобильном */}
      {mobileOpen && (
        <div
          className={styles.overlay}
          onClick={() => setMobileOpen(false)}
          aria-hidden
        />
      )}

      {/* Правая часть: верхняя панель + контент */}
      <div className={styles.main}>
        <header className={styles.topbar}>
          <div className={styles.topbarLeft}>
            <Burger
              className={styles.burger}
              opened={mobileOpen}
              onClick={() => setMobileOpen((v) => !v)}
              size="sm"
              aria-label="Меню"
            />
            <WorkspaceSwitcher />
          </div>
          <div className={styles.topbarRight}>
            <ThemeToggle />
            <ActionIcon
              variant="subtle"
              color="gray"
              size="lg"
              aria-label="Свернуть"
              visibleFrom="sm"
            >
              <IconLayoutSidebarLeftCollapse size={20} />
            </ActionIcon>
          </div>
        </header>

        <main className={styles.content}>
          <Outlet />
        </main>
      </div>
    </div>
  );
}
