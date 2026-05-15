import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { Note, Chord } from 'tonal';

export interface WindowRect {
  x: number;
  y: number;
  width: number;
  height: number;
}

interface MidiState {
  isMidiEnabled: boolean;
  showPianoDisplay: boolean;
  /** All currently held notes (hardware MIDI + virtual keyboard combined) */
  activeNotes: Set<number>;
  detectedChord: string;
  windowRect: WindowRect;
  toggleMidi: () => void;
  /** Called by the hardware MIDI hook */
  setHardwareNotes: (notes: Set<number>) => void;
  /** Called by the virtual piano keyboard */
  pressVirtualNote: (midi: number) => void;
  releaseVirtualNote: (midi: number) => void;
  releaseAllVirtualNotes: () => void;
  setWindowRect: (rect: Partial<WindowRect>) => void;
  closePianoDisplay: () => void;
  // Internal — not persisted, not serialized
  _hardwareNotes: Set<number>;
  _virtualNotes: Set<number>;
}

/** Recompute activeNotes + detectedChord from the union of both note sets */
function computeChord(
  hardware: Set<number>,
  virtual_: Set<number>
): { activeNotes: Set<number>; detectedChord: string } {
  const combined = new Set([...hardware, ...virtual_]);
  const noteNames = Array.from(combined)
    .sort((a, b) => a - b)
    .map((m) => Note.fromMidi(m))
    .filter(Boolean) as string[];
  const detected = Chord.detect(noteNames);
  return {
    activeNotes: combined,
    detectedChord: detected[0] ?? (noteNames.length > 0 ? noteNames.join(' ') : ''),
  };
}

// BUG FIX #1: Compute default rect only in browser; fall back to safe static values for SSR
function getDefaultRect(): WindowRect {
  if (typeof window === 'undefined') {
    return { x: 100, y: 80, width: 560, height: 240 };
  }
  return {
    x: Math.max(0, window.innerWidth - 560 - 24),
    y: 80,
    width: 560,
    height: 240,
  };
}

export const useMidiStore = create<MidiState>()(
  persist(
    (set, get) => ({
      isMidiEnabled: false,
      showPianoDisplay: false,
      // BUG FIX #4: Sets are not JSON-serializable — keep them as transient runtime
      // state only (not persisted). They are always re-initialized to empty Sets.
      activeNotes: new Set<number>(),
      detectedChord: '',
      windowRect: getDefaultRect(),
      _hardwareNotes: new Set<number>(),
      _virtualNotes: new Set<number>(),

      toggleMidi: () =>
        set((state) => ({
          isMidiEnabled: !state.isMidiEnabled,
          showPianoDisplay: !state.isMidiEnabled,
        })),

      setHardwareNotes: (notes) => {
        const { _virtualNotes } = get();
        set({ _hardwareNotes: notes, ...computeChord(notes, _virtualNotes) });
      },

      pressVirtualNote: (midi) => {
        const { _hardwareNotes, _virtualNotes } = get();
        const next = new Set(_virtualNotes);
        next.add(midi);
        set({ _virtualNotes: next, ...computeChord(_hardwareNotes, next) });
      },

      releaseVirtualNote: (midi) => {
        const { _hardwareNotes, _virtualNotes } = get();
        const next = new Set(_virtualNotes);
        next.delete(midi);
        set({ _virtualNotes: next, ...computeChord(_hardwareNotes, next) });
      },

      releaseAllVirtualNotes: () => {
        const { _hardwareNotes } = get();
        const empty = new Set<number>();
        set({ _virtualNotes: empty, ...computeChord(_hardwareNotes, empty) });
      },

      setWindowRect: (rect) =>
        set((state) => ({ windowRect: { ...state.windowRect, ...rect } })),

      closePianoDisplay: () =>
        set({
          showPianoDisplay: false,
          isMidiEnabled: false,
          detectedChord: '',
          activeNotes: new Set(),
          _hardwareNotes: new Set(),
          _virtualNotes: new Set(),
        }),
    }),
    {
      name: 'midi-storage',
      // BUG FIX #4: Only persist plain-JSON-serializable values.
      // Sets (activeNotes, _hardwareNotes, _virtualNotes) are intentionally excluded.
      partialize: (state) => ({
        windowRect: state.windowRect,
      }),
    }
  )
);
