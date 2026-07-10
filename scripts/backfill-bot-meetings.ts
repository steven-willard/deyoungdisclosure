/**
 * Backfill Board of Trustees meetings with AssemblyAI transcription + speaker ID.
 *
 * Flags:
 *   (none)              Process meetings not yet transcribed with AssemblyAI
 *   --force             Re-transcribe + re-summarize all meetings
 *   --resummary-only    Re-run summarization only (no AssemblyAI) using stored segments
 *
 * Usage:
 *   ASSEMBLYAI_API_KEY=<key> YOUTUBE_SUMMARIZER_API_KEY=<key> DEYOUNG_API_KEY=<key> \
 *     npx tsx scripts/backfill-bot-meetings.ts [--force | --resummary-only]
 */

import { readFileSync, writeFileSync, existsSync } from "fs";
import Anthropic from "@anthropic-ai/sdk";
import { transcribeWithAssemblyAI, utterancesToSegments } from "./assemblyai-transcribe.js";
import { identifySpeakers, getDaveSpeaker } from "./identify-speakers.js";

const STORE_PATH = "scripts/meetings-store.json";
const SOURCE_PATH = "scripts/meetings-output.json";
const API_URL = "https://deyoungdisclosure.com";
const MODEL = "claude-haiku-4-5-20251001";

const ASSEMBLYAI_API_KEY = process.env.ASSEMBLYAI_API_KEY ?? '';
const ANTHROPIC_API_KEY = process.env.YOUTUBE_SUMMARIZER_API_KEY ?? '';
const DEYOUNG_API_KEY = process.env.DEYOUNG_API_KEY ?? '';
const FORCE = process.argv.includes('--force');
const RESUMMARY_ONLY = process.argv.includes('--resummary-only');

if (!ANTHROPIC_API_KEY) { console.error('Missing YOUTUBE_SUMMARIZER_API_KEY'); process.exit(1); }
if (!DEYOUNG_API_KEY) { console.error('Missing DEYOUNG_API_KEY'); process.exit(1); }
if (!RESUMMARY_ONLY && !ASSEMBLYAI_API_KEY) { console.error('Missing ASSEMBLYAI_API_KEY (required unless using --resummary-only)'); process.exit(1); }

if (!existsSync(STORE_PATH)) { console.error(`Missing ${STORE_PATH} — run summarize-meetings.ts first`); process.exit(1); }
if (!existsSync(SOURCE_PATH)) { console.error(`Missing ${SOURCE_PATH} — run scrape-meetings.ts first`); process.exit(1); }

const store = JSON.parse(readFileSync(STORE_PATH, "utf8"));
const source: any[] = JSON.parse(readFileSync(SOURCE_PATH, "utf8"));
const anthropic = new Anthropic({ apiKey: ANTHROPIC_API_KEY });

function saveStore() {
  store.last_synced = new Date().toISOString();
  writeFileSync(STORE_PATH, JSON.stringify(store, null, 2));
}

/** Parse "5:01" or "1:05:30" to seconds. */
function parseTimestamp(ts: string): number {
  const parts = ts.trim().split(':').map(Number);
  if (parts.length === 3) return parts[0] * 3600 + parts[1] * 60 + parts[2];
  if (parts.length === 2) return parts[0] * 60 + parts[1];
  return parts[0] ?? 0;
}

function formatSegments(segments: { text: string; offset: number }[]): string {
  return segments.map(s => {
    const totalSec = Math.floor(s.offset / 1000);
    const h = Math.floor(totalSec / 3600);
    const m = Math.floor((totalSec % 3600) / 60);
    const sec = totalSec % 60;
    const ts = h > 0
      ? `${h}:${String(m).padStart(2, '0')}:${String(sec).padStart(2, '0')}`
      : `${m}:${String(sec).padStart(2, '0')}`;
    return `[${ts}] ${s.text}`;
  }).join('\n');
}

async function summarize(meeting: any, segments: { text: string; offset: number }[], speaker_map: Record<string, string | null>) {
  const daveSpeaker = getDaveSpeaker(speaker_map);
  const legend = Object.entries(speaker_map).filter(([, n]) => n).map(([k, v]) => `Speaker ${k} = ${v}`).join(', ');
  const formatted = formatSegments(segments);

  console.log(`  Summarizing with speaker labels...`);
  const response = await anthropic.messages.create({
    model: MODEL,
    max_tokens: 8192,
    system: `You are a civic transparency assistant analyzing Holland Charter Township public meeting transcripts. Respond ONLY with valid JSON. No markdown fences, no extra text.`,
    messages: [{
      role: 'user',
      content: `Analyze this Board of Trustees meeting (date: ${meeting.date ?? 'unknown'}).
Speaker legend: ${legend || 'not available'}.
Dave DeYoung's speaker label: ${daveSpeaker ? `Speaker ${daveSpeaker}` : 'Unknown'}.

Return JSON:
{
  "summary": "markdown — 3-6 bullet points: agenda items, votes (with counts), key decisions, notable public comment",
  "highlights": [{ "topic": "short label", "quote": "verbatim or near-verbatim quote", "timestamp": "M:SS from the [M:SS] prefix on that line" }],
  "dave_statements": [{ "topic": "label (5 words max)", "quote": "verbatim quote of what Dave said", "timestamp": "M:SS from the [M:SS] prefix on that line" }]
}

highlights: 5-10 most significant moments. dave_statements: ALL substantive things Dave said.
For timestamp: copy the [M:SS] or [H:MM:SS] value that appears at the START of the line containing that quote. This is critical for accurate video deep links.
Do not use double-quote characters inside string values — use single quotes or rephrase.

TRANSCRIPT:
${formatted}`
    }]
  });

  const raw = response.content[0].type === 'text' ? response.content[0].text : '';
  const text = raw.replace(/^```(?:json)?\n?/m, '').replace(/\n?```$/m, '').trim();
  try {
    return JSON.parse(text);
  } catch {
    const fix = await anthropic.messages.create({
      model: MODEL, max_tokens: 8192,
      system: 'Repair malformed JSON. Return only valid JSON. Escape inner double-quotes as \\".',
      messages: [{ role: 'user', content: `Fix:\n\n${text}` }]
    });
    return JSON.parse((fix.content[0] as any).text.replace(/^```(?:json)?\n?/m, '').replace(/\n?```$/m, '').trim());
  }
}

async function pushToD1(meeting: any, summary: string, highlights: any[], dave_segments: any[], speaker_map: any, summarized_at: string) {
  const res = await fetch(`${API_URL}/api/meetings`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${DEYOUNG_API_KEY}` },
    body: JSON.stringify({
      video_id: meeting.video_id,
      type: meeting.type,
      date: meeting.date,
      youtube_url: meeting.youtube_url,
      hct_url: meeting.hct_url,
      summary,
      highlights,
      transcript_source: 'assemblyai',
      speaker_map,
      dave_segments,
      scraped_at: meeting.scraped_at,
      summarized_at,
    }),
  });
  return res.ok ? null : `${res.status}`;
}

// --- Determine which meetings to process ---

const botMeetings = Object.values(store.meetings as Record<string, any>).filter(
  (m: any) => m.type === 'Board of Trustees' && !m.deleted_at
);

let toProcess: any[];
if (RESUMMARY_ONLY) {
  // Only meetings that have stored segments (from a prior full run)
  toProcess = botMeetings.filter((m: any) => m.transcript_source === 'assemblyai' && m._segments);
  if (toProcess.length === 0) {
    console.error('No meetings have stored segments. Run a full backfill first (without --resummary-only).');
    process.exit(1);
  }
  console.log(`\nResummary mode — ${toProcess.length} meetings with stored segments\n`);
} else if (FORCE) {
  toProcess = botMeetings;
  console.log(`\nForce mode — ${toProcess.length} meetings to reprocess\n`);
} else {
  toProcess = botMeetings.filter((m: any) => m.transcript_source !== 'assemblyai');
  console.log(`\nBoard of Trustees meetings: ${botMeetings.length} total, ${toProcess.length} to backfill\n`);
}

if (toProcess.length === 0) {
  console.log('Nothing to process. Use --force to reprocess all, or --resummary-only to re-summarize.');
  process.exit(0);
}

let processed = 0;
let failed = 0;

for (const meeting of toProcess) {
  console.log(`[${processed + failed + 1}/${toProcess.length}] ${meeting.date ?? 'unknown'} (${meeting.video_id})`);

  if (!meeting.youtube_url) {
    console.warn('  No YouTube URL — skipping');
    failed++;
    continue;
  }

  try {
    let segments: { text: string; offset: number }[];
    let speaker_map: Record<string, string | null>;

    if (RESUMMARY_ONLY) {
      // Use stored segments + speaker map — skip AssemblyAI entirely
      segments = meeting._segments;
      speaker_map = meeting.speaker_map ?? {};
      console.log(`  Using stored segments (${segments.length} utterances)`);
    } else {
      // Full pipeline: transcribe → identify speakers → store segments
      const result = await transcribeWithAssemblyAI(meeting.youtube_url, meeting.video_id, ASSEMBLYAI_API_KEY);
      segments = utterancesToSegments(result.utterances);

      console.log(`  Identifying speakers...`);
      speaker_map = await identifySpeakers(result.utterances, meeting.date, ANTHROPIC_API_KEY);

      // Store segments so --resummary-only can use them later without re-transcribing
      store.meetings[meeting.video_id]._segments = segments;
      store.meetings[meeting.video_id].speaker_map = speaker_map;
      store.meetings[meeting.video_id].transcript_source = 'assemblyai';
      saveStore();
    }

    const parsed = await summarize(meeting, segments, speaker_map);

    const youtubeBase = meeting.youtube_url;
    const dave_segments = (parsed.dave_statements ?? []).map((d: any) => {
      const sec = d.timestamp ? parseTimestamp(d.timestamp) : 0;
      return { text: d.quote, timestamp_sec: sec, youtube_url: `${youtubeBase}&t=${sec}`, topic: d.topic };
    });

    const highlights = (parsed.highlights ?? []).map((h: any) => ({
      topic: h.topic, quote: h.quote,
      timestamp_sec: h.timestamp ? parseTimestamp(h.timestamp) : 0,
    }));

    const summarized_at = new Date().toISOString();

    store.meetings[meeting.video_id] = {
      ...store.meetings[meeting.video_id],
      summary: parsed.summary,
      highlights,
      dave_segments,
      summarized_at,
    };
    saveStore();

    const pushErr = await pushToD1(meeting, parsed.summary, highlights, dave_segments, speaker_map, summarized_at);
    if (!pushErr) {
      console.log(`  ✓ Done — ${highlights.length} highlights, ${dave_segments.length} Dave segments`);
    } else {
      console.warn(`  ⚠ Summarized but D1 push failed: ${pushErr}`);
    }

    processed++;
  } catch (e: any) {
    console.error(`  ✗ FAILED: ${e.message}`);
    failed++;
  }

  console.log();
}

console.log(`\nBackfill complete — ${processed} succeeded, ${failed} failed.`);
if (failed > 0) console.log('Re-run to retry failed meetings.');
