import type { Metadata, Viewport } from "next";
import { Inter, JetBrains_Mono } from "next/font/google";
import "./globals.css";

const inter = Inter({ subsets: ["latin"], variable: "--font-inter" });
const jetbrainsMono = JetBrains_Mono({ 
  subsets: ["latin"], 
  variable: "--font-jetbrains-mono",
});

// ── SEO ──────────────────────────────────────────────────────────────────────
export const metadata: Metadata = {
  title: "Bord — Chord Sheets for Worship Musicians",
  description: "Search, transpose, and annotate chord sheets for worship music. Offline-first with Nashville Number System support.",
  icons: {
    icon: "/images/bord-logo.png",
  },
};

// ── Viewport (must be a separate export in Next.js App Router) ────────────────
// Without this, mobile browsers render at 980px and scale down,
// causing touch coordinates to not match visual element positions.
export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 5, // Allow pinch-zoom for readability on chord sheets
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="id" suppressHydrationWarning>
      <body className={`${inter.variable} ${jetbrainsMono.variable} antialiased`}>
        {children}
      </body>
    </html>
  );
}
