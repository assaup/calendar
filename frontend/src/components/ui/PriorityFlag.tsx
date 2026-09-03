import { Tooltip } from '@mantine/core';
import { IconFlagFilled } from '@tabler/icons-react';
import { PRIORITY_META, type Priority } from '../../store/tasks';

export function PriorityFlag({
  priority,
  size = 14,
}: {
  priority: Priority | null | undefined;
  size?: number;
}) {
  if (!priority) return null;
  const meta = PRIORITY_META[priority];
  return (
    <Tooltip label={`Приоритет: ${meta.label}`} withArrow>
      <IconFlagFilled
        size={size}
        style={{ color: meta.color, flexShrink: 0 }}
      />
    </Tooltip>
  );
}
