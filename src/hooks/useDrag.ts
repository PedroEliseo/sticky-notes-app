import { useCallback, useEffect, useRef } from 'react';
import type { PointerEvent as ReactPointerEvent } from 'react';
import { subtract, type Point } from '../model/geometry';

export interface DragCallbacks {
  /** Called at most once per animation frame. `delta` is relative to the drag start. */
  onMove(delta: Point, pointer: Point): void;
  onEnd(delta: Point, pointer: Point): void;
  /** Escape key, lost window focus or a cancelled pointer. */
  onCancel(): void;
}

/** Returns `false` if the gesture was not started (non-primary button or another drag in progress). */
export type StartDrag = (event: ReactPointerEvent, callbacks: DragCallbacks) => boolean;

const pointOf = (event: PointerEvent | ReactPointerEvent): Point => ({ x: event.clientX, y: event.clientY });

/**
 * Generic pointer drag gesture. Listeners live on `window` for the duration of
 * the gesture, so dragging keeps working when the pointer leaves the element
 * or moves faster than the element can follow.
 */
export function useDrag(): StartDrag {
  const stopActive = useRef<(() => void) | null>(null);

  useEffect(() => () => stopActive.current?.(), []);

  return useCallback<StartDrag>((event, callbacks) => {
    if (event.button !== 0 || stopActive.current !== null) return false;
    // Prevents text selection and native drag-and-drop while dragging.
    event.preventDefault();

    const origin = pointOf(event);
    const pointerId = event.pointerId;
    let latest = origin;
    let frame: number | null = null;

    const flushMove = () => {
      frame = null;
      callbacks.onMove(subtract(latest, origin), latest);
    };

    const handleMove = (e: PointerEvent) => {
      if (e.pointerId !== pointerId) return;
      latest = pointOf(e);
      frame ??= requestAnimationFrame(flushMove);
    };

    const handleUp = (e: PointerEvent) => {
      if (e.pointerId !== pointerId) return;
      stop();
      const pointer = pointOf(e);
      callbacks.onEnd(subtract(pointer, origin), pointer);
    };

    const handleCancel = () => {
      stop();
      callbacks.onCancel();
    };

    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') handleCancel();
    };

    const stop = () => {
      if (frame !== null) cancelAnimationFrame(frame);
      window.removeEventListener('pointermove', handleMove);
      window.removeEventListener('pointerup', handleUp);
      window.removeEventListener('pointercancel', handleCancel);
      window.removeEventListener('keydown', handleKey);
      window.removeEventListener('blur', handleCancel);
      stopActive.current = null;
    };

    window.addEventListener('pointermove', handleMove);
    window.addEventListener('pointerup', handleUp);
    window.addEventListener('pointercancel', handleCancel);
    window.addEventListener('keydown', handleKey);
    window.addEventListener('blur', handleCancel);
    stopActive.current = stop;
    return true;
  }, []);
}
