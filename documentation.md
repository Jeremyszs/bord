# Bord Architecture Documentation

This document outlines the architectural design and core systems of the Bord application.

## 1. High-Level Overview

Bord is a client-heavy Next.js application designed to function as an offline-first Progressive Web App (PWA)-like experience. While it uses a server-side API route for web scraping, the core application logic—rendering, transposing, state management, and exporting—happens entirely in the client's browser.

### Core Paradigms:
- **Offline-First:** All user data (setlists, annotations) is stored locally in IndexedDB.
- **Client-Side Processing:** Music theory calculations (transposition, Nashville Number System) are executed locally to ensure zero latency.
- **Decoupled Stores:** State is split logically between independent Zustand stores (e.g., `viewerStore` for song data, `midiStore` for hardware interactions).

---

## 2. Data Flow & State Management

State is managed globally using **Zustand**. 

### `viewerStore.ts`
Manages the core state of the application's main viewer:
- **Songs List:** An array of `SonglistItem` objects.
- **UI State:** Tracks NNS toggle, drawing mode, and auto-scroll speed.
- **Database Synchronization:** Automatically syncs the current setlist to Dexie.js using a debounced observer to prevent excessive disk writes.

### `midiStore.ts`
Manages the state for the MIDI Controller integration:
- **Hardware vs. Virtual Notes:** Tracks notes originating from the Web MIDI API (`_hardwareNotes`) and the clickable screen UI (`_virtualNotes`) separately.
- **Chord Detection Engine:** Merges both sets of notes and processes them through `tonal.js` to detect the played chord.
- **Persistence:** Uses Zustand's `persist` middleware to save the floating window's X/Y coordinates and dimensions to `localStorage`, ensuring the user's workspace layout is retained across sessions. Note sets are kept strictly in transient memory.

### IndexedDB (`db.ts`)
We use **Dexie.js** as a wrapper around the browser's native IndexedDB.
- Saves the full setlist array, user-drawn canvas annotations (as serialized JSON), and NNS preferences.
- Enables the "Local Library" feature on the homepage, allowing users to load previously fetched songs instantly without an internet connection.

---

## 3. Scraper Engine (`/api/scrape/route.ts`)

Since browsers block cross-origin requests (CORS), web scraping must happen server-side.
- **Tooling:** Uses `cheerio` to parse HTML.
- **Process:** 
  1. Executes a search on `jrchord.com`.
  2. Resolves the correct song URL.
  3. Fetches the page and extracts the Title, Artist, and the raw pre-formatted chord content.
  4. **Heuristic Key Detection:** If the page does not explicitly declare the original key (e.g., "Key: G"), the engine falls back to a custom music theory algorithm (`inferKeyFromContent`) that analyzes chord frequencies and positions to probabilistically determine the tonic key.

---

## 4. Music Engine (`/lib/music-engine.ts`)

A pure-logic module responsible for real-time chord manipulation.
- **Regex Parsing:** Uses precise regular expressions to separate root notes (C, F#), qualities (m, maj7), and slash bass notes (/B).
- **Transposition:** Shifts the root and bass notes along a chromatic array based on the `transposeSteps` state.
- **Nashville Number System (NNS):** Calculates the interval between the song's *current transposed key* and the chord's root, converting the chord to a numerical representation (e.g., 1, 4, 5m) while preserving the chord quality.

---

## 5. UI Renderers

### Chord Sheet Renderer (`ChordSheetRender.tsx`)
- Parses the raw text format into discrete tokens (`type: 'chord-over-lyric'` or `type: 'tokens'` for bracketed formatting).
- Dynamically injects transposed chords or NNS values during the React render cycle.
- Designed with strict CSS constraints to ensure lyrics and chords remain perfectly aligned regardless of font size or screen width.

### Canvas Notation (`CanvasNotation.tsx`)
- Instantiates a `Fabric.js` canvas directly over the chord sheet.
- **Serialization:** Saves drawn paths as JSON strings to the Zustand store, which are then synced to IndexedDB.
- Handles responsive window resizing by utilizing `ResizeObserver` to update the Fabric canvas dimensions without losing drawn data.

### MIDI Piano Window (`MidiPianoWindow.tsx`)
- Utilizes `react-rnd` to create a floating, draggable, and resizable window.
- Renders a full 88-key piano (A0 to C8).
- **Zero-Latency Design:** Subscribes directly to the `activeNotes` Set in the `midiStore`. It completely bypasses complex Framer Motion animations in favor of instant React inline-style updates to ensure there is zero visual lag when a musician presses a key.

---

## 6. Hardware Integrations

### Web MIDI Processor (`useMidiProcessor.ts`)
- Hooks into the browser's native `navigator.requestMIDIAccess`.
- Attaches listeners to all available MIDI inputs.
- Parses MIDI byte data (Note On / Note Off events) and feeds them into `midiStore.setHardwareNotes`.
- Handles hot-plugging (connecting/disconnecting controllers while the app is running) via the `onstatechange` event.

---

## 7. Export Engine (`/lib/export-engine.ts`)

To bypass the complexities of rendering complex CSS frameworks (like Tailwind) to PDF:
1. The engine constructs a completely isolated, pure HTML/CSS representation of the chord sheet hidden off-screen.
2. Uses `html2canvas` to take a high-resolution snapshot of this isolated DOM.
3. Uses `jsPDF` to embed the image into a perfectly sized PDF document.
This approach guarantees that the exported PDF looks identical across all browsers and devices, immune to responsive layout shifts or missing fonts.
