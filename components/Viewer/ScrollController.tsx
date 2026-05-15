'use client';

import { useEffect, useRef } from 'react';
import { useViewerStore } from '@/store/viewerStore';

export default function ScrollController() {
  // Use refs for values read inside the rAF loop to avoid stale closures
  const isPlayingRef = useRef(false);
  const targetSpeedRef = useRef(0);
  const currentSpeedRef = useRef(0);
  const requestRef = useRef<number | undefined>(undefined);

  const { isPlaying, scrollSpeed } = useViewerStore();

  // Sync store values into refs so the rAF loop always reads the latest
  useEffect(() => {
    isPlayingRef.current = isPlaying;
    targetSpeedRef.current = isPlaying
      ? 0.1 + (scrollSpeed / 100) * 2.9   // 0.1 – 3.0 px / frame
      : 0;
  }, [isPlaying, scrollSpeed]);

  // Start the animation loop once on mount — it never needs to restart
  useEffect(() => {
    const animate = () => {
      // Lerp toward target for smooth accel / decel
      currentSpeedRef.current +=
        (targetSpeedRef.current - currentSpeedRef.current) * 0.05;

      if (currentSpeedRef.current > 0.01) {
        window.scrollBy({ top: currentSpeedRef.current, behavior: 'instant' });
      }

      requestRef.current = requestAnimationFrame(animate);
    };

    requestRef.current = requestAnimationFrame(animate);

    return () => {
      if (requestRef.current !== undefined) {
        cancelAnimationFrame(requestRef.current);
      }
    };
  }, []); // ← empty: loop starts once and reads from refs forever

  return null;
}
