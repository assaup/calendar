import axios from 'axios';

// Через Vite-прокси запросы идут на тот же origin (/api -> Django).
const baseURL = import.meta.env.VITE_API_URL ?? '/api';

export const api = axios.create({
  baseURL,
  withCredentials: true,
  // Django CSRF: берём токен из cookie 'csrftoken' и шлём в заголовке
  xsrfCookieName: 'csrftoken',
  xsrfHeaderName: 'X-CSRFToken',
  headers: { 'Content-Type': 'application/json' },
});
