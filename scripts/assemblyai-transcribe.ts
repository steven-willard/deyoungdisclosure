/**
 * Download YouTube audio and transcribe via AssemblyAI with speaker diarization.
 * Used exclusively for Board of Trustees meetings.
 */

import { AssemblyAI } from 'assemblyai';
import ytdl from '@distube/ytdl-core';
import { createWriteStream, unlinkSync, existsSync, mkdirSync } from 'fs';
import { pipeline } from 'stream/promises';
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

export async function transcribeWithAssemblyAI(
  youtubeUrl: string,
  videoId: string,
  apiKey: string
): Promise<AssemblyResult> {
  const client = new AssemblyAI({ apiKey });

  const tempDir = join(tmpdir(), 'deyoung-transcribe');
  if (!existsSync(tempDir)) mkdirSync(tempDir, { recursive: true });
  const tempPath = resolve(join(tempDir, `${videoId}.webm`));

  console.log(`    Downloading audio from YouTube...`);
  const audioStream = ytdl(youtubeUrl, { quality: 'highestaudio', filter: 'audioonly' });
  await pipeline(audioStream, createWriteStream(tempPath));
  console.log(`    Audio downloaded. Submitting to AssemblyAI...`);

  try {
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

    const wordCount = words.length.toLocaleString();
    const durationMin = Math.round((transcript.audio_duration ?? 0) / 60);
    console.log(`    Transcription complete — ${wordCount} words, ~${durationMin} min audio`);

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
