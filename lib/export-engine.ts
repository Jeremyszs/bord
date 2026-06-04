import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';
import { useViewerStore } from '@/store/viewerStore';
import type { SonglistItem } from '@/types';
import { transposeChord, convertToNNS } from '@/lib/music-engine';

// ── Helpers ────────────────────────────────────────────────────────────────────

function isChord(token: string): boolean {
  return /^[A-G][#b]?(m(?:aj)?|min|dim|aug|sus[24]?|add\d*|M|maj\d*|\d+[^\s/]*)?(\/.+)?$/.test(token.trim());
}

function isChordLine(line: string): boolean {
  const tokens = line.trim().split(/\s+/).filter(Boolean);
  return tokens.length > 0 && tokens.every(t => isChord(t));
}

const FLAT_TO_SHARP_EXPORT: Record<string, string> = {
  Db: 'C#', Eb: 'D#', Fb: 'E', Gb: 'F#', Ab: 'G#', Bb: 'A#', Cb: 'B',
};
const CHROMATIC_EXPORT = ['C','C#','D','D#','E','F','F#','G','G#','A','A#','B'];
const FLAT_PREF_EXPORT = new Set(['F','Bb','Eb','Ab','Db','Gb']);
const SHARP_TO_FLAT_EXPORT: Record<string, string> = {
  'C#':'Db','D#':'Eb','F#':'Gb','G#':'Ab','A#':'Bb',
};

/** Returns the key after applying transposeSteps, with flat spelling preference */
function getExportCurrentKey(song: SonglistItem): string | null {
  if (!song.originalKey) return null;
  const norm = FLAT_TO_SHARP_EXPORT[song.originalKey] ?? song.originalKey;
  const idx = CHROMATIC_EXPORT.indexOf(norm);
  if (idx === -1) return song.originalKey;
  const newIdx = (idx + song.transposeSteps + 1200) % 12;
  const raw = CHROMATIC_EXPORT[newIdx];
  const flat = SHARP_TO_FLAT_EXPORT[raw];
  if (flat) {
    const origWasFlat = song.originalKey in FLAT_TO_SHARP_EXPORT || FLAT_PREF_EXPORT.has(song.originalKey);
    if (origWasFlat || FLAT_PREF_EXPORT.has(flat)) return flat;
  }
  return raw;
}

// BUG FIX #8: NNS export must use the post-transpose key as tonic
function displayChord(raw: string, song: SonglistItem, isNNS: boolean): string {
  if (!raw) return '';
  if (isNNS) {
    const currentKey = getExportCurrentKey(song);
    if (currentKey) {
      const transposed = song.transposeSteps !== 0
        ? transposeChord(raw, song.transposeSteps)
        : raw;
      return convertToNNS(transposed, currentKey);
    }
  }
  if (song.transposeSteps !== 0) return transposeChord(raw, song.transposeSteps);
  return raw;
}

// ── Off-screen HTML builder (zero Tailwind / external CSS dependency) ──────────

function buildCleanHTML(songs: SonglistItem[], isNNS: boolean): string {
  const songBlocks = songs.map(song => {
    const lines = song.rawContent?.split('\n') ?? [];
    let html = '';
    let i = 0;

    while (i < lines.length) {
      const line = lines[i];

      // Inline bracket format: [Chord]lyric
      if (line.includes('[') && line.includes(']')) {
        const parts = line.split(/(?=\[)/);
        let chordRow = '';
        let lyricRow = '';

        for (const part of parts) {
          const m = part.match(/^\[([^\]]+)\](.*)$/);
          if (m) {
            const chord = displayChord(m[1].trim(), song, isNNS);
            const lyric = m[2] ?? '';
            const w = Math.max(chord.length, lyric.length) + 1;
            chordRow += `<span style="display:inline-block;min-width:${w}ch;font-weight:700;color:#007AFF;">${chord || '&nbsp;'}</span>`;
            lyricRow += `<span style="display:inline-block;min-width:${w}ch;">${lyric || (chord ? '&nbsp;' : '')}</span>`;
          } else if (part) {
            chordRow += `<span style="display:inline-block;">&nbsp;</span>`;
            lyricRow += `<span style="display:inline-block;">${part}</span>`;
          }
        }

        html += `<div style="margin-bottom:2px;"><div style="line-height:1.2;white-space:pre;">${chordRow}</div><div style="line-height:1.4;white-space:pre;">${lyricRow}</div></div>`;
        i++;
        continue;
      }

      // Chord-over-lyric format
      if (isChordLine(line) && i + 1 < lines.length) {
        const chords = line.trim().split(/\s+/).filter(Boolean)
          .map(c => displayChord(c, song, isNNS)).join('    ');
        const lyric = lines[i + 1] ?? '';
        html += `<div style="margin-bottom:2px;"><div style="font-weight:700;color:#007AFF;line-height:1.2;white-space:pre-wrap;">${chords}</div><div style="line-height:1.4;white-space:pre-wrap;">${lyric}</div></div>`;
        i += 2;
        continue;
      }

      if (line.trim()) {
        html += `<div style="line-height:1.5;white-space:pre-wrap;margin-bottom:2px;">${line}</div>`;
      } else {
        html += `<div style="height:0.8em;"></div>`;
      }
      i++;
    }

    const transposeLabel = song.transposeSteps !== 0
      ? `<span style="font-size:11px;color:#888;margin-left:8px;">(transposed ${song.transposeSteps > 0 ? '+' : ''}${song.transposeSteps})</span>`
      : '';

    return `
      <div style="padding:48px 56px;border-bottom:1px solid #eee;">
        <div style="text-align:center;margin-bottom:28px;padding-bottom:20px;border-bottom:1px solid #f3f4f6;">
          <h1 style="font-size:28px;font-weight:800;color:#000;margin:0 0 4px;">${song.title}${transposeLabel}</h1>
          <p style="font-size:13px;color:#888;margin:0 0 12px;">${song.artist}</p>
          ${isNNS ? `<span style="display:inline-block;padding:2px 10px;border-radius:99px;background:#f0f7ff;color:#007AFF;font-size:11px;font-weight:700;">Nashville Number System</span>` : ''}
        </div>
        <div style="font-family:monospace;font-size:14px;color:#000;line-height:1.5;">
          ${html}
        </div>
      </div>
    `;
  }).join('');

  return `
    <div style="
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      background: #ffffff;
      width: 820px;
      color: #000000;
      box-sizing: border-box;
    ">
      ${songBlocks}
      <div style="padding:16px 56px;text-align:center;">
        <span style="font-size:10px;color:#ccc;">Generated by Bord · jrchord.com</span>
      </div>
    </div>
  `;
}

// ── Main export function ────────────────────────────────────────────────────────

export const exportToPdf = async () => {
  const state = useViewerStore.getState();
  const { songs, isNNSActive } = state;

  if (songs.length === 0) return;

  // 1. Build a completely isolated off-screen container with zero external CSS
  const container = document.createElement('div');
  container.style.cssText = `
    position: absolute;
    top: -99999px;
    left: -99999px;
    width: 820px;
    background: #ffffff;
    margin: 0;
    padding: 0;
    overflow: hidden;
  `;
  container.innerHTML = buildCleanHTML(songs, isNNSActive);
  document.body.appendChild(container);

  try {
    // 2. Render the isolated, Tailwind-free element to canvas
    const canvas = await html2canvas(container, {
      scale: 2,
      useCORS: true,
      logging: false,
      backgroundColor: '#ffffff',
      width: 820,
      windowWidth: 820,
    });

    // 3. Generate PDF
    const imgData = canvas.toDataURL('image/jpeg', 0.97);
    const pdfWidth = 595;  // A4 pt width
    const pdfHeight = (canvas.height / canvas.width) * pdfWidth;

    const pdf = new jsPDF({
      orientation: pdfHeight > pdfWidth ? 'portrait' : 'landscape',
      unit: 'pt',
      format: [pdfWidth, pdfHeight],
    });

    pdf.addImage(imgData, 'JPEG', 0, 0, pdfWidth, pdfHeight);

    // 4. Sanitize filename
    let songTitle = 'Setlist';
    if (songs.length === 1) {
      songTitle = `${songs[0].artist} ${songs[0].title}`;
    } else {
      songTitle = `Setlist_${songs[0].title}_and_${songs.length - 1}_others`;
    }
    const cleanTitle = songTitle
      .replace(/[/\\?%*:|"<>]/g, '-')
      .replace(/\s+/g, '_')
      .trim() || 'untitled_song';

    pdf.save(`${cleanTitle}.pdf`);
  } finally {
    document.body.removeChild(container);
  }
};
