'use client';

import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useMetronomeStore } from '@/store/metronomeStore';
import { Play, Pause } from 'lucide-react';
import Slider from '@/components/UI/Slider';

export default function MetronomePanel({ isVisible }: { isVisible: boolean }) {
  const {
    isPlaying,
    bpm,
    timeSignature,
    currentBeat,
    togglePlay,
    setBpm,
    setTimeSignature,
  } = useMetronomeStore();

  const handleTimeSigChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const val = e.target.value;
    const [beatsPerBar, beatValue] = val.split('/').map(Number);
    setTimeSignature({ beatsPerBar, beatValue });
  };

  const tapTimesRef = React.useRef<number[]>([]);

  const handleTap = () => {
    const now = performance.now();
    const tapTimes = tapTimesRef.current;
    if (tapTimes.length > 0 && now - tapTimes[tapTimes.length - 1] > 2000) {
      tapTimes.length = 0;
    }
    tapTimes.push(now);
    if (tapTimes.length > 4) {
      tapTimes.shift();
    }
    if (tapTimes.length >= 2) {
      let totalInterval = 0;
      for (let i = 1; i < tapTimes.length; i++) {
        totalInterval += (tapTimes[i] - tapTimes[i - 1]);
      }
      const averageInterval = totalInterval / (tapTimes.length - 1);
      const calculatedBpm = Math.round(60000 / averageInterval);
      setBpm(Math.max(40, Math.min(250, calculatedBpm)));
    }
  };

  return (
    <AnimatePresence>
      {isVisible && (
        <motion.div
          initial={{ opacity: 0, y: 8, scale: 0.95 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: 8, scale: 0.95 }}
          className="w-full max-w-sm backdrop-blur-md border rounded-2xl shadow-xl p-4 mb-2"
          style={{
            backgroundColor: 'var(--bg-overlay)',
            borderColor: 'var(--border-subtle)',
          }}
        >
          <div className="flex items-center justify-between mb-4">
            <span className="text-xs font-semibold uppercase tracking-wider" style={{ color: 'var(--text-muted)' }}>
              Metronome
            </span>
            <div className="flex items-center gap-3">
              <select
                value={`${timeSignature.beatsPerBar}/${timeSignature.beatValue}`}
                onChange={handleTimeSigChange}
                className="text-xs font-bold rounded-lg px-2 py-1 outline-none appearance-none cursor-pointer border transition-colors"
                style={{
                  backgroundColor: 'var(--bg-elevated)',
                  color: 'var(--text-primary)',
                  borderColor: 'transparent',
                }}
              >
                <option value="2/4">2/4</option>
                <option value="3/4">3/4</option>
                <option value="4/4">4/4</option>
                <option value="6/8">6/8</option>
              </select>

              <span className="text-sm font-black w-12 text-right" style={{ color: 'var(--accent)' }}>
                {bpm} <span className="text-[10px] font-semibold" style={{ color: 'var(--text-muted)' }}>BPM</span>
              </span>
            </div>
          </div>

          <div className="flex items-center gap-3 mb-5">
            <button
              onClick={togglePlay}
              className={`flex items-center justify-center w-12 h-12 rounded-full shrink-0 active:scale-90`}
              style={{
                backgroundColor: isPlaying ? 'var(--accent)' : 'var(--btn-bg)',
                color: isPlaying ? 'white' : 'var(--btn-text)',
                border: isPlaying ? 'none' : '1px solid var(--btn-border)',
                boxShadow: isPlaying ? '0 4px 12px var(--accent-glow)' : 'none',
              }}
            >
              {isPlaying ? <Pause size={20} /> : <Play size={20} className="ml-1" />}
            </button>
            <div className="flex-1 px-1">
              <Slider min={40} max={250} value={bpm} onChange={setBpm} />
            </div>
            <button
              onClick={handleTap}
              className="flex items-center justify-center h-10 px-3.5 rounded-xl font-bold text-[10px] uppercase tracking-widest active:scale-95 shrink-0 transition-all border"
              style={{
                backgroundColor: 'var(--btn-bg)',
                color: 'var(--btn-text)',
                borderColor: 'var(--btn-border)',
              }}
            >
              Tap
            </button>
          </div>

          {/* Visual Flash Indicator */}
          <div className="flex items-center justify-center gap-2 h-4">
            {Array.from({ length: timeSignature.beatsPerBar }).map((_, i) => {
              const isActive = isPlaying && currentBeat === i;
              return (
                <div
                  key={i}
                  className="w-2.5 h-2.5 rounded-full transition-none"
                  style={{
                    backgroundColor: isActive ? 'var(--accent)' : 'var(--border-subtle)',
                    boxShadow: isActive ? '0 0 8px var(--accent-glow)' : 'none',
                  }}
                />
              );
            })}
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
