import { NOTE_COLORS, type NoteColor } from '../model/note';
import type { SyncStatus } from '../state/NotesSynchronizer';
import styles from './Toolbar.module.css';

interface ToolbarProps {
  readonly color: NoteColor;
  readonly syncStatus: SyncStatus;
  onColorChange(color: NoteColor): void;
  onAddNote(): void;
}

const SYNC_LABELS: Record<SyncStatus, string> = {
  saved: 'All changes saved',
  saving: 'Saving…',
  error: 'Could not save changes',
};

export function Toolbar({ color, syncStatus, onColorChange, onAddNote }: ToolbarProps) {
  return (
    <header className={styles.toolbar}>
      <h1 className={styles.title}>Sticky Notes</h1>
      <button type="button" className={styles.addButton} onClick={onAddNote}>
        + New note
      </button>
      <div className={styles.colors} role="radiogroup" aria-label="Color of new notes">
        {NOTE_COLORS.map((option) => (
          <button
            key={option}
            type="button"
            role="radio"
            aria-checked={option === color}
            aria-label={option}
            className={`${styles.swatch} ${styles[option]}`}
            onClick={() => onColorChange(option)}
          />
        ))}
      </div>
      <p className={styles.hint}>
        Drag on the board to draw a note or double-click to add one. Drop a note on the trash to delete it.
      </p>
      <span className={`${styles.status} ${styles[syncStatus]}`} role="status">
        {SYNC_LABELS[syncStatus]}
      </span>
    </header>
  );
}
