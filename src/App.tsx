import { useCallback, useState } from 'react';
import type { NotesApi } from './api/NotesApi';
import { Board } from './components/Board';
import { Toolbar } from './components/Toolbar';
import type { Rect } from './model/geometry';
import { DEFAULT_NOTE_SIZE, type NoteColor, type NoteId } from './model/note';
import { useNotesStore } from './state/useNotesStore';
import styles from './App.module.css';

/** Notes added from the toolbar are cascaded so they don't hide each other. */
const CASCADE_STEP = 28;
const CASCADE_LENGTH = 8;

export function App({ api }: { readonly api: NotesApi }) {
  const { state, syncStatus, actions } = useNotesStore(api);
  const [newNoteColor, setNewNoteColor] = useState<NoteColor>('yellow');
  const [lastCreatedId, setLastCreatedId] = useState<NoteId | null>(null);

  const createNote = useCallback(
    (rect: Rect) => setLastCreatedId(actions.create(rect, newNoteColor)),
    [actions, newNoteColor],
  );

  const addCascadedNote = () => {
    const offset = (state.notes.length % CASCADE_LENGTH) * CASCADE_STEP;
    createNote({ x: 32 + offset, y: 32 + offset, ...DEFAULT_NOTE_SIZE });
  };

  return (
    <div className={styles.app}>
      <Toolbar
        color={newNoteColor}
        syncStatus={syncStatus}
        onColorChange={setNewNoteColor}
        onAddNote={addCascadedNote}
      />
      {state.status === 'ready' ? (
        <Board notes={state.notes} actions={actions} focusedNoteId={lastCreatedId} onCreateNote={createNote} />
      ) : (
        <div className={styles.message} role={state.status === 'failed' ? 'alert' : undefined}>
          {state.status === 'loading' ? 'Loading notes…' : `Failed to load notes: ${state.error}`}
        </div>
      )}
    </div>
  );
}
