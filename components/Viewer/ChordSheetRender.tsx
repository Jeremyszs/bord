'use client';

import React, { useMemo } from 'react';
import { useViewerStore, SonglistItem } from '@/store/viewerStore';
import { transposeChord, convertToNNS, CHROMATIC_SCALE } from '@/lib/music-engine';
import { Minus, Plus, X, ChevronUp, ChevronDown } from 'lucide-react';

// ── Types ─────────────────────────────────────────────────────────────────────

interface Token {
  chord: string;
  lyric: string;
}

type DisplayLine = Token[];

// ── Chord detector ────────────────────────────────────────────────────────────

const CHORD_TOKEN_RE = /^[A-G][#b]?(m(?:aj)?|min|dim|aug|sus[24]?|add\d*|M|maj\d*|\d+[^\s/]*)?(\/.+)?$/

function isChord(token: string): boolean {
  return CHORD_TOKEN_RE.test(token.trim());
}

function isChordLine(line: string): boolean {
  const tokens = line.trim().split(/\s+/).filter(Boolean);
  return tokens.length > 0 && tokens.every(t => isChord(t));
}

// ── Current Key calculator ────────────────────────────────────────────────────

const FLAT_TO_SHARP: Record<string, string> = {
  Db: 'C#', Eb: 'D#', Fb: 'E', Gb: 'F#', Ab: 'G#', Bb: 'A#', Cb: 'B',
};

const FLAT_PREFERENCE_KEYS = new Set(['F', 'Bb', 'Eb', 'Ab', 'Db', 'Gb']);
const SHARP_TO_FLAT_DISPLAY: Record<string, string> = {
  'C#': 'Db', 'D#': 'Eb', 'F#': 'Gb', 'G#': 'Ab', 'A#': 'Bb',
};

function getCurrentKey(song: SonglistItem): string | null {
  if (!song.originalKey) return null;
  const normalized = FLAT_TO_SHARP[song.originalKey] ?? song.originalKey;
  const idx = CHROMATIC_SCALE.indexOf(normalized);
  if (idx === -1) return song.originalKey;
  const newIdx = (idx + song.transposeSteps + 1200) % 12;
  const rawKey = CHROMATIC_SCALE[newIdx];
  // Use flat spelling if original key was flat OR if target key conventionally uses flats
  const flatVersion = SHARP_TO_FLAT_DISPLAY[rawKey];
  if (flatVersion) {
    // Keep flat if the original key was a flat key, or if the resulting key is a flat preference key
    const originalWasFlat = song.originalKey in FLAT_TO_SHARP || FLAT_PREFERENCE_KEYS.has(song.originalKey);
    if (originalWasFlat || FLAT_PREFERENCE_KEYS.has(flatVersion)) {
      return flatVersion;
    }
  }
  return rawKey;
}

// ── Parser ────────────────────────────────────────────────────────────────────

interface ParsedLine {
  type: 'tokens' | 'chord-over-lyric' | 'plain' | 'spacer';
  tokens?: Token[];
  chords?: string[];
  lyric?: string;
}

function parseRawContent(raw: string): ParsedLine[] {
  const lines = raw.split('\n');
  const result: ParsedLine[] = [];
  let i = 0;

  while (i < lines.length) {
    const line = lines[i];

    if (line.includes('[') && line.includes(']')) {
      const tokens: Token[] = [];
      const parts = line.split(/(?=\[)/);
      for (const part of parts) {
        const m = part.match(/^\[([^\]]+)\](.*)$/);
        if (m) {
          tokens.push({ chord: m[1].trim(), lyric: m[2] });
        } else if (part) {
          if (tokens.length === 0) {
            tokens.push({ chord: '', lyric: part });
          } else {
            tokens[tokens.length - 1].lyric += part;
          }
        }
      }
      result.push({ type: 'tokens', tokens });
      i++;
      continue;
    }

    if (isChordLine(line) && i + 1 < lines.length) {
      const chords = line.trim().split(/\s+/).filter(Boolean);
      const lyric = lines[i + 1] ?? '';
      result.push({ type: 'chord-over-lyric', chords, lyric });
      i += 2;
      continue;
    }

    if (line.trim()) {
      result.push({ type: 'plain', lyric: line });
    } else {
      result.push({ type: 'spacer' });
    }
    i++;
  }

  return result;
}

// ── Component ─────────────────────────────────────────────────────────────────

export default function ChordSheetRender({ song, index, total }: { song: SonglistItem; index: number; total: number }) {
  const { isNNSActive, setSongTranspose, removeSong, reorderSongs } = useViewerStore();

  const parsedLines = useMemo<ParsedLine[]>(() => {
    if (!song?.rawContent) return [];
    return parseRawContent(song.rawContent);
  }, [song?.rawContent]);

  function displayChord(raw: string): string {
    if (!raw) return '';
    const currentKey = getCurrentKey(song);
    // BUG FIX #5: NNS must use the *current* (post-transpose) key as the tonic,
    // not the originalKey. E.g. if song is in G and transposed +2 → A, NNS "1"
    // must map to A, not G.
    if (isNNSActive && currentKey) {
      // First transpose the raw chord to the current key, then convert to NNS
      const transposed = song.transposeSteps !== 0
        ? transposeChord(raw, song.transposeSteps)
        : raw;
      return convertToNNS(transposed, currentKey);
    }
    if (song.transposeSteps !== 0) {
      return transposeChord(raw, song.transposeSteps);
    }
    return raw;
  }

  const artistDisplay = song.artist.length > 60
    ? song.artist.slice(0, 57) + '…'
    : song.artist;

  const currentKey = getCurrentKey(song);

  return (
    <div className="w-full relative p-5 sm:p-8 md:p-12 bg-white">
      {/* ── Header ────────────────────────────────────────────────────────── */}
      <div className="mb-6 sm:mb-8 pb-4 sm:pb-6 text-center font-mono relative z-10 border-b"
        style={{ borderColor: '#f3f4f6' }}>
        
        {/* Reorder + Remove controls */}
        <div className="absolute left-0 top-0 flex flex-col gap-0.5">
          {index > 0 && (
            <button
              onClick={() => reorderSongs(index, index - 1)}
              style={{ touchAction: 'manipulation' }}
              className="p-2 text-gray-300 hover:text-[#007AFF] hover:bg-blue-50 rounded-full transition-colors active:scale-90"
              title="Move Up"
            >
              <ChevronUp size={14} />
            </button>
          )}
          {index < total - 1 && (
            <button
              onClick={() => reorderSongs(index, index + 1)}
              style={{ touchAction: 'manipulation' }}
              className="p-2 text-gray-300 hover:text-[#007AFF] hover:bg-blue-50 rounded-full transition-colors active:scale-90"
              title="Move Down"
            >
              <ChevronDown size={14} />
            </button>
          )}
        </div>

        <button 
          onClick={() => removeSong(song.listId)}
          style={{ touchAction: 'manipulation' }}
          className="absolute right-0 top-0 p-2 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-full transition-colors active:scale-90"
          title="Remove Song"
        >
          <X size={18} />
        </button>

        <h1 className="text-2xl sm:text-3xl md:text-4xl font-bold mb-1 text-black px-8">
          {song.title}
        </h1>
        <p className="text-xs sm:text-sm mb-3 sm:mb-4 text-gray-500">{artistDisplay}</p>
        
        {/* Transpose Controls + Current Key Display */}
        <div className="flex items-center justify-center gap-2 sm:gap-3 flex-wrap">
          <div className="flex items-center bg-gray-50 border border-gray-200 rounded-full overflow-hidden shadow-sm">
            <button 
              onClick={() => setSongTranspose(song.listId, s => s - 1)}
              style={{ touchAction: 'manipulation' }}
              className="p-2.5 hover:bg-gray-200 text-gray-600 transition-colors active:bg-gray-300"
            >
              <Minus size={13} />
            </button>
            <span className="px-2 text-xs font-bold w-10 text-center text-blue-600">
              {song.transposeSteps !== 0 ? (song.transposeSteps > 0 ? `+${song.transposeSteps}` : song.transposeSteps) : 'Key'}
            </span>
            <button 
              onClick={() => setSongTranspose(song.listId, s => s + 1)}
              style={{ touchAction: 'manipulation' }}
              className="p-2.5 hover:bg-gray-200 text-gray-600 transition-colors active:bg-gray-300"
            >
              <Plus size={13} />
            </button>
          </div>
          
          {/* Current Key Badge */}
          {currentKey && (
            <span
              className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold"
              style={{ backgroundColor: '#f0f7ff', color: '#007AFF' }}
            >
              <span style={{ opacity: 0.6 }}>Key</span> {currentKey}
              {song.transposeSteps !== 0 && (
                <span style={{ opacity: 0.5, fontSize: '10px' }}>({song.originalKey}→)</span>
              )}
            </span>
          )}

          {isNNSActive && (
            <span className="inline-block px-2.5 py-1 rounded-full text-xs font-bold"
              style={{ backgroundColor: '#f5f0ff', color: '#5856D6' }}>
              NNS
            </span>
          )}
        </div>
      </div>

      {/* ── Sheet body ────────────────────────────────────────────────────── */}
      <div className="font-mono text-xs sm:text-sm md:text-base relative z-10 text-black overflow-x-auto">
        {parsedLines.map((line, li) => {

          if (line.type === 'spacer') {
            return <div key={`sp-${li}`} style={{ height: '0.8em' }} />;
          }

          if (line.type === 'tokens' && line.tokens) {
            const hasChords = line.tokens.some(t => t.chord);
            return (
              <div key={`tl-${li}`} className="mb-1">
                {hasChords && (
                  <div className="flex flex-row flex-nowrap leading-tight">
                    {line.tokens.map((t, ti) => {
                      const chord = displayChord(t.chord);
                      const minW = Math.max(chord.length, t.lyric.length) + 1;
                      return (
                        <span key={`c-${li}-${ti}`}
                          className="font-bold whitespace-pre flex-shrink-0"
                          style={{ color: chord ? '#007AFF' : 'transparent', minWidth: `${minW}ch` }}>
                          {chord || ' '}
                        </span>
                      );
                    })}
                  </div>
                )}
                <div className="flex flex-row flex-nowrap leading-snug">
                  {line.tokens.map((t, ti) => {
                    const chord = displayChord(t.chord);
                    const minW = Math.max(chord.length, t.lyric.length) + 1;
                    return (
                      <span key={`l-${li}-${ti}`}
                        className="whitespace-pre flex-shrink-0"
                        style={{ color: '#000000', minWidth: `${minW}ch` }}>
                        {t.lyric || (chord ? ' ' : '')}
                      </span>
                    );
                  })}
                </div>
              </div>
            );
          }

          if (line.type === 'chord-over-lyric' && line.chords) {
            return (
              <div key={`col-${li}`} className="mb-1">
                <div className="leading-tight font-bold whitespace-pre-wrap text-blue-500">
                  {line.chords.map((c, ci) => displayChord(c)).join('    ')}
                </div>
                <div className="leading-snug whitespace-pre-wrap text-black">
                  {line.lyric}
                </div>
              </div>
            );
          }

          if (line.type === 'plain') {
            return (
              <div key={`pl-${li}`}
                className="leading-snug mb-1 whitespace-pre-wrap text-gray-700">
                {line.lyric}
              </div>
            );
          }

          return null;
        })}
      </div>
    </div>
  );
}
