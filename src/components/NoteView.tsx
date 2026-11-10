import { memo } from 'react';
import type { PointerEvent as ReactPointerEvent } from 'react';
import type { Rect } from '../model/geometry';
import { NOTE_COLORS, type Note, type NoteId } from '../model/note';
import type { NoteChanges } from '../state/notesReducer';
import styles from './NoteView.module.css';

export type NoteDragMode = 'move' | 'resize';

interface NoteViewProps {
  readonly note: Note;
  /** Rendered geometry; differs from `note.rect` while the note is being dragged. */
  readonly rect: Rect;
  readonly dragMode: NoteDragMode | null;
  readonly isOverTrash: boolean;
  readonly autoFocus: boolean;
  onDragStart(note: Note, mode: NoteDragMode, event: ReactPointerEvent): void;
  onChange(id: NoteId, changes: NoteChanges): void;
  onActivate(id: NoteId): void;
}

export const NoteView = memo(function NoteView({
  note,
  rect,
  dragMode,
  isOverTrash,
  autoFocus,
  onDragStart,
  onChange,
  onActivate,
}: NoteViewProps) {
  const className = [
    styles.note,
    styles[note.color],
    dragMode === 'move' && styles.moving,
    isOverTrash && styles.overTrash,
  ]
    .filter(Boolean)
    .join(' ');

  return (
    <div
      className={className}
      style={{
        transform: `translate(${rect.x}px, ${rect.y}px)`,
        width: rect.width,
        height: rect.height,
        zIndex: note.zIndex,
      }}
      onPointerDownCapture={() => onActivate(note.id)}
      onFocusCapture={() => onActivate(note.id)}
    >
      <div
        className={styles.header}
        onPointerDown={(event) => onDragStart(note, 'move', event)}
        title="Drag to move. Drop on the trash to delete."
      >
        <div className={styles.colors} role="radiogroup" aria-label="Note color">
          {NOTE_COLORS.map((color) => (
            <button
              key={color}
              type="button"
              role="radio"
              aria-checked={color === note.color}
              aria-label={color}
              className={`${styles.swatch} ${styles[color]}`}
              onPointerDown={(event) => event.stopPropagation()}
              onClick={() => onChange(note.id, { color })}
            />
          ))}
        </div>
      </div>
      <textarea
        className={styles.text}
        value={note.text}
        placeholder="Type something…"
        aria-label="Note text"
        autoFocus={autoFocus}
        onChange={(event) => onChange(note.id, { text: event.target.value })}
      />
      <div
        className={styles.resizeHandle}
        onPointerDown={(event) => onDragStart(note, 'resize', event)}
        title="Drag to resize"
        aria-hidden
      />
    </div>
  );
});
