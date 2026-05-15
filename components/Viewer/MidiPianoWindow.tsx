'use client';

import React, { useCallback, useMemo } from 'react';
import { Rnd } from 'react-rnd';
import { X, Music2, Info } from 'lucide-react';
import { useMidiStore } from '@/store/midiStore';

// ─── Full 88-Key Piano Layout ──────────────────────────────────────────────────
// Standard 88-key piano: A0 (MIDI 21) → C8 (MIDI 108)
const START_MIDI = 21;  // A0
const END_MIDI = 108;   // C8

const BLACK_OFFSETS = new Set([1, 3, 6, 8, 10]); // C#, D#, F#, G#, A#

// Fixed pixel widths — narrow enough to show useful range, wide enough to click
const WHITE_KEY_WIDTH = 24; // px
const BLACK_KEY_WIDTH = 15; // px
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

// ─── Clickable Virtual Piano ───────────────────────────────────────────────────
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

  // Scroll the piano to show the C4 area on mount (middle of keyboard)
  const scrollRef = useCallback((node: HTMLDivElement | null) => {
    if (!node) return;
    // C4 = MIDI 60; white key index among A0..C4 ≈ position to center
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
        {/* White keys */}
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
                  ? 'bg-[#007AFF] border-[#0055cc] shadow-inner'
                  : 'bg-white border-gray-300 hover:bg-blue-50'
              }`}
              style={{
                left,
                width: WHITE_KEY_WIDTH - 1,
                height: '100%',
                zIndex: 1,
                transition: 'none',
              }}
              onPointerDown={(e) => handlePointerDown(k.midi, e)}
              onPointerUp={(e) => handlePointerUp(k.midi, e)}
            >
              {isC && (
                <span
                  className={`absolute bottom-1 left-0 right-0 text-center text-[7px] font-medium pointer-events-none ${
                    active ? 'text-white/70' : 'text-gray-300'
                  }`}
                >
                  {midiToName(k.midi)}
                </span>
              )}
            </div>
          );
        })}

        {/* Black keys */}
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
                  active ? 'bg-[#007AFF]' : 'bg-[#1c1c1e] hover:bg-gray-700'
                }`}
                style={{
                  left,
                  width: BLACK_KEY_WIDTH,
                  height: `${BLACK_KEY_HEIGHT_RATIO * 100}%`,
                  zIndex: 2,
                  transition: 'none',
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
    (
      _e: unknown,
      _dir: unknown,
      ref: HTMLElement,
      _delta: unknown,
      pos: { x: number; y: number }
    ) => {
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
    // BUG FIX #2: Use `position` prop (not `default`) so the window respects
    // the persisted windowRect on every open, not just the first mount.
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
      style={{ zIndex: 9999 }}
    >
      <div
        className="flex flex-col w-full h-full rounded-2xl overflow-hidden border border-gray-200/80 shadow-2xl"
        style={{
          background: 'rgba(255,255,255,0.96)',
          backdropFilter: 'blur(24px)',
          WebkitBackdropFilter: 'blur(24px)',
          // BUG FIX #3: Set container-type so cqw units work for chord font-size
          containerType: 'inline-size',
        }}
      >
        {/* ── Title Bar ── */}
        <div className="midi-drag-handle flex items-center justify-between px-4 py-2 bg-white/80 border-b border-gray-100 cursor-grab active:cursor-grabbing select-none shrink-0">
          <div className="flex items-center gap-2">
            <Music2 size={13} className="text-[#007AFF]" />
            <span className="text-xs font-semibold text-gray-600 tracking-widest uppercase">
              MIDI Detector
            </span>
            <span
              className={`inline-flex items-center gap-1 text-[10px] font-medium px-1.5 py-0.5 rounded-full ${
                isMidiEnabled && hasMidi
                  ? 'bg-green-50 text-green-600'
                  : 'bg-gray-100 text-gray-400'
              }`}
            >
              <span
                className={`w-1.5 h-1.5 rounded-full ${
                  isMidiEnabled && hasMidi ? 'bg-green-500' : 'bg-gray-300'
                }`}
              />
              {isMidiEnabled && hasMidi ? 'HW Connected' : 'Virtual'}
            </span>
          </div>
          <button
            onClick={closePianoDisplay}
            className="flex items-center justify-center w-5 h-5 rounded-full hover:bg-red-100 text-gray-400 hover:text-red-500 transition-colors"
            style={{ touchAction: 'manipulation' }}
            title="Close"
          >
            <X size={12} />
          </button>
        </div>

        {/* ── Info banners ── */}
        {!hasMidi && (
          <div className="flex items-center gap-1.5 px-3 py-1 bg-amber-50 border-b border-amber-100 text-[10px] text-amber-600 font-medium shrink-0">
            <Info size={10} />
            Web MIDI not supported in this browser. Using virtual keyboard only.
          </div>
        )}
        {hasMidi && !isMidiEnabled && (
          <div className="flex items-center gap-1.5 px-3 py-1 bg-blue-50 border-b border-blue-100 text-[10px] text-blue-500 font-medium shrink-0">
            <Info size={10} />
            Click keys to test chords. Plug in a MIDI controller and re-enable for hardware input.
          </div>
        )}

        {/* ── Chord Display ── */}
        <div
          className="flex items-center justify-center px-4 shrink-0 border-b border-gray-100 bg-white/50"
          style={{ minHeight: 52 }}
        >
          {detectedChord ? (
            <span
              className="font-black text-[#007AFF] leading-none"
              style={{
                fontFamily: '"SF Mono", "JetBrains Mono", "Fira Code", Menlo, monospace',
                // BUG FIX #3: Fall back to clamp with vw since cqw requires container-type
                fontSize: 'clamp(22px, 5cqw, 42px)',
                letterSpacing: '-0.03em',
              }}
            >
              {detectedChord}
            </span>
          ) : (
            <span className="text-sm text-gray-300 font-medium">
              Click keys or play on your MIDI controller…
            </span>
          )}
        </div>

        {/* ── Piano Keys ── */}
        <div className="flex-1 px-3 py-3 min-h-0 bg-gray-50/50">
          <div className="h-full rounded-xl overflow-hidden border border-gray-200 bg-gray-100 shadow-inner">
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
        <div className="flex items-center justify-between px-4 py-1.5 border-t border-gray-100 bg-white/60 shrink-0">
          <span className="text-[10px] text-gray-400">
            Full 88-key piano · A0 – C8 · Scroll to navigate
          </span>
          <span className="text-[10px] text-gray-400">
            Chord detection: all 128 MIDI notes
          </span>
        </div>
      </div>
    </Rnd>
  );
}
