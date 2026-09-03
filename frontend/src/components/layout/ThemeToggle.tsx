import { ActionIcon, Menu } from '@mantine/core';
import { IconSun, IconMoon, IconFlower } from '@tabler/icons-react';
import { useThemeStore, type AppTheme } from '../../store/theme';

const THEMES: { value: AppTheme; label: string; icon: typeof IconSun }[] = [
  { value: 'light', label: 'Светлая', icon: IconSun },
  { value: 'dark', label: 'Тёмная', icon: IconMoon },
  { value: 'pink', label: 'Розовая', icon: IconFlower },
];

export function ThemeToggle() {
  const theme = useThemeStore((s) => s.theme);
  const setTheme = useThemeStore((s) => s.setTheme);
  const current = THEMES.find((t) => t.value === theme) ?? THEMES[0];
  const CurrentIcon = current.icon;

  return (
    <Menu shadow="md" width={170} position="bottom-end">
      <Menu.Target>
        <ActionIcon
          variant="subtle"
          color="gray"
          size="lg"
          aria-label="Выбрать тему"
        >
          <CurrentIcon size={20} />
        </ActionIcon>
      </Menu.Target>
      <Menu.Dropdown>
        <Menu.Label>Тема</Menu.Label>
        {THEMES.map(({ value, label, icon: Icon }) => (
          <Menu.Item
            key={value}
            leftSection={<Icon size={16} />}
            onClick={() => setTheme(value)}
            data-active={value === theme || undefined}
            fw={value === theme ? 700 : undefined}
          >
            {label}
          </Menu.Item>
        ))}
      </Menu.Dropdown>
    </Menu>
  );
}
