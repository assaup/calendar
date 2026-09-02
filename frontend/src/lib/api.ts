import axios from 'axios';

// Базовый URL бэкенда (Django). Меняется через .env -> VITE_API_URL
const baseURL = import.meta.env.VITE_API_URL ?? 'http://localhost:8000/api';

export const api = axios.create({
  baseURL,
  withCredentials: true,
  headers: { 'Content-Type': 'application/json' },
});
