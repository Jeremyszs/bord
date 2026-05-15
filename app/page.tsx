'use client';

import React, { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { useViewerStore } from '@/store/viewerStore';
import { Search, Loader2, Music2, ChevronRight, Upload, Library, Trash2, AlertTriangle, X } from 'lucide-react';
import { db, SavedSetlist } from '@/lib/db';

const EXAMPLE_SONGS = [
  'Bapa Engkau Baik',
  'Yesus Engkau Tuhan',
  'Memuji Syukur',
  'Kau Yang Terindah',
  'Aku Percaya',
];

export default function Home() {
  const router = useRouter();
  const { startNewSetlist, importBordFile, loadFromLibrary, syncWithDb } = useViewerStore();

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
    } catch (e: any) {
      setError(e.message);
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
    } catch (err: any) {
      setError(err.message || 'Failed to import file');
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
      style={{ background: 'linear-gradient(160deg, #f0f7ff 0%, #ffffff 50%, #f5f0ff 100%)' }}
    >
      {/* ── Top Bar ───────────────────────────────────────────────────────────── */}
      <div className="w-full flex justify-end px-4 sm:px-6 pt-4 sm:pt-6">
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
          className="flex items-center gap-2 px-4 py-2.5 rounded-full bg-white shadow-sm border border-gray-200 text-sm font-semibold text-[#007AFF] active:scale-95 transition-transform"
        >
          <Upload size={16} /> Import .bord
        </button>
      </div>

      {/* ── Hero + Search ─────────────────────────────────────────────────────── */}
      <div className="flex flex-col items-center w-full max-w-xl px-4 pt-6 sm:pt-10 pb-10">

        {/* Logo */}
        <div className="flex flex-col items-center mb-8 sm:mb-10 text-center">
          <div
            className="w-16 h-16 sm:w-20 sm:h-20 rounded-2xl sm:rounded-3xl flex items-center justify-center mb-4 sm:mb-6"
            style={{ background: 'linear-gradient(135deg, #007AFF, #5856D6)', boxShadow: '0 12px 32px rgba(0,122,255,0.35)' }}
          >
            <Music2 size={30} color="#fff" className="sm:hidden" />
            <Music2 size={38} color="#fff" className="hidden sm:block" />
          </div>
          <h1 className="text-5xl sm:text-6xl md:text-7xl font-extrabold tracking-tight mb-2 sm:mb-3 text-black">
            Bord
          </h1>
          <p className="text-sm sm:text-base max-w-sm text-gray-500">
            Chord sheets for worship musicians.<br />
            Transpose · Auto-scroll · Annotate.
          </p>
        </div>

        {/* Search form */}
        <div className="w-full">
          <form onSubmit={handleSubmit}>
            <div
              className="flex rounded-2xl overflow-hidden border bg-white border-gray-200 shadow-[0_8px_40px_rgba(0,0,0,0.08)]"
              style={{ WebkitTapHighlightColor: 'transparent' }}
            >
              <Search size={20} className="ml-4 self-center flex-shrink-0 text-gray-400" />
              <input
                id="song-search"
                type="text"
                required
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search worship song title…"
                disabled={isLoading}
                className="flex-1 px-3 py-4 bg-transparent outline-none text-base text-black min-w-0"
                style={{ fontSize: '16px' }} /* prevent iOS zoom on focus */
              />
              <button
                type="submit"
                id="search-button"
                disabled={isLoading || !query.trim()}
                style={{
                  touchAction: 'manipulation',
                  background: isLoading || !query.trim() ? '#bfdbfe' : 'linear-gradient(135deg, #007AFF, #5856D6)',
                  cursor: isLoading || !query.trim() ? 'not-allowed' : 'pointer',
                  boxShadow: isLoading || !query.trim() ? 'none' : '0 4px 14px rgba(0,122,255,0.4)',
                }}
                className="flex items-center gap-2 px-5 sm:px-6 m-2 rounded-xl font-semibold text-sm text-white flex-shrink-0 active:scale-95 transition-transform"
              >
                {isLoading
                  ? <Loader2 size={18} className="animate-spin" />
                  : <><span>Search</span><ChevronRight size={16} /></>}
              </button>
            </div>
          </form>

          {/* Loading message */}
          {isLoading && (
            <p className="mt-4 text-sm text-center animate-pulse text-gray-400">
              Searching JrChord for &ldquo;{query}&rdquo;…
            </p>
          )}

          {/* Error */}
          {error && !isLoading && (
            <div className="mt-4 px-4 py-3 rounded-xl border text-sm bg-red-50 border-red-200 text-red-600">
              <span className="font-semibold">Not found: </span>{error}
            </div>
          )}

          {/* Popular song suggestions */}
          {!isLoading && !error && (
            <div className="mt-6">
              <p className="text-xs font-semibold uppercase tracking-wider mb-3 text-center text-gray-400">
                Popular Worship Songs
              </p>
              <div className="flex flex-wrap gap-2 justify-center">
                {EXAMPLE_SONGS.map((song) => (
                  <button
                    key={song}
                    type="button"
                    onClick={() => search(song)}
                    style={{ touchAction: 'manipulation' }}
                    className="px-4 py-2.5 rounded-xl text-sm font-medium border transition-all bg-white border-gray-200 text-gray-700 hover:text-[#007AFF] hover:border-[#007AFF]/30 active:scale-95"
                  >
                    {song}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* ── Local Library ─────────────────────────────────────────────────────── */}
      {savedSetlists.length > 0 && (
        <div className="w-full max-w-4xl px-4 sm:px-6 pb-16">
          <div className="flex items-center gap-2 mb-6">
            <Library size={22} className="text-[#007AFF]" />
            <h2 className="text-xl sm:text-2xl font-bold text-black tracking-tight">Local Library</h2>
            <span className="ml-1 px-2.5 py-0.5 rounded-full bg-blue-100 text-[#007AFF] text-xs font-bold">
              {savedSetlists.length}
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
            {savedSetlists.map(setlist => (
              <div
                key={setlist.id}
                onClick={() => handleLoadSaved(setlist)}
                style={{ touchAction: 'manipulation', WebkitTapHighlightColor: 'rgba(0,122,255,0.1)' }}
                className="group flex justify-between items-start bg-white p-4 sm:p-5 rounded-2xl border border-gray-200 shadow-sm active:scale-[0.98] hover:shadow-md hover:border-[#007AFF]/30 cursor-pointer transition-all"
              >
                <div className="min-w-0 flex-1 pr-2">
                  <h3 className="font-bold text-black text-base sm:text-lg leading-tight mb-1 group-hover:text-[#007AFF] transition-colors truncate">
                    {setlist.name}
                  </h3>
                  <p className="text-sm text-gray-500 mb-3">{setlist.songs.length} song(s)</p>
                  <span className="text-xs font-semibold px-2 py-1 rounded bg-gray-100 text-gray-600">
                    {new Date(setlist.lastModified).toLocaleDateString()}
                  </span>
                </div>
                <button
                  onClick={(e) => handleDeleteClick(e, setlist)}
                  style={{ touchAction: 'manipulation' }}
                  className="p-2.5 text-gray-300 hover:text-red-500 hover:bg-red-50 rounded-full transition-colors flex-shrink-0"
                  title="Remove from Library"
                >
                  <Trash2 size={16} />
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── Footer (pointer-events-none so it never blocks taps) ─────────────── */}
      <p
        className="text-xs text-gray-300 text-center pb-6 mt-auto"
        style={{ pointerEvents: 'none' }}
      >
        Powered by JrChord · Data is stored locally · Export .bord to backup
      </p>

      {/* ── Delete Confirmation Modal ─────────────────────────────────────────── */}
      {setlistToDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
          <div className="bg-white rounded-3xl p-6 w-full max-w-sm shadow-2xl">
            <div className="flex justify-between items-start mb-4">
              <div className="w-12 h-12 rounded-full bg-red-50 flex items-center justify-center">
                <AlertTriangle className="text-red-500" size={24} />
              </div>
              <button
                onClick={() => setSetlistToDelete(null)}
                style={{ touchAction: 'manipulation' }}
                className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-full transition-colors"
              >
                <X size={20} />
              </button>
            </div>

            <h3 className="text-xl font-bold text-black mb-2">Delete Setlist?</h3>
            <p className="text-gray-500 text-sm mb-6">
              Are you sure you want to delete{' '}
              <span className="font-semibold text-gray-800">&ldquo;{setlistToDelete.name}&rdquo;</span>?
              This action cannot be undone.
            </p>

            <div className="flex gap-3 w-full">
              <button
                onClick={() => setSetlistToDelete(null)}
                style={{ touchAction: 'manipulation' }}
                className="flex-1 py-3 px-4 bg-gray-50 hover:bg-gray-100 text-gray-700 font-semibold rounded-xl transition-colors active:scale-95"
              >
                Cancel
              </button>
              <button
                onClick={confirmDelete}
                style={{ touchAction: 'manipulation' }}
                className="flex-1 py-3 px-4 bg-red-500 hover:bg-red-600 text-white font-semibold rounded-xl transition-colors shadow-sm shadow-red-500/30 active:scale-95"
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
