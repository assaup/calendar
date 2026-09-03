import { createBrowserRouter, Navigate } from 'react-router-dom';
import { AppLayout } from './components/layout/AppLayout';
import { CalendarPage } from './features/calendar/CalendarPage';
import { BoardPage } from './features/board/BoardPage';
import { TodoPage } from './features/todo/TodoPage';
import { NotesPage } from './features/notes/NotesPage';
import { DashboardPage } from './features/dashboard/DashboardPage';

export const router = createBrowserRouter([
  {
    path: '/',
    element: <AppLayout />,
    children: [
      { index: true, element: <Navigate to="/calendar" replace /> },
      { path: 'calendar', element: <CalendarPage /> },
      { path: 'board', element: <BoardPage /> },
      { path: 'todo', element: <TodoPage /> },
      { path: 'notes', element: <NotesPage /> },
      { path: 'dashboard', element: <DashboardPage /> },
    ],
  },
]);
