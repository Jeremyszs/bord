import { NextResponse } from 'next/server';
import { scrapeJrchord } from '@/lib/scrapers/jrchord';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const songTitle = searchParams.get('songTitle')?.trim();

  if (!songTitle) {
    return NextResponse.json({ error: 'Missing songTitle parameter' }, { status: 400 });
  }

  try {
    const songData = await scrapeJrchord(songTitle);
    return NextResponse.json(songData);
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error);
    console.error('[scrape] Error:', msg);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
