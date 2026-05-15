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
