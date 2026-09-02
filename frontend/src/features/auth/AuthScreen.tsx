import { useState } from 'react';
import { TextInput, PasswordInput, Button, Anchor } from '@mantine/core';
import { IconCalendarStats } from '@tabler/icons-react';
import { AxiosError } from 'axios';
import { useAuth } from './useAuth';
import styles from './AuthScreen.module.scss';

type Mode = 'login' | 'register';

function extractError(err: unknown): string {
  if (err instanceof AxiosError && err.response) {
    const data = err.response.data as Record<string, unknown>;
    if (typeof data?.detail === 'string') return data.detail;
    const first = Object.values(data ?? {})[0];
    if (Array.isArray(first) && typeof first[0] === 'string') return first[0];
  }
  return 'Что-то пошло не так. Попробуй ещё раз.';
}

export function AuthScreen() {
  const { login, register } = useAuth();
  const [mode, setMode] = useState<Mode>('login');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const isRegister = mode === 'register';

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      if (isRegister) {
        await register(email, password, name);
      } else {
        await login(email, password);
      }
    } catch (err) {
      setError(extractError(err));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className={styles.screen}>
      <div className={styles.brand}>
        <div className={styles.brandInner}>
          <div className={styles.logo}>
            <IconCalendarStats size={28} />
            <span>Планер</span>
          </div>
          <h1 className={styles.tagline}>
            Календарь, доска, задачи и заметки — в одном месте
          </h1>
          <p className={styles.subtitle}>
            Работа и личное не перемешиваются. Всё связано: сроки, проекты,
            категории.
          </p>
        </div>
      </div>

      <div className={styles.formSide}>
        <form className={styles.form} onSubmit={submit}>
          <h2 className={styles.formTitle}>
            {isRegister ? 'Создать аккаунт' : 'С возвращением'}
          </h2>
          <p className={styles.formHint}>
            {isRegister
              ? 'Пара секунд — и можно планировать.'
              : 'Войди, чтобы продолжить.'}
          </p>

          {isRegister && (
            <TextInput
              label="Имя"
              placeholder="Как тебя зовут"
              value={name}
              onChange={(e) => setName(e.currentTarget.value)}
              mt="md"
            />
          )}

          <TextInput
            label="Email"
            placeholder="you@example.com"
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.currentTarget.value)}
            mt="md"
          />

          <PasswordInput
            label="Пароль"
            placeholder="Твой пароль"
            required
            value={password}
            onChange={(e) => setPassword(e.currentTarget.value)}
            mt="md"
          />

          {error && <div className={styles.error}>{error}</div>}

          <Button type="submit" fullWidth mt="xl" size="md" loading={loading}>
            {isRegister ? 'Зарегистрироваться' : 'Войти'}
          </Button>

          <div className={styles.switch}>
            {isRegister ? 'Уже есть аккаунт?' : 'Нет аккаунта?'}{' '}
            <Anchor
              component="button"
              type="button"
              onClick={() => {
                setMode(isRegister ? 'login' : 'register');
                setError('');
              }}
            >
              {isRegister ? 'Войти' : 'Создать'}
            </Anchor>
          </div>
        </form>
      </div>
    </div>
  );
}
