// Pure implementation — no dependency on chordsheetjs internals for chord math
// chordsheetjs is still used for its text parser in parseChordSheet()
// eslint-disable-next-line @typescript-eslint/no-require-imports
const ChordSheetJS = require('chordsheetjs');

export const CHROMATIC_SCALE = [
  'C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B',
];

const FLAT_TO_SHARP: Record<string, string> = {
  Db: 'C#', Eb: 'D#', Fb: 'E', Gb: 'F#', Ab: 'G#', Bb: 'A#', Cb: 'B',
};

/** Normalize a root note string to the sharp-based chromatic scale */
function normalizeRoot(root: string): string {
  return FLAT_TO_SHARP[root] ?? root;
}

function getRootIndex(root: string): number {
  return CHROMATIC_SCALE.indexOf(normalizeRoot(root));
}

/**
 * Regex that matches a chord string.
 * Groups:
 *   1 — root note (e.g. C, D#, Bb)
 *   2 — quality / suffix (e.g. m, maj7, dim, sus4, add9 …)
 *   3 — slash bass note (optional, without the slash)
 */
const CHORD_RE = /^([A-G][#b]?)(m(?:aj)?|min|dim|aug|sus[24]?|add\d+|M|maj\d*|\d+[^/]*)?(?:\/([A-G][#b]?))?$/;

interface ParsedChord {
  root: string;
  suffix: string;
  bass: string | null;
}

function parseChordString(chordStr: string): ParsedChord | null {
  const m = chordStr.trim().match(CHORD_RE);
  if (!m) return null;
  return { root: m[1], suffix: m[2] ?? '', bass: m[3] ?? null };
}

/**
 * Transpose a single chord string by a given number of semitones.
 * Returns the original string unchanged if it cannot be parsed.
 */
export function transposeChord(chordStr: string, steps: number): string {
  if (!chordStr || chordStr.trim() === '') return chordStr;

  const parsed = parseChordString(chordStr);
  if (!parsed) return chordStr;

  const rootIdx = getRootIndex(parsed.root);
  if (rootIdx === -1) return chordStr;

  const newRoot = CHROMATIC_SCALE[(rootIdx + steps + 1200) % 12];
  let result = newRoot + parsed.suffix;

  if (parsed.bass) {
    const bassIdx = getRootIndex(parsed.bass);
    const newBass = bassIdx !== -1
      ? CHROMATIC_SCALE[(bassIdx + steps + 1200) % 12]
      : parsed.bass;
    result += '/' + newBass;
  }

  return result;
}

const NNS_SCALE = ['1', '1#', '2', '2#', '3', '4', '4#', '5', '5#', '6', '6#', '7'];

/**
 * Convert a chord string to Nashville Number System representation.
 * The `tonicKey` is the tonic (I) note (e.g. 'G', 'Bb', 'C#').
 */
export function convertToNNS(chordStr: string, tonicKey: string): string {
  if (!chordStr || chordStr.trim() === '') return chordStr;

  const parsed = parseChordString(chordStr);
  if (!parsed) return chordStr;

  const tonicIdx = getRootIndex(tonicKey);
  const rootIdx = getRootIndex(parsed.root);
  if (tonicIdx === -1 || rootIdx === -1) return chordStr;

  const interval = (rootIdx - tonicIdx + 12) % 12;
  let nns = NNS_SCALE[interval];

  // Append quality suffix (minor → m, etc.)
  const suffix = parsed.suffix;
  if (suffix === 'm' || suffix === 'min') nns += 'm';
  else if (suffix === 'maj' || suffix === 'maj7') nns += suffix.replace('maj', 'M');
  else if (suffix) nns += suffix;

  if (parsed.bass) {
    const bassIdx = getRootIndex(parsed.bass);
    if (bassIdx !== -1) {
      const bassInterval = (bassIdx - tonicIdx + 12) % 12;
      nns += '/' + NNS_SCALE[bassInterval];
    }
  }

  return nns;
}

// ── Keep parseChordSheet for any future use ──────────────────────────────────
export function parseChordSheet(rawContent: string): InstanceType<typeof ChordSheetJS.UltimateGuitarParser>['song'] {
  const parser = new ChordSheetJS.UltimateGuitarParser({ preserveWhitespace: false });
  return parser.parse(rawContent);
}
