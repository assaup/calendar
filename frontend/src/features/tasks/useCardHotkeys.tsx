import { useEffect } from 'react';
import { notifications } from '@mantine/notifications';
import { Button, Group, Text } from '@mantine/core';
import { cardFocus, resolvePatch } from './cardFocus';
import { useQuickCategory } from './quickCategory';
import { useTaskEditor } from './taskEditor';
import { useTasksStore, type Task } from '../../store/tasks';
import { useWorkspaceStore, ALL_WORKSPACES } from '../../store/workspace';

// ------------------------------------------------------------------
// Горячие клавиши над карточкой под курсором:
//   Ctrl+C — копировать, Ctrl+V — вставить копию в область под курсором,
//   Delete — удалить (с отменой), C — меню категории.
// Клавиши сверяются по физической клавише (e.code), поэтому работают
// и в русской раскладке.
// ------------------------------------------------------------------

function isTyping(target: EventTarget | null): boolean {
  const el = target as HTMLElement | null;
  if (!el || !el.tagName) return false;
  const tag = el.tagName;
  return (
    tag === 'INPUT' ||
    tag === 'TEXTAREA' ||
    tag === 'SELECT' ||
    el.isContentEditable
  );
}

/** Клавиша нажата? Сверяем физическую клавишу (работает в любой раскладке),
 *  а если событие пришло без code — то букву, латинскую или русскую. */
function isKey(e: KeyboardEvent, code: string, letters: string[]): boolean {
  if (e.code) return e.code === code;
  return letters.includes(e.key.toLowerCase());
}

/** Открыто любое модальное окно — горячие клавиши отключаем */
function modalOpen(): boolean {
  return (
    useTaskEditor.getState().opened ||
    !!document.querySelector('[role="dialog"]')
  );
}

/** Поля задачи, которые переносим в копию/восстановление */
function fieldsOf(t: Task) {
  return {
    title: t.title,
    description: t.description,
    categoryId: t.categoryId,
    status: t.status,
    priority: t.priority,
    startDate: t.startDate,
    dueDate: t.dueDate,
  };
}

async function pasteCopy(src: Task) {
  // в «Все доски» копия остаётся на доске оригинала
  const { activeId } = useWorkspaceStore.getState();
  const activeWorkspace =
    activeId === ALL_WORKSPACES ? src.workspaceId : activeId;
  const { addTask, updateTask, categories } = useTasksStore.getState();
  const patch = resolvePatch(cardFocus.getTarget(), src);

  // категории свои у каждой доски: при вставке на другую доску
  // пробуем найти одноимённую, иначе оставляем без категории
  let categoryId = src.categoryId;
  if (src.workspaceId !== activeWorkspace) {
    const srcCat = categories.find((c) => c.id === src.categoryId);
    categoryId =
      categories.find(
        (c) => c.workspaceId === activeWorkspace && c.name === srcCat?.name,
      )?.id ?? null;
  }

  const id = await addTask({
    workspaceId: activeWorkspace,
    ...fieldsOf(src),
    categoryId,
    ...patch,
  });
  if (src.subtasks?.length) {
    await updateTask(id, {
      subtasks: src.subtasks.map((s) => ({ ...s })),
    });
  }
  notifications.show({
    message: `Вставлена копия: «${src.title}»`,
    color: 'green',
  });
}

async function removeWithUndo(task: Task) {
  const { deleteTask, addTask, updateTask } = useTasksStore.getState();
  await deleteTask(task.id);

  const id = `undo-${task.id}`;
  const restore = async () => {
    notifications.hide(id);
    const newId = await addTask({
      workspaceId: task.workspaceId,
      ...fieldsOf(task),
    });
    if (task.subtasks?.length) {
      await updateTask(newId, {
        subtasks: task.subtasks.map((s) => ({ ...s })),
      });
    }
  };

  notifications.show({
    id,
    color: 'red',
    autoClose: 7000,
    message: (
      <Group justify="space-between" wrap="nowrap" gap="sm">
        <Text size="sm" lineClamp={1}>
          Удалена «{task.title}»
        </Text>
        <Button size="compact-xs" variant="light" onClick={restore}>
          Отменить
        </Button>
      </Group>
    ),
  });
}

export function useCardHotkeys() {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (isTyping(e.target) || modalOpen()) return;
      // меню категории открыто — оно само обрабатывает клавиши
      if (useQuickCategory.getState().taskId) return;

      const hoveredId = cardFocus.getTask();
      const tasks = useTasksStore.getState().tasks;
      const hovered = hoveredId
        ? (tasks.find((t) => t.id === hoveredId) ?? null)
        : null;

      // --- Копировать ---
      if ((e.ctrlKey || e.metaKey) && isKey(e, 'KeyC', ['c', 'с'])) {
        // пользователь выделил текст — пусть работает обычное копирование
        if (window.getSelection()?.toString()) return;
        if (!hovered) return;
        e.preventDefault();
        cardFocus.copy(hovered);
        notifications.show({
          message: `Скопировано: «${hovered.title}». Наведи на нужное место и нажми Ctrl+V`,
          color: 'blue',
        });
        return;
      }

      // --- Вставить копию ---
      if ((e.ctrlKey || e.metaKey) && isKey(e, 'KeyV', ['v', 'м'])) {
        const src = cardFocus.getClipboard();
        if (!src) return;
        e.preventDefault();
        void pasteCopy(src);
        return;
      }

      if (e.ctrlKey || e.metaKey || e.altKey) return;

      // --- Удалить ---
      if (e.key === 'Delete' && hovered) {
        e.preventDefault();
        void removeWithUndo(hovered);
        return;
      }

      // --- Меню категории ---
      if (isKey(e, 'KeyC', ['c', 'с']) && hovered) {
        e.preventDefault();
        const { x, y } = cardFocus.getPointer();
        useQuickCategory.getState().open(hovered.id, x, y);
      }
    };

    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);
}
