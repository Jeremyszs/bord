'use client';

import React, { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { useViewerStore } from '@/store/viewerStore';
import { Search, Loader2, ChevronRight, Upload, Library, Trash2, AlertTriangle, X, Mic2, Moon, Sun } from 'lucide-react';
import { db, SavedSetlist } from '@/lib/db';
import { useThemeStore } from '@/store/themeStore';
import PopularSongsCarousel from '@/components/UI/PopularSongsCarousel';

export default function Home() {
  const router = useRouter();
  const { startNewSetlist, importBordFile, loadFromLibrary, syncWithDb } = useViewerStore();
  const { theme, toggleTheme } = useThemeStore();

  const [query, setQuery] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [savedSetlists, setSavedSetlists] = useState<SavedSetlist[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [setlistToDelete, setSetlistToDelete] = useState<SavedSetlist | null>(null);

  useEffect(() => {
    const loadSetlists = async () => {
      try {
        const setlists = await db.setlists.orderBy('lastModified').reverse().toArray();
        setSavedSetlists(setlists);
      } catch (e) {
        console.error("Failed to load library", e);
      }
    };
    loadSetlists();
  }, []);

  const search = async (title: string) => {
    const q = title.trim();
    if (!q) return;
    setQuery(q);
    setIsLoading(true);
    setError(null);

    try {
      const res = await fetch(`/api/scrape?songTitle=${encodeURIComponent(q)}`);
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Song not found');
      startNewSetlist(data);
      router.push('/viewer');
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'Song not found';
      setError(msg);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    search(query);
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setError(null);
    try {
      const text = await file.text();
      importBordFile(text);
      await syncWithDb();
      router.push('/viewer');
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Failed to import file';
      setError(msg);
    } finally {
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const handleLoadSaved = (setlist: SavedSetlist) => {
    loadFromLibrary(setlist);
    router.push('/viewer');
  };

  const confirmDelete = async () => {
    if (!setlistToDelete) return;
    await db.setlists.delete(setlistToDelete.id);
    setSavedSetlists(s => s.filter(x => x.id !== setlistToDelete.id));
    setSetlistToDelete(null);
  };

  const handleDeleteClick = (e: React.MouseEvent, setlist: SavedSetlist) => {
    e.preventDefault();
    e.stopPropagation();
    setSetlistToDelete(setlist);
  };

  return (
    <main
      className="min-h-screen flex flex-col items-center font-sans"
      style={{ background: 'var(--bg-page)' }}
    >
      {/* ── Top Bar ───────────────────────────────────────────────────────────── */}
      <div className="w-full flex items-center justify-between px-4 sm:px-6 pt-4 sm:pt-6">
        {/* Left: Audio Analyzer */}
        <button
          onClick={() => router.push('/chord-analyzer')}
          style={{ touchAction: 'manipulation' }}
          className="flex items-center gap-2 px-4 py-2.5 rounded-full bg-[var(--bg-card)] shadow-sm border border-[var(--border-subtle)] text-sm font-semibold text-[var(--accent)] active:scale-95 transition-transform hover:bg-[var(--accent-bg)]"
        >
          <Mic2 size={16} /> Audio Analyzer
        </button>

        {/* Right: Theme + Import */}
        <div className="flex items-center gap-2">
          <button
            onClick={toggleTheme}
            style={{ touchAction: 'manipulation' }}
            className="flex items-center justify-center w-10 h-10 rounded-full bg-[var(--bg-card)] shadow-sm border border-[var(--border-subtle)] text-[var(--text-secondary)] hover:text-[var(--accent)] active:scale-95 transition-all"
            title={theme === 'dark' ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
          >
            {theme === 'dark' ? <Sun size={16} /> : <Moon size={16} />}
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
            className="flex items-center gap-2 px-4 py-2.5 rounded-full bg-[var(--bg-card)] shadow-sm border border-[var(--border-subtle)] text-sm font-semibold text-[var(--accent)] active:scale-95 transition-transform"
          >
            <Upload size={16} /> Import .bord
          </button>
        </div>
      </div>

      {/* ── Hero + Search ─────────────────────────────────────────────────────── */}
      <div className="flex flex-col items-center w-full max-w-xl px-4 pt-6 sm:pt-10 pb-10">

        {/* Logo */}
        <div className="flex flex-col items-center mb-8 sm:mb-10 text-center">
          <div
            className="w-16 h-16 sm:w-20 sm:h-20 mb-4 sm:mb-6 overflow-hidden"
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src="/images/bord-logo.png"
              alt="Bord"
              className="w-full h-full object-contain p-1.5 sm:p-2"
            />
          </div>
          <h1 className="text-5xl sm:text-6xl md:text-7xl font-extrabold tracking-tight mb-2 sm:mb-3 text-[var(--text-primary)]">
            Bord
          </h1>
          <p className="text-sm sm:text-base max-w-sm text-[var(--text-secondary)]">
            Chord sheets for worship musicians.<br />
            Transpose · Auto-scroll · Annotate
          </p>
        </div>

        {/* Search form */}
        <div className="w-full">
          <form onSubmit={handleSubmit}>
            <div
              className="flex rounded-2xl overflow-hidden border bg-[var(--bg-card)] border-[var(--border-subtle)] shadow-[0_8px_40px_rgba(0,0,0,0.08)] dark:shadow-[0_8px_40px_rgba(0,0,0,0.30)]"
              style={{ WebkitTapHighlightColor: 'transparent' }}
            >
              <Search size={20} className="ml-4 self-center flex-shrink-0 text-[var(--text-muted)]" />
              <input
                id="song-search"
                type="text"
                required
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search worship song title…"
                disabled={isLoading}
                className="flex-1 px-3 py-4 bg-transparent outline-none text-base text-[var(--text-primary)] min-w-0 placeholder:text-[var(--text-muted)]"
                style={{ fontSize: '16px' }}
              />
              <button
                type="submit"
                id="search-button"
                disabled={isLoading || !query.trim()}
                style={{
                  touchAction: 'manipulation',
                  background: isLoading || !query.trim() ? 'var(--accent-dim)' : 'var(--accent)',
                  cursor: isLoading || !query.trim() ? 'not-allowed' : 'pointer',
                  boxShadow: isLoading || !query.trim() ? 'none' : '0 4px 14px var(--accent-glow)',
                  color: 'white',
                }}
                className="flex items-center gap-2 px-5 sm:px-6 m-2 rounded-xl font-semibold text-sm flex-shrink-0 active:scale-95 transition-transform"
              >
                {isLoading
                  ? <Loader2 size={18} className="animate-spin" />
                  : <><span>Search</span><ChevronRight size={16} /></>}
              </button>
            </div>
          </form>

          {/* Loading message */}
          {isLoading && (
            <p className="mt-4 text-sm text-center animate-pulse text-[var(--text-muted)]">
              Searching JrChord for &ldquo;{query}&rdquo;…
            </p>
          )}

          {/* Error */}
          {error && !isLoading && (
            <div className="mt-4 px-4 py-3 rounded-xl border text-sm bg-[var(--red-bg)] border-[var(--red-border)]" style={{ color: 'var(--red)' }}>
              <span className="font-semibold">Not found: </span>{error}
            </div>
          )}

          {/* Popular song suggestions — Marquee */}
          {!isLoading && !error && (
            <div className="mt-6 sm:mt-8 w-full max-w-lg mx-auto">
              <p className="text-xs font-semibold uppercase tracking-widest mb-3 sm:mb-4 text-center text-[var(--text-muted)]">
                Popular Worship Songs
              </p>
              <PopularSongsCarousel onSongClick={search} />
            </div>
          )}
        </div>
      </div>

      {/* ── Local Library ─────────────────────────────────────────────────────── */}
      {savedSetlists.length > 0 && (
        <div className="w-full max-w-4xl px-4 sm:px-6 pb-16">
          <div className="flex items-center gap-2 mb-6">
            <Library size={22} className="text-[var(--accent)]" />
            <h2 className="text-xl sm:text-2xl font-bold text-[var(--text-primary)] tracking-tight">Local Library</h2>
            <span className="ml-1 px-2.5 py-0.5 rounded-full bg-[var(--accent-bg)] text-[var(--accent)] text-xs font-bold">
              {savedSetlists.length}
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
            {savedSetlists.map(setlist => (
              <div
                key={setlist.id}
                onClick={() => handleLoadSaved(setlist)}
                style={{ touchAction: 'manipulation', WebkitTapHighlightColor: 'rgba(0,122,255,0.1)' }}
                className="group flex justify-between items-start bg-[var(--bg-card)] p-4 sm:p-5 rounded-2xl border border-[var(--border-subtle)] shadow-sm active:scale-[0.98] hover:shadow-md hover:border-[var(--accent)]/30 cursor-pointer transition-all"
              >
                <div className="min-w-0 flex-1 pr-2">
                  <h3 className="font-bold text-[var(--text-primary)] text-base sm:text-lg leading-tight mb-1 group-hover:text-[var(--accent)] transition-colors truncate">
                    {setlist.name}
                  </h3>
                  <p className="text-sm text-[var(--text-secondary)] mb-3">{setlist.songs.length} song(s)</p>
                  <span className="text-xs font-semibold px-2 py-1 rounded bg-[var(--bg-elevated)] text-[var(--text-muted)]">
                    {new Date(setlist.lastModified).toLocaleDateString()}
                  </span>
                </div>
                <button
                  onClick={(e) => handleDeleteClick(e, setlist)}
                  style={{ touchAction: 'manipulation' }}
                  className="p-2.5 text-[var(--text-muted)] hover:text-[var(--red)] hover:bg-[var(--red-bg)] rounded-full transition-colors flex-shrink-0"
                  title="Remove from Library"
                >
                  <Trash2 size={16} />
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── Footer ─────────────────────────────────────────────────────────────── */}
      <p
        className="text-xs text-[var(--text-muted)] text-center pb-6 mt-auto"
        style={{ pointerEvents: 'none' }}
      >
        &copy; {new Date().getFullYear()} Bord. All rights reserved.
      </p>

      {/* ── Delete Confirmation Modal ─────────────────────────────────────────── */}
      {setlistToDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
          <div className="bg-[var(--bg-card)] rounded-3xl p-6 w-full max-w-sm shadow-2xl border border-[var(--border-subtle)]">
            <div className="flex justify-between items-start mb-4">
              <div className="w-12 h-12 rounded-full bg-[var(--red-bg)] flex items-center justify-center">
                <AlertTriangle className="text-[var(--red)]" size={24} />
              </div>
              <button
                onClick={() => setSetlistToDelete(null)}
                style={{ touchAction: 'manipulation' }}
                className="p-2 text-[var(--text-muted)] hover:text-[var(--text-secondary)] hover:bg-[var(--bg-elevated)] rounded-full transition-colors"
              >
                <X size={20} />
              </button>
            </div>

            <h3 className="text-xl font-bold text-[var(--text-primary)] mb-2">Delete Setlist?</h3>
            <p className="text-[var(--text-secondary)] text-sm mb-6">
              Are you sure you want to delete{' '}
              <span className="font-semibold text-[var(--text-primary)]">&ldquo;{setlistToDelete.name}&rdquo;</span>?
              This action cannot be undone.
            </p>

            <div className="flex gap-3 w-full">
              <button
                onClick={() => setSetlistToDelete(null)}
                style={{ touchAction: 'manipulation' }}
                className="flex-1 py-3 px-4 bg-[var(--bg-elevated)] hover:bg-[var(--border-subtle)] text-[var(--text-primary)] font-semibold rounded-xl transition-colors active:scale-95"
              >
                Cancel
              </button>
              <button
                onClick={confirmDelete}
                style={{ touchAction: 'manipulation' }}
                className="flex-1 py-3 px-4 bg-[var(--red)] hover:opacity-90 text-white font-semibold rounded-xl transition-all shadow-sm active:scale-95"
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}
