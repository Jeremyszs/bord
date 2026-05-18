import { NextResponse } from 'next/server';

export async function POST(request: Request) {
  try {
    const { url } = await request.json();

    if (!url) {
      return NextResponse.json({ error: 'URL is required' }, { status: 400 });
    }

    const encodedUrl = encodeURIComponent(url);

    // Try is.gd first (much more lenient with .vercel.app domains)
    try {
      const res1 = await fetch(`https://is.gd/create.php?format=simple&url=${encodedUrl}`);
      if (res1.ok) {
        const shortUrl = await res1.text();
        // is.gd returns error text sometimes even with 200 OK, so verify it starts with http
        if (shortUrl.startsWith('http')) {
          return NextResponse.json({ shortUrl });
        }
      }
    } catch (e) {
      console.warn('is.gd failed, trying TinyURL fallback...');
    }

    // Fallback to TinyURL modern API (requires TINYURL_API_TOKEN in env if authenticated, but we'll try without first)
    const tinyUrlBody = {
      url: url,
      domain: "tinyurl.com"
    };

    const res2 = await fetch('https://api.tinyurl.com/create', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${process.env.TINYURL_API_TOKEN}` // Uncomment and add your token if it fails with 401
      },
      body: JSON.stringify(tinyUrlBody)
    });

    if (!res2.ok) {
      const errData = await res2.json().catch(() => ({}));
      throw new Error(`TinyURL API responded with status: ${res2.status} - ${JSON.stringify(errData)}`);
    }

    const tinyUrlData = await res2.json();
    return NextResponse.json({ shortUrl: tinyUrlData.data.tiny_url });
  } catch (error: any) {
    console.error('URL Shortening failed:', error);
    return NextResponse.json({ error: 'Failed to shorten URL' }, { status: 500 });
  }
}
