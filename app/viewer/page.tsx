'use client';

import React, { useState, useRef } from 'react';
import { useViewerStore } from '@/store/viewerStore';
import ChordSheetRender from '@/components/Viewer/ChordSheetRender';
import ControlPanel from '@/components/Viewer/ControlPanel';
import ScrollController from '@/components/Viewer/ScrollController';
import CanvasNotation from '@/components/Viewer/CanvasNotation';
import MidiPianoWindow from '@/components/Viewer/MidiPianoWindow';
import SetlistNavigatorWindow from '@/components/Viewer/SetlistNavigatorWindow';
import { useMidiProcessor } from '@/hooks/useMidiProcessor';
import { useMetronomeEngine } from '@/hooks/useMetronomeEngine';
import { Plus, Search, Loader2, ChevronLeft, Moon, Sun, Upload } from 'lucide-react';
import Link from 'next/link';
import LZString from 'lz-string';
import { useThemeStore } from '@/store/themeStore';

export default function ViewerPage() {
  const { theme, toggleTheme } = useThemeStore();
  const { songs, addSong, importBordFile, syncWithDb } = useViewerStore();
  const [query, setQuery] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [showSearch, setShowSearch] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isFetchingShare, setIsFetchingShare] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Activate MIDI listener
  useMidiProcessor();
  // Activate Metronome Audio Engine
  useMetronomeEngine();

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const text = await file.text();
      importBordFile(text);
      await syncWithDb();
    } catch (e) {
      console.error('Failed to import file', e);
    } finally {
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  // Activate MIDI listener
  useMidiProcessor();
  // Activate Metronome Audio Engine
  useMetronomeEngine();

  // Load from share link hash
  React.useEffect(() => {
    if (typeof window !== 'undefined' && window.location.hash.startsWith('#data=')) {
      const compressed = window.location.hash.substring(6);
      try {
        const jsonString = LZString.decompressFromEncodedURIComponent(compressed);
        if (jsonString) {
          const parsed = JSON.parse(jsonString);

          if (parsed.version === 2) {
            const rebuildSetlist = async () => {
              setIsFetchingShare(true);
              const fullSongs = [];
              try {
                for (const lightSong of parsed.songs) {
                  const query = encodeURIComponent(`${lightSong.title} ${lightSong.artist}`);
                  const res = await fetch(`/api/scrape?songTitle=${query}`);
                  if (res.ok) {
                    const data = await res.json();
                    fullSongs.push({
                      ...data,
                      listId: crypto.randomUUID(),
                      transposeSteps: lightSong.transposeSteps || 0,
                      sourceType: 'jrchord'
                    });
                  }
                }
                importBordFile(JSON.stringify({
                  version: 1,
                  songs: fullSongs,
                  isNNSActive: parsed.isNNSActive,
                  currentAnnotation: null
                }));
              } catch (e) {
                console.error("Failed to rebuild setlist", e);
                alert("Failed to load some songs from the shared link.");
              } finally {
                setIsFetchingShare(false);
                window.history.replaceState(null, '', window.location.pathname);
              }
            };
            rebuildSetlist();
          } else {
            importBordFile(jsonString);
            window.history.replaceState(null, '', window.location.pathname);
          }
        }
      } catch (e) {
        console.error("Failed to load setlist from URL", e);
      }
    }
  }, [importBordFile]);

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    const q = query.trim();
    if (!q) return;
    setIsLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/scrape?songTitle=${encodeURIComponent(q)}`);
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Song not found');
      addSong(data);
      setQuery('');
      setShowSearch(false);
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'Failed to add song';
      setError(msg);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen font-sans" style={{ backgroundColor: 'var(--bg-page)' }}>
      <ScrollController />

      {/* Loading Overlay for Share Link */}
      {isFetchingShare && (
        <div className="fixed inset-0 z-[100] backdrop-blur-sm flex flex-col items-center justify-center" style={{ backgroundColor: 'var(--bg-overlay)' }}>
          <Loader2 size={48} className="animate-spin mb-4" style={{ color: 'var(--accent)' }} />
          <p className="font-medium" style={{ color: 'var(--text-secondary)' }}>Rebuilding Setlist...</p>
        </div>
      )}

      {/* ── Fixed top bar ── */}
      <div
        className="fixed top-0 left-0 right-0 z-50 flex items-center justify-between px-4 sm:px-6 py-3 backdrop-blur-md border-b"
        style={{ backgroundColor: 'var(--bg-overlay)', borderColor: 'var(--border-subtle)' }}
      >
        <div className="flex items-center gap-3">
          <Link
            href="/"
            style={{ touchAction: 'manipulation' }}
            className="flex items-center justify-center w-9 h-9 rounded-full bg-[var(--bg-card)] shadow-sm active:scale-95 transition-all text-[var(--text-secondary)] hover:text-[var(--accent)] border border-[var(--border-subtle)]"
            title="Back to Home"
          >
            <ChevronLeft size={18} />
          </Link>
          <div className="flex items-center gap-2">
            <Link href="/" className="block w-7 h-7">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src="/images/bord-logo.png"
                alt="Bord"
                className="w-full h-full object-contain"
              />
            </Link>
            <h1 className="text-sm font-bold" style={{ color: 'var(--text-primary)' }}>Bord</h1>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={toggleTheme}
            style={{ touchAction: 'manipulation' }}
            className="flex items-center justify-center w-9 h-9 rounded-full bg-[var(--bg-card)] shadow-sm active:scale-95 transition-all text-[var(--text-secondary)] hover:text-[var(--accent)] border border-[var(--border-subtle)]"
            title={theme === 'dark' ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
          >
            {theme === 'dark' ? <Sun size={14} /> : <Moon size={14} />}
          </button>
          <input
            type="file"
            accept=".bord"
            ref={fileInputRef}
            className="hidden"
            onChange={handleFileUpload}
          />
          <button
            onClick={() => fileInputRef.current?.click()}
            style={{ touchAction: 'manipulation' }}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-[var(--bg-card)] border border-[var(--border-subtle)] text-xs font-semibold text-[var(--accent)] active:scale-95 transition-all"
          >
            <Upload size={13} />
            Import .bord
          </button>
        </div>
      </div>

      <main className="w-full flex flex-col items-center px-2 sm:px-4 pt-20 pb-40 gap-4 sm:gap-6">
        <div
          id="pdf-export-target"
          className="w-full max-w-3xl relative rounded-xl sm:rounded-2xl shadow-lg sm:shadow-xl border overflow-hidden"
          style={{ backgroundColor: 'var(--bg-card)', borderColor: 'var(--border-subtle)' }}
        >
          {/* Annotation canvas overlay */}
          <CanvasNotation />

          <div className="flex flex-col">
            {songs.map((song, idx) => (
              <div key={song.listId} id={`song-${song.listId}`} className={idx > 0 ? "border-t" : ""}
                style={{ borderColor: 'var(--border-subtle)' }}>
                <ChordSheetRender song={song} index={idx} total={songs.length} />
              </div>
            ))}

            {songs.length === 0 && (
              <div className="p-12 text-center" style={{ color: 'var(--text-muted)' }}>
                <p className="mb-4">No songs in the list.</p>
                <Link href="/" style={{ color: 'var(--accent)' }} className="hover:underline">
                  Go to Home to start
                </Link>
              </div>
            )}
          </div>
        </div>

        {/* Add Another Song button */}
        {songs.length > 0 && !showSearch && (
          <button
            type="button"
            onClick={() => { setShowSearch(true); setError(null); }}
            style={{
              touchAction: 'manipulation',
              backgroundColor: 'var(--bg-card)',
              border: '1px solid var(--border-subtle)',
              color: 'var(--accent)',
            }}
            className="flex items-center gap-2 px-5 py-3 rounded-full shadow hover:shadow-md transition-all font-medium text-sm active:scale-95"
          >
            <Plus size={18} />
            Add Another Song
          </button>
        )}

        {/* Inline search form */}
        {showSearch && (
          <form onSubmit={handleSearch} className="w-full max-w-xl flex flex-col items-center px-1 sm:px-0">
            <div
              className="flex rounded-2xl overflow-hidden border w-full"
              style={{
                backgroundColor: 'var(--bg-card)',
                borderColor: 'var(--accent)',
                boxShadow: '0 0 0 1px var(--accent)',
              }}
            >
              <Search size={18} className="ml-3 self-center flex-shrink-0" style={{ color: 'var(--text-muted)' }} />
              <input
                type="text"
                autoFocus
                required
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search song to add..."
                disabled={isLoading}
                style={{ fontSize: '16px', color: 'var(--text-primary)' }}
                className="flex-1 px-2 py-3.5 bg-transparent outline-none min-w-0"
              />
              <button
                type="submit"
                disabled={isLoading || !query.trim()}
                style={{
                  touchAction: 'manipulation',
                  background: isLoading || !query.trim() ? 'var(--accent-dim)' : 'var(--accent)',
                  color: 'white',
                }}
                className="flex items-center justify-center px-4 sm:px-5 m-1.5 rounded-xl font-semibold text-sm flex-shrink-0 active:scale-95 transition-transform"
              >
                {isLoading ? <Loader2 size={16} className="animate-spin" /> : 'Add'}
              </button>
              <button
                type="button"
                onClick={() => { setShowSearch(false); setError(null); setQuery(''); }}
                style={{ touchAction: 'manipulation', color: 'var(--text-secondary)' }}
                className="px-3 hover:text-[var(--text-primary)] font-medium text-sm flex-shrink-0 active:scale-95"
              >
                Cancel
              </button>
            </div>
            {error && (
              <p className="mt-3 text-sm font-medium text-center" style={{ color: 'var(--red)' }}>{error}</p>
            )}
          </form>
        )}
      </main>

      <ControlPanel />
      <MidiPianoWindow />
      <SetlistNavigatorWindow />
    </div>
  );
}
