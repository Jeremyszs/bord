import { create } from 'zustand';

export interface TimeSignature {
  beatsPerBar: number;
  beatValue: number;
}

interface MetronomeState {
  isPlaying: boolean;
  bpm: number;
  timeSignature: TimeSignature;
  currentBeat: number; // 0-indexed, up to beatsPerBar - 1
  togglePlay: () => void;
  setBpm: (bpm: number) => void;
  setTimeSignature: (sig: TimeSignature) => void;
  setCurrentBeat: (beat: number) => void;
  stop: () => void;
}

export const useMetronomeStore = create<MetronomeState>((set) => ({
  isPlaying: false,
  bpm: 120,
  timeSignature: { beatsPerBar: 4, beatValue: 4 },
  currentBeat: 0,

  togglePlay: () => set((state) => ({ isPlaying: !state.isPlaying })),
  setBpm: (bpm) => set({ bpm: Math.max(40, Math.min(250, bpm)) }),
  setTimeSignature: (timeSignature) => set({ timeSignature, currentBeat: 0 }),
  setCurrentBeat: (beat) => set({ currentBeat: beat }),
  stop: () => set({ isPlaying: false, currentBeat: 0 }),
}));
