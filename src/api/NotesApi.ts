import type { Note, NoteId } from '../model/note';

/**
 * Persistence boundary of the application. Shaped after a REST resource
 * (`GET /notes`, `PUT /notes/:id`, `DELETE /notes/:id`) so a real HTTP
 * implementation can replace the mock without touching the UI.
 */
export interface NotesApi {
  list(): Promise<readonly Note[]>;
  /** Creates or fully replaces a note (idempotent upsert). */
  save(note: Note): Promise<void>;
  remove(id: NoteId): Promise<void>;
}
