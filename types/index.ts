export interface ScrapedSongObject {
  id: string; // generated slug/hash
  title: string;
  artist: string;
  originalKey: string;
  rawContent: string; // Formatted in bracket notation: [Am]lyrics here
  sourceType: 'jrchord';
}

export interface ChordSheetToken {
  type: 'chord' | 'lyric' | 'newline' | 'directive';
  value: string;
  transposedValue?: string;
  nnsValue?: string;
}

export interface LocalStorageAnnotationSchema {
  songId: string;
  version: number;
  updatedAt: string;
  canvasState: string;
}

// ─── Extended song type used across stores ──────────────────────────────────────

export interface SonglistItem extends ScrapedSongObject {
  listId: string;
  transposeSteps: number;
}

// ─── Saved setlist type for IndexedDB ───────────────────────────────────────────

export interface SavedSetlistData {
  id: string;
  name: string;
  songs: SonglistItem[];
  isNnsActive: boolean;
  annotations: string | null;
  lastModified: number;
}
