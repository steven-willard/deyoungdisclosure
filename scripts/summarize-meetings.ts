/**
 * Summarize township meeting transcripts via Anthropic API.
 * Reads: scripts/meetings-output.json (scraper output with segments)
 * Writes: scripts/meetings-store.json (backing store, mirrors future D1 schema)
 *
 * Usage:
 *   npx tsx scripts/summarize-meetings.ts           # process up to 5 unsummarized
 *   npx tsx scripts/summarize-meetings.ts --max 10  # process up to 10
 *   npx tsx scripts/summarize-meetings.ts --max all # all
 *
 * Kill switch: Ctrl+C — saves progress before exiting.
 * Requires: YOUTUBE_SUMMARIZER_API_KEY env var (Anthropic)
 */

import Anthropic from "@anthropic-ai/sdk";
import { readFileSync, writeFileSync, existsSync } from "fs";
import { getDaveSpeaker } from "./identify-speakers.js";

const MAX_DEFAULT = 5;
const STORE_PATH = "scripts/meetings-store.json";
const SOURCE_PATH = "scripts/meetings-output.json";
const MODEL = "claude-haiku-4-5-20251001";

const maxArg = process.argv.indexOf("--max");
const maxVal = maxArg !== -1 ? process.argv[maxArg + 1] : null;
const MAX = maxVal === "all" ? Infinity : maxVal ? parseInt(maxVal, 10) : MAX_DEFAULT;

// --- Types ---
export interface Highlight {
  timestamp_sec: number;
  topic: string;
  quote: string;
}

export interface DaveSegment {
  text: string;
  timestamp_sec: number;
  youtube_url: string;
  topic: string;
}

export interface MeetingRecord {
  video_id: string;
  type: string;
  date: string | null;
  youtube_url: string;
  hct_url: string;
  summary: string | null;
  highlights: Highlight[] | null;
  transcript_source: 'youtube-captions' | 'assemblyai';
  speaker_map: Record<string, string | null> | null;
  dave_segments: DaveSegment[] | null;
  deleted_at: string | null;
  scraped_at: string;
  summarized_at: string | null;
}

interface Store {
  last_synced: string;
  meetings: Record<string, MeetingRecord>;
}

// --- Load / init store ---
const store: Store = existsSync(STORE_PATH)
  ? JSON.parse(readFileSync(STORE_PATH, "utf8"))
  : { last_synced: new Date().toISOString(), meetings: {} };

function saveStore() {
  store.last_synced = new Date().toISOString();
  writeFileSync(STORE_PATH, JSON.stringify(store, null, 2));
}

let killed = false;
process.on("SIGINT", () => {
  console.log("\nInterrupted — saving progress...");
  saveStore();
  killed = true;
  process.exit(0);
});

if (!existsSync(SOURCE_PATH)) {
  console.error(`Missing ${SOURCE_PATH} — run scrape-meetings.ts first`);
  process.exit(1);
}

const source: any[] = JSON.parse(readFileSync(SOURCE_PATH, "utf8"));

for (const m of source) {
  if (!m.video_id) continue;
  if (!store.meetings[m.video_id]) {
    store.meetings[m.video_id] = {
      video_id: m.video_id,
      type: m.type,
      date: m.date ?? null,
      youtube_url: m.youtube_url ?? `https://www.youtube.com/watch?v=${m.video_id}`,
      hct_url: m.hct_url,
      summary: null,
      highlights: null,
      transcript_source: m.transcript_source ?? 'youtube-captions',
      speaker_map: m.speaker_map ?? null,
      dave_segments: null,
      deleted_at: null,
      scraped_at: m.scraped_at ?? new Date().toISOString(),
      summarized_at: null,
    };
  } else {
    // Update speaker_map if freshly scraped (BOT re-runs)
    if (m.speaker_map) {
      store.meetings[m.video_id].speaker_map = m.speaker_map;
      store.meetings[m.video_id].transcript_source = m.transcript_source ?? store.meetings[m.video_id].transcript_source;
    }
  }
}

saveStore();

const unsummarized = source.filter(
  m => m.video_id && m.segments?.length && !store.meetings[m.video_id]?.summarized_at
);

if (unsummarized.length === 0) {
  console.log("All meetings already summarized.");
  process.exit(0);
}

const toProcess = unsummarized.slice(0, MAX);
console.log(`Found ${unsummarized.length} unsummarized. Processing ${toProcess.length} (max ${MAX}).\n`);

const apiKey = process.env.YOUTUBE_SUMMARIZER_API_KEY;
if (!apiKey) {
  console.error("Missing YOUTUBE_SUMMARIZER_API_KEY environment variable");
  process.exit(1);
}
const client = new Anthropic({ apiKey });

function formatSegmentsForPrompt(segments: { text: string; offset: number }[]): string {
  return segments
    .map(s => {
      const totalSec = Math.floor(s.offset / 1000);
      const h = Math.floor(totalSec / 3600);
      const m = Math.floor((totalSec % 3600) / 60);
      const sec = totalSec % 60;
      const ts = h > 0
        ? `${h}:${String(m).padStart(2, "0")}:${String(sec).padStart(2, "0")}`
        : `${m}:${String(sec).padStart(2, "0")}`;
      return `[${ts}] ${s.text}`;
    })
    .join("\n");
}

function matchQuoteToOffset(
  quote: string,
  segments: { text: string; offset: number }[]
): number {
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

const SYSTEM_PROMPT = `You are a civic transparency assistant analyzing Holland Charter Township public meeting transcripts.
The transcript may be AI-generated — expect some noise and garbled names.
Your job is to extract what actually happened: agenda items, votes, decisions, notable public comment, and key moments.
Dave DeYoung is a Township Trustee — note anything relevant to him specifically.
IMPORTANT: The trustee's name is "DeYoung" — always write it as one word. Captions often garble it as "D. Young", "D Young", or similar. Always correct to "DeYoung".
Respond ONLY with valid JSON matching the schema provided. No markdown fences, no extra text.`;

/** Standard path: Planning Commission, ZBA — uses YouTube captions (no speaker labels). */
async function summarizeStandardMeeting(m: any): Promise<{ summary: string; highlights: Highlight[] }> {
  const formatted = formatSegmentsForPrompt(m.segments);
  const prompt = `Analyze this ${m.type} meeting transcript from Holland Charter Township (date: ${m.date ?? "unknown"}).

Return JSON with this exact shape:
{
  "summary": "markdown string — 3-6 bullet points covering: agenda items discussed, votes taken (with counts if stated), key decisions, notable public comment, and anything relevant to Trustee Dave DeYoung",
  "highlights": [
    { "topic": "short topic label", "quote": "verbatim or near-verbatim quote from the transcript" }
  ]
}

highlights: include 5-10 of the most significant moments (votes, decisions, heated discussion, public comment).
The quote must be verbatim or near-verbatim from the transcript — it will be used to locate the exact timestamp.
IMPORTANT: Do not use double-quote characters inside any string value. Use single quotes or rephrase to avoid nesting.

TRANSCRIPT:
${formatted}`;

  const response = await client.messages.create({ model: MODEL, max_tokens: 4096, system: SYSTEM_PROMPT, messages: [{ role: "user", content: prompt }] });
  const raw = response.content[0].type === "text" ? response.content[0].text : "";
  let text = raw.replace(/^```(?:json)?\n?/m, "").replace(/\n?```$/m, "").trim();

  let parsed: { summary: string; highlights: { topic: string; quote: string }[] };
  try {
    parsed = JSON.parse(text);
  } catch {
    console.warn("  JSON parse failed — asking Claude to repair...");
    const fixRes = await client.messages.create({
      model: MODEL,
      max_tokens: 4096,
      system: "You repair malformed JSON. Return only valid JSON with no markdown fences or explanation. Escape any double-quote characters inside string values as \\\".",
      messages: [{ role: "user", content: `Fix this malformed JSON:\n\n${text}` }],
    });
    const fixedRaw = fixRes.content[0].type === "text" ? fixRes.content[0].text : "";
    text = fixedRaw.replace(/^```(?:json)?\n?/m, "").replace(/\n?```$/m, "").trim();
    parsed = JSON.parse(text);
  }

  const highlights: Highlight[] = parsed.highlights.map(h => ({
    topic: h.topic,
    quote: h.quote,
    timestamp_sec: matchQuoteToOffset(h.quote, m.segments),
  }));

  return { summary: parsed.summary, highlights };
}

/** AssemblyAI path: Board of Trustees — uses speaker-labeled utterances. */
async function summarizeBotMeeting(
  m: any,
  speakerMap: Record<string, string | null>
): Promise<{ summary: string; highlights: Highlight[]; dave_segments: DaveSegment[] }> {
  const daveSpeaker = getDaveSpeaker(speakerMap);
  const formatted = formatSegmentsForPrompt(m.segments);

  // Speaker legend for Claude
  const legend = Object.entries(speakerMap)
    .filter(([, name]) => name)
    .map(([label, name]) => `Speaker ${label} = ${name}`)
    .join(', ');

  const prompt = `Analyze this Board of Trustees meeting from Holland Charter Township (date: ${m.date ?? "unknown"}).

Speaker legend: ${legend || 'Not available — use context clues'}.
Dave DeYoung's speaker label: ${daveSpeaker ? `Speaker ${daveSpeaker}` : 'Unknown — look for him by name in context'}.

Return JSON with this exact shape:
{
  "summary": "markdown string — 3-6 bullet points covering: agenda items discussed, votes taken (with counts), key decisions, notable public comment",
  "highlights": [
    { "topic": "short topic label", "quote": "verbatim or near-verbatim quote from the transcript" }
  ],
  "dave_statements": [
    { "topic": "short label (5 words max)", "quote": "verbatim quote of what Dave said" }
  ]
}

highlights: 5-10 most significant moments (votes, decisions, heated exchanges, public comment).
dave_statements: ALL substantive statements made by Dave DeYoung (identified by Speaker ${daveSpeaker ?? '?'}). Include every meaningful thing he said — questions, motions, comments, arguments. Skip procedural one-word responses like "yes" or "so moved" unless they are the only record of his vote on a significant item. Minimum 3, no maximum.
Quotes must be verbatim or near-verbatim from the transcript for timestamp matching.
IMPORTANT: Do not use double-quote characters inside any string value. Use single quotes or rephrase.

TRANSCRIPT (Speaker labels in [brackets]):
${formatted}`;

  const response = await client.messages.create({ model: MODEL, max_tokens: 8192, system: SYSTEM_PROMPT, messages: [{ role: "user", content: prompt }] });
  const raw = response.content[0].type === "text" ? response.content[0].text : "";
  let text = raw.replace(/^```(?:json)?\n?/m, "").replace(/\n?```$/m, "").trim();

  let parsed: { summary: string; highlights: { topic: string; quote: string }[]; dave_statements: { topic: string; quote: string }[] };
  try {
    parsed = JSON.parse(text);
  } catch {
    console.warn("  JSON parse failed — asking Claude to repair...");
    const fixRes = await client.messages.create({
      model: MODEL,
      max_tokens: 8192,
      system: "You repair malformed JSON. Return only valid JSON with no markdown fences or explanation. Escape any double-quote characters inside string values as \\\".",
      messages: [{ role: "user", content: `Fix this malformed JSON:\n\n${text}` }],
    });
    const fixedRaw = fixRes.content[0].type === "text" ? fixRes.content[0].text : "";
    text = fixedRaw.replace(/^```(?:json)?\n?/m, "").replace(/\n?```$/m, "").trim();
    parsed = JSON.parse(text);
  }

  const highlights: Highlight[] = (parsed.highlights ?? []).map(h => ({
    topic: h.topic,
    quote: h.quote,
    timestamp_sec: matchQuoteToOffset(h.quote, m.segments),
  }));

  const youtubeBase = m.youtube_url ?? `https://www.youtube.com/watch?v=${m.video_id}`;
  const dave_segments: DaveSegment[] = (parsed.dave_statements ?? []).map(d => {
    const sec = matchQuoteToOffset(d.quote, m.segments);
    return {
      text: d.quote,
      timestamp_sec: sec,
      youtube_url: `${youtubeBase}&t=${sec}`,
      topic: d.topic,
    };
  });

  return { summary: parsed.summary, highlights, dave_segments };
}

// --- Main loop ---
let processed = 0;

for (const m of toProcess) {
  if (killed) break;

  const isBot = m.transcript_source === 'assemblyai';
  const speakerMap: Record<string, string | null> = m.speaker_map ?? {};
  console.log(`[${processed + 1}/${toProcess.length}] ${m.type} — ${m.date ?? "unknown"} (${m.video_id}) [${isBot ? 'AssemblyAI' : 'captions'}]`);

  try {
    if (isBot && Object.keys(speakerMap).length > 0) {
      const result = await summarizeBotMeeting(m, speakerMap);
      store.meetings[m.video_id].summary = result.summary;
      store.meetings[m.video_id].highlights = result.highlights;
      store.meetings[m.video_id].dave_segments = result.dave_segments;
      store.meetings[m.video_id].speaker_map = speakerMap;
      store.meetings[m.video_id].transcript_source = 'assemblyai';
      console.log(`  Done — ${result.highlights?.length ?? 0} highlights, ${result.dave_segments?.length ?? 0} Dave segments`);
    } else {
      const result = await summarizeStandardMeeting(m);
      store.meetings[m.video_id].summary = result.summary;
      store.meetings[m.video_id].highlights = result.highlights;
      if (isBot) console.log(`  Note: AssemblyAI meeting but no speaker map — used standard summarization`);
      console.log(`  Done — ${result.highlights?.length ?? 0} highlights`);
    }

    store.meetings[m.video_id].summarized_at = new Date().toISOString();
    saveStore();
    processed++;
  } catch (e: any) {
    console.error(`  FAILED: ${e.message}\n`);
  }
}

console.log(`\nSummarized ${processed} meetings. Store saved to ${STORE_PATH}.`);
const remaining = unsummarized.length - processed;
if (remaining > 0) console.log(`${remaining} remaining — run again to continue.`);
