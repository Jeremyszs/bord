# Bord

**Bord** is a production-ready, offline-first Next.js web application built specifically for worship musicians. It provides a premium, highly functional tool to search, transpose, annotate, and organize chord sheets without requiring cloud accounts or an active internet connection after the initial fetch.

## ✨ Key Features

- **High-Speed Song Search & Scraping**: Instantly search and scrape chord sheets directly from JrChord.com.
- **Offline-First Library**: Save setlists locally to your browser using IndexedDB. Access your music anywhere, anytime, even without an internet connection.
- **Advanced Music Engine**:
  - **Transposition**: Shift the key of any song up or down seamlessly.
  - **Nashville Number System (NNS)**: Instantly convert chords to NNS based on the song's current transposed key.
- **MIDI Controller Integration**: 
  - Connect your hardware MIDI controller via the Web MIDI API.
  - Features a floating, resizable 88-key visual piano window.
  - Real-time chord detection (powered by Tonal.js) on all 128 MIDI notes with zero-latency visual feedback.
  - Includes a clickable virtual keyboard for testing without hardware.
- **Canvas Annotations**: Draw directly on your chord sheets using a built-in Fabric.js canvas overlay. Annotations are saved locally with your setlist.
- **PDF Export**: Export your setlists to clean, stylized PDF documents (using jsPDF & html2canvas) for printing or sharing.
- **Auto-Scroll**: Hands-free scrolling with adjustable speed controls.
- **Premium UI/UX**: Built with Tailwind CSS, featuring glassmorphism, responsive design, and smooth interactions optimized for both desktop and mobile devices.

## 🛠️ Technology Stack

- **Framework**: [Next.js 14/15 App Router](https://nextjs.org/)
- **Language**: [TypeScript](https://www.typescriptlang.org/)
- **Styling**: [Tailwind CSS](https://tailwindcss.com/)
- **State Management**: [Zustand](https://zustand-demo.pmnd.rs/) (with persistence middleware)
- **Local Database**: [Dexie.js](https://dexie.org/) (IndexedDB wrapper)
- **Scraping**: [Cheerio](https://cheerio.js.org/)
- **Music Theory**: [Tonal.js](https://github.com/tonaljs/tonal)
- **Canvas/Drawing**: [Fabric.js](http://fabricjs.com/)
- **Exporting**: [jsPDF](https://parall.ax/products/jspdf) + [html2canvas](https://html2canvas.hertzen.com/)
- **Window Management**: [react-rnd](https://github.com/bokuweb/react-rnd)

## 🚀 Getting Started

### Prerequisites
- Node.js (v18 or higher recommended)
- npm, yarn, pnpm, or bun

### Installation

1. **Clone the repository:**
   ```bash
   git clone <repository-url>
   cd Bord
   ```

2. **Install dependencies:**
   ```bash
   npm install
   ```

3. **Start the development server:**
   ```bash
   npm run dev
   ```

4. Open [http://localhost:3000](http://localhost:3000) with your browser to see the application.
5. You can also use [Bord](https://bord-phi.vercel.app) directly.

## 📱 Usage

1. **Search**: Enter a worship song title on the home page.
2. **View & Edit**: Use the bottom control panel to transpose, toggle NNS, draw annotations, or adjust auto-scroll speed.
3. **MIDI**: Click the Piano icon to open the MIDI detector. Play chords on your connected MIDI keyboard or click the virtual keys.
4. **Save**: Click the save icon to store the setlist in your local library.
5. **Export**: Use the export button to download a `.bord` backup file or a PDF.

## 📄 Documentation

For a detailed breakdown of the application's architecture and modules, please refer to [documentation.md](./documentation.md).
