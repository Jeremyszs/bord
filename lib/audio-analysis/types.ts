// ─── API Request Types ──────────────────────────────────────────────────────────

export interface AudioAnalysisRequest {
  smooth_method?: 'hmm' | 'median';
  device?: 'cpu' | 'cuda';
  include_raw_chords?: boolean;
}

// ─── API Response Types ─────────────────────────────────────────────────────────

export interface JobCreatedResponse {
  job_id: string;
  status: 'queued';
  message: string;
  poll_url: string;
  result_url: string;
}

export interface JobStatusResponse {
  job_id: string;
  status: 'queued' | 'processing' | 'completed' | 'failed';
  progress: number | null;
  message: string | null;
  created_at: string | null;
  error: string | null;
}

export interface ChordSegment {
  chord: string;     // e.g. "C:maj", "A:min", "G:7"
  roman: string;     // e.g. "I", "V", "vi"
  start: number;     // seconds
  end: number;       // seconds
  duration: number;  // seconds
  confidence: number; // 0.0 - 1.0
}

export interface AnalysisResultResponse {
  job_id: string;
  status: 'completed';
  audio_filename: string;
  duration_seconds: number;
  tempo_bpm: number;
  key: string;
  progression: string;
  chord_count: number;
  segments: ChordSegment[];
  raw_chords: string | null;
  processing_time_seconds: number;
  created_at: string;
}

export type ApiErrorResponse = {
  error: string;
  detail: string;
  job_id: string | null;
};

// ─── UI State Types ────────────────────────────────────────────────────────────

export type UploadPhase =
  | 'idle'
  | 'uploading'
  | 'processing'
  | 'completed'
  | 'failed';

export interface UploadState {
  phase: UploadPhase;
  progress: number;
  message: string;
  jobId: string | null;
  result: AnalysisResultResponse | null;
  error: string | null;
  audioFile: File | null;
  audioUrl: string | null; // Blob URL for local playback
}
