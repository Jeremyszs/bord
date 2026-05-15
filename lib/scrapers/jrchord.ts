import * as cheerio from 'cheerio';
import { ScrapedSongObject } from '@/types';

const FETCH_HEADERS = {
  'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
  'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8',
  'Accept-Language': 'en-US,en;q=0.9,id;q=0.8',
  'Accept-Encoding': 'gzip, deflate, br',
  'Cache-Control': 'no-cache',
  'Pragma': 'no-cache',
};

/**
 * Search jrchord.com using its native WordPress search.
 */
async function resolveJrchordUrl(songTitle: string): Promise<string | null> {
  const query = encodeURIComponent(songTitle);
  const res = await fetch(`https://www.jrchord.com/?s=${query}`, { headers: FETCH_HEADERS });
  if (!res.ok) return null;

  const $ = cheerio.load(await res.text());
  let link: string | null = null;

  $('article a, h2 > a, h3 > a, .entry-title a, .song-title a').each((_, el) => {
    const href = $(el).attr('href');
    if (href && href.includes('jrchord.com') && !href.includes('?s=') && !link) {
      link = href;
    }
  });
  return link;
}

// ── Key detection helpers ──────────────────────────────────────────────────────

const CHROMATIC = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];
const FLAT_TO_SHARP: Record<string, string> = {
  Db: 'C#', Eb: 'D#', Fb: 'E', Gb: 'F#', Ab: 'G#', Bb: 'A#', Cb: 'B',
};
// Preferred flat spellings for keys that musicians read in flats
const SHARP_TO_FLAT: Record<string, string> = {
  'C#': 'Db', 'D#': 'Eb', 'F#': 'Gb', 'G#': 'Ab', 'A#': 'Bb',
};
// Keys that are conventionally written with flats in Western music theory
const FLAT_PREFERENCE_KEYS = new Set(['F', 'Bb', 'Eb', 'Ab', 'Db', 'Gb']);

/**
 * Analyse a raw chord-sheet string and return the most probable tonic key.
 *
 * Only scans definitively chord tokens (bracket format or chord-only lines).
 * Heuristics to resolve relative major/minor ambiguity:
 *   - First chord gets 5× bonus (worship songs almost always open on the tonic)
 *   - Chords earlier in the song get slightly higher weight
 *   - When major and relative minor have close scores, prefer major
 */
function inferKeyFromContent(rawContent: string): string {
  const CHORD_RE = /^([A-G][#b]?)(m(?:aj)?|min|dim|aug|sus[24]?|add\d*|M|maj\d*|\d+[^/\s]*)?(?:\/([A-G][#b]?))?$/;
  const rootCounts: Record<string, number> = {};
  let firstChordRoot: string | null = null;
  let lineIndex = 0;

  function processChordToken(token: string, weight: number) {
    const m = token.trim().match(CHORD_RE);
    if (!m) return;
    const root = FLAT_TO_SHARP[m[1]] ?? m[1];
    if (!CHROMATIC.includes(root)) return;

    rootCounts[root] = (rootCounts[root] ?? 0) + weight;
    if (firstChordRoot === null) firstChordRoot = root;

    // Bass note at half weight
    if (m[3]) {
      const bass = FLAT_TO_SHARP[m[3]] ?? m[3];
      if (CHROMATIC.includes(bass)) {
        rootCounts[bass] = (rootCounts[bass] ?? 0) + weight * 0.5;
      }
    }
  }

  for (const line of rawContent.split('\n')) {
    const trimmed = line.trim();
    if (!trimmed) continue;

    // Chords that appear earlier in the song get slightly more weight
    const positionWeight = Math.max(0.6, 1 - lineIndex * 0.003);

    // Strategy 1: bracket format — extract only the [Chord] portions
    if (trimmed.includes('[') && trimmed.includes(']')) {
      const bracketRe = /\[([^\]]+)\]/g;
      let bm: RegExpExecArray | null;
      while ((bm = bracketRe.exec(trimmed)) !== null) {
        processChordToken(bm[1].trim(), positionWeight);
      }
      lineIndex++;
      continue;
    }

    // Strategy 2: chord-only line — every whitespace-delimited token must be a valid chord
    const tokens = trimmed.split(/\s+/).filter(Boolean);
    const allChords = tokens.length > 0 && tokens.every(t => CHORD_RE.test(t));
    if (allChords) {
      tokens.forEach(t => processChordToken(t, positionWeight));
    }
    // Lyric-only lines are completely ignored
    lineIndex++;
  }

  if (Object.keys(rootCounts).length === 0) return 'C';

  // First chord bonus: strongly suggests the tonic
  if (firstChordRoot) {
    rootCounts[firstChordRoot] = (rootCounts[firstChordRoot] ?? 0) + 5;
  }

  const MAJOR_STEPS = [0, 2, 4, 5, 7, 9, 11];
  const MINOR_STEPS = [0, 2, 3, 5, 7, 8, 10];

  let bestKey = 'C';
  let bestScore = -1;
  let bestIsMajor = true;

  for (let tonicIdx = 0; tonicIdx < 12; tonicIdx++) {
    const tonicNote = CHROMATIC[tonicIdx];

    for (const [steps, isMajor] of [[MAJOR_STEPS, true], [MINOR_STEPS, false]] as [number[], boolean][]) {
      const diatonic = new Set(steps.map(s => (tonicIdx + s) % 12));
      let score = 0;
      for (const [note, count] of Object.entries(rootCounts)) {
        const noteIdx = CHROMATIC.indexOf(note);
        if (noteIdx !== -1 && diatonic.has(noteIdx)) {
          score += count * 2;
        }
      }
      score += (rootCounts[tonicNote] ?? 0) * 3;

      // Penalize minor key if relative major appears more — song is probably in major
      if (!isMajor) {
        const relMajorIdx = (tonicIdx + 3) % 12;
        const relMajorRoot = CHROMATIC[relMajorIdx];
        if ((rootCounts[relMajorRoot] ?? 0) > (rootCounts[tonicNote] ?? 0)) {
          score *= 0.85;
        }
      }

      if (score > bestScore || (score === bestScore && isMajor && !bestIsMajor)) {
        bestScore = score;
        bestKey = tonicNote;
        bestIsMajor = isMajor;
      }
    }
  }

  // Convert sharp-based result to flat if the key conventionally uses flats
  const flatVersion = SHARP_TO_FLAT[bestKey];
  if (flatVersion && FLAT_PREFERENCE_KEYS.has(flatVersion)) {
    return flatVersion;
  }
  return bestKey;
}


/**
 * Scrape a jrchord.com song page and return a ScrapedSongObject.
 */
export async function scrapeJrchord(songTitle: string): Promise<ScrapedSongObject> {
  const songUrl = await resolveJrchordUrl(songTitle);
  if (!songUrl) throw new Error(`No results for "${songTitle}" on JrChord`);

  const res = await fetch(songUrl, { headers: FETCH_HEADERS });
  if (!res.ok) throw new Error(`Failed to load JrChord page (HTTP ${res.status})`);

  const html = await res.text();
  const $ = cheerio.load(html);

  // ── Title ─────────────────────────────────────────────────────────────────
  const title = $('h1').first().text().trim() || songTitle;

  // ── Artist ────────────────────────────────────────────────────────────────
  let artist = 'Unknown Artist';

  const artistEl = $(
    '.song-artist, [class*="artist"], .post-meta a, .entry-meta a, .author'
  ).first().text().trim();
  if (artistEl && artistEl.length < 60) {
    artist = artistEl;
  } else {
    const pageTitle = $('title').text().trim();
    // Handle both " - " and " – " (em dash)
    const separators = [' \u2013 ', ' - '];
    let found = false;
    for (const sep of separators) {
      const dashIdx = pageTitle.indexOf(sep);
      const pipeIdx = pageTitle.indexOf(' | ');
      if (dashIdx !== -1 && pipeIdx !== -1 && pipeIdx > dashIdx) {
        artist = pageTitle.slice(dashIdx + sep.length, pipeIdx).trim();
        found = true;
        break;
      } else if (dashIdx !== -1) {
        artist = pageTitle.slice(dashIdx + sep.length).trim();
        found = true;
        break;
      }
    }
    if (!found) artist = 'Unknown Artist';
  }

  // ── Chord content ─────────────────────────────────────────────────────────
  const preEl = $('pre').first();
  let rawContent = '';

  if (preEl.length) {
    preEl.find('span.c, span[class*="chord"]').each((_, el) => {
      $(el).replaceWith(`[${$(el).text().trim()}]`);
    });
    preEl.find('b, i, em, strong').each((_, el) => {
      $(el).replaceWith($(el).text());
    });
    rawContent = preEl.text();
  }

  if (!rawContent.trim()) {
    $('article pre, .entry-content pre, .post-content pre').each((_, el) => {
      if (!rawContent) rawContent = $(el).text().trim();
    });
  }
  if (!rawContent.trim()) {
    rawContent = $('.entry-content, .post-content').first().text().trim();
  }

  // ── Key detection — three-tier approach ────────────────────────────────────
  //
  // Tier 1: Explicit "Key: X" or "Nada Dasar: X" anywhere in the raw pre text
  // Tier 2: Same label in sidebar/meta elements
  // Tier 3: Chord-frequency analysis (always produces a result)
  //
  const KEY_LABEL_RE = /(?:Key|Nada(?:\s+Dasar)?)\s*:?\s*([A-G][#b]?m?)/i;
  let originalKey: string | null = null;

  // Tier 1 — label inside pre content
  const inPreMatch = rawContent.match(KEY_LABEL_RE);
  if (inPreMatch) {
    originalKey = inPreMatch[1];
  }

  // Tier 2 — label in page meta/sidebar
  if (!originalKey) {
    const keyEl = $('.key, [class*="key"], [class*="nada"]').first().text().trim();
    const bodyText = keyEl || $('body').text();
    const bodyMatch = bodyText.match(KEY_LABEL_RE);
    if (bodyMatch) {
      originalKey = bodyMatch[1];
    }
  }

  // Tier 3 — chord frequency analysis
  if (!originalKey) {
    originalKey = inferKeyFromContent(rawContent);
    console.log(`[jrchord] Key inferred from chord analysis: ${originalKey}`);
  } else {
    // Strip trailing 'm' if it's a minor key label (e.g. "Em" → "E")
    // Preserve flat spelling (Bb stays Bb, not A#) — musicians read in flats
    originalKey = originalKey.replace(/m$/, '');
    console.log(`[jrchord] Key from page label: ${originalKey}`);
  }

  const id = Buffer.from(songUrl).toString('base64url').slice(0, 16);
  return { id, title, artist, originalKey, rawContent, sourceType: 'jrchord' };
}
