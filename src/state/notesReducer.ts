import { rectsEqual, type Rect } from '../model/geometry';
import type { Note, NoteColor, NoteId } from '../model/note';

export type NotesState =
  | { readonly status: 'loading'; readonly notes: readonly Note[] }
  | { readonly status: 'ready'; readonly notes: readonly Note[] }
  | { readonly status: 'failed'; readonly notes: readonly Note[]; readonly error: string };

export type NoteChanges = Partial<{ readonly rect: Rect; readonly text: string; readonly color: NoteColor }>;

export type NotesAction =
  | { readonly type: 'loaded'; readonly notes: readonly Note[] }
  | { readonly type: 'loadFailed'; readonly error: string }
  | { readonly type: 'added'; readonly note: Omit<Note, 'zIndex'> }
  | { readonly type: 'updated'; readonly id: NoteId; readonly changes: NoteChanges }
  | { readonly type: 'broughtToFront'; readonly id: NoteId }
  | { readonly type: 'removed'; readonly id: NoteId };

export const initialNotesState: NotesState = { status: 'loading', notes: [] };

const topZIndex = (notes: readonly Note[]): number =>
  notes.reduce((max, note) => Math.max(max, note.zIndex), 0);

const replaceNote = (notes: readonly Note[], id: NoteId, update: (note: Note) => Note): readonly Note[] => {
  let changed = false;
  const next = notes.map((note) => {
    if (note.id !== id) return note;
    const updated = update(note);
    changed ||= updated !== note;
    return updated;
  });
  // Preserving identity lets memoized consumers and the synchronizer skip no-op updates.
  return changed ? next : notes;
};

const withNotes = (state: NotesState, notes: readonly Note[]): NotesState =>
  notes === state.notes ? state : { ...state, notes };

export function notesReducer(state: NotesState, action: NotesAction): NotesState {
  switch (action.type) {
    case 'loaded':
      return { status: 'ready', notes: action.notes };

    case 'loadFailed':
      return { status: 'failed', notes: [], error: action.error };

    case 'added':
      return withNotes(state, [...state.notes, { ...action.note, zIndex: topZIndex(state.notes) + 1 }]);

    case 'updated':
      return withNotes(
        state,
        replaceNote(state.notes, action.id, (note) => {
          const { rect = note.rect, text = note.text, color = note.color } = action.changes;
          return rectsEqual(rect, note.rect) && text === note.text && color === note.color
            ? note
            : { ...note, rect, text, color };
        }),
      );

    case 'broughtToFront': {
      const top = topZIndex(state.notes);
      const isAlone = (note: Note) => state.notes.every((other) => other === note || other.zIndex < top);
      return withNotes(
        state,
        replaceNote(state.notes, action.id, (note) =>
          note.zIndex === top && isAlone(note) ? note : { ...note, zIndex: top + 1 },
        ),
      );
    }

    case 'removed': {
      const notes = state.notes.filter((note) => note.id !== action.id);
      return withNotes(state, notes.length === state.notes.length ? state.notes : notes);
    }
  }
}
