/**
 * Download YouTube audio and transcribe via AssemblyAI with speaker diarization.
 * Used exclusively for Board of Trustees meetings.
 *
 * Uses yt-dlp for audio download (reliable, handles YouTube's anti-bot measures).
 * Install: winget install yt-dlp.yt-dlp
 */

import { AssemblyAI } from 'assemblyai';
import { execSync } from 'child_process';
import { unlinkSync, existsSync, mkdirSync, readdirSync } from 'fs';
import { join, resolve } from 'path';
import { tmpdir } from 'os';

export interface AssemblyWord {
  text: string;
  start: number;   // ms
  end: number;     // ms
  speaker: string;
  confidence: number;
}

export interface AssemblyUtterance {
  speaker: string;
  text: string;
  start: number;   // ms
  end: number;     // ms
  words: AssemblyWord[];
}

export interface AssemblyResult {
  transcript: string;
  utterances: AssemblyUtterance[];
  words: AssemblyWord[];
}

const KEYTERMS = [
  'Dave DeYoung',
  'Holland Charter Township',
  'Russ TeSlaa',
  'Corey Broersma',
  'Steve Bulthuis',
  'Jim DeGraaf',
  'Jenny Hamzik',
  'Ottawa County',
  'Board of Trustees',
  'Douglas Brinks',
  'Bob Dykstra',
  'affirmative relief',
  'deyoungdisclosure',
];

// yt-dlp may live in WinGet's Links dir rather than on the system PATH
const YTDLP_CANDIDATES = [
  process.env.YTDLP_PATH,
  'yt-dlp',
  'C:\\Users\\rocke\\AppData\\Local\\Microsoft\\WinGet\\Links\\yt-dlp.exe',
];

function getYtDlpCmd(): string {
  for (const candidate of YTDLP_CANDIDATES) {
    if (!candidate) continue;
    try {
      execSync(`"${candidate}" --version`, { stdio: 'pipe' });
      return candidate;
    } catch {}
  }
  throw new Error('yt-dlp not found. Install with: winget install yt-dlp.yt-dlp');
}

function downloadAudio(youtubeUrl: string, videoId: string, tempDir: string): string {
  const ytdlp = getYtDlpCmd();
  // Output template without extension — yt-dlp appends .m4a after conversion
  const outputTemplate = join(tempDir, videoId);

  // Pass Node.js as the JS runtime so yt-dlp can decrypt YouTube's player script
  const nodePath = process.execPath.replace(/\\/g, '/');
  console.log(`    Downloading audio via yt-dlp...`);
  execSync(
    `"${ytdlp}" -x --audio-format m4a --no-playlist -q --js-runtimes "nodejs:${nodePath}" -o "${outputTemplate}.%(ext)s" "${youtubeUrl}"`,
    { stdio: 'pipe' }
  );

  // Find the downloaded file (should be videoId.m4a)
  const files = readdirSync(tempDir).filter(f => f.startsWith(videoId));
  if (files.length === 0) throw new Error(`yt-dlp produced no output file for ${videoId}`);

  const outPath = resolve(join(tempDir, files[0]));
  console.log(`    Audio downloaded: ${files[0]}`);
  return outPath;
}

export async function transcribeWithAssemblyAI(
  youtubeUrl: string,
  videoId: string,
  apiKey: string
): Promise<AssemblyResult> {
  const client = new AssemblyAI({ apiKey });

  const tempDir = join(tmpdir(), 'deyoung-transcribe');
  if (!existsSync(tempDir)) mkdirSync(tempDir, { recursive: true });

  // Clean up any leftover files for this video before starting
  readdirSync(tempDir).filter(f => f.startsWith(videoId)).forEach(f => {
    try { unlinkSync(join(tempDir, f)); } catch {}
  });

  const tempPath = downloadAudio(youtubeUrl, videoId, tempDir);

  try {
    console.log(`    Submitting to AssemblyAI...`);
    const transcript = await client.transcripts.transcribe({
      audio: tempPath,
      speech_models: ['universal-3-5-pro', 'universal-2'],
      speaker_labels: true,
      keyterms_prompt: KEYTERMS,
    } as any);

    if (transcript.status === 'error') {
      throw new Error(transcript.error ?? 'AssemblyAI transcription failed');
    }

    const utterances: AssemblyUtterance[] = (transcript.utterances ?? []).map((u: any) => ({
      speaker: u.speaker,
      text: u.text,
      start: u.start,
      end: u.end,
      words: (u.words ?? []).map((w: any) => ({
        text: w.text,
        start: w.start,
        end: w.end,
        speaker: w.speaker ?? u.speaker,
        confidence: w.confidence ?? 1,
      })),
    }));

    const words: AssemblyWord[] = (transcript.words ?? []).map((w: any) => ({
      text: w.text,
      start: w.start,
      end: w.end,
      speaker: w.speaker ?? 'A',
      confidence: w.confidence ?? 1,
    }));

    const durationMin = Math.round((transcript.audio_duration ?? 0) / 60);
    console.log(`    Transcription complete — ${words.length.toLocaleString()} words, ~${durationMin} min audio`);

    return { transcript: transcript.text ?? '', utterances, words };
  } finally {
    try { unlinkSync(tempPath); } catch {}
  }
}

/** Convert AssemblyAI utterances into the existing TranscriptSegment shape for backward compat. */
export function utterancesToSegments(
  utterances: AssemblyUtterance[]
): { text: string; offset: number }[] {
  return utterances.map(u => ({
    text: `[${u.speaker}] ${u.text}`,
    offset: u.start,   // ms — same convention as youtube-transcript
  }));
}
