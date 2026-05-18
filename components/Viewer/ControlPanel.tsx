'use client';

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useViewerStore } from '@/store/viewerStore';
import { useMidiStore } from '@/store/midiStore';
import { Hash, RotateCcw, PenTool, Play, Pause, Download, Undo2, Trash2, Save, FileText, SlidersHorizontal, Piano, Timer, Link as LinkIcon, Loader2 } from 'lucide-react';
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
  } = useViewerStore();

  const { isMidiEnabled, toggleMidi } = useMidiStore();

  const [showSaveToast, setShowSaveToast] = React.useState(false);
  const [showLinkToast, setShowLinkToast] = React.useState(false);
  const [showScrollSlider, setShowScrollSlider] = useState(false);
  const [showMetronome, setShowMetronome] = useState(false);
  const [isShortening, setIsShortening] = useState(false);

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
    if (songs.length === 0 || isShortening) return;
    setIsShortening(true);

    const state = useViewerStore.getState();

    // Create a ultra-lightweight version of the setlist for the URL
    // This avoids HTTP 431 (URI Too Long) errors when proxying to shorteners.
    const lightweightSongs = state.songs.map(s => ({
      title: s.title,
      artist: s.artist,
      transposeSteps: s.transposeSteps
    }));

    const data = {
      version: 2,
      songs: lightweightSongs,
      isNNSActive: state.isNNSActive,
      // Annotations are excluded to ensure the link remains tiny
    };

    const jsonString = JSON.stringify(data);
    const compressed = LZString.compressToEncodedURIComponent(jsonString);
    
    // Fallback URL if we are testing on localhost (TinyURL often rejects localhost)
    let originUrl = window.location.origin;
    if (originUrl.includes('localhost')) {
      originUrl = 'https://bord.app'; // Mock production domain so TinyURL accepts it for testing
    }
    
    const longUrl = `${originUrl}${window.location.pathname}#data=${compressed}`;

    // Robust clipboard copy utility to bypass the "Document is not focused" error
    // that occurs when trying to use navigator.clipboard after an async fetch
    const copyToClipboard = async (text: string) => {
      try {
        if (!document.hasFocus()) window.focus();
        await navigator.clipboard.writeText(text);
      } catch (err) {
        // Fallback for when modern clipboard API is blocked by async delay
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

    try {
      const res = await fetch('/api/shorten', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url: longUrl })
      });
      
      const resData = await res.json();
      const finalUrl = resData.shortUrl || longUrl;

      await copyToClipboard(finalUrl);
      setShowLinkToast(true);
      setTimeout(() => setShowLinkToast(false), 3000);
    } catch (err) {
      console.error('Failed to shorten or copy link: ', err);
      // Fallback to long URL if API or network fails
      await copyToClipboard(longUrl);
      setShowLinkToast(true);
      setTimeout(() => setShowLinkToast(false), 3000);
    } finally {
      setIsShortening(false);
    }
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

        <MetronomePanel isVisible={showMetronome} />

        {/* Main pill */}
        <div
          className="flex items-center gap-1.5 sm:gap-2 px-3 py-2.5 bg-white/90 backdrop-blur-md border border-gray-100 rounded-full shadow-xl w-full justify-start sm:justify-center overflow-x-auto touch-pan-x [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]"
          style={{ justifyContent: 'safe center' }}
        >
          {/* MIDI */}
          <motion.button style={touchStyle} whileTap={{ scale: 0.88 }} onClick={toggleMidi}
            className={isMidiEnabled ? activBtn : btn} title="MIDI Detector">
            <Piano size={iconSize} />
          </motion.button>

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

          {/* Metronome */}
          <motion.button style={touchStyle} whileTap={{ scale: 0.88 }}
            onClick={() => { setShowMetronome(s => !s); setShowScrollSlider(false); }}
            className={showMetronome ? activBtn : btn} title="Metronome">
            <Timer size={iconSize} />
          </motion.button>

          {/* Play / Scroll */}
          <motion.button style={touchStyle} whileTap={{ scale: 0.88 }} onClick={togglePlaying}
            className={isPlaying ? activBtn : btn} title={isPlaying ? 'Pause' : 'Auto-scroll'}>
            {isPlaying ? <Pause size={iconSize} /> : <Play size={iconSize} className="ml-0.5" />}
          </motion.button>

          {/* Scroll slider toggle */}
          <motion.button style={touchStyle} whileTap={{ scale: 0.88 }}
            onClick={() => { setShowScrollSlider(s => !s); setShowMetronome(false); }}
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

          {/* Share Link */}
          <motion.button style={touchStyle} whileTap={{ scale: 0.88 }} onClick={handleShareLink}
            disabled={isShortening}
            className={`${btn} ${isShortening ? 'opacity-50' : ''}`} title="Share Link">
            {isShortening ? <Loader2 size={iconSize} className="animate-spin text-[#007AFF]" /> : <LinkIcon size={iconSize} />}
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

      {/* Link Copied Toast */}
      {showLinkToast && (
        <motion.div
          initial={{ opacity: 0, y: 40, scale: 0.9 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, scale: 0.9 }}
          className="fixed bottom-28 left-1/2 -translate-x-1/2 flex items-center gap-3 px-5 py-3 bg-gray-900 text-white rounded-full shadow-2xl z-50 pointer-events-none"
        >
          <div className="w-6 h-6 rounded-full bg-white flex items-center justify-center">
            <LinkIcon size={14} className="text-[#007AFF]" />
          </div>
          <span className="font-medium text-sm whitespace-nowrap">Share Link Copied!</span>
        </motion.div>
      )}
    </>
  );
}
