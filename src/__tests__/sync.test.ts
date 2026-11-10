import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { MockNotesApi } from '../api/MockNotesApi';
import type { NotesApi } from '../api/NotesApi';
import type { Note, NoteId } from '../model/note';
import { NotesSynchronizer, type SyncStatus } from '../state/NotesSynchronizer';

class MemoryStorage implements Storage {
  private readonly data = new Map<string, string>();
  get length() {
    return this.data.size;
  }
  clear() {
    this.data.clear();
  }
  getItem(key: string) {
    return this.data.get(key) ?? null;
  }
  key(index: number) {
    return [...this.data.keys()][index] ?? null;
  }
  removeItem(key: string) {
    this.data.delete(key);
  }
  setItem(key: string, value: string) {
    this.data.set(key, value);
  }
}

const note = (id: string, text = ''): Note => ({
  id: id as NoteId,
  rect: { x: 10, y: 20, width: 200, height: 150 },
  text,
  color: 'blue',
  zIndex: 1,
});

beforeEach(() => vi.useFakeTimers());
afterEach(() => vi.useRealTimers());

describe('MockNotesApi', () => {
  it('persists notes and applies requests in order', async () => {
    const storage = new MemoryStorage();
    const api = new MockNotesApi({ storage, latencyMs: { min: 0, max: 100 } });
    void api.save(note('a', 'first'));
    void api.save(note('a', 'second'));
    void api.save(note('b'));
    void api.remove('b' as NoteId);
    const result = api.list();
    await vi.runAllTimersAsync();
    expect(await result).toEqual([note('a', 'second')]);
  });

  it('ignores corrupted storage', async () => {
    const storage = new MemoryStorage();
    storage.setItem('sticky-notes/v1', '[{"id":1},"garbage"');
    const result = new MockNotesApi({ storage }).list();
    await vi.runAllTimersAsync();
    expect(await result).toEqual([]);
  });
});

describe('NotesSynchronizer', () => {
  const fakeApi = () => ({
    list: vi.fn<NotesApi['list']>(),
    save: vi.fn<NotesApi['save']>(() => Promise.resolve()),
    remove: vi.fn<NotesApi['remove']>(() => Promise.resolve()),
  });

  it('coalesces bursts of edits into one request per note', async () => {
    const api = fakeApi();
    const statuses: SyncStatus[] = [];
    const sync = new NotesSynchronizer(api, (s) => statuses.push(s));

    const a = note('a');
    const b = note('b');
    const v0 = [a, b];
    const v1 = [{ ...a, text: 'h' }, b];
    const v2 = [{ ...a, text: 'hi' }];
    sync.track(v0, v1);
    sync.track(v1, v2);
    await vi.runAllTimersAsync();

    expect(api.save).toHaveBeenCalledTimes(1);
    expect(api.save).toHaveBeenCalledWith(v2[0]);
    expect(api.remove).toHaveBeenCalledWith('b');
    expect(statuses.at(-1)).toBe('saved');
  });

  it('reports failures', async () => {
    const api = fakeApi();
    api.save.mockRejectedValue(new Error('offline'));
    vi.spyOn(console, 'error').mockImplementation(() => undefined);
    let status: SyncStatus = 'saved';
    const sync = new NotesSynchronizer(api, (s) => (status = s));
    sync.track([], [note('a')]);
    await vi.runAllTimersAsync();
    expect(status).toBe('error');
  });
});
