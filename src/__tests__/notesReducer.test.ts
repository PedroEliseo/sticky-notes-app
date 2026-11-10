import { describe, expect, it } from 'vitest';
import type { Note, NoteId } from '../model/note';
import { notesReducer, type NotesState } from '../state/notesReducer';

const id = (value: string) => value as NoteId;

const note = (value: string, zIndex: number): Note => ({
  id: id(value),
  rect: { x: 0, y: 0, width: 200, height: 150 },
  text: '',
  color: 'yellow',
  zIndex,
});

const ready = (...notes: Note[]): NotesState => ({ status: 'ready', notes });

describe('notesReducer', () => {
  it('puts new notes on top', () => {
    const state = notesReducer(ready(note('a', 3)), {
      type: 'added',
      note: { id: id('b'), rect: { x: 1, y: 2, width: 3, height: 4 }, text: '', color: 'pink' },
    });
    expect(state.notes.map((n) => [n.id, n.zIndex])).toEqual([
      ['a', 3],
      ['b', 4],
    ]);
  });

  it('keeps identity for no-op updates', () => {
    const state = ready(note('a', 1));
    const sameRect = { ...state.notes[0]!.rect };
    expect(notesReducer(state, { type: 'updated', id: id('a'), changes: { rect: sameRect } })).toBe(state);
    expect(notesReducer(state, { type: 'updated', id: id('missing'), changes: { text: 'x' } })).toBe(state);
  });

  it('updates only the targeted note', () => {
    const state = ready(note('a', 1), note('b', 2));
    const next = notesReducer(state, { type: 'updated', id: id('b'), changes: { text: 'hello' } });
    expect(next.notes[0]).toBe(state.notes[0]);
    expect(next.notes[1]!.text).toBe('hello');
  });

  it('brings a note to front only when it is not already the topmost', () => {
    const state = ready(note('a', 1), note('b', 2));
    expect(notesReducer(state, { type: 'broughtToFront', id: id('b') })).toBe(state);
    const next = notesReducer(state, { type: 'broughtToFront', id: id('a') });
    expect(next.notes.find((n) => n.id === 'a')!.zIndex).toBe(3);
  });

  it('resolves zIndex ties when bringing to front', () => {
    const state = ready(note('a', 2), note('b', 2));
    const next = notesReducer(state, { type: 'broughtToFront', id: id('a') });
    expect(next.notes.find((n) => n.id === 'a')!.zIndex).toBe(3);
  });

  it('removes notes', () => {
    const state = ready(note('a', 1), note('b', 2));
    expect(notesReducer(state, { type: 'removed', id: id('a') }).notes.map((n) => n.id)).toEqual(['b']);
    expect(notesReducer(state, { type: 'removed', id: id('missing') })).toBe(state);
  });
});
