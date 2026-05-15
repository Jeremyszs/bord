# Bord — Chord Sheets for Worship Musicians

**Bord** is an offline-first chord sheet application built for worship musicians. Search any song on JrChord.com, transpose to any key, use Nashville Number System notation, annotate with free-draw, and organize setlists — all stored locally in your browser.

## Features

- 🔍 **Song Search** — Live search from JrChord.com
- 🎵 **Transposition** — Per-song semitone transpose with real key display (Bb, not A#)
- 🔢 **Nashville Number System** — Global NNS toggle with correct flat key support
- 📝 **Annotations** — Free-draw canvas overlay (Fabric.js) with undo
- ⏩ **Auto-Scroll** — Smooth velocity-based scrolling for hands-free reading
- 📚 **Local Library** — Persistent setlist storage via IndexedDB (Dexie)
- 📤 **Export** — `.bord` JSON bundles and PDF chord sheets
- 📥 **Import** — Open `.bord` files to restore setlists across devices
- 🗂️ **Setlist Management** — Multi-song setlists with drag-free reordering
- 📱 **Responsive** — Works on mobile, tablet, and desktop

## Tech Stack

Next.js 16 · TypeScript · Tailwind CSS v4 · Zustand · Dexie/IndexedDB · Fabric.js · Framer Motion · Cheerio · jsPDF · html2canvas

## Getting Started

```bash
git clone https://github.com/YOUR_USERNAME/bord.git
cd bord
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000)

## Deployment

See the full step-by-step guide in [VERCEL_DEPLOYMENT.md](./VERCEL_DEPLOYMENT.md).

Quick version:
1. Push to GitHub
2. Import to [vercel.com](https://vercel.com) (free Hobby plan)
3. Deploy — no environment variables needed

## Documentation

Full technical documentation: [BORD_DOCUMENTATION.md](./BORD_DOCUMENTATION.md)

Covers architecture, algorithms, component APIs, database schema, and known limitations.

## Data & Privacy

- **No cloud storage** — all setlists stored locally in browser IndexedDB
- **No account required** — search is server-proxied through JrChord.com
- **Portable** — export `.bord` files to move data between browsers/devices
