import type { NewTaskInput, Task } from '../../store/tasks';

// ------------------------------------------------------------------
// Что сейчас под курсором: карточка и «область вставки».
// Намеренно обычный модуль, а не стор: наведение срабатывает часто,
// а перерисовывать из-за него ничего не нужно — горячие клавиши
// читают значения в момент нажатия.
// ------------------------------------------------------------------

/** Поля, которые область вставки навязывает копии (колонка, день календаря…).
 *  Может быть функцией — тогда учитывает саму копируемую задачу. */
export type PastePatch =
  | Partial<NewTaskInput>
  | ((src: Task) => Partial<NewTaskInput>);

/** Разворачивает область вставки в конкретные поля для копии */
export function resolvePatch(
  patch: PastePatch | null,
  src: Task,
): Partial<NewTaskInput> {
  if (!patch) return {};
  return typeof patch === 'function' ? patch(src) : patch;
}

let hoveredTaskId: string | null = null;
let hoveredTarget: PastePatch | null = null;
let clipboard: Task | null = null;
let pointer = { x: 0, y: 0 };

if (typeof window !== 'undefined') {
  window.addEventListener(
    'pointermove',
    (e) => {
      pointer = { x: e.clientX, y: e.clientY };
    },
    { passive: true },
  );
}

export const cardFocus = {
  enterTask(id: string) {
    hoveredTaskId = id;
  },
  leaveTask(id: string) {
    // мышь могла уже войти в соседнюю карточку — не затираем её
    if (hoveredTaskId === id) hoveredTaskId = null;
  },
  getTask() {
    return hoveredTaskId;
  },

  enterTarget(patch: PastePatch) {
    hoveredTarget = patch;
  },
  leaveTarget() {
    hoveredTarget = null;
  },
  getTarget() {
    return hoveredTarget;
  },

  copy(task: Task) {
    clipboard = task;
  },
  getClipboard() {
    return clipboard;
  },

  getPointer() {
    return pointer;
  },
};
