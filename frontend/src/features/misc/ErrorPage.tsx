import { Button, Stack, Text, Title } from '@mantine/core';

// Показывается, если при рендере роутов произошла ошибка (errorElement).
export function ErrorPage() {
  return (
    <Stack align="center" justify="center" gap="sm" mih="80vh" p="md">
      <Title order={2}>Что-то пошло не так</Title>
      <Text c="dimmed" ta="center">
        Произошла ошибка. Попробуй обновить страницу.
      </Text>
      <Button onClick={() => window.location.reload()}>Обновить</Button>
    </Stack>
  );
}
