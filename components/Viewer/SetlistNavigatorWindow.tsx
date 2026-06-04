'use client';

import React, { useCallback } from 'react';
import { Rnd } from 'react-rnd';
import type { RndDragCallback, RndResizeCallback } from 'react-rnd';
import { X, ListMusic, ChevronRight } from 'lucide-react';
import { useViewerStore } from '@/store/viewerStore';

export default function SetlistNavigatorWindow() {
  const { songs, showSetlistNav, toggleSetlistNav, navWindowRect, setNavWindowRect } = useViewerStore();

  const handleDragStop: RndDragCallback = useCallback((_e, d) => {
    setNavWindowRect({ x: d.x, y: d.y });
  }, [setNavWindowRect]);

  const handleResizeStop: RndResizeCallback = useCallback(
    (_e, _dir, ref, _delta, pos) => {
      setNavWindowRect({
        width: parseInt(ref.style.width),
        height: parseInt(ref.style.height),
        x: pos.x,
        y: pos.y,
      });
    },
    [setNavWindowRect]
  );

  if (!showSetlistNav || songs.length === 0) return null;

  return (
    <div style={{ position: 'fixed', inset: 0, pointerEvents: 'none', zIndex: 9998 }}>
      <Rnd
        position={{ x: navWindowRect.x, y: navWindowRect.y }}
        size={{ width: navWindowRect.width, height: navWindowRect.height }}
        minWidth={240}
        minHeight={180}
        maxWidth={600}
        maxHeight={800}
        bounds="window"
        dragHandleClassName="nav-drag-handle"
        enableResizing={{
          top: true, right: true, bottom: true, left: true,
          topRight: true, bottomRight: true, bottomLeft: true, topLeft: true,
        }}
        onDragStop={handleDragStop}
        onResizeStop={handleResizeStop}
        style={{ pointerEvents: 'auto' }}
      >
        <div
          className="flex flex-col w-full h-full rounded-2xl overflow-hidden border border-gray-200/80 shadow-2xl"
          style={{
            background: 'rgba(255,255,255,0.96)',
            backdropFilter: 'blur(24px)',
            WebkitBackdropFilter: 'blur(24px)',
          }}
        >
          {/* Title Bar */}
          <div className="nav-drag-handle flex items-center justify-between px-4 py-3 bg-white/80 border-b border-gray-100 cursor-grab active:cursor-grabbing select-none shrink-0">
            <div className="flex items-center gap-2">
              <ListMusic size={14} className="text-[#007AFF]" />
              <span className="text-xs font-semibold text-gray-600 tracking-widest uppercase">
                Setlist
              </span>
            </div>
            <button
              onClick={toggleSetlistNav}
              className="flex items-center justify-center w-5 h-5 rounded-full hover:bg-red-100 text-gray-400 hover:text-red-500 transition-colors"
              style={{ touchAction: 'manipulation' }}
              title="Close"
            >
              <X size={12} />
            </button>
          </div>

          {/* Scrollable Song List */}
          <div className="flex-1 overflow-y-auto p-2" style={{ scrollbarWidth: 'thin' }}>
            {songs.map((song, idx) => (
              <button
                key={song.listId}
                onClick={() => {
                  const el = document.getElementById(`song-${song.listId}`);
                  if (el) {
                    // Offset by slightly more than the top header height (approx 80px)
                    const y = el.getBoundingClientRect().top + window.scrollY - 80;
                    window.scrollTo({ top: y, behavior: 'smooth' });
                  }
                }}
                className="w-full flex items-center justify-between p-3 rounded-xl hover:bg-blue-50 text-left transition-colors active:scale-[0.98] group"
              >
                <div className="flex items-center gap-3 overflow-hidden">
                  <span className="flex items-center justify-center w-6 h-6 rounded-full bg-gray-100 text-gray-500 font-bold text-xs shrink-0 group-hover:bg-[#007AFF] group-hover:text-white transition-colors">
                    {idx + 1}
                  </span>
                  <div className="flex flex-col overflow-hidden">
                    <span className="font-semibold text-gray-800 text-sm truncate">
                      {song.title}
                    </span>
                    <span className="text-[10px] text-gray-400 truncate mt-0.5">
                      {song.artist}
                    </span>
                  </div>
                </div>
                <ChevronRight size={16} className="text-gray-300 group-hover:text-[#007AFF]" />
              </button>
            ))}
          </div>
        </div>
      </Rnd>
    </div>
  );
}
