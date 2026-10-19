import { describe, expect, it } from 'vitest';
import { cardFocus, resolvePatch } from './cardFocus';
import { makeTask } from '../../test/utils';

describe('cardFocus', () => {
  it('leaveTask не затирает карточку, в которую мышь уже вошла', () => {
    cardFocus.enterTask('a');
    cardFocus.enterTask('b'); // вошли в соседнюю раньше, чем ушли из первой
    cardFocus.leaveTask('a');
    expect(cardFocus.getTask()).toBe('b');
    cardFocus.leaveTask('b');
    expect(cardFocus.getTask()).toBeNull();
  });

  it('область вставки и буфер', () => {
    cardFocus.enterTarget({ status: 'done' });
    expect(cardFocus.getTarget()).toEqual({ status: 'done' });
    cardFocus.leaveTarget();
    expect(cardFocus.getTarget()).toBeNull();

    const t = makeTask();
    cardFocus.copy(t);
    expect(cardFocus.getClipboard()).toBe(t);
  });

  it('запоминает позицию указателя', () => {
    window.dispatchEvent(new MouseEvent('pointermove', { clientX: 10, clientY: 20 }));
    // jsdom не всегда умеет PointerEvent — проверяем через MouseEvent с типом pointermove
    expect(cardFocus.getPointer()).toEqual({ x: 10, y: 20 });
  });

  it('resolvePatch: null / объект / функция от копируемой задачи', () => {
    const src = makeTask({ dueDate: '2026-10-05' });
    expect(resolvePatch(null, src)).toEqual({});
    expect(resolvePatch({ dueDate: null }, src)).toEqual({ dueDate: null });
    expect(resolvePatch((t) => ({ title: `${t.title}!` }), src)).toEqual({
      title: `${src.title}!`,
    });
  });
});
