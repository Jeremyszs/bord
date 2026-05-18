'use client';

import React, { useState } from 'react';
import { useViewerStore } from '@/store/viewerStore';
import ChordSheetRender from '@/components/Viewer/ChordSheetRender';
import ControlPanel from '@/components/Viewer/ControlPanel';
import ScrollController from '@/components/Viewer/ScrollController';
import CanvasNotation from '@/components/Viewer/CanvasNotation';
import MidiPianoWindow from '@/components/Viewer/MidiPianoWindow';
import { useMidiProcessor } from '@/hooks/useMidiProcessor';
import { useMetronomeEngine } from '@/hooks/useMetronomeEngine';
import { Plus, Search, Loader2, Home } from 'lucide-react';
import Link from 'next/link';

export default function ViewerPage() {
  const { songs, addSong } = useViewerStore();
  const [query, setQuery] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [showSearch, setShowSearch] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Activate MIDI listener (attaches/detaches automatically based on store state)
  useMidiProcessor();

  // Activate Metronome Audio Engine
  useMetronomeEngine();

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
    } catch (e: any) {
      setError(e.message);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen font-sans" style={{ backgroundColor: '#f8f9fa' }}>
      <ScrollController />

      {/* Floating Home Button */}
      <Link
        href="/"
        style={{ touchAction: 'manipulation' }}
        className="fixed top-4 left-4 z-50 flex items-center justify-center w-10 h-10 rounded-full bg-white shadow-sm active:scale-95 transition-all text-gray-500 hover:text-[#007AFF] border border-gray-200"
        title="Back to Home"
      >
        <Home size={18} />
      </Link>

      <main className="w-full flex flex-col items-center px-2 sm:px-4 pt-14 sm:pt-16 pb-40 gap-4 sm:gap-6">
        <div
          id="pdf-export-target"
          className="w-full max-w-3xl relative rounded-xl sm:rounded-2xl shadow-lg sm:shadow-xl border overflow-hidden"
          style={{ backgroundColor: '#ffffff', borderColor: '#e5e7eb' }}
        >
          {/* Annotation canvas overlay */}
          <CanvasNotation />

          <div className="flex flex-col">
            {songs.map((song, idx) => (
              <div key={song.listId} className={idx > 0 ? "border-t border-gray-200" : ""}>
                <ChordSheetRender song={song} index={idx} total={songs.length} />
              </div>
            ))}

            {songs.length === 0 && (
              <div className="p-12 text-center text-gray-400">
                <p className="mb-4">No songs in the list.</p>
                <Link href="/" className="text-[#007AFF] hover:underline">
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
            style={{ touchAction: 'manipulation' }}
            className="flex items-center gap-2 px-5 py-3 rounded-full bg-white shadow hover:shadow-md transition-all text-[#007AFF] font-medium border border-[#007AFF]/20 text-sm active:scale-95"
          >
            <Plus size={18} />
            Add Another Song
          </button>
        )}

        {/* Inline search form */}
        {showSearch && (
          <form onSubmit={handleSearch} className="w-full max-w-xl flex flex-col items-center px-1 sm:px-0">
            <div
              className="flex rounded-2xl overflow-hidden border bg-white border-[#007AFF]/30 shadow-lg w-full"
              style={{ WebkitTapHighlightColor: 'transparent' }}
            >
              <Search size={18} className="ml-3 self-center flex-shrink-0 text-gray-400" />
              <input
                type="text"
                autoFocus
                required
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search song to add..."
                disabled={isLoading}
                style={{ fontSize: '16px' }} /* prevent iOS keyboard zoom */
                className="flex-1 px-2 py-3.5 bg-transparent outline-none text-black min-w-0"
              />
              <button
                type="submit"
                disabled={isLoading || !query.trim()}
                style={{
                  touchAction: 'manipulation',
                  background: isLoading || !query.trim() ? '#bfdbfe' : '#007AFF',
                  cursor: isLoading || !query.trim() ? 'not-allowed' : 'pointer',
                }}
                className="flex items-center justify-center px-4 sm:px-5 m-1.5 rounded-xl font-semibold text-sm text-white flex-shrink-0 active:scale-95 transition-transform"
              >
                {isLoading ? <Loader2 size={16} className="animate-spin" /> : 'Add'}
              </button>
              <button
                type="button"
                onClick={() => { setShowSearch(false); setError(null); setQuery(''); }}
                style={{ touchAction: 'manipulation' }}
                className="px-3 text-gray-500 hover:text-gray-700 font-medium text-sm flex-shrink-0 active:scale-95"
              >
                Cancel
              </button>
            </div>
            {error && (
              <p className="mt-3 text-sm text-red-500 font-medium text-center">{error}</p>
            )}
          </form>
        )}
      </main>

      <ControlPanel />
      <MidiPianoWindow />
    </div>
  );
}
