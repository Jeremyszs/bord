'use client';

import React, { useCallback, useMemo } from 'react';
import { Rnd } from 'react-rnd';
import { X, Music2, Info } from 'lucide-react';
import { useMidiStore } from '@/store/midiStore';

// ─── Full 88-Key Piano Layout ──────────────────────────────────────────────────
const START_MIDI = 21;  // A0
const END_MIDI = 108;   // C8

const BLACK_OFFSETS = new Set([1, 3, 6, 8, 10]);

const WHITE_KEY_WIDTH = 24;
const BLACK_KEY_WIDTH = 15;
const BLACK_KEY_HEIGHT_RATIO = 0.62;

interface KeyInfo {
  midi: number;
  isBlack: boolean;
}

function buildKeys(start: number, end: number): KeyInfo[] {
  const keys: KeyInfo[] = [];
  for (let m = start; m <= end; m++) {
    keys.push({ midi: m, isBlack: BLACK_OFFSETS.has(m % 12) });
  }
  return keys;
}

function midiToName(midi: number): string {
  const names = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];
  const octave = Math.floor(midi / 12) - 1;
  return `${names[midi % 12]}${octave}`;
}

function VisualPiano({
  activeNotes,
  onNotePress,
  onNoteRelease,
  onReleaseAll,
}: {
  activeNotes: Set<number>;
  onNotePress: (midi: number) => void;
  onNoteRelease: (midi: number) => void;
  onReleaseAll: () => void;
}) {
  const keys = useMemo(() => buildKeys(START_MIDI, END_MIDI), []);
  const whiteKeys = useMemo(() => keys.filter((k) => !k.isBlack), [keys]);

  const layout = useMemo(() => {
    const whitePositions = new Map<number, number>();
    const blackPositions = new Map<number, number>();
    let wx = 0;
    keys.forEach((k) => {
      if (!k.isBlack) {
        whitePositions.set(k.midi, wx);
        wx += WHITE_KEY_WIDTH;
      } else {
        blackPositions.set(k.midi, wx - BLACK_KEY_WIDTH / 2);
      }
    });
    return { whitePositions, blackPositions, totalWidth: wx };
  }, [keys]);

  const handlePointerDown = useCallback(
    (midi: number, e: React.PointerEvent) => {
      e.preventDefault();
      e.currentTarget.setPointerCapture(e.pointerId);
      onNotePress(midi);
    },
    [onNotePress]
  );

  const handlePointerUp = useCallback(
    (midi: number, e: React.PointerEvent) => {
      e.preventDefault();
      onNoteRelease(midi);
    },
    [onNoteRelease]
  );

  const scrollRef = useCallback((node: HTMLDivElement | null) => {
    if (!node) return;
    const c4Left = layout.whitePositions.get(60) ?? 0;
    const viewWidth = node.clientWidth;
    node.scrollLeft = Math.max(0, c4Left - viewWidth / 2);
  }, [layout.whitePositions]);

  return (
    <div
      ref={scrollRef}
      className="overflow-x-auto overflow-y-hidden h-full"
      style={{ WebkitOverflowScrolling: 'touch', scrollbarWidth: 'thin' }}
      onMouseLeave={onReleaseAll}
    >
      <div
        className="relative shrink-0"
        style={{ width: layout.totalWidth, height: '100%', userSelect: 'none' }}
      >
        {whiteKeys.map((k) => {
          const left = layout.whitePositions.get(k.midi)!;
          const active = activeNotes.has(k.midi);
          const isC = k.midi % 12 === 0;
          return (
            <div
              key={k.midi}
              title={midiToName(k.midi)}
              className={`absolute top-0 rounded-b-md border cursor-pointer select-none ${
                active
                  ? 'shadow-inner'
                  : 'hover:bg-blue-50'
              }`}
              style={{
                left,
                width: WHITE_KEY_WIDTH - 1,
                height: '100%',
                zIndex: 1,
                transition: 'none',
                backgroundColor: active ? 'var(--accent)' : 'var(--piano-white)',
                borderColor: active ? 'var(--accent)' : 'var(--border-subtle)',
              }}
              onPointerDown={(e) => handlePointerDown(k.midi, e)}
              onPointerUp={(e) => handlePointerUp(k.midi, e)}
            >
              {isC && (
                <span
                  className={`absolute bottom-1 left-0 right-0 text-center text-[7px] font-medium pointer-events-none ${
                    active ? 'text-white/70' : ''
                  }`}
                  style={{ color: active ? 'rgba(255,255,255,0.7)' : 'var(--text-muted)' }}
                >
                  {midiToName(k.midi)}
                </span>
              )}
            </div>
          );
        })}

        {keys
          .filter((k) => k.isBlack)
          .map((k) => {
            const left = layout.blackPositions.get(k.midi)!;
            const active = activeNotes.has(k.midi);
            return (
              <div
                key={k.midi}
                title={midiToName(k.midi)}
                className={`absolute top-0 rounded-b cursor-pointer select-none ${
                  active ? '' : 'hover:opacity-80'
                }`}
                style={{
                  left,
                  width: BLACK_KEY_WIDTH,
                  height: `${BLACK_KEY_HEIGHT_RATIO * 100}%`,
                  zIndex: 2,
                  transition: 'none',
                  backgroundColor: active ? 'var(--accent)' : 'var(--piano-black)',
                }}
                onPointerDown={(e) => handlePointerDown(k.midi, e)}
                onPointerUp={(e) => handlePointerUp(k.midi, e)}
              />
            );
          })}
      </div>
    </div>
  );
}

// ─── Floating Window ───────────────────────────────────────────────────────────
export default function MidiPianoWindow() {
  const showPianoDisplay = useMidiStore((s) => s.showPianoDisplay);
  const isMidiEnabled = useMidiStore((s) => s.isMidiEnabled);
  const activeNotes = useMidiStore((s) => s.activeNotes);
  const detectedChord = useMidiStore((s) => s.detectedChord);
  const windowRect = useMidiStore((s) => s.windowRect);
  const setWindowRect = useMidiStore((s) => s.setWindowRect);
  const closePianoDisplay = useMidiStore((s) => s.closePianoDisplay);
  const pressVirtualNote = useMidiStore((s) => s.pressVirtualNote);
  const releaseVirtualNote = useMidiStore((s) => s.releaseVirtualNote);
  const releaseAllVirtualNotes = useMidiStore((s) => s.releaseAllVirtualNotes);

  const handleDragStop = useCallback(
    (_e: unknown, d: { x: number; y: number }) => {
      setWindowRect({ x: d.x, y: d.y });
    },
    [setWindowRect]
  );

  const handleResizeStop = useCallback(
    (_e: unknown, _dir: unknown, ref: HTMLElement, _delta: unknown, pos: { x: number; y: number }) => {
      setWindowRect({
        width: parseInt(ref.style.width),
        height: parseInt(ref.style.height),
        x: pos.x,
        y: pos.y,
      });
    },
    [setWindowRect]
  );

  const hasMidi = typeof navigator !== 'undefined' && 'requestMIDIAccess' in navigator;

  if (!showPianoDisplay) return null;

  return (
    <div style={{ position: 'fixed', inset: 0, pointerEvents: 'none', zIndex: 9999 }}>
      <Rnd
        position={{ x: windowRect.x, y: windowRect.y }}
        size={{ width: windowRect.width, height: windowRect.height }}
        minWidth={380}
        minHeight={180}
        maxWidth={1200}
        maxHeight={480}
        bounds="window"
        dragHandleClassName="midi-drag-handle"
        enableResizing={{
          top: true, right: true, bottom: true, left: true,
          topRight: true, bottomRight: true, bottomLeft: true, topLeft: true,
        }}
        onDragStop={handleDragStop}
        onResizeStop={handleResizeStop}
        style={{ pointerEvents: 'auto' }}
      >
        <div
          className="flex flex-col w-full h-full rounded-2xl overflow-hidden border shadow-2xl"
          style={{
            backgroundColor: 'var(--bg-overlay)',
            borderColor: 'var(--border-subtle)',
            backdropFilter: 'blur(24px)',
            WebkitBackdropFilter: 'blur(24px)',
            containerType: 'inline-size',
          }}
        >
          {/* ── Title Bar ── */}
          <div className="midi-drag-handle flex items-center justify-between px-4 py-2 border-b cursor-grab active:cursor-grabbing select-none shrink-0"
            style={{ backgroundColor: 'var(--bg-overlay)', borderColor: 'var(--border-subtle)' }}>
            <div className="flex items-center gap-2">
              <Music2 size={13} style={{ color: 'var(--accent)' }} />
              <span className="text-xs font-semibold tracking-widest uppercase" style={{ color: 'var(--text-secondary)' }}>
                MIDI Detector
              </span>
              <span
                className={`inline-flex items-center gap-1 text-[10px] font-medium px-1.5 py-0.5 rounded-full ${
                  isMidiEnabled && hasMidi
                    ? 'text-green-600'
                    : ''
                }`}
                style={{
                  backgroundColor: isMidiEnabled && hasMidi ? 'var(--green-bg)' : 'var(--bg-elevated)',
                  color: isMidiEnabled && hasMidi ? 'var(--green)' : 'var(--text-muted)',
                }}
              >
                <span
                  className={`w-1.5 h-1.5 rounded-full`}
                  style={{
                    backgroundColor: isMidiEnabled && hasMidi ? 'var(--green)' : 'var(--text-muted)',
                  }}
                />
                {isMidiEnabled && hasMidi ? 'HW Connected' : 'Virtual'}
              </span>
            </div>
            <button
              onClick={closePianoDisplay}
              className="flex items-center justify-center w-5 h-5 rounded-full hover:bg-red-100 transition-colors"
              style={{ touchAction: 'manipulation', color: 'var(--text-muted)' }}
              title="Close"
            >
              <X size={12} />
            </button>
          </div>

          {/* ── Info banners ── */}
          {!hasMidi && (
            <div className="flex items-center gap-1.5 px-3 py-1 border-b text-[10px] font-medium shrink-0"
              style={{
                backgroundColor: 'var(--amber-bg)',
                borderColor: 'var(--amber-border)',
                color: '#d97706',
              }}>
              <Info size={10} />
              Web MIDI not supported in this browser. Using virtual keyboard only.
            </div>
          )}
          {hasMidi && !isMidiEnabled && (
            <div className="flex items-center gap-1.5 px-3 py-1 border-b text-[10px] font-medium shrink-0"
              style={{
                backgroundColor: 'var(--accent-bg)',
                borderColor: 'var(--border-subtle)',
                color: 'var(--accent)',
              }}>
              <Info size={10} />
              Click keys to test chords. Plug in a MIDI controller and re-enable for hardware input.
            </div>
          )}

          {/* ── Chord Display ── */}
          <div
            className="flex items-center justify-center px-4 shrink-0 border-b"
            style={{ minHeight: 52, backgroundColor: 'var(--bg-overlay)', borderColor: 'var(--border-subtle)' }}
          >
            {detectedChord ? (
              <span
                className="font-black leading-none"
                style={{
                  color: 'var(--accent)',
                  fontFamily: '"SF Mono", "JetBrains Mono", "Fira Code", Menlo, monospace',
                  fontSize: 'clamp(22px, 5cqw, 42px)',
                  letterSpacing: '-0.03em',
                }}
              >
                {detectedChord}
              </span>
            ) : (
              <span className="text-sm font-medium" style={{ color: 'var(--text-muted)' }}>
                Click keys or play on your MIDI controller…
              </span>
            )}
          </div>

          {/* ── Piano Keys ── */}
          <div className="flex-1 px-3 py-3 min-h-0" style={{ backgroundColor: 'var(--bg-elevated)' }}>
            <div className="h-full rounded-xl overflow-hidden border shadow-inner"
              style={{ backgroundColor: 'var(--bg-elevated)', borderColor: 'var(--border-subtle)' }}>
              <div className="h-full p-2">
                <VisualPiano
                  activeNotes={activeNotes}
                  onNotePress={pressVirtualNote}
                  onNoteRelease={releaseVirtualNote}
                  onReleaseAll={releaseAllVirtualNotes}
                />
              </div>
            </div>
          </div>

          {/* ── Footer ── */}
          <div className="flex items-center justify-between px-4 py-1.5 border-t shrink-0"
            style={{
              backgroundColor: 'var(--bg-overlay)',
              borderColor: 'var(--border-subtle)',
            }}>
            <span className="text-[10px]" style={{ color: 'var(--text-muted)' }}>
              Full 88-key piano · A0 – C8 · Scroll to navigate
            </span>
            <span className="text-[10px]" style={{ color: 'var(--text-muted)' }}>
              Chord detection: all 128 MIDI notes
            </span>
          </div>
        </div>
      </Rnd>
    </div>
  );
}
