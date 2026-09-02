import type { ReactNode } from 'react';
import { Text, Title } from '@mantine/core';
import styles from './PageShell.module.scss';

interface Props {
  title: string;
  description?: string;
  action?: ReactNode;
  children: ReactNode;
}

export function PageShell({ title, description, action, children }: Props) {
  return (
    <div className={styles.page}>
      <div className={styles.header}>
        <div>
          <Title order={2} className={styles.title}>
            {title}
          </Title>
          {description && (
            <Text size="sm" c="dimmed" mt={4}>
              {description}
            </Text>
          )}
        </div>
        {action && <div className={styles.action}>{action}</div>}
      </div>
      <div className={styles.body}>{children}</div>
    </div>
  );
}
