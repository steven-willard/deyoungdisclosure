/**
 * Backfill Board of Trustees meetings with AssemblyAI transcription + speaker ID.
 *
 * Flags:
 *   (none)              Process meetings not yet transcribed with AssemblyAI
 *   --force             Re-transcribe + re-summarize all meetings (caches utterances)
 *   --resummary-only    Re-run summarization only using cached utterances (no AssemblyAI cost)
 *
 * After a --force run, --resummary-only works for all future fixes without re-transcribing.
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

if (!existsSync(STORE_PATH)) { console.error(`Missing ${STORE_PATH}`); process.exit(1); }
if (!existsSync(SOURCE_PATH)) { console.error(`Missing ${SOURCE_PATH}`); process.exit(1); }

const store = JSON.parse(readFileSync(STORE_PATH, "utf8"));
const source: any[] = JSON.parse(readFileSync(SOURCE_PATH, "utf8"));
const anthropic = new Anthropic({ apiKey: ANTHROPIC_API_KEY });

function saveStore() {
  store.last_synced = new Date().toISOString();
  writeFileSync(STORE_PATH, JSON.stringify(store, null, 2));
}

function sleep(ms: number) { return new Promise(r => setTimeout(r, ms)); }

/** Parse "5:01" or "1:05:30" to total seconds. */
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
For timestamp: copy the [M:SS] or [H:MM:SS] value from the START of the line containing that quote. This is critical for accurate deep links.
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

/** Push to D1 with retry + exponential backoff. Returns null on success, error string on failure. */
async function pushToD1(meeting: any, summary: string, highlights: any[], dave_segments: any[], speaker_map: any, summarized_at: string, maxRetries = 3): Promise<string | null> {
  const body = JSON.stringify({
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
  });

  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      const res = await fetch(`${API_URL}/api/meetings`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${DEYOUNG_API_KEY}` },
        body,
      });
      if (res.ok) return null;
      const errText = `${res.status}`;
      if (attempt < maxRetries) {
        const delay = attempt * 3000;
        console.log(`    D1 push failed (${errText}), retrying in ${delay / 1000}s... (attempt ${attempt}/${maxRetries})`);
        await sleep(delay);
      } else {
        return errText;
      }
    } catch (e: any) {
      if (attempt < maxRetries) {
        const delay = attempt * 3000;
        console.log(`    D1 push error (${e.message}), retrying in ${delay / 1000}s...`);
        await sleep(delay);
      } else {
        return e.message;
      }
    }
  }
  return 'max retries exceeded';
}

// --- Determine which meetings to process ---

const botMeetings = Object.values(store.meetings as Record<string, any>).filter(
  (m: any) => m.type === 'Board of Trustees' && !m.deleted_at
) as any[];

let toProcess: any[];
if (RESUMMARY_ONLY) {
  // Re-summarize all assemblyai meetings. If utterances cached, skip AssemblyAI.
  // If not cached, re-transcribe (avoids failing silently on missing data).
  toProcess = botMeetings.filter((m: any) => m.transcript_source === 'assemblyai');
  console.log(`\nResummary mode — ${toProcess.length} AssemblyAI meetings\n`);
} else if (FORCE) {
  toProcess = botMeetings;
  console.log(`\nForce mode — ${toProcess.length} meetings to reprocess\n`);
} else {
  toProcess = botMeetings.filter((m: any) => m.transcript_source !== 'assemblyai');
  console.log(`\nBoard of Trustees meetings: ${botMeetings.length} total, ${toProcess.length} to backfill\n`);
}

if (toProcess.length === 0) {
  console.log('Nothing to process. Use --force to reprocess all, --resummary-only to re-summarize.');
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

    const hasCachedUtterances = Array.isArray(meeting._utterances) && meeting._utterances.length > 0;

    if ((RESUMMARY_ONLY || FORCE) && hasCachedUtterances) {
      // Fast path: reconstruct from cached utterances, no AssemblyAI
      const cachedUtterances = meeting._utterances as Array<{ speaker: string; text: string; start: number; end: number }>;
      segments = cachedUtterances.map(u => ({ text: `[${u.speaker}] ${u.text}`, offset: u.start }));
      speaker_map = meeting.speaker_map ?? {};
      console.log(`  Using cached utterances (${cachedUtterances.length} utterances)`);
    } else {
      // Full pipeline: download → AssemblyAI → speaker ID
      if (!ASSEMBLYAI_API_KEY) { console.error('  Missing ASSEMBLYAI_API_KEY — needed to transcribe'); failed++; continue; }

      const result = await transcribeWithAssemblyAI(meeting.youtube_url, meeting.video_id, ASSEMBLYAI_API_KEY);
      segments = utterancesToSegments(result.utterances);

      // Cache raw utterances for future --resummary-only runs
      const utterancesToCache = result.utterances.map(u => ({
        speaker: u.speaker,
        text: u.text,
        start: u.start,
        end: u.end,
      }));
      store.meetings[meeting.video_id]._utterances = utterancesToCache;
      store.meetings[meeting.video_id].transcript_source = 'assemblyai';
      saveStore();

      console.log(`  Identifying speakers...`);
      speaker_map = await identifySpeakers(result.utterances, meeting.date, ANTHROPIC_API_KEY);
      store.meetings[meeting.video_id].speaker_map = speaker_map;
      saveStore();
    }

    const parsed = await summarize(meeting, segments, speaker_map);

    // Claude may return summary as a string or an array of bullet strings — normalize to string
    const rawSummary = parsed.summary;
    const summaryStr: string = Array.isArray(rawSummary)
      ? (rawSummary as string[]).map(s => `- ${s}`).join('\n')
      : (rawSummary ?? '');

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
      summary: summaryStr,
      highlights,
      dave_segments,
      summarized_at,
    };
    saveStore();

    // Throttle + retry D1 push
    await sleep(2000);
    const pushErr = await pushToD1(meeting, summaryStr, highlights, dave_segments, speaker_map, summarized_at);
    if (!pushErr) {
      console.log(`  ✓ Done — ${highlights.length} highlights, ${dave_segments.length} Dave segments`);
    } else {
      console.warn(`  ⚠ Summarized but D1 push failed after retries: ${pushErr}`);
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
