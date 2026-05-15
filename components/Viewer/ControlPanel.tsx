'use client';

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useViewerStore } from '@/store/viewerStore';
import { Hash, RotateCcw, PenTool, Play, Pause, Download, Undo2, Trash2, Save, FileText, ChevronUp, SlidersHorizontal } from 'lucide-react';
import Slider from '@/components/UI/Slider';

export default function ControlPanel() {
  const {
    songs,
    isNNSActive,
    toggleNNS,
    isDrawingMode,
    toggleDrawingMode,
    resetView,
    isPlaying,
    togglePlaying,
    scrollSpeed,
    setScrollSpeed,
    undoAnnotation,
    currentAnnotation,
    clearSongs,
    syncWithDb,
  } = useViewerStore();

  const [showSaveToast, setShowSaveToast] = React.useState(false);
  const [showScrollSlider, setShowScrollSlider] = useState(false);

  const handleExportBord = () => {
    if (songs.length === 0) return;
    const state = useViewerStore.getState();

    const data = {
      version: 1,
      songs: state.songs,
      isNNSActive: state.isNNSActive,
      currentAnnotation: state.currentAnnotation,
    };

    let songTitle = 'Setlist';
    if (songs.length === 1) {
      songTitle = `${songs[0].artist} ${songs[0].title}`;
    } else {
      songTitle = `Setlist ${songs[0].title} and ${songs.length - 1} others`;
    }

    const cleanTitle = songTitle
      .replace(/[/\\?%*:|"<>]/g, '-')
      .replace(/\s+/g, '_')
      .trim() || 'untitled_song';

    const fileName = `${cleanTitle}.bord`;
    const jsonString = JSON.stringify(data, null, 2);
    const blob = new Blob([jsonString], { type: 'application/json' });
    const url = window.URL.createObjectURL(blob);

    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', fileName);
    link.style.display = 'none';
    document.body.appendChild(link);
    link.click();
    setTimeout(() => {
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
    }, 100);
  };

  const handleSaveToLibrary = async () => {
    await syncWithDb();
    setShowSaveToast(true);
    setTimeout(() => setShowSaveToast(false), 3000);
  };

  const btn = "flex items-center justify-center p-2.5 sm:p-3 rounded-full bg-white shadow-[0_4px_12px_rgba(0,0,0,0.08)] text-black hover:text-[#007AFF] transition-colors border border-gray-100 active:scale-90 shrink-0";
  const activBtn = "flex items-center justify-center p-2.5 sm:p-3 rounded-full bg-[#007AFF] text-white shadow-[0_4px_12px_rgba(0,122,255,0.3)] transition-colors border border-[#007AFF] active:scale-90 shrink-0";
  const touchStyle = { touchAction: 'manipulation' as const };
  const iconSize = 16;

  if (songs.length === 0) return null;

  return (
    <>
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
        className="fixed bottom-4 sm:bottom-8 left-1/2 -translate-x-1/2 z-50 flex flex-col items-center gap-2"
        style={{ width: 'calc(100vw - 32px)', maxWidth: '680px' }}
      >
        {/* Scroll speed popover (mobile-friendly) */}
        <AnimatePresence>
          {showScrollSlider && (
            <motion.div
              initial={{ opacity: 0, y: 8, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 8, scale: 0.95 }}
              className="w-full max-w-xs bg-white/90 backdrop-blur-md border border-gray-100 rounded-2xl shadow-xl p-4"
            >
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Scroll Speed</span>
                <span className="text-xs font-bold text-[#007AFF]">{scrollSpeed}</span>
              </div>
              <Slider min={1} max={100} value={scrollSpeed} onChange={setScrollSpeed} />
            </motion.div>
          )}
        </AnimatePresence>

        {/* Main pill */}
        <div 
          className="flex items-center gap-1.5 sm:gap-2 px-3 py-2.5 bg-white/90 backdrop-blur-md border border-gray-100 rounded-full shadow-xl w-full justify-start sm:justify-center overflow-x-auto touch-pan-x [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]"
          style={{ justifyContent: 'safe center' }}
        >
          {/* NNS */}
          <motion.button style={touchStyle} whileTap={{ scale: 0.88 }} onClick={toggleNNS}
            className={isNNSActive ? activBtn : btn} title="Nashville Number System">
            <Hash size={iconSize} />
          </motion.button>

          {/* Draw */}
          <motion.button style={touchStyle} whileTap={{ scale: 0.88 }} onClick={toggleDrawingMode}
            className={isDrawingMode ? activBtn : btn} title="Draw Mode">
            <PenTool size={iconSize} />
          </motion.button>

          {isDrawingMode && (
            <motion.button style={touchStyle} initial={{ opacity: 0, scale: 0.8 }} animate={{ opacity: 1, scale: 1 }}
              whileTap={{ scale: 0.88 }} onClick={undoAnnotation} disabled={!currentAnnotation}
              className={`${btn} ${!currentAnnotation ? 'opacity-40' : ''}`} title="Undo">
              <Undo2 size={iconSize} />
            </motion.button>
          )}

          <div className="w-px h-6 bg-gray-200 flex-shrink-0" />

          {/* Play / Scroll */}
          <motion.button style={touchStyle} whileTap={{ scale: 0.88 }} onClick={togglePlaying}
            className={isPlaying ? activBtn : btn} title={isPlaying ? 'Pause' : 'Auto-scroll'}>
            {isPlaying ? <Pause size={iconSize} /> : <Play size={iconSize} className="ml-0.5" />}
          </motion.button>

          {/* Scroll slider toggle */}
          <motion.button style={touchStyle} whileTap={{ scale: 0.88 }}
            onClick={() => setShowScrollSlider(s => !s)}
            className={showScrollSlider ? activBtn : btn} title="Scroll Speed">
            <SlidersHorizontal size={iconSize} />
          </motion.button>

          <div className="w-px h-6 bg-gray-200 flex-shrink-0" />

          {/* Reset */}
          <motion.button style={touchStyle} whileTap={{ scale: 0.88 }} onClick={resetView}
            className={btn} title="Reset Transpositions">
            <RotateCcw size={iconSize} />
          </motion.button>

          {/* Clear */}
          <motion.button style={touchStyle} whileTap={{ scale: 0.88 }} onClick={clearSongs}
            className={`${btn} hover:text-red-500`} title="Clear Setlist">
            <Trash2 size={iconSize} />
          </motion.button>

          <div className="w-px h-6 bg-gray-200 flex-shrink-0" />

          {/* Save */}
          <motion.button style={touchStyle} whileTap={{ scale: 0.88 }} onClick={handleSaveToLibrary}
            className={btn} title="Save to Library">
            <Save size={iconSize} />
          </motion.button>

          {/* Export .bord */}
          <motion.button style={touchStyle} whileTap={{ scale: 0.88 }} onClick={handleExportBord}
            className={btn} title="Export .bord">
            <Download size={iconSize} />
          </motion.button>

          {/* Export PDF */}
          <motion.button style={touchStyle} whileTap={{ scale: 0.88 }}
            onClick={async () => {
              const { exportToPdf } = await import('@/lib/export-engine');
              exportToPdf();
            }}
            className={btn} title="Export PDF">
            <FileText size={iconSize} />
          </motion.button>
        </div>
      </motion.div>

      {/* Save Toast */}
      {showSaveToast && (
        <motion.div
          initial={{ opacity: 0, y: 40, scale: 0.9 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, scale: 0.9 }}
          className="fixed bottom-28 left-1/2 -translate-x-1/2 flex items-center gap-3 px-5 py-3 bg-gray-900 text-white rounded-full shadow-2xl z-50 pointer-events-none"
        >
          <div className="w-6 h-6 rounded-full bg-green-500 flex items-center justify-center">
            <svg width="14" height="10" viewBox="0 0 14 10" fill="none">
              <path d="M1 5L4.5 8.5L12.5 1" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </div>
          <span className="font-medium text-sm whitespace-nowrap">Saved to Local Library</span>
        </motion.div>
      )}
    </>
  );
}
