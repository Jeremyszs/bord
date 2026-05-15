import { scrapeJrchord } from './jrchord';
import { ScrapedSongObject } from '@/types';

export async function scrapeSong(songTitle: string): Promise<ScrapedSongObject> {
  return scrapeJrchord(songTitle);
}
