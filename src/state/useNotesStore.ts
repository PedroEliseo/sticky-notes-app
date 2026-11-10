import { useEffect, useMemo, useReducer, useRef, useState } from 'react';
import type { NotesApi } from '../api/NotesApi';
import type { Rect } from '../model/geometry';
import { createNoteId, type Note, type NoteColor, type NoteId } from '../model/note';
import { NotesSynchronizer, type SyncStatus } from './NotesSynchronizer';
import { initialNotesState, notesReducer, type NoteChanges, type NotesState } from './notesReducer';

export interface NotesActions {
  create(rect: Rect, color: NoteColor): NoteId;
  update(id: NoteId, changes: NoteChanges): void;
  bringToFront(id: NoteId): void;
  remove(id: NoteId): void;
}

export interface NotesStore {
  readonly state: NotesState;
  readonly syncStatus: SyncStatus;
  readonly actions: NotesActions;
}

/**
 * Owns the notes collection: local state is updated optimistically and
 * synchronized with the API in the background.
 */
export function useNotesStore(api: NotesApi): NotesStore {
  const [state, dispatch] = useReducer(notesReducer, initialNotesState);
  const [syncStatus, setSyncStatus] = useState<SyncStatus>('saved');
  const synchronizer = useMemo(() => new NotesSynchronizer(api, setSyncStatus), [api]);

  useEffect(() => {
    let cancelled = false;
    api.list().then(
      (notes) => !cancelled && dispatch({ type: 'loaded', notes }),
      (error: unknown) => !cancelled && dispatch({ type: 'loadFailed', error: String(error) }),
    );
    return () => {
      cancelled = true;
    };
  }, [api]);

  // The first snapshot after loading is the server state itself and must not be echoed back.
  const syncedNotes = useRef<readonly Note[] | null>(null);
  useEffect(() => {
    if (state.status !== 'ready') return;
    if (syncedNotes.current !== null) synchronizer.track(syncedNotes.current, state.notes);
    syncedNotes.current = state.notes;
  }, [state, synchronizer]);

  useEffect(() => {
    const flush = () => synchronizer.flush();
    window.addEventListener('pagehide', flush);
    return () => {
      window.removeEventListener('pagehide', flush);
      synchronizer.dispose();
    };
  }, [synchronizer]);

  const actions = useMemo<NotesActions>(
    () => ({
      create(rect, color) {
        const id = createNoteId();
        dispatch({ type: 'added', note: { id, rect, color, text: '' } });
        return id;
      },
      update: (id, changes) => dispatch({ type: 'updated', id, changes }),
      bringToFront: (id) => dispatch({ type: 'broughtToFront', id }),
      remove: (id) => dispatch({ type: 'removed', id }),
    }),
    [],
  );

  return { state, syncStatus, actions };
}
