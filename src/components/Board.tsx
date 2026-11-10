import { useCallback, useMemo, useRef, useState } from 'react';
import type { MouseEvent as ReactMouseEvent, PointerEvent as ReactPointerEvent } from 'react';
import { useDrag, type DragCallbacks } from '../hooks/useDrag';
import { keepInside, rectsIntersect, rectFromCorners, toRect, type Point, type Rect, type Size } from '../model/geometry';
import { constrainSize, DEFAULT_NOTE_SIZE, MIN_DRAWN_SIZE, type Note, type NoteId } from '../model/note';
import type { NotesActions } from '../state/useNotesStore';
import { NoteView, type NoteDragMode } from './NoteView';
import { TrashZone } from './TrashZone';
import styles from './Board.module.css';

/** Transient state of the gesture in progress. Committed to the store only when the gesture ends. */
type Interaction =
  | { readonly kind: 'move'; readonly id: NoteId; readonly rect: Rect; readonly overTrash: boolean }
  | { readonly kind: 'resize'; readonly id: NoteId; readonly rect: Rect }
  | { readonly kind: 'create'; readonly rect: Rect | null };

interface BoardProps {
  readonly notes: readonly Note[];
  readonly actions: NotesActions;
  readonly focusedNoteId: NoteId | null;
  onCreateNote(rect: Rect): void;
}

const CANVAS_PADDING = 24;

export function Board({ notes, actions, focusedNoteId, onCreateNote }: BoardProps) {
  const canvasRef = useRef<HTMLDivElement>(null);
  const trashRef = useRef<HTMLDivElement>(null);
  const [interaction, setInteraction] = useState<Interaction | null>(null);
  const startDrag = useDrag();

  const getCanvas = useCallback(() => {
    const canvas = canvasRef.current;
    if (canvas === null) throw new Error('Board canvas is not mounted');
    const bounds = canvas.getBoundingClientRect();
    return {
      size: { width: bounds.width, height: bounds.height } satisfies Size,
      origin: { x: bounds.left, y: bounds.top } satisfies Point,
      toLocal: (client: Point): Point => ({ x: client.x - bounds.left, y: client.y - bounds.top }),
    };
  }, []);

  /** Runs a drag gesture whose intermediate state is fully described by `compute`. */
  const runGesture = useCallback(
    <T extends Interaction>(
      event: ReactPointerEvent,
      compute: (delta: Point, pointer: Point) => T,
      commit: (result: T) => void,
    ) => {
      const callbacks: DragCallbacks = {
        onMove: (delta, pointer) => setInteraction(compute(delta, pointer)),
        onEnd: (delta, pointer) => {
          setInteraction(null);
          commit(compute(delta, pointer));
        },
        onCancel: () => setInteraction(null),
      };
      if (startDrag(event, callbacks)) {
        setInteraction(compute({ x: 0, y: 0 }, { x: event.clientX, y: event.clientY }));
      }
    },
    [startDrag],
  );

  const handleNoteDragStart = useCallback(
    (note: Note, mode: NoteDragMode, event: ReactPointerEvent) => {
      const { size: bounds, origin } = getCanvas();
      const { rect } = note;

      if (mode === 'resize') {
        runGesture(
          event,
          (delta) => ({
            kind: 'resize' as const,
            id: note.id,
            rect: {
              ...rect,
              ...constrainSize({
                width: Math.min(rect.width + delta.x, bounds.width - rect.x),
                height: Math.min(rect.height + delta.y, bounds.height - rect.y),
              }),
            },
          }),
          (result) => actions.update(note.id, { rect: result.rect }),
        );
        return;
      }

      // The trash zone is fixed, so it is measured once per gesture and converted to canvas coordinates.
      const trashClient = trashRef.current && toRect(trashRef.current.getBoundingClientRect());
      const trash = trashClient && { ...trashClient, x: trashClient.x - origin.x, y: trashClient.y - origin.y };
      runGesture(
        event,
        (delta) => {
          const moved = keepInside({ ...rect, x: rect.x + delta.x, y: rect.y + delta.y }, bounds);
          return {
            kind: 'move' as const,
            id: note.id,
            rect: moved,
            overTrash: trash !== null && rectsIntersect(moved, trash),
          };
        },
        (result) => {
          if (result.overTrash) actions.remove(note.id);
          else actions.update(note.id, { rect: result.rect });
        },
      );
    },
    [actions, getCanvas, runGesture],
  );

  const handleCanvasPointerDown = (event: ReactPointerEvent<HTMLDivElement>) => {
    if (event.target !== event.currentTarget) return;
    // The drag suppresses the default focus change, so release the edited note explicitly.
    if (document.activeElement instanceof HTMLElement) document.activeElement.blur();
    const { size: bounds, toLocal } = getCanvas();
    const start = toLocal({ x: event.clientX, y: event.clientY });

    runGesture(
      event,
      (_, pointer) => {
        const drawn = rectFromCorners(start, toLocal(pointer));
        const isDeliberate = drawn.width >= MIN_DRAWN_SIZE || drawn.height >= MIN_DRAWN_SIZE;
        // What the user sees while drawing is exactly the note that will be created.
        return {
          kind: 'create' as const,
          rect: isDeliberate ? keepInside({ ...drawn, ...constrainSize(drawn) }, bounds) : null,
        };
      },
      (result) => {
        if (result.rect !== null) onCreateNote(result.rect);
      },
    );
  };

  const handleCanvasDoubleClick = (event: ReactMouseEvent<HTMLDivElement>) => {
    if (event.target !== event.currentTarget) return;
    const { size: bounds, toLocal } = getCanvas();
    const center = toLocal({ x: event.clientX, y: event.clientY });
    onCreateNote(
      keepInside(
        {
          x: center.x - DEFAULT_NOTE_SIZE.width / 2,
          y: center.y - DEFAULT_NOTE_SIZE.height / 2,
          ...DEFAULT_NOTE_SIZE,
        },
        bounds,
      ),
    );
  };

  // Grow the scrollable area to fit all notes when the window is smaller than the content.
  const contentSize = useMemo<Size>(
    () =>
      notes.reduce<Size>(
        (size, { rect }) => ({
          width: Math.max(size.width, rect.x + rect.width + CANVAS_PADDING),
          height: Math.max(size.height, rect.y + rect.height + CANVAS_PADDING),
        }),
        { width: 0, height: 0 },
      ),
    [notes],
  );

  const active = interaction?.kind === 'move' || interaction?.kind === 'resize' ? interaction : null;

  return (
    <div className={styles.board}>
      <div
        ref={canvasRef}
        className={styles.canvas}
        style={contentSize}
        onPointerDown={handleCanvasPointerDown}
        onDoubleClick={handleCanvasDoubleClick}
      >
        {notes.map((note) => {
          const isActive = active?.id === note.id;
          return (
            <NoteView
              key={note.id}
              note={note}
              rect={isActive ? active.rect : note.rect}
              dragMode={isActive ? active.kind : null}
              isOverTrash={isActive && active.kind === 'move' && active.overTrash}
              autoFocus={note.id === focusedNoteId}
              onDragStart={handleNoteDragStart}
              onChange={actions.update}
              onActivate={actions.bringToFront}
            />
          );
        })}
        {interaction?.kind === 'create' && interaction.rect !== null && (
          <div
            className={styles.draft}
            style={{
              transform: `translate(${interaction.rect.x}px, ${interaction.rect.y}px)`,
              width: interaction.rect.width,
              height: interaction.rect.height,
            }}
          />
        )}
      </div>
      <TrashZone
        ref={trashRef}
        isActive={interaction?.kind === 'move'}
        isTargeted={interaction?.kind === 'move' && interaction.overTrash}
      />
    </div>
  );
}
