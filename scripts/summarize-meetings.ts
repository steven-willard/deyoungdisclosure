/**
 * Summarize township meeting transcripts via Anthropic API.
 * Reads: scripts/meetings-output.json (scraper output with segments)
 * Writes: scripts/meetings-store.json (backing store, mirrors future D1 schema)
 *
 * Usage:
 *   npx tsx scripts/summarize-meetings.ts           # process up to 5 unsummarized
 *   npx tsx scripts/summarize-meetings.ts --max 10  # process up to 10
 *   npx tsx scripts/summarize-meetings.ts --max 1   # just one
 *
 * Kill switch: Ctrl+C — saves progress before exiting.
 * Requires: ANTHROPIC_API_KEY env var
 */

import Anthropic from "@anthropic-ai/sdk";
import { readFileSync, writeFileSync, existsSync } from "fs";

const MAX_DEFAULT = 5;
const STORE_PATH = "scripts/meetings-store.json";
const SOURCE_PATH = "scripts/meetings-output.json";
const MODEL = "claude-haiku-4-5-20251001";

// --- CLI args ---
const maxArg = process.argv.indexOf("--max");
const maxVal = maxArg !== -1 ? process.argv[maxArg + 1] : null;
const MAX = maxVal === "all" ? Infinity : maxVal ? parseInt(maxVal, 10) : MAX_DEFAULT;

// --- Types ---
export interface Highlight {
  timestamp_sec: number;
  topic: string;
  quote: string;
}

export interface MeetingRecord {
  video_id: string;
  type: string;
  date: string | null;
  youtube_url: string;
  hct_url: string;
  summary: string | null;
  highlights: Highlight[] | null;
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

// Kill switch — save on Ctrl+C
let killed = false;
process.on("SIGINT", () => {
  console.log("\nInterrupted — saving progress...");
  saveStore();
  killed = true;
  process.exit(0);
});

// --- Load source ---
if (!existsSync(SOURCE_PATH)) {
  console.error(`Missing ${SOURCE_PATH} — run scrape-meetings.ts first`);
  process.exit(1);
}

const source: any[] = JSON.parse(readFileSync(SOURCE_PATH, "utf8"));

// Seed store with any meetings not yet tracked (no summary yet)
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
      deleted_at: null,
      scraped_at: m.scraped_at ?? new Date().toISOString(),
      summarized_at: null,
    };
  }
}

saveStore();

// --- Find unsummarized ---
const unsummarized = source.filter(
  m => m.video_id && m.segments?.length && !store.meetings[m.video_id]?.summarized_at
);

if (unsummarized.length === 0) {
  console.log("All meetings already summarized.");
  process.exit(0);
}

const toProcess = unsummarized.slice(0, MAX);
console.log(`Found ${unsummarized.length} unsummarized. Processing ${toProcess.length} (max ${MAX}).\n`);

// --- Anthropic client ---
const apiKey = process.env.YOUTUBE_SUMMARIZER_API_KEY;
if (!apiKey) {
  console.error("Missing YOUTUBE_SUMMARIZER_API_KEY environment variable");
  process.exit(1);
}
const client = new Anthropic({ apiKey });

function formatSegmentsForPrompt(segments: { text: string; offset: number }[]): string {
  return segments
    .map(s => {
      // offset is in milliseconds — convert to seconds first
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

const SYSTEM_PROMPT = `You are a civic transparency assistant analyzing Holland Charter Township public meeting transcripts.
The transcript is auto-generated captions — expect some noise, speaker mix-ups, and garbled names.
Your job is to extract what actually happened: agenda items, votes, decisions, notable public comment, and key moments.
Dave DeYoung is a Township Trustee — note anything relevant to him specifically.
Respond ONLY with valid JSON matching the schema provided. No markdown fences, no extra text.`;

async function summarizeMeeting(m: any): Promise<{ summary: string; highlights: Highlight[] }> {
  const formatted = formatSegmentsForPrompt(m.segments);

  const prompt = `Analyze this ${m.type} meeting transcript from Holland Charter Township (date: ${m.date ?? "unknown"}).

Return JSON with this exact shape:
{
  "summary": "markdown string — 3-6 bullet points covering: agenda items discussed, votes taken (with counts if stated), key decisions, notable public comment, and anything relevant to Trustee Dave DeYoung",
  "highlights": [
    { "timestamp_sec": 123, "topic": "short topic label", "quote": "verbatim or near-verbatim quote from the transcript" }
  ]
}

highlights: include 5-10 of the most significant moments (votes, decisions, heated discussion, public comment). timestamp_sec must be an integer number of SECONDS matching the [M:SS] or [H:MM:SS] timestamp shown in the transcript for that segment.

TRANSCRIPT:
${formatted}`;

  const response = await client.messages.create({
    model: MODEL,
    max_tokens: 2048,
    system: SYSTEM_PROMPT,
    messages: [{ role: "user", content: prompt }],
  });

  const raw = response.content[0].type === "text" ? response.content[0].text : "";
  const text = raw.replace(/^```(?:json)?\n?/m, "").replace(/\n?```$/m, "").trim();
  return JSON.parse(text);
}

// --- Main loop ---
let processed = 0;

for (const m of toProcess) {
  if (killed) break;

  console.log(`[${processed + 1}/${toProcess.length}] ${m.type} — ${m.date ?? "unknown date"} (${m.video_id})`);

  try {
    const result = await summarizeMeeting(m);
    store.meetings[m.video_id].summary = result.summary;
    store.meetings[m.video_id].highlights = result.highlights;
    store.meetings[m.video_id].summarized_at = new Date().toISOString();
    saveStore();
    console.log(`  Done — ${result.highlights?.length ?? 0} highlights\n`);
    processed++;
  } catch (e: any) {
    console.error(`  FAILED: ${e.message}\n`);
  }
}

console.log(`Summarized ${processed} meetings. Store saved to ${STORE_PATH}.`);
const remaining = unsummarized.length - processed;
if (remaining > 0) console.log(`${remaining} remaining — run again to continue.`);
