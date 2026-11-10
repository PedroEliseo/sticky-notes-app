import type { NotesApi } from '../api/NotesApi';
import type { Note, NoteId } from '../model/note';

export type SyncStatus = 'saved' | 'saving' | 'error';

type PendingChange = { readonly kind: 'save'; readonly note: Note } | { readonly kind: 'remove' };

/**
 * Pushes local state changes to the API. It diffs consecutive snapshots of the
 * notes collection (cheap thanks to immutable updates) and coalesces bursts of
 * changes, e.g. typing, into a single request per note.
 */
export class NotesSynchronizer {
  private readonly pending = new Map<NoteId, PendingChange>();
  private timer: ReturnType<typeof setTimeout> | undefined;
  private inFlight = 0;
  private failed = false;

  constructor(
    private readonly api: NotesApi,
    private readonly onStatusChange: (status: SyncStatus) => void,
    private readonly debounceMs = 300,
  ) {}

  track(previous: readonly Note[], next: readonly Note[]): void {
    if (previous === next) return;

    const previousById = new Map(previous.map((note) => [note.id, note]));
    for (const note of next) {
      if (previousById.get(note.id) !== note) this.pending.set(note.id, { kind: 'save', note });
      previousById.delete(note.id);
    }
    for (const id of previousById.keys()) this.pending.set(id, { kind: 'remove' });

    if (this.pending.size > 0) this.schedule();
  }

  /** Sends all pending changes immediately. */
  flush(): void {
    clearTimeout(this.timer);
    this.timer = undefined;
    const changes = [...this.pending];
    this.pending.clear();
    for (const [id, change] of changes) {
      this.send(change.kind === 'save' ? this.api.save(change.note) : this.api.remove(id));
    }
  }

  dispose(): void {
    this.flush();
  }

  private schedule(): void {
    clearTimeout(this.timer);
    this.timer = setTimeout(() => this.flush(), this.debounceMs);
    this.onStatusChange('saving');
  }

  private send(request: Promise<void>): void {
    this.inFlight += 1;
    request
      .then(
        () => undefined,
        (error: unknown) => {
          console.error('Failed to sync notes', error);
          this.failed = true;
        },
      )
      .finally(() => {
        this.inFlight -= 1;
        if (this.inFlight === 0 && this.pending.size === 0) {
          this.onStatusChange(this.failed ? 'error' : 'saved');
          this.failed = false;
        }
      });
  }
}
