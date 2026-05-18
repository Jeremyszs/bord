import { NextResponse } from 'next/server';

export async function POST(request: Request) {
  try {
    const { url } = await request.json();
    
    if (!url) {
      return NextResponse.json({ error: 'URL is required' }, { status: 400 });
    }

    // Use TinyURL's free API to shorten the massive hash link
    const res = await fetch(`https://tinyurl.com/api-create.php?url=${encodeURIComponent(url)}`);
    
    if (!res.ok) {
      throw new Error(`TinyURL API responded with status: ${res.status}`);
    }
    
    const shortUrl = await res.text();
    
    return NextResponse.json({ shortUrl });
  } catch (error: any) {
    console.error('URL Shortening failed:', error);
    return NextResponse.json({ error: 'Failed to shorten URL' }, { status: 500 });
  }
}
