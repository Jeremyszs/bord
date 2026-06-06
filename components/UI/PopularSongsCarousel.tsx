'use client';

import React from 'react';

const SONGS = [
  'Bejana-Mu',
  'Sampai Akhir Hidupku',
  'Kau Tuhan Hidupku',
  'Waktu Tuhan',
  'Ku Percaya Janji-Mu',
  'Kemenangan Terjadi Disini',
  'Kudus Kuduslah Tuhan',
  'Engkau Di Dalamku',
  'Kau Rajaku',
  'Bersamamu',
  'Diberkatilah Ia Yang Datang',
  'Ku Nyanyi Haleluya',
  'Kekuatan Hatiku',
  'Satu-satunya Harapan',
  'Seperti Surgamu',
  'Tuhan Kau Ajaib',
  'Dalam Yesus',
  'Symphony Yang Indah',
  'Kutinggikan Kau Tuhan-Mu',
  'Nyanyi Bagi Dia',
  'Seperti Rusa Yang Haus',
  'Sentuh Hatiku',
  'Bagi Tuhan Tak Ada Yang Mustahil',
  'Jangan Lelah',
  'Lingkupiku',
  'Ku Hidup Bagi-Mu',
  'Hatiku Percaya',
  'Walau Seribu Rebah',
  'Allah Peduli',
  'Mukjizat Itu Nyata',
  'Bersuka Dalam Tuhan',
  'Kuhidup Karena Anugerah-Mu',
  'Sebab Tuhan Maha Besar',
  'Dia Lahir Untuk Kami',
  'Betapa Hebat',
  'Hati Sebagai Hamba',
  'Kau Telah Memilihku',
  'Bapa Sentuh Hatiku',
  'Kusiapkan Hatiku Tuhan',
  'Bapa Surgawi',
];

interface Props {
  onSongClick: (title: string) => void;
}

export default function PopularSongsCarousel({ onSongClick }: Props) {
  const doubled = [...SONGS, ...SONGS];

  return (
    <>
      <style>{`
        @keyframes marquee {
          0% { transform: translateX(0); }
          100% { transform: translateX(-50%); }
        }
        .marquee-track {
          animation: marquee 160s linear infinite;
          will-change: transform;
        }
        .marquee-wrapper:hover .marquee-track {
          animation-play-state: paused;
        }
        @media (prefers-reduced-motion: reduce) {
          .marquee-track { animation: none; }
        }
      `}</style>

      <div
        className="marquee-wrapper relative overflow-hidden rounded-2xl py-3"
        style={{
          maskImage: 'linear-gradient(to right, transparent 0%, black 8%, black 92%, transparent 100%)',
          WebkitMaskImage: 'linear-gradient(to right, transparent 0%, black 8%, black 92%, transparent 100%)',
        }}
      >
        <div className="marquee-track flex gap-3 w-max" style={{ touchAction: 'pan-y' }}>
          {doubled.map((song, i) => (
            <button
              key={`${i}`}
              type="button"
              onClick={() => onSongClick(song)}
              className="flex-shrink-0 px-4 py-2.5 rounded-full text-sm font-medium border transition-all duration-300 cursor-pointer select-none bg-[var(--bg-card)] border-[var(--border-subtle)] text-[var(--text-secondary)] hover:bg-[var(--accent)] hover:text-white hover:border-[var(--accent)] hover:shadow-[0_0_24px_var(--accent-glow)] active:scale-95"
              style={{ touchAction: 'manipulation' }}
            >
              {song}
            </button>
          ))}
        </div>
      </div>
    </>
  );
}
