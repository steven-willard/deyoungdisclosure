/**
 * One-time backfill: re-transcribe all existing Board of Trustees meetings
 * with AssemblyAI and push updated records (speaker_map + dave_segments) to D1.
 *
 * Usage:
 *   ASSEMBLYAI_API_KEY=<key> YOUTUBE_SUMMARIZER_API_KEY=<key> DEYOUNG_API_KEY=<key> \
 *     npx tsx scripts/backfill-bot-meetings.ts
 *
 * Skips meetings already processed with AssemblyAI (transcript_source = 'assemblyai').
 * Add --force to reprocess everything.
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

if (!ASSEMBLYAI_API_KEY) { console.error('Missing ASSEMBLYAI_API_KEY'); process.exit(1); }
if (!ANTHROPIC_API_KEY) { console.error('Missing YOUTUBE_SUMMARIZER_API_KEY'); process.exit(1); }
if (!DEYOUNG_API_KEY) { console.error('Missing DEYOUNG_API_KEY'); process.exit(1); }

if (!existsSync(STORE_PATH)) { console.error(`Missing ${STORE_PATH} — run summarize-meetings.ts first`); process.exit(1); }
if (!existsSync(SOURCE_PATH)) { console.error(`Missing ${SOURCE_PATH} — run scrape-meetings.ts first`); process.exit(1); }

const store = JSON.parse(readFileSync(STORE_PATH, "utf8"));
const source: any[] = JSON.parse(readFileSync(SOURCE_PATH, "utf8"));

const anthropic = new Anthropic({ apiKey: ANTHROPIC_API_KEY });

function saveStore() {
  store.last_synced = new Date().toISOString();
  writeFileSync(STORE_PATH, JSON.stringify(store, null, 2));
}

function matchQuoteToOffset(quote: string, segments: { text: string; offset: number }[]): number {
  const quoteWords = quote.toLowerCase().split(/\W+/).filter(w => w.length > 3);
  if (quoteWords.length === 0) return Math.round(segments[0]?.offset / 1000 ?? 0);
  const quoteSet = new Set(quoteWords);
  let bestScore = -1;
  let bestOffset = segments[0]?.offset ?? 0;
  for (let i = 0; i < segments.length; i++) {
    const window = segments.slice(i, i + 3).map(s => s.text).join(" ").toLowerCase().split(/\W+/).filter(w => w.length > 3);
    const hits = window.filter(w => quoteSet.has(w)).length;
    const score = hits / quoteSet.size;
    if (score > bestScore) { bestScore = score; bestOffset = segments[i].offset; }
  }
  return Math.round(bestOffset / 1000);
}

// Find all BOT meetings in meetings-store.json
const botMeetings = Object.values(store.meetings as Record<string, any>).filter(
  (m: any) => m.type === 'Board of Trustees' && !m.deleted_at
);

const toProcess = FORCE
  ? botMeetings
  : botMeetings.filter((m: any) => m.transcript_source !== 'assemblyai');

console.log(`\nBoard of Trustees meetings: ${botMeetings.length} total, ${toProcess.length} to backfill${FORCE ? ' (--force)' : ''}\n`);

if (toProcess.length === 0) {
  console.log('Nothing to backfill. Use --force to reprocess all.');
  process.exit(0);
}

let processed = 0;
let failed = 0;

for (const meeting of toProcess) {
  console.log(`[${processed + failed + 1}/${toProcess.length}] ${meeting.date ?? 'unknown'} (${meeting.video_id})`);

  // Find raw data in meetings-output.json for this video_id
  const raw = source.find((m: any) => m.video_id === meeting.video_id);
  const youtubeUrl = meeting.youtube_url;

  if (!youtubeUrl) {
    console.warn('  No YouTube URL — skipping');
    failed++;
    continue;
  }

  try {
    // 1. Transcribe with AssemblyAI
    const result = await transcribeWithAssemblyAI(youtubeUrl, meeting.video_id, ASSEMBLYAI_API_KEY);

    const utterances = result.utterances.map(u => ({
      speaker: u.speaker,
      text: u.text,
      start: u.start,
      end: u.end,
    }));

    const segments = utterancesToSegments(result.utterances);

    // 2. Identify speakers
    console.log(`  Identifying speakers...`);
    const speaker_map = await identifySpeakers(result.utterances, meeting.date, ANTHROPIC_API_KEY);
    const daveSpeaker = getDaveSpeaker(speaker_map);

    // 3. Summarize with speaker-aware prompt
    const legend = Object.entries(speaker_map).filter(([, n]) => n).map(([k, v]) => `Speaker ${k} = ${v}`).join(', ');
    const formatted = segments.map(s => {
      const totalSec = Math.floor(s.offset / 1000);
      const h = Math.floor(totalSec / 3600);
      const m = Math.floor((totalSec % 3600) / 60);
      const sec = totalSec % 60;
      const ts = h > 0 ? `${h}:${String(m).padStart(2,'0')}:${String(sec).padStart(2,'0')}` : `${m}:${String(sec).padStart(2,'0')}`;
      return `[${ts}] ${s.text}`;
    }).join('\n');

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
  "highlights": [{ "topic": "short label", "quote": "verbatim or near-verbatim quote" }],
  "dave_statements": [{ "topic": "label (5 words max)", "quote": "verbatim quote of what Dave said" }]
}

highlights: 5-10 most significant moments. dave_statements: ALL substantive things Dave said.
Do not use double-quote characters inside string values — use single quotes or rephrase.

TRANSCRIPT:
${formatted}`
      }]
    });

    const raw2 = response.content[0].type === 'text' ? response.content[0].text : '';
    const text = raw2.replace(/^```(?:json)?\n?/m, '').replace(/\n?```$/m, '').trim();
    let parsed: any;
    try { parsed = JSON.parse(text); }
    catch {
      const fix = await anthropic.messages.create({
        model: MODEL, max_tokens: 8192,
        system: 'Repair malformed JSON. Return only valid JSON. Escape inner double-quotes as \\".',
        messages: [{ role: 'user', content: `Fix:\n\n${text}` }]
      });
      parsed = JSON.parse((fix.content[0] as any).text.replace(/^```(?:json)?\n?/m, '').replace(/\n?```$/m, '').trim());
    }

    const youtubeBase = meeting.youtube_url;
    const dave_segments = (parsed.dave_statements ?? []).map((d: any) => {
      const sec = matchQuoteToOffset(d.quote, segments);
      return { text: d.quote, timestamp_sec: sec, youtube_url: `${youtubeBase}&t=${sec}`, topic: d.topic };
    });

    const highlights = (parsed.highlights ?? []).map((h: any) => ({
      topic: h.topic, quote: h.quote,
      timestamp_sec: matchQuoteToOffset(h.quote, segments),
    }));

    // 4. Update store
    store.meetings[meeting.video_id] = {
      ...store.meetings[meeting.video_id],
      summary: parsed.summary,
      highlights,
      transcript_source: 'assemblyai',
      speaker_map,
      dave_segments,
      summarized_at: new Date().toISOString(),
    };
    saveStore();

    // 5. Push to D1
    const pushRes = await fetch(`${API_URL}/api/meetings`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${DEYOUNG_API_KEY}` },
      body: JSON.stringify({
        video_id: meeting.video_id,
        type: meeting.type,
        date: meeting.date,
        youtube_url: meeting.youtube_url,
        hct_url: meeting.hct_url,
        summary: parsed.summary,
        highlights,
        transcript_source: 'assemblyai',
        speaker_map,
        dave_segments,
        scraped_at: meeting.scraped_at,
        summarized_at: store.meetings[meeting.video_id].summarized_at,
      }),
    });

    if (pushRes.ok) {
      console.log(`  ✓ Done — ${highlights.length} highlights, ${dave_segments.length} Dave segments`);
    } else {
      console.warn(`  ⚠ Summarized but D1 push failed: ${pushRes.status}`);
    }

    processed++;
  } catch (e: any) {
    console.error(`  ✗ FAILED: ${e.message}`);
    failed++;
  }

  console.log();
}

console.log(`\nBackfill complete — ${processed} succeeded, ${failed} failed.`);
if (failed > 0) console.log(`Re-run to retry failed meetings.`);
