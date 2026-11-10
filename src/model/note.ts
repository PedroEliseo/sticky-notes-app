import type { Rect, Size } from './geometry';

export const NOTE_COLORS = ['yellow', 'pink', 'green', 'blue', 'purple'] as const;
export type NoteColor = (typeof NOTE_COLORS)[number];

export type NoteId = string & { readonly __brand: 'NoteId' };

export interface Note {
  readonly id: NoteId;
  readonly rect: Rect;
  readonly text: string;
  readonly color: NoteColor;
  /** Stacking order; a higher value is rendered on top. */
  readonly zIndex: number;
}

export const MIN_NOTE_SIZE: Size = { width: 120, height: 90 };
export const DEFAULT_NOTE_SIZE: Size = { width: 200, height: 160 };

/** Drawn rectangles smaller than this are treated as a click rather than a deliberate size. */
export const MIN_DRAWN_SIZE = 12;

// `crypto.randomUUID` exists only in secure contexts (HTTPS / localhost).
export const createNoteId = (): NoteId =>
  (typeof crypto.randomUUID === 'function'
    ? crypto.randomUUID()
    : Array.from(crypto.getRandomValues(new Uint8Array(16)), (b) => b.toString(16).padStart(2, '0')).join('')) as NoteId;

export const isNoteColor = (value: unknown): value is NoteColor =>
  typeof value === 'string' && (NOTE_COLORS as readonly string[]).includes(value);

export const constrainSize = (size: Size): Size => ({
  width: Math.max(size.width, MIN_NOTE_SIZE.width),
  height: Math.max(size.height, MIN_NOTE_SIZE.height),
});
