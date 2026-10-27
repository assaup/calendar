// Помощники для отката оптимистичных изменений в сторах.

/** Вернуть у элемента списка поля, которые были до неудачного запроса */
export function restoreFields<T extends { id: string }>(
  items: T[],
  id: string,
  prev: T,
  keys: string[],
): T[] {
  const old = Object.fromEntries(
    keys.map((k) => [k, prev[k as keyof T]]),
  ) as Partial<T>;
  return items.map((x) => (x.id === id ? { ...x, ...old } : x));
}

/** Вернуть удалённый элемент на прежнее место (если его ещё нет) */
export function reinsert<T extends { id: string }>(
  items: T[],
  item: T,
  index: number,
): T[] {
  if (items.some((x) => x.id === item.id)) return items;
  const next = items.slice();
  next.splice(Math.min(index, next.length), 0, item);
  return next;
}
