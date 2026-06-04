'use client';

import { useEffect, useRef } from 'react';
import { useMetronomeStore } from '@/store/metronomeStore';

const LOOKAHEAD_MS = 25.0; // How often to wake up and schedule (ms)
const SCHEDULE_AHEAD_TIME_S = 0.1; // How far ahead to schedule audio (sec)

export function useMetronomeEngine() {
  const { isPlaying, bpm, timeSignature, setCurrentBeat, stop } = useMetronomeStore();

  const audioContextRef = useRef<AudioContext | null>(null);
  const click1BufferRef = useRef<AudioBuffer | null>(null);
  const click2BufferRef = useRef<AudioBuffer | null>(null);

  const isPlayingRef = useRef(isPlaying);
  const bpmRef = useRef(bpm);
  const timeSignatureRef = useRef(timeSignature);

  // Sync refs so the setInterval/rAF loop always sees the latest state without tearing down
  useEffect(() => { isPlayingRef.current = isPlaying; }, [isPlaying]);
  useEffect(() => { bpmRef.current = bpm; }, [bpm]);
  useEffect(() => { timeSignatureRef.current = timeSignature; }, [timeSignature]);

  // Metronome loop state
  const nextNoteTimeRef = useRef(0.0);
  const currentBeatInBarRef = useRef(0);
  const timerIDRef = useRef<number | null>(null);

  // Queue of notes for UI synchronization
  const notesInQueueRef = useRef<{ note: number; time: number }[]>([]);
  const lastBeatDrawnRef = useRef(-1);
  const rAFIdRef = useRef<number | null>(null);

  // --- 1. Audio Initialization ---
  useEffect(() => {
    let isMounted = true;
    const ACtx = window.AudioContext || (window as unknown as { webkitAudioContext?: new () => AudioContext }).webkitAudioContext;
    if (!ACtx) {
      console.warn('Web Audio API not supported');
      return;
    }

    const ctx = new ACtx();
    audioContextRef.current = ctx;

    const loadAudio = async (url: string) => {
      try {
        const response = await fetch(url);
        const arrayBuffer = await response.arrayBuffer();
        return await ctx.decodeAudioData(arrayBuffer);
      } catch (err) {
        console.error(`Failed to load audio: ${url}`, err);
        return null;
      }
    };

    Promise.all([
      loadAudio('/audio/metronome/click1.mp3'),
      loadAudio('/audio/metronome/click2.mp3'),
    ]).then(([b1, b2]) => {
      if (!isMounted) return;
      click1BufferRef.current = b1;
      click2BufferRef.current = b2;
    });

    // iOS/Safari Web Audio API Autoplay Policy Fix:
    // AudioContext must be resumed from a direct user interaction. 
    // We attach a one-time listener to the window to unlock it on the first tap/click.
    const unlockAudioContext = () => {
      if (ctx.state === 'suspended') {
        ctx.resume().then(() => {
          // Remove listeners once successfully unlocked
          window.removeEventListener('click', unlockAudioContext);
          window.removeEventListener('touchstart', unlockAudioContext);
          window.removeEventListener('keydown', unlockAudioContext);
        }).catch(err => console.warn('AudioContext unlock failed', err));
      } else {
        window.removeEventListener('click', unlockAudioContext);
        window.removeEventListener('touchstart', unlockAudioContext);
        window.removeEventListener('keydown', unlockAudioContext);
      }
    };

    window.addEventListener('click', unlockAudioContext);
    window.addEventListener('touchstart', unlockAudioContext, { passive: true });
    window.addEventListener('keydown', unlockAudioContext);

    return () => {
      isMounted = false;
      window.removeEventListener('click', unlockAudioContext);
      window.removeEventListener('touchstart', unlockAudioContext);
      window.removeEventListener('keydown', unlockAudioContext);
      ctx.close();
    };
  }, []);

  // --- 2. Metronome Engine (Web Audio Scheduler) ---
  useEffect(() => {
    const ctx = audioContextRef.current;
    if (!ctx) return;

    if (isPlaying) {
      if (ctx.state === 'suspended') {
        ctx.resume();
      }

      // Reset sequence
      currentBeatInBarRef.current = 0;
      nextNoteTimeRef.current = ctx.currentTime + 0.05; // slight delay to start
      notesInQueueRef.current = [];
      lastBeatDrawnRef.current = -1;

      // The core scheduler loop
      const scheduler = () => {
        // While there are notes that will need to play before the next interval,
        // schedule them and advance the pointer.
        while (nextNoteTimeRef.current < ctx.currentTime + SCHEDULE_AHEAD_TIME_S) {
          const beatNumber = currentBeatInBarRef.current;
          const time = nextNoteTimeRef.current;

          // 1. Push to UI queue
          notesInQueueRef.current.push({ note: beatNumber, time });

          // 2. Schedule audio
          const buffer = beatNumber === 0 ? click1BufferRef.current : click2BufferRef.current;
          if (buffer) {
            const osc = ctx.createBufferSource();
            osc.buffer = buffer;
            osc.connect(ctx.destination);
            osc.start(time);
          }

          // 3. Advance time
          const secondsPerBeat = 60.0 / bpmRef.current;
          nextNoteTimeRef.current += secondsPerBeat;
          currentBeatInBarRef.current = (currentBeatInBarRef.current + 1) % timeSignatureRef.current.beatsPerBar;
        }
        timerIDRef.current = window.setTimeout(scheduler, LOOKAHEAD_MS);
      };

      // The UI visual sync loop
      const draw = () => {
        let currentNote = lastBeatDrawnRef.current;
        const currentTime = ctx.currentTime;

        // Find the most recent note that has already played
        while (notesInQueueRef.current.length && notesInQueueRef.current[0].time < currentTime) {
          currentNote = notesInQueueRef.current[0].note;
          notesInQueueRef.current.splice(0, 1); // remove note from queue
        }

        // We only need to draw if the note has moved on
        if (lastBeatDrawnRef.current !== currentNote && currentNote !== -1) {
          setCurrentBeat(currentNote);
          lastBeatDrawnRef.current = currentNote;
        }

        rAFIdRef.current = requestAnimationFrame(draw);
      };

      scheduler();
      rAFIdRef.current = requestAnimationFrame(draw);

    } else {
      // Stopping
      if (timerIDRef.current !== null) {
        window.clearTimeout(timerIDRef.current);
        timerIDRef.current = null;
      }
      if (rAFIdRef.current !== null) {
        cancelAnimationFrame(rAFIdRef.current);
        rAFIdRef.current = null;
      }
      setCurrentBeat(0);
      if (ctx.state === 'running') {
        ctx.suspend();
      }
    }

    return () => {
      if (timerIDRef.current !== null) {
        window.clearTimeout(timerIDRef.current);
        timerIDRef.current = null;
      }
      if (rAFIdRef.current !== null) {
        cancelAnimationFrame(rAFIdRef.current);
        rAFIdRef.current = null;
      }
    };
  }, [isPlaying, setCurrentBeat]); // We do not depend on bpm or timeSignature to avoid tearing down the interval

  return null;
}
