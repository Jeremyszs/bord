'use client';

import React, { useState, useRef, useEffect, useCallback } from 'react';
import Link from 'next/link';
import {
  Upload, Loader2, Play, Pause,
  Music, Clock, Target, Hash,
  XCircle, ChevronLeft,
} from 'lucide-react';
import type { AnalysisResultResponse, ChordSegment } from '@/lib/audio-analysis/types';

// ─── Colour palette (matches existing Bord design) ────────────────────────────
const BLUE = '#007AFF';
const LIGHT_BG = '#f8f9fa';

// ─── Chord Engine API (CORS is open — direct browser calls, no proxy needed) ──
const ENGINE_BASE = 'https://jeremyszs-chord-engine.hf.space/api/v1';

// ─── Chord label mapper: API "Root:quality" → display chord ───────────────────
// API returns "C:maj", "A:min", "G:7", "F:maj7", "N" (silence), "X" (percussion)
function formatChordLabel(label: string): string {
  if (label === 'N') return '—';
  if (label === 'X') return '×';

  const parts = label.split(':');
  if (parts.length !== 2) return label;

  const [root, quality] = parts;

  const qualityMap: Record<string, string> = {
    'maj': '',
    'min': 'm',
    'm': 'm',
    '7': '7',
    'maj7': 'M7',
    'min7': 'm7',
    'm7': 'm7',
    'dim': '°',
    'dim7': '°7',
    'aug': '+',
    'sus4': 'sus4',
    'sus2': 'sus2',
    '7sus4': '7sus4',
    'm7b5': 'm7♭5',
    '6': '6',
    'm6': 'm6',
    'add9': 'add9',
    '9': '9',
    'maj9': 'M9',
  };

  const suffix = qualityMap[quality] ?? (quality ? quality : '');
  return `${root}${suffix}`;
}

// ─── Time formatting ──────────────────────────────────────────────────────────
function fmtTime(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${m}:${s.toString().padStart(2, '0')}`;
}

// ─── Audio file validation ────────────────────────────────────────────────────
const ALLOWED_EXTS = ['mp3', 'wav', 'flac', 'ogg', 'm4a'];
const MAX_SIZE = 50 * 1024 * 1024; // 50MB

function validateAudioFile(file: File): string | null {
  const ext = file.name.split('.').pop()?.toLowerCase();
  if (!ext || !ALLOWED_EXTS.includes(ext)) {
    return `Unsupported format (.${ext}). Use mp3, wav, flac, ogg, or m4a.`;
  }
  if (file.size === 0) return 'File is empty.';
  if (file.size > MAX_SIZE) return 'File exceeds 50MB limit.';
  return null;
}

// ─── Main Page ────────────────────────────────────────────────────────────────
export default function ChordAnalyzerPage() {
  // ── State ──────────────────────────────────────────────────────────────────
  const [phase, setPhase] = useState<'idle' | 'uploading' | 'processing' | 'completed' | 'failed'>('idle');
  const [progress, setProgress] = useState(0);
  const [statusMsg, setStatusMsg] = useState('');
  const [jobId, setJobId] = useState<string | null>(null);
  const [result, setResult] = useState<AnalysisResultResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [audioFile, setAudioFile] = useState<File | null>(null);
  const [audioUrl, setAudioUrl] = useState<string | null>(null);

  // Audio playback state
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [activeSegmentIdx, setActiveSegmentIdx] = useState<number>(-1);

  const audioRef = useRef<HTMLAudioElement | null>(null);
  const rafRef = useRef<number | null>(null);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const resultRef = useRef(result);
  const segmentsRef = useRef<ChordSegment[]>([]);

  // Keep refs in sync with state (avoids stale closures in RAF loop)
  useEffect(() => { resultRef.current = result; }, [result]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (pollRef.current) clearInterval(pollRef.current);
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
      if (audioUrl) URL.revokeObjectURL(audioUrl);
    };
  }, [audioUrl]);

  // ── Upload & Poll ──────────────────────────────────────────────────────────

  const handleFileSelect = useCallback((file: File) => {
    const validationError = validateAudioFile(file);
    if (validationError) {
      setError(validationError);
      return;
    }

    setError(null);
    setResult(null);
    setPhase('idle');
    setProgress(0);
    setActiveSegmentIdx(-1);
    setIsPlaying(false);
    setCurrentTime(0);
    setDuration(0);

    if (audioUrl) URL.revokeObjectURL(audioUrl);

    setAudioFile(file);
    setAudioUrl(URL.createObjectURL(file));
  }, [audioUrl]);

  const handleFileChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) handleFileSelect(file);
    if (fileInputRef.current) fileInputRef.current.value = '';
  }, [handleFileSelect]);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    const file = e.dataTransfer.files?.[0];
    if (file) handleFileSelect(file);
  }, [handleFileSelect]);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
  }, []);

  const startAnalysis = useCallback(async () => {
    if (!audioFile) return;

    setPhase('uploading');
    setProgress(0);
    setStatusMsg('Uploading audio file…');
    setError(null);

    try {
      const formData = new FormData();
      formData.append('audio', audioFile);

      // Call the engine directly (CORS is open: Access-Control-Allow-Origin: *)
      const uploadRes = await fetch(`${ENGINE_BASE}/jobs`, {
        method: 'POST',
        body: formData,
      });

      const uploadData = await uploadRes.json();

      if (!uploadRes.ok) {
        throw new Error(uploadData.detail || uploadData.error || 'Upload failed');
      }

      setJobId(uploadData.job_id);
      setPhase('processing');
      setStatusMsg('Analysis queued…');
      setProgress(5);

      // Start polling — construct URLs directly from the job_id
      const jobId = uploadData.job_id;

      let attempts = 0;
      const maxAttempts = 120; // 120 * 2.5s = 5 min timeout

      pollRef.current = setInterval(async () => {
        attempts++;

        try {
          const pollRes = await fetch(`${ENGINE_BASE}/jobs/${jobId}/status`);

          // 409 means not ready yet — keep polling
          if (pollRes.status === 409) {
            return; // Continue polling
          }

          // 404 means job not found
          if (pollRes.status === 404) {
            clearInterval(pollRef.current!);
            pollRef.current = null;
            setPhase('failed');
            setError('Job not found. It may have expired.');
            return;
          }

          const pollData = await pollRes.json();

          if (pollData.status === 'queued') {
            setStatusMsg('Waiting in queue…');
            setProgress(10);
          } else if (pollData.status === 'processing') {
            setStatusMsg(pollData.message || 'Analyzing audio…');
            setProgress(Math.max(15, pollData.progress ?? 50));
          } else if (pollData.status === 'completed') {
            clearInterval(pollRef.current!);
            pollRef.current = null;

            // Fetch the full result
            const resultRes = await fetch(`${ENGINE_BASE}/jobs/${jobId}/result`);
            const resultData = await resultRes.json();

            if (resultRes.ok && resultData.status === 'completed') {
              setProgress(100);
              setStatusMsg('Analysis complete!');
              segmentsRef.current = resultData.segments;
              setResult(resultData as AnalysisResultResponse);
              setDuration(resultData.duration_seconds);
              setPhase('completed');
            } else {
              throw new Error(resultData.detail || 'Failed to retrieve analysis result');
            }
          } else if (pollData.status === 'failed') {
            clearInterval(pollRef.current!);
            pollRef.current = null;
            throw new Error(pollData.error || pollData.detail || 'Analysis failed');
          }

          if (attempts >= maxAttempts) {
            clearInterval(pollRef.current!);
            pollRef.current = null;
            throw new Error('Analysis timed out after 5 minutes');
          }
        } catch (pollErr) {
          const msg = pollErr instanceof Error ? pollErr.message : 'Failed to poll analysis status';
          clearInterval(pollRef.current!);
          pollRef.current = null;
          setPhase('failed');
          setError(msg);
        }
      }, 2500);
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Failed to start analysis';
      setPhase('failed');
      setError(msg);
    }
  }, [audioFile]);

  // ── Audio Playback Sync ────────────────────────────────────────────────────

  const syncLoop = useCallback(() => {
    if (!audioRef.current) return;

    const time = audioRef.current.currentTime;
    setCurrentTime(time);

    // Find active chord segment using ref (no stale closure on result)
    const idx = segmentsRef.current.findIndex(
      (seg) => time >= seg.start && time < seg.end
    );
    setActiveSegmentIdx(idx);

    rafRef.current = requestAnimationFrame(syncLoop);
  }, []); // No deps — reads from refs only

  const togglePlayback = useCallback(() => {
    if (!audioRef.current) return;

    if (isPlaying) {
      audioRef.current.pause();
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
      setIsPlaying(false);
    } else {
      audioRef.current.play().then(() => {
        rafRef.current = requestAnimationFrame(syncLoop);
        setIsPlaying(true);
      }).catch(() => {
        // User interaction required — handled by button click
      });
    }
  }, [isPlaying, syncLoop]);

  const seekTo = useCallback((time: number) => {
    if (!audioRef.current) return;
    audioRef.current.currentTime = time;
    setCurrentTime(time);
  }, []);

  const handleSegmentClick = useCallback((segment: ChordSegment) => {
    seekTo(segment.start);
  }, [seekTo]);

  // Reset everything
  const handleReset = useCallback(() => {
    if (pollRef.current) clearInterval(pollRef.current);
    if (rafRef.current) cancelAnimationFrame(rafRef.current);
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current = null;
    }
    setPhase('idle');
    setProgress(0);
    setStatusMsg('');
    setJobId(null);
    setResult(null);
    setError(null);
    setAudioFile(null);
    if (audioUrl) URL.revokeObjectURL(audioUrl);
    setAudioUrl(null);
    setIsPlaying(false);
    setCurrentTime(0);
    setDuration(0);
    setActiveSegmentIdx(-1);
    segmentsRef.current = [];
  }, [audioUrl]);

  // Audio ended handler
  const handleAudioEnded = useCallback(() => {
    setIsPlaying(false);
    if (rafRef.current) cancelAnimationFrame(rafRef.current);
    setActiveSegmentIdx(-1);
  }, []);

  // ── Render ─────────────────────────────────────────────────────────────────
  return (
    <div className="min-h-screen font-sans" style={{ backgroundColor: LIGHT_BG }}>
      {/* ── Hidden audio element ── */}
      {audioUrl && (
        <audio
          ref={(el) => { audioRef.current = el; }}
          src={audioUrl}
          onEnded={handleAudioEnded}
          onDurationChange={() => {
            if (audioRef.current) setDuration(audioRef.current.duration);
          }}
          preload="auto"
        />
      )}

      {/* ── Loading overlay ── */}
      {(phase === 'uploading' || phase === 'processing') && (
        <div className="fixed inset-0 z-[100] bg-white/80 backdrop-blur-sm flex flex-col items-center justify-center">
          <Loader2 size={48} className="animate-spin mb-4" style={{ color: BLUE }} />
          {/* Progress bar */}
          <div className="w-64 h-2 bg-gray-200 rounded-full overflow-hidden mb-3">
            <div
              className="h-full rounded-full transition-all duration-500 ease-out"
              style={{ width: `${progress}%`, backgroundColor: BLUE }}
            />
          </div>
          <p className="text-gray-600 font-medium text-sm">{statusMsg}</p>
          {phase === 'processing' && jobId && (
            <p className="text-gray-400 text-xs mt-1 font-mono">Job: {jobId.slice(0, 8)}…</p>
          )}
        </div>
      )}

      {/* ── Fixed top bar ── */}
      <div className="fixed top-0 left-0 right-0 z-50 flex items-center justify-between px-4 sm:px-6 py-3 bg-white/80 backdrop-blur-md border-b border-gray-100">
        <div className="flex items-center gap-3">
          <Link
            href="/"
            style={{ touchAction: 'manipulation' }}
            className="flex items-center justify-center w-9 h-9 rounded-full bg-white shadow-sm active:scale-95 transition-all text-gray-500 hover:text-[#007AFF] border border-gray-200"
            title="Back to Home"
          >
            <ChevronLeft size={18} />
          </Link>
          <div className="flex items-center gap-2">
            <Link href="/" className="block w-7 h-7">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src="/images/bord-logo.png"
                alt="Bord"
                className="w-full h-full object-contain"
              />
            </Link>
            <h1 className="text-sm font-bold text-gray-800">Bord</h1>
          </div>
        </div>

        {phase === 'completed' && (
          <button
            onClick={handleReset}
            style={{ touchAction: 'manipulation' }}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-white border border-gray-200 text-xs font-semibold text-gray-500 hover:text-[#007AFF] active:scale-95 transition-all"
          >
            <Upload size={13} />
            New File
          </button>
        )}
      </div>

      {/* ── Main content ── */}
      <main className="w-full max-w-3xl mx-auto px-4 pt-20 pb-32">

        {/* ── IDLE / FAILED: Show upload area ── */}
        {(phase === 'idle' || phase === 'failed') && (
          <div className="space-y-6">
            {/* Error banner */}
            {phase === 'failed' && error && (
              <div className="flex items-start gap-3 px-4 py-3 rounded-xl border bg-red-50 border-red-200 text-red-700 text-sm">
                <XCircle size={18} className="shrink-0 mt-0.5 text-red-500" />
                <div>
                  <p className="font-semibold">Analysis failed</p>
                  <p className="text-red-600/80">{error}</p>
                  <button
                    onClick={handleReset}
                    className="mt-2 text-xs font-semibold text-red-600 hover:text-red-700 underline"
                  >
                    Try again
                  </button>
                </div>
              </div>
            )}

            {/* Upload drop zone */}
            <div
              onDrop={handleDrop}
              onDragOver={handleDragOver}
              onClick={() => fileInputRef.current?.click()}
              style={{ touchAction: 'manipulation' }}
              className={
                `relative flex flex-col items-center justify-center w-full border-2 border-dashed rounded-2xl p-10 sm:p-16 cursor-pointer transition-all group ${
                  audioFile
                    ? 'bg-blue-50/30 border-blue-300'
                    : 'border-gray-300 hover:bg-blue-50/30 hover:border-blue-300'
                }`
              }
            >
              <input
                type="file"
                accept=".mp3,.wav,.flac,.ogg,.m4a,audio/*"
                ref={fileInputRef}
                className="hidden"
                onChange={handleFileChange}
              />

              {audioFile ? (
                <>
                  <div
                    className="w-14 h-14 rounded-2xl flex items-center justify-center mb-4"
                    style={{ backgroundColor: '#007AFF' }}
                  >
                    <Music size={24} color="#fff" />
                  </div>
                  <p className="text-base font-semibold text-gray-800 mb-1">{audioFile.name}</p>
                  <p className="text-xs text-gray-400 mb-4">
                    {(audioFile.size / (1024 * 1024)).toFixed(1)} MB
                  </p>
                  <div className="flex gap-2">
                    <button
                      onClick={(e) => { e.stopPropagation(); fileInputRef.current?.click(); }}
                      style={{ touchAction: 'manipulation' }}
                      className="px-4 py-2 rounded-full text-xs font-semibold bg-gray-100 text-gray-600 hover:bg-gray-200 transition-all active:scale-95"
                    >
                      Change File
                    </button>
                    <button
                      onClick={(e) => { e.stopPropagation(); startAnalysis(); }}
                      style={{
                        touchAction: 'manipulation',
                        backgroundColor: '#007AFF',
                        boxShadow: '0 4px 14px rgba(0,122,255,0.4)',
                      }}
                      className="px-5 py-2 rounded-full text-xs font-bold text-white active:scale-95 transition-transform"
                    >
                      Analyze
                    </button>
                  </div>
                </>
              ) : (
                <>
                  <div
                    className="w-14 h-14 rounded-2xl flex items-center justify-center mb-4"
                    style={{ backgroundColor: '#007AFF' }}
                  >
                    <Upload size={22} color="#fff" />
                  </div>
                  <p className="text-sm font-semibold text-gray-700 mb-1">
                    Drop audio file or tap to browse
                  </p>
                  <p className="text-xs text-gray-400 mb-4">
                    MP3, WAV, FLAC, OGG, or M4A · Max 50MB
                  </p>
                  <span className="px-4 py-1.5 rounded-full text-xs font-semibold text-white"
                    style={{ backgroundColor: '#007AFF' }}>
                    Select File
                  </span>
                </>
              )}
            </div>

            {/* Quick tips */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              {[
                { icon: Music, title: 'Chord Detection', desc: 'AI analyzes audio to detect chords in real time' },
                { icon: Target, title: 'Key & Tempo', desc: 'Detects song key, BPM, and chord progression' },
                { icon: Clock, title: 'Timed Segments', desc: 'Every chord aligned to its exact timestamp' },
              ].map((tip, i) => (
                <div key={i} className="flex items-start gap-3 p-3 rounded-xl bg-white border border-gray-100 shadow-sm">
                  <tip.icon size={16} className="shrink-0 mt-0.5" style={{ color: BLUE }} />
                  <div>
                    <p className="text-xs font-semibold text-gray-700">{tip.title}</p>
                    <p className="text-[10px] text-gray-400 mt-0.5">{tip.desc}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ── COMPLETED: Show results ── */}
        {phase === 'completed' && result && (
          <div className="space-y-5">

            {/* ── Header: Key info cards ── */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              {[
                { label: 'Key', value: result.key, icon: Hash },
                { label: 'Tempo', value: `${Math.round(result.tempo_bpm)} BPM`, icon: Music },
                { label: 'Duration', value: fmtTime(result.duration_seconds), icon: Clock },
                { label: 'Chords', value: `${result.chord_count} detected`, icon: Target },
              ].map((item, i) => (
                <div key={i}
                  className="flex flex-col items-center justify-center p-3 sm:p-4 rounded-xl bg-white border border-gray-100 shadow-sm"
                >
                  <item.icon size={14} className="mb-1.5" style={{ color: BLUE }} />
                  <p className="text-[10px] font-semibold uppercase tracking-wider text-gray-400 mb-0.5">
                    {item.label}
                  </p>
                  <p className="text-sm sm:text-base font-bold text-gray-800">{item.value}</p>
                </div>
              ))}
            </div>

            {/* ── Progression ── */}
            {result.progression && (
              <div className="p-4 rounded-xl bg-white border border-gray-100 shadow-sm text-center">
                <p className="text-[10px] font-semibold uppercase tracking-wider text-gray-400 mb-1">Progression</p>
                <p className="text-xl sm:text-2xl font-black tracking-wide" style={{ color: BLUE }}>
                  {result.progression}
                </p>
              </div>
            )}

            {/* ── Audio Player ── */}
            <div className="p-4 sm:p-5 rounded-xl bg-white border border-gray-100 shadow-sm">
              {/* Play/pause + time */}
              <div className="flex items-center gap-3 mb-4">
                <button
                  onClick={togglePlayback}
                  style={{
                    touchAction: 'manipulation',
                    backgroundColor: isPlaying ? BLUE : '#007AFF',
                    boxShadow: '0 4px 14px rgba(0,122,255,0.4)',
                  }}
                  className="flex items-center justify-center w-10 h-10 rounded-full shrink-0 text-white active:scale-90 transition-transform"
                >
                  {isPlaying ? <Pause size={16} /> : <Play size={16} className="ml-0.5" />}
                </button>

                {/* Progress bar */}
                <div className="flex-1 relative">
                  <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden cursor-pointer"
                    onClick={(e) => {
                      const rect = e.currentTarget.getBoundingClientRect();
                      const frac = (e.clientX - rect.left) / rect.width;
                      seekTo(frac * duration);
                    }}
                  >
                    <div
                      className="h-full rounded-full transition-all duration-100"
                      style={{ width: `${duration > 0 ? (currentTime / duration) * 100 : 0}%`, backgroundColor: BLUE }}
                    />
                  </div>
                  {/* Timestamps */}
                  <div className="flex justify-between mt-1">
                    <span className="text-[10px] font-mono text-gray-400">{fmtTime(currentTime)}</span>
                    <span className="text-[10px] font-mono text-gray-400">{fmtTime(duration)}</span>
                  </div>
                </div>
              </div>

              {/* ── Current chord display ── */}
              {activeSegmentIdx >= 0 && result.segments[activeSegmentIdx] && (
                <div className="text-center py-3 border-t border-gray-100">
                  <p className="text-[10px] font-semibold uppercase tracking-wider text-gray-400 mb-1">Current Chord</p>
                  <p
                    className="text-3xl sm:text-4xl font-black leading-none"
                    style={{ color: BLUE }}
                  >
                    {formatChordLabel(result.segments[activeSegmentIdx].chord)}
                  </p>
                  <p className="text-xs text-gray-400 mt-1 font-mono">
                    {result.segments[activeSegmentIdx].roman} · {fmtTime(result.segments[activeSegmentIdx].start)} – {fmtTime(result.segments[activeSegmentIdx].end)}
                    · {Math.round(result.segments[activeSegmentIdx].confidence * 100)}% confidence
                  </p>
                </div>
              )}
            </div>

            {/* ── Chord Timeline ── */}
            <div>
              <h2 className="text-xs font-semibold uppercase tracking-wider text-gray-400 mb-2 flex items-center gap-2">
                <Hash size={12} />
                Chord Timeline
              </h2>

              <div className="space-y-1 max-h-80 overflow-y-auto pr-1" style={{ scrollbarWidth: 'thin' }}>
                {result.segments.map((seg, idx) => {
                  const isActive = idx === activeSegmentIdx;
                  return (
                    <button
                      key={idx}
                      onClick={() => handleSegmentClick(seg)}
                      style={{
                        touchAction: 'manipulation',
                        backgroundColor: isActive ? `${BLUE}10` : '#ffffff',
                        borderColor: isActive ? BLUE : '#e5e7eb',
                      }}
                      className={`w-full flex items-center gap-3 sm:gap-4 p-3 rounded-xl border transition-all active:scale-[0.99] text-left ${
                        isActive ? 'shadow-sm' : 'hover:border-blue-200 hover:bg-blue-50/30'
                      }`}
                    >
                      {/* Confidence indicator */}
                      <div
                        className="w-1 h-8 rounded-full shrink-0"
                        style={{
                          backgroundColor:
                            seg.confidence >= 0.8 ? '#34c759' :
                            seg.confidence >= 0.6 ? '#ff9500' :
                            '#ff3b30',
                          opacity: isActive ? 1 : 0.4,
                        }}
                      />

                      {/* Timestamp */}
                      <span className="text-[11px] font-mono text-gray-400 w-16 shrink-0">
                        {fmtTime(seg.start)}
                      </span>

                      {/* Chord */}
                      <span
                        className={`font-bold shrink-0 ${isActive ? 'text-base' : 'text-sm'}`}
                        style={{ color: isActive ? BLUE : '#1f2937', minWidth: '4ch' }}
                      >
                        {formatChordLabel(seg.chord)}
                      </span>

                      {/* Roman numeral */}
                      <span className={`text-xs font-mono ${isActive ? 'text-blue-500 font-bold' : 'text-gray-400'}`}>
                        {seg.roman}
                      </span>

                      {/* Duration bar */}
                      <div className="flex-1 hidden sm:block">
                        <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
                          <div
                            className="h-full rounded-full"
                            style={{
                              width: `${Math.max(3, (seg.duration / result.duration_seconds) * 100)}%`,
                              backgroundColor: isActive ? BLUE : '#d1d5db',
                            }}
                          />
                        </div>
                      </div>

                      {/* Duration text — shown only when bar is hidden */}
                      <span className="text-[10px] text-gray-400 font-mono shrink-0 sm:hidden">
                        {seg.duration.toFixed(1)}s
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* ── Processing info (subtle) ── */}
            <p className="text-center text-[10px] text-gray-300 pt-2">
              {result.audio_filename} · Processed in {result.processing_time_seconds.toFixed(1)}s
            </p>
          </div>
        )}
      </main>
    </div>
  );
}
