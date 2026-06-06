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
export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 5,
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="id" suppressHydrationWarning>
      <head>
        {/* ── Prevent FOUC — apply dark class before React hydrates ── */}
        <script
          dangerouslySetInnerHTML={{
            __html: `
              try {
                var theme = JSON.parse(localStorage.getItem('bord-theme') || '{}');
                if (theme.state && theme.state.theme === 'dark') {
                  document.documentElement.classList.add('dark');
                }
              } catch(e) {}
            `,
          }}
        />
      </head>
      <body className={`${inter.variable} ${jetbrainsMono.variable} antialiased`}>
        {children}
      </body>
    </html>
  );
}
