# Bord - Architectural Blueprint

## Phase 0: Specification & Architectural Blueprint

### 1. Complete File Tree Schema

```text
Bord/
├── app/
│   ├── api/
│   │   └── scrape/
│   │       └── route.ts            # Server-side Next.js API route for scraping
│   ├── viewer/
│   │   └── page.tsx                # High-contrast minimalist viewer page
│   ├── globals.css                 # Global styles and Tailwind directives
│   ├── layout.tsx                  # Root Next.js layout
│   └── page.tsx                    # Landing/Home page for URL input
├── components/
│   ├── Viewer/
│   │   ├── ChordSheetRender.tsx    # Renders the parsed chord sheet with monospaced font
│   │   ├── CanvasNotation.tsx      # Fabric.js interactive drawing layer overlay
│   │   ├── ScrollController.tsx    # Custom scrolling component (requestAnimationFrame)
│   │   └── ControlPanel.tsx        # Floating minimalist panel (Transpose, NNS, Draw Toggle, Export)
│   └── UI/
│       └── Slider.tsx              # Reusable modern range input slider
├── lib/
│   ├── scrapers/
│   │   ├── index.ts                # Strategy pattern orchestrator
│   │   ├── jrchord.ts              # jrchord.com scraper strategy
│   │   ├── ultimate-guitar.ts      # ultimate-guitar.com scraper strategy
│   │   └── chordtela.ts            # chordtela.com scraper strategy
│   ├── music-engine.ts             # chordsheetjs integration, transposition, and NNS calculation
│   └── export-engine.ts            # html2canvas and jspdf pipeline
├── store/
│   └── viewerStore.ts              # State management for viewer (Zustand)
├── types/
│   └── index.ts                    # TypeScript interfaces and types
├── package.json
├── tailwind.config.ts
├── tsconfig.json
└── next.config.mjs
```

### 2. Independent Component Composition

**State Management Strategy: Zustand with Persistence Middleware**
To handle state sharing across isolated components (e.g., `ScrollController`, `CanvasNotation`, `ControlPanel`, and `ChordSheetRender`) without prop drilling or excessive re-renders, we will use **Zustand**. It is lightweight and integrates natively with `localStorage` for persisting settings and drawing paths.

- **Viewer Store (`viewerStore.ts`)**:
  - `songData`: Stores the current `ScrapedSongObject` or parsed representation.
  - `transposeSteps`: Integer representing semitone shifts (e.g., -2, +3).
  - `isNNSActive`: Boolean toggle for Nashville Number System mode.
  - `isDrawingMode`: Boolean toggle for interacting with the Fabric.js canvas vs. standard view.
  - `scrollSpeed`: Integer (1-100) mapped to the scrolling multiplier.
  - `isPlaying`: Boolean for the auto-scroll state.
  - `canvasAnnotations`: Synchronized with local storage to persist user drawings mapped to a song's ID.

### 3. Dependency Tree & Matrix

**Core Frameworks**
- `next` (14 or 15 - App Router)
- `react`, `react-dom`
- `typescript`

**Application Dependencies**
- **Scraping Engine**:
  - `cheerio` (Fast HTML parsing for jrchord and chordtela)
  - `puppeteer` (Optional, if dynamic rendering is strictly required, though `cheerio` + fetch is preferred for speed if data is in raw HTML/JSON).
- **Music Parsing & Processing**:
  - `chordsheetjs` (Robust parser for ChordPro and standard chord over lyric sheets).
- **Interactive Canvas & UI**:
  - `fabric` (Version 5 or 6 - For the interactive notation and sketching layer).
  - `framer-motion` (For minimal UI animation tokens, transitions, and hover states).
- **Export Pipeline**:
  - `jspdf` (Client-side PDF generation).
  - `html2canvas` (DOM rasterization to merge with Fabric.js data).
- **State & Styling**:
  - `zustand` (State management + LocalStorage persist).
  - `tailwindcss` (Utility-first CSS).
  - `lucide-react` (Minimalist icons for control panels).

### 4. Data Schema Definitions

Below are the explicit TypeScript interfaces governing data flow from the server to the client and within local storage:

```typescript
// types/index.ts

/**
 * Standardized output from the multi-source scraper engine.
 */
export interface ScrapedSongObject {
  id: string;             // Generated slug or hash based on artist/title
  title: string;
  artist: string;
  originalKey: string;    // E.g., 'C', 'G#', 'Fm'
  rawContent: string;     // Standardized bracket notation: "Hello [C] world" or standard raw text
  sourceType: 'jrchord' | 'ultimate-guitar' | 'chordtela';
}

/**
 * Representation of a tokenized chord block within the Music Engine.
 */
export interface ChordSheetToken {
  type: 'chord' | 'lyric' | 'newline' | 'directive';
  value: string;          // The raw string value (e.g., "C#m", "Hello ", "\n")
  transposedValue?: string; // The shifted chord value
  nnsValue?: string;      // The Nashville Number System representation
}

/**
 * Schema for persisting canvas drawings to localStorage.
 */
export interface LocalStorageAnnotationSchema {
  songId: string;         // References ScrapedSongObject.id
  version: number;        // Schema version for future-proofing
  updatedAt: string;      // ISO string representation
  canvasState: string;    // Serialized Fabric.js JSON string representation
}
```
