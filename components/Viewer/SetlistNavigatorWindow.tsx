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
          className="flex flex-col w-full h-full rounded-2xl overflow-hidden border shadow-2xl"
          style={{
            backgroundColor: 'var(--bg-overlay)',
            borderColor: 'var(--border-subtle)',
            backdropFilter: 'blur(24px)',
            WebkitBackdropFilter: 'blur(24px)',
          }}
        >
          {/* Title Bar */}
          <div className="nav-drag-handle flex items-center justify-between px-4 py-3 bg-[var(--bg-overlay)] border-b cursor-grab active:cursor-grabbing select-none shrink-0"
            style={{ borderColor: 'var(--border-subtle)' }}>
            <div className="flex items-center gap-2">
              <ListMusic size={14} style={{ color: 'var(--accent)' }} />
              <span className="text-xs font-semibold tracking-widest uppercase" style={{ color: 'var(--text-secondary)' }}>
                Setlist
              </span>
            </div>
            <button
              onClick={toggleSetlistNav}
              className="flex items-center justify-center w-5 h-5 rounded-full hover:bg-red-100 transition-colors"
              style={{ touchAction: 'manipulation', color: 'var(--text-muted)' }}
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
                    const y = el.getBoundingClientRect().top + window.scrollY - 80;
                    window.scrollTo({ top: y, behavior: 'smooth' });
                  }
                }}
                className="w-full flex items-center justify-between p-3 rounded-xl text-left transition-colors active:scale-[0.98] group"
                style={{ color: 'var(--text-primary)' }}
              >
                <div className="flex items-center gap-3 overflow-hidden">
                  <span
                    className="flex items-center justify-center w-6 h-6 rounded-full font-bold text-xs shrink-0 transition-colors"
                    style={{
                      backgroundColor: 'var(--bg-elevated)',
                      color: 'var(--text-muted)',
                    }}
                  >
                    {idx + 1}
                  </span>
                  <div className="flex flex-col overflow-hidden">
                    <span className="font-semibold text-sm truncate" style={{ color: 'var(--text-primary)' }}>
                      {song.title}
                    </span>
                    <span className="text-[10px] truncate mt-0.5" style={{ color: 'var(--text-muted)' }}>
                      {song.artist}
                    </span>
                  </div>
                </div>
                <ChevronRight size={16} style={{ color: 'var(--text-muted)' }} />
              </button>
            ))}
          </div>
        </div>
      </Rnd>
    </div>
  );
}
