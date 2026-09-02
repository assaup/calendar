import { useEffect, type ReactNode } from 'react';
import { Loader, Center } from '@mantine/core';
import { useAuth } from './useAuth';
import { AuthScreen } from './AuthScreen';

export function AuthGate({ children }: { children: ReactNode }) {
  const status = useAuth((s) => s.status);
  const init = useAuth((s) => s.init);

  useEffect(() => {
    init();
  }, [init]);

  if (status === 'loading') {
    return (
      <Center h="100vh">
        <Loader />
      </Center>
    );
  }

  if (status === 'anon') {
    return <AuthScreen />;
  }

  return <>{children}</>;
}
