import Dexie, { type EntityTable } from 'dexie';
import type { SavedSetlistData } from '@/types';

export interface SavedSetlist extends SavedSetlistData {}

const db = new Dexie('BordDatabase') as Dexie & {
  setlists: EntityTable<SavedSetlist, 'id'>;
};

// Schema declaration
db.version(2).stores({
  setlists: 'id, lastModified' 
});

export { db };
