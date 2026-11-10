# Sticky Notes

A single-page sticky notes board written in TypeScript and React, built without any third-party UI or drag-and-drop libraries.

## Features

All four required features:

- **Create a note at a given position and size.** Drag on empty board space to draw the note's rectangle; the preview shows exactly the note that will be created. You can also double-click the board to add a default-size note at that spot, or click **+ New note** in the toolbar.
- **Resize.** Drag the handle in a note's bottom-right corner.
- **Move.** Drag a note by its colored header.
- **Delete.** Drag a note onto the trash zone in the bottom-right corner. As soon as any part of the note overlaps the zone, the zone highlights and the note fades; releasing it then deletes the note.

All optional features:

- Text editing: the note body is a text area.
- Bring to front: clicking or focusing a note raises it above the others.
- Colors: pick the color for new notes in the toolbar, or recolor a note with the swatches that appear on hover.
- Persistence: an asynchronous mock REST API backed by `localStorage`, so notes are restored when the page loads.

Press **Escape** during any drag to cancel it and put the note back where it was.

## Running

Requires Node.js 18 or later.

```bash
npm install
npm run dev        # development server at http://localhost:5173
npm run build      # type-check + production build into dist/
npm run preview    # serve the production build
npm test           # unit tests (reducer, synchronizer, mock API)
npm run typecheck  # tsc only
```

## Architecture

The app has three layers, and each depends only on the one below it. The **model** (`src/model`) holds immutable domain types (`Note`, `Rect`, branded `NoteId`), plus pure geometry helpers and size constraints. The **state layer** (`src/state`) has a pure `notesReducer` that owns the notes collection and a `useNotesStore` hook that exposes it to the UI as a stable `actions` object. Persistence goes through a `NotesApi` interface shaped like a REST resource (`list`, `save` as an idempotent PUT, `remove`). `MockNotesApi` implements it asynchronously, with random latency and in-order request processing, and stores data in `localStorage`. Persisted data is validated at runtime when it is read. A real HTTP client could replace the mock without touching anything else.

The UI never calls the API directly. Updates are applied optimistically to local state. `NotesSynchronizer` then diffs consecutive state snapshots (cheap, because updates are immutable and the reducer keeps object identity for no-ops), works out which notes were saved or removed, and debounces the changes. A burst of keystrokes or a drag becomes one request per note, and the toolbar shows whether changes are saved.

All pointer gestures (create, move, resize) go through one generic `useDrag` hook. It attaches listeners to `window` only while a gesture is active, throttles updates to one per animation frame, and supports cancelling with Escape or when the window loses focus. While a gesture is running, `Board` keeps a transient `Interaction` (a discriminated union) in local state and only writes the final result to the store when the gesture ends. As a result, dragging causes no store updates or network writes, and `NoteView` is memoized and receives its rendered rectangle as a separate prop, so only the dragged note re-renders on each frame. Notes are positioned with `transform` to keep layout cost low. The board uses `isolation: isolate` so that ever-growing note z-indices can't cover fixed overlays such as the trash zone.
