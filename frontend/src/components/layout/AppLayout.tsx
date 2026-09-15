import { useState } from 'react';
import { Outlet } from 'react-router-dom';
import { Burger, ActionIcon, Tooltip } from '@mantine/core';
import {
  IconLayoutSidebarLeftCollapse,
  IconLayoutSidebarLeftExpand,
} from '@tabler/icons-react';
import { Sidebar } from './Sidebar';
import { WorkspaceSwitcher } from './WorkspaceSwitcher';
import { ThemeToggle } from './ThemeToggle';
import { TaskModal } from '../../features/tasks/TaskModal';
import { QuickCategoryMenu } from '../../features/tasks/QuickCategoryMenu';
import { useCardHotkeys } from '../../features/tasks/useCardHotkeys';
import { useUiStore } from '../../store/ui';
import styles from './AppLayout.module.scss';

export function AppLayout() {
  const [mobileOpen, setMobileOpen] = useState(false);
  const collapsed = useUiStore((s) => s.sidebarCollapsed);
  const toggleSidebar = useUiStore((s) => s.toggleSidebar);

  // Ctrl+C / Ctrl+V / Delete / C над карточкой
  useCardHotkeys();

  return (
    <div className={styles.shell} data-collapsed={collapsed ? 'true' : undefined}>
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
            <Tooltip
              label={collapsed ? 'Показать меню' : 'Свернуть меню'}
              withArrow
            >
              <ActionIcon
                className={styles.collapseBtn}
                variant="subtle"
                color="gray"
                size="lg"
                onClick={toggleSidebar}
                aria-label={collapsed ? 'Показать меню' : 'Свернуть меню'}
              >
                {collapsed ? (
                  <IconLayoutSidebarLeftExpand size={20} />
                ) : (
                  <IconLayoutSidebarLeftCollapse size={20} />
                )}
              </ActionIcon>
            </Tooltip>
            <WorkspaceSwitcher />
          </div>
          <div className={styles.topbarRight}>
            <ThemeToggle />
          </div>
        </header>

        <main className={styles.content}>
          <Outlet />
        </main>
      </div>

      {/* Единое окно создания/редактирования задачи */}
      <TaskModal />

      {/* Быстрый выбор категории по клавише C */}
      <QuickCategoryMenu />
    </div>
  );
}
