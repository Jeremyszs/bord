'use client';

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useViewerStore } from '@/store/viewerStore';
import { useMidiStore } from '@/store/midiStore';
import { Hash, RotateCcw, PenTool, Play, Pause, Download, Undo2, Trash2, Save, FileText, SlidersHorizontal, Piano, Timer, Link as LinkIcon, ListMusic } from 'lucide-react';
import Slider from '@/components/UI/Slider';
import MetronomePanel from './MetronomePanel';
import LZString from 'lz-string';

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
    showSetlistNav,
    toggleSetlistNav,
  } = useViewerStore();

  const { isMidiEnabled, toggleMidi } = useMidiStore();

  const [showSaveToast, setShowSaveToast] = React.useState(false);
  const [showLinkToast, setShowLinkToast] = React.useState(false);
  const [showScrollSlider, setShowScrollSlider] = useState(false);
  const [showMetronome, setShowMetronome] = useState(false);

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

  const handleShareLink = async () => {
    if (songs.length === 0) return;

    const state = useViewerStore.getState();

    const lightweightSongs = state.songs.map(s => ({
      title: s.title,
      artist: s.artist,
      transposeSteps: s.transposeSteps
    }));

    const data = {
      version: 2,
      songs: lightweightSongs,
      isNNSActive: state.isNNSActive,
    };

    const jsonString = JSON.stringify(data);
    const compressed = LZString.compressToEncodedURIComponent(jsonString);
    const url = `${window.location.origin}${window.location.pathname}#data=${compressed}`;

    const copyToClipboard = async (text: string) => {
      try {
        if (!document.hasFocus()) window.focus();
        await navigator.clipboard.writeText(text);
      } catch (err) {
        const textArea = document.createElement('textarea');
        textArea.value = text;
        textArea.style.position = 'fixed';
        textArea.style.top = '0';
        textArea.style.left = '0';
        textArea.style.opacity = '0';
        document.body.appendChild(textArea);
        textArea.focus();
        textArea.select();
        try {
          document.execCommand('copy');
        } catch (e) {
          console.error('Fallback copy failed', e);
        }
        document.body.removeChild(textArea);
      }
    };

    await copyToClipboard(url);
    setShowLinkToast(true);
    setTimeout(() => setShowLinkToast(false), 3000);
  };

  const handleSaveToLibrary = async () => {
    await syncWithDb();
    setShowSaveToast(true);
    setTimeout(() => setShowSaveToast(false), 3000);
  };

  const touchStyle = { touchAction: 'manipulation' as const };
  const iconSize = 16;

  if (songs.length === 0) return null;

  return (
    <>
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
        className="fixed bottom-4 sm:bottom-8 left-1/2 -translate-x-1/2 z-50 flex flex-col items-center gap-2 w-[calc(100vw-16px)] sm:w-max sm:max-w-[calc(100vw-32px)]"
      >
        {/* Scroll speed popover */}
        <AnimatePresence>
          {showScrollSlider && (
            <motion.div
              initial={{ opacity: 0, y: 8, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 8, scale: 0.95 }}
              className="w-full max-w-xs backdrop-blur-md border rounded-2xl shadow-xl p-4"
              style={{
                backgroundColor: 'var(--bg-overlay)',
                borderColor: 'var(--border-subtle)',
              }}
            >
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-semibold uppercase tracking-wider" style={{ color: 'var(--text-muted)' }}>Scroll Speed</span>
                <span className="text-xs font-bold" style={{ color: 'var(--accent)' }}>{scrollSpeed}</span>
              </div>
              <Slider min={1} max={100} value={scrollSpeed} onChange={setScrollSpeed} />
            </motion.div>
          )}
        </AnimatePresence>

        <MetronomePanel isVisible={showMetronome} />

        {/* Main pill */}
        <div
          className="flex items-center gap-1.5 sm:gap-2 px-3 py-2.5 backdrop-blur-md border rounded-full shadow-xl w-full justify-start sm:justify-center overflow-x-auto touch-pan-x [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]"
          style={{
            backgroundColor: 'var(--bg-overlay)',
            borderColor: 'var(--border-subtle)',
          }}
        >
          {/* MIDI */}
          <motion.button style={touchStyle} whileTap={{ scale: 0.88 }} onClick={toggleMidi}
            className={isMidiEnabled ? 'btn-active p-2.5 sm:p-3 rounded-full' : 'btn-ghost p-2.5 sm:p-3 rounded-full'} title="MIDI Detector">
            <Piano size={iconSize} />
          </motion.button>

          {/* NNS */}
          <motion.button style={touchStyle} whileTap={{ scale: 0.88 }} onClick={toggleNNS}
            className={isNNSActive ? 'btn-active p-2.5 sm:p-3 rounded-full' : 'btn-ghost p-2.5 sm:p-3 rounded-full'} title="Nashville Number System">
            <Hash size={iconSize} />
          </motion.button>

          {/* Draw */}
          <motion.button style={touchStyle} whileTap={{ scale: 0.88 }} onClick={toggleDrawingMode}
            className={isDrawingMode ? 'btn-active p-2.5 sm:p-3 rounded-full' : 'btn-ghost p-2.5 sm:p-3 rounded-full'} title="Draw Mode">
            <PenTool size={iconSize} />
          </motion.button>

          {isDrawingMode && (
            <motion.button style={touchStyle} initial={{ opacity: 0, scale: 0.8 }} animate={{ opacity: 1, scale: 1 }}
              whileTap={{ scale: 0.88 }} onClick={undoAnnotation} disabled={!currentAnnotation}
              className={`btn-ghost p-2.5 sm:p-3 rounded-full ${!currentAnnotation ? 'opacity-40' : ''}`} title="Undo">
              <Undo2 size={iconSize} />
            </motion.button>
          )}

          <div className="w-px h-6 flex-shrink-0" style={{ backgroundColor: 'var(--border-subtle)' }} />

          {/* Setlist Navigator */}
          <motion.button style={touchStyle} whileTap={{ scale: 0.88 }} onClick={toggleSetlistNav}
            className={showSetlistNav ? 'btn-active p-2.5 sm:p-3 rounded-full' : 'btn-ghost p-2.5 sm:p-3 rounded-full'} title="Setlist Navigation">
            <ListMusic size={iconSize} />
          </motion.button>

          {/* Metronome */}
          <motion.button style={touchStyle} whileTap={{ scale: 0.88 }}
            onClick={() => { setShowMetronome(s => !s); setShowScrollSlider(false); }}
            className={showMetronome ? 'btn-active p-2.5 sm:p-3 rounded-full' : 'btn-ghost p-2.5 sm:p-3 rounded-full'} title="Metronome">
            <Timer size={iconSize} />
          </motion.button>

          {/* Play / Scroll */}
          <motion.button style={touchStyle} whileTap={{ scale: 0.88 }} onClick={togglePlaying}
            className={isPlaying ? 'btn-active p-2.5 sm:p-3 rounded-full' : 'btn-ghost p-2.5 sm:p-3 rounded-full'} title={isPlaying ? 'Pause' : 'Auto-scroll'}>
            {isPlaying ? <Pause size={iconSize} /> : <Play size={iconSize} className="ml-0.5" />}
          </motion.button>

          {/* Scroll slider toggle */}
          <motion.button style={touchStyle} whileTap={{ scale: 0.88 }}
            onClick={() => { setShowScrollSlider(s => !s); setShowMetronome(false); }}
            className={showScrollSlider ? 'btn-active p-2.5 sm:p-3 rounded-full' : 'btn-ghost p-2.5 sm:p-3 rounded-full'} title="Scroll Speed">
            <SlidersHorizontal size={iconSize} />
          </motion.button>

          <div className="w-px h-6 flex-shrink-0" style={{ backgroundColor: 'var(--border-subtle)' }} />

          {/* Reset */}
          <motion.button style={touchStyle} whileTap={{ scale: 0.88 }} onClick={resetView}
            className="btn-ghost p-2.5 sm:p-3 rounded-full" title="Reset Transpositions">
            <RotateCcw size={iconSize} />
          </motion.button>

          {/* Clear */}
          <motion.button style={touchStyle} whileTap={{ scale: 0.88 }} onClick={clearSongs}
            className="btn-ghost p-2.5 sm:p-3 rounded-full hover:text-[var(--red)]" title="Clear Setlist">
            <Trash2 size={iconSize} />
          </motion.button>

          <div className="w-px h-6 flex-shrink-0" style={{ backgroundColor: 'var(--border-subtle)' }} />

          {/* Save */}
          <motion.button style={touchStyle} whileTap={{ scale: 0.88 }} onClick={handleSaveToLibrary}
            className="btn-ghost p-2.5 sm:p-3 rounded-full" title="Save to Library">
            <Save size={iconSize} />
          </motion.button>

          {/* Share Link */}
          <motion.button style={touchStyle} whileTap={{ scale: 0.88 }} onClick={handleShareLink}
            className="btn-ghost p-2.5 sm:p-3 rounded-full" title="Share Link">
            <LinkIcon size={iconSize} />
          </motion.button>

          {/* Export .bord */}
          <motion.button style={touchStyle} whileTap={{ scale: 0.88 }} onClick={handleExportBord}
            className="btn-ghost p-2.5 sm:p-3 rounded-full" title="Export .bord">
            <Download size={iconSize} />
          </motion.button>

          {/* Export PDF */}
          <motion.button style={touchStyle} whileTap={{ scale: 0.88 }}
            onClick={async () => {
              const { exportToPdf } = await import('@/lib/export-engine');
              exportToPdf();
            }}
            className="btn-ghost p-2.5 sm:p-3 rounded-full" title="Export PDF">
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
          className="fixed bottom-28 left-1/2 -translate-x-1/2 flex items-center gap-3 px-5 py-3 rounded-full shadow-2xl z-50 pointer-events-none toast"
        >
          <div className="w-6 h-6 rounded-full flex items-center justify-center" style={{ backgroundColor: 'var(--green)' }}>
            <svg width="14" height="10" viewBox="0 0 14 10" fill="none">
              <path d="M1 5L4.5 8.5L12.5 1" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </div>
          <span className="font-medium text-sm whitespace-nowrap">Saved to Local Library</span>
        </motion.div>
      )}

      {/* Link Copied Toast */}
      {showLinkToast && (
        <motion.div
          initial={{ opacity: 0, y: 40, scale: 0.9 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, scale: 0.9 }}
          className="fixed bottom-28 left-1/2 -translate-x-1/2 flex items-center gap-3 px-5 py-3 rounded-full shadow-2xl z-50 pointer-events-none toast"
        >
          <div className="w-6 h-6 rounded-full flex items-center justify-center" style={{ backgroundColor: 'var(--bg-card)' }}>
            <LinkIcon size={14} style={{ color: 'var(--accent)' }} />
          </div>
          <span className="font-medium text-sm whitespace-nowrap">Share Link Copied!</span>
        </motion.div>
      )}
    </>
  );
}
