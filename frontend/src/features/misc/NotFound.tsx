import { Button, Stack, Text, Title } from '@mantine/core';
import { useNavigate } from 'react-router-dom';

export function NotFound() {
  const navigate = useNavigate();
  return (
    <Stack align="center" justify="center" gap="sm" mih="60vh">
      <Title order={1} style={{ fontSize: 56 }}>
        404
      </Title>
      <Text c="dimmed">Такой страницы нет.</Text>
      <Button onClick={() => navigate('/calendar')}>На календарь</Button>
    </Stack>
  );
}
