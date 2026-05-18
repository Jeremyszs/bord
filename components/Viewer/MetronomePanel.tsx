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

  return (
    <AnimatePresence>
      {isVisible && (
        <motion.div
          initial={{ opacity: 0, y: 8, scale: 0.95 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: 8, scale: 0.95 }}
          className="w-full max-w-sm bg-white/90 backdrop-blur-md border border-gray-100 rounded-2xl shadow-xl p-4 mb-2"
          style={{ touchAction: 'manipulation' }}
        >
          <div className="flex items-center justify-between mb-4">
            <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider">
              Metronome
            </span>
            <div className="flex items-center gap-3">
              {/* Time Signature Dropdown */}
              <select
                value={`${timeSignature.beatsPerBar}/${timeSignature.beatValue}`}
                onChange={handleTimeSigChange}
                className="bg-gray-100 text-xs font-bold text-gray-700 rounded-lg px-2 py-1 outline-none appearance-none cursor-pointer border border-transparent hover:border-gray-200"
              >
                <option value="2/4">2/4</option>
                <option value="3/4">3/4</option>
                <option value="4/4">4/4</option>
                <option value="6/8">6/8</option>
              </select>

              <span className="text-sm font-black text-[#007AFF] w-12 text-right">
                {bpm} <span className="text-[10px] font-semibold text-gray-400">BPM</span>
              </span>
            </div>
          </div>

          {/* Controls Row */}
          <div className="flex items-center gap-4 mb-5">
            <button
              onClick={togglePlay}
              className={`flex items-center justify-center w-12 h-12 rounded-full shrink-0 transition-colors ${
                isPlaying
                  ? 'bg-[#007AFF] text-white shadow-[0_4px_12px_rgba(0,122,255,0.3)]'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              } active:scale-90`}
            >
              {isPlaying ? <Pause size={20} /> : <Play size={20} className="ml-1" />}
            </button>
            <div className="flex-1">
              <Slider min={40} max={250} value={bpm} onChange={setBpm} />
            </div>
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
                    backgroundColor: isActive ? '#007AFF' : '#E5E7EB',
                    boxShadow: isActive ? '0 0 8px rgba(0,122,255,0.6)' : 'none',
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
