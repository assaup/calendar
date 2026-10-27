import { notifications } from '@mantine/notifications';
import { isAxiosError } from 'axios';

/** Сообщение об ошибке сервера (сеть, 500, валидация). При истёкшей сессии
 *  молчим — её обрабатывает перехватчик в lib/api.ts (экран входа). */
export function notifyError(message: string, error?: unknown) {
  if (isAxiosError(error)) {
    const status = error.response?.status;
    if (status === 401 || status === 403) return;
  }
  notifications.show({ color: 'red', title: 'Не сохранилось', message });
}
