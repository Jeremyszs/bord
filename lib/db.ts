import Dexie, { type EntityTable } from 'dexie';

export interface SavedSetlist {
  id: string; // A unique UUID for the setlist
  name: string; // e.g., "Bapa Engkau Baik" or "Bapa Engkau Baik & 2 others"
  songs: any[]; // The array of songs in the setlist
  isNnsActive: boolean;
  annotations: string | null;
  lastModified: number;
}

const db = new Dexie('BordDatabase') as Dexie & {
  setlists: EntityTable<SavedSetlist, 'id'>;
};

// Schema declaration
db.version(2).stores({
  setlists: 'id, lastModified' 
});

export { db };
