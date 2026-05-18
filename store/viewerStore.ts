import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { ScrapedSongObject } from '@/types';

export interface SonglistItem extends ScrapedSongObject {
  listId: string;
  transposeSteps: number;
}

interface ViewerState {
  setlistId: string;
  songs: SonglistItem[];
  isNNSActive: boolean;
  isDrawingMode: boolean;
  scrollSpeed: number;
  isPlaying: boolean;
  currentAnnotation: string | null;
  annotationHistory: string[];
  showSetlistNav: boolean;
  navWindowRect: { x: number; y: number; width: number | string; height: number | string };
  startNewSetlist: (data: ScrapedSongObject) => void;
  addSong: (data: ScrapedSongObject) => void;
  removeSong: (listId: string) => void;
  setSongTranspose: (listId: string, steps: number | ((prev: number) => number)) => void;
  reorderSongs: (fromIndex: number, toIndex: number) => void;
  toggleSetlistNav: () => void;
  setNavWindowRect: (rect: Partial<{ x: number; y: number; width: number | string; height: number | string }>) => void;
  toggleNNS: () => void;
  toggleDrawingMode: () => void;
  setScrollSpeed: (speed: number) => void;
  togglePlaying: () => void;
  resetView: () => void;
  saveAnnotation: (canvasState: string) => void;
  undoAnnotation: () => void;
  clearAnnotation: () => void;
  clearSongs: () => void;
  syncWithDb: () => Promise<void>;
  loadFromLibrary: (saved: any) => void;
  importBordFile: (data: string) => void;
}

export const useViewerStore = create<ViewerState>()(
  persist(
    (set, get) => ({
      setlistId: crypto.randomUUID(),
      songs: [],
      isNNSActive: false,
      isDrawingMode: false,
      scrollSpeed: 50,
      isPlaying: false,
      currentAnnotation: null,
      annotationHistory: [],
      showSetlistNav: false,
      navWindowRect: { x: 20, y: 80, width: 280, height: 400 },
      startNewSetlist: (data) => set({
        setlistId: crypto.randomUUID(),
        songs: [{ ...data, listId: crypto.randomUUID(), transposeSteps: 0, sourceType: 'jrchord' }],
        currentAnnotation: null,
        annotationHistory: [],
        isNNSActive: false,
      }),
      addSong: (data) => set((state) => ({
        songs: [...state.songs, { ...data, listId: crypto.randomUUID(), transposeSteps: 0, sourceType: 'jrchord' }],
      })),
      removeSong: (listId) => set((state) => ({
        songs: state.songs.filter(s => s.listId !== listId),
      })),
      setSongTranspose: (listId, steps) =>
        set((state) => ({
          songs: state.songs.map(song => {
            if (song.listId === listId) {
              const newSteps = typeof steps === 'function' ? steps(song.transposeSteps) : steps;
              return { ...song, transposeSteps: newSteps };
            }
            return song;
          })
        })),
      reorderSongs: (fromIndex, toIndex) =>
        set((state) => {
          const songs = [...state.songs];
          const [moved] = songs.splice(fromIndex, 1);
          songs.splice(toIndex, 0, moved);
          return { songs };
        }),
      toggleSetlistNav: () => set((state) => ({ showSetlistNav: !state.showSetlistNav })),
      setNavWindowRect: (rect) => set((state) => ({ navWindowRect: { ...state.navWindowRect, ...rect } })),
      toggleNNS: () => set((state) => ({ isNNSActive: !state.isNNSActive })),
      toggleDrawingMode: () => set((state) => ({ isDrawingMode: !state.isDrawingMode })),
      setScrollSpeed: (speed) => set({ scrollSpeed: speed }),
      togglePlaying: () => set((state) => ({ isPlaying: !state.isPlaying })),
      resetView: () => set((state) => ({ 
        songs: state.songs.map(s => ({ ...s, transposeSteps: 0 })), 
        isNNSActive: false, 
        isPlaying: false 
      })),
      saveAnnotation: (canvasState) => set((state) => {
        if (state.currentAnnotation === canvasState) return state;
        const history = state.currentAnnotation ? [...state.annotationHistory, state.currentAnnotation] : [];
        return {
          currentAnnotation: canvasState,
          annotationHistory: history
        };
      }),
      undoAnnotation: () => set((state) => {
        if (state.annotationHistory.length === 0) {
          return { currentAnnotation: null, annotationHistory: [] };
        }
        const newHistory = [...state.annotationHistory];
        const previousState = newHistory.pop() || null;
        return {
          currentAnnotation: previousState,
          annotationHistory: newHistory
        };
      }),
      clearAnnotation: () => set({ currentAnnotation: null, annotationHistory: [] }),
      clearSongs: () => set({ songs: [], currentAnnotation: null, annotationHistory: [], setlistId: crypto.randomUUID() }),
      syncWithDb: async () => {
        const state = get();
        if (state.songs.length === 0) return;
        
        const { db } = await import('@/lib/db');
        
        let name = state.songs[0].title;
        if (state.songs.length > 1) {
          name = `${state.songs[0].title} & ${state.songs.length - 1} others`;
        }
        
        await db.setlists.put({
          id: state.setlistId,
          name: name,
          songs: state.songs,
          isNnsActive: state.isNNSActive,
          annotations: state.currentAnnotation,
          lastModified: Date.now()
        });
      },
      loadFromLibrary: (saved: any) => set({
        setlistId: saved.id,
        songs: saved.songs,
        isNNSActive: saved.isNnsActive || false,
        currentAnnotation: saved.annotations || null,
        annotationHistory: [],
      }),
      importBordFile: (data: string) => {
        try {
          const parsed = JSON.parse(data);
          if (parsed.version === 1 && parsed.songs) {
            set({
              setlistId: crypto.randomUUID(),
              songs: parsed.songs,
              isNNSActive: parsed.isNNSActive || false,
              currentAnnotation: parsed.currentAnnotation || null,
              annotationHistory: [],
            });
          }
        } catch (e) {
          console.error("Failed to parse .bord file", e);
          throw new Error("Invalid .bord file format");
        }
      }
    }),
    {
      name: 'viewer-storage',
      partialize: (state) => ({ 
        scrollSpeed: state.scrollSpeed, 
        isDrawingMode: state.isDrawingMode,
        navWindowRect: state.navWindowRect,
      }),
    }
  )
);

// Auto-sync subscription
let debounceTimer: ReturnType<typeof setTimeout>;
useViewerStore.subscribe((state) => {
  if (typeof window === 'undefined') return;
  clearTimeout(debounceTimer);
  debounceTimer = setTimeout(() => {
    state.syncWithDb();
  }, 1000);
});
