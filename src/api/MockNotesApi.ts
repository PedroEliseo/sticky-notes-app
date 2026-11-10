import type { NotesApi } from './NotesApi';
import { isNoteColor, type Note, type NoteId } from '../model/note';

interface MockOptions {
  readonly storage: Storage;
  readonly storageKey?: string;
  readonly latencyMs?: { readonly min: number; readonly max: number };
}

const isFiniteNumber = (value: unknown): value is number =>
  typeof value === 'number' && Number.isFinite(value);

/** Runtime validation of untrusted persisted data. */
const isNote = (value: unknown): value is Note => {
  if (typeof value !== 'object' || value === null) return false;
  const note = value as Record<string, unknown>;
  const rect = note['rect'] as Record<string, unknown> | null | undefined;
  return (
    typeof note['id'] === 'string' &&
    typeof note['text'] === 'string' &&
    isNoteColor(note['color']) &&
    isFiniteNumber(note['zIndex']) &&
    typeof rect === 'object' &&
    rect !== null &&
    isFiniteNumber(rect['x']) &&
    isFiniteNumber(rect['y']) &&
    isFiniteNumber(rect['width']) &&
    isFiniteNumber(rect['height'])
  );
};

/**
 * Asynchronous mock of a REST backend that keeps its "database" in Web Storage.
 * Requests get a random latency, but are processed strictly in the order they
 * were issued, the same guarantee a single HTTP/1.1 connection queue would give.
 */
export class MockNotesApi implements NotesApi {
  private readonly storage: Storage;
  private readonly storageKey: string;
  private readonly latency: { readonly min: number; readonly max: number };
  private queue: Promise<unknown> = Promise.resolve();

  constructor({ storage, storageKey = 'sticky-notes/v1', latencyMs = { min: 50, max: 250 } }: MockOptions) {
    this.storage = storage;
    this.storageKey = storageKey;
    this.latency = latencyMs;
  }

  list(): Promise<readonly Note[]> {
    return this.enqueue(() => [...this.read().values()]);
  }

  save(note: Note): Promise<void> {
    return this.enqueue(() => {
      const notes = this.read();
      notes.set(note.id, note);
      this.write(notes);
    });
  }

  remove(id: NoteId): Promise<void> {
    return this.enqueue(() => {
      const notes = this.read();
      notes.delete(id);
      this.write(notes);
    });
  }

  private enqueue<T>(operation: () => T): Promise<T> {
    const result = this.queue.then(async () => {
      await this.delay();
      return operation();
    });
    // A failed request must not block the ones queued after it.
    this.queue = result.catch(() => undefined);
    return result;
  }

  private delay(): Promise<void> {
    const { min, max } = this.latency;
    const ms = min + Math.random() * (max - min);
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  private read(): Map<NoteId, Note> {
    const raw = this.storage.getItem(this.storageKey);
    if (raw === null) return new Map();
    try {
      const parsed: unknown = JSON.parse(raw);
      const notes = Array.isArray(parsed) ? parsed.filter(isNote) : [];
      return new Map(notes.map((note) => [note.id, note]));
    } catch {
      // Corrupted storage: start from scratch instead of breaking the app.
      return new Map();
    }
  }

  private write(notes: ReadonlyMap<NoteId, Note>): void {
    this.storage.setItem(this.storageKey, JSON.stringify([...notes.values()]));
  }
}
