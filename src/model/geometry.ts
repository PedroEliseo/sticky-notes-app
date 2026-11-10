export interface Point {
  readonly x: number;
  readonly y: number;
}

export interface Size {
  readonly width: number;
  readonly height: number;
}

export interface Rect extends Point, Size {}

export const clamp = (value: number, min: number, max: number): number =>
  Math.min(Math.max(value, min), Math.max(min, max));

export const subtract = (a: Point, b: Point): Point => ({ x: a.x - b.x, y: a.y - b.y });

export const add = (a: Point, b: Point): Point => ({ x: a.x + b.x, y: a.y + b.y });

/** Normalized rectangle spanned by two arbitrary corner points. */
export const rectFromCorners = (a: Point, b: Point): Rect => ({
  x: Math.min(a.x, b.x),
  y: Math.min(a.y, b.y),
  width: Math.abs(a.x - b.x),
  height: Math.abs(a.y - b.y),
});

/** True if the rects share any area (touching edges don't count). */
export const rectsIntersect = (a: Rect, b: Rect): boolean =>
  a.x < b.x + b.width && b.x < a.x + a.width && a.y < b.y + b.height && b.y < a.y + a.height;

export const rectsEqual = (a: Rect, b: Rect): boolean =>
  a.x === b.x && a.y === b.y && a.width === b.width && a.height === b.height;

export const toRect = (domRect: DOMRectReadOnly): Rect => ({
  x: domRect.left,
  y: domRect.top,
  width: domRect.width,
  height: domRect.height,
});

/** Moves a rect so that it lies inside `bounds` (as far as its size allows). */
export const keepInside = (rect: Rect, bounds: Size): Rect => ({
  ...rect,
  x: clamp(rect.x, 0, bounds.width - rect.width),
  y: clamp(rect.y, 0, bounds.height - rect.height),
});
