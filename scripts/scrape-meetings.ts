import { fetchTranscript } from "youtube-transcript";
import { writeFileSync } from "fs";
import { transcribeWithAssemblyAI, utterancesToSegments } from "./assemblyai-transcribe.js";
import { identifySpeakers } from "./identify-speakers.js";

const BASE = "https://hct.holland.mi.us";

const LISTING_PAGES = [
  { type: "Board of Trustees", path: "/township-meeting-recordings/board-of-trustees-meeting-recordings" },
  { type: "Planning Commission", path: "/township-meeting-recordings/planning-commission-meeting-recordings" },
  { type: "Zoning Board of Appeals", path: "/township-meeting-recordings/zoning-board-of-appeals-meeting-recordings" },
];

// Board of Trustees gets AssemblyAI (speaker diarization); others use free YouTube captions
const ASSEMBLYAI_TYPES = new Set(["Board of Trustees"]);

const ASSEMBLYAI_API_KEY = process.env.ASSEMBLYAI_API_KEY ?? '';
const ANTHROPIC_API_KEY = process.env.YOUTUBE_SUMMARIZER_API_KEY ?? '';

async function fetchHtml(url: string): Promise<string> {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`${res.status} ${url}`);
  return res.text();
}

interface MeetingLink {
  path: string;
  date: string | null;
}

function extractMeetingLinks(html: string): MeetingLink[] {
  const rowPattern = /<tr[\s\S]*?<\/tr>/g;
  const rows = html.match(rowPattern) ?? [];
  const seen = new Set<string>();
  const results: MeetingLink[] = [];

  for (const row of rows) {
    const hrefMatch = row.match(/href="(\/township-meeting-recordings\/[^"]+\/\d{4}-[^"]+)"/);
    if (!hrefMatch) continue;
    const path = hrefMatch[1];
    if (seen.has(path)) continue;
    seen.add(path);
    const dateMatch = row.match(/(\w+ \d{1,2} \d{4})/);
    results.push({ path, date: dateMatch ? dateMatch[1] : extractDateFromSlug(path) });
  }

  if (results.length === 0) {
    const matches = html.matchAll(/href="(\/township-meeting-recordings\/[^"]+\/\d{4}-[^"]+)"/g);
    for (const m of matches) {
      if (!seen.has(m[1])) {
        seen.add(m[1]);
        results.push({ path: m[1], date: extractDateFromSlug(m[1]) });
      }
    }
  }

  return results;
}

function extractDateFromSlug(path: string): string | null {
  const slug = path.split("/").pop() ?? "";
  const m = slug.match(/(\d{1,2})-(\d{1,2})-(\d{4})$/);
  if (!m) return null;
  const [, month, day, year] = m;
  return `${year}-${month.padStart(2, "0")}-${day.padStart(2, "0")}`;
}

function extractYouTubeUrl(html: string): string | null {
  const iframe = html.match(/src="(https?:\/\/(?:www\.)?youtube(?:-nocookie)?\.com\/embed\/[^"?]+)(?:[^"]*)"/);
  if (iframe) {
    const videoId = iframe[1].split("/embed/")[1];
    return `https://www.youtube.com/watch?v=${videoId}`;
  }
  const anchor = html.match(/href="(https?:\/\/(?:www\.)?(?:youtube\.com\/watch|youtu\.be\/)[^"]+)"/);
  if (anchor) return anchor[1];
  return null;
}

function extractVideoId(youtubeUrl: string): string | null {
  const watch = youtubeUrl.match(/[?&]v=([a-zA-Z0-9_-]+)/);
  if (watch) return watch[1];
  const short = youtubeUrl.match(/youtu\.be\/([a-zA-Z0-9_-]+)/);
  if (short) return short[1];
  return null;
}

export interface TranscriptSegment {
  text: string;
  offset: number;   // milliseconds
}

export interface AssemblyUtteranceStored {
  speaker: string;
  text: string;
  start: number;    // ms
  end: number;      // ms
}

export interface Meeting {
  type: string;
  date: string | null;
  hct_url: string;
  youtube_url: string | null;
  video_id: string | null;
  segments: TranscriptSegment[] | null;
  transcript: string | null;
  transcriptError: string | null;
  transcript_source: 'youtube-captions' | 'assemblyai';
  utterances: AssemblyUtteranceStored[] | null;
  speaker_map: Record<string, string | null> | null;
  scraped_at: string;
}

const results: Meeting[] = [];

for (const listing of LISTING_PAGES) {
  console.log(`\nFetching ${listing.type} listing...`);
  const html = await fetchHtml(`${BASE}${listing.path}`);
  const links = extractMeetingLinks(html);
  const useAssemblyAI = ASSEMBLYAI_TYPES.has(listing.type);
  console.log(`  Found ${links.length} meetings [${useAssemblyAI ? 'AssemblyAI' : 'YouTube captions'}]`);

  if (useAssemblyAI && !ASSEMBLYAI_API_KEY) {
    console.warn(`  WARNING: ASSEMBLYAI_API_KEY not set — falling back to YouTube captions for ${listing.type}`);
  }

  for (const { path, date } of links) {
    const hct_url = `${BASE}${path}`;
    try {
      const meetingHtml = await fetchHtml(hct_url);
      const youtube_url = extractYouTubeUrl(meetingHtml);
      const video_id = youtube_url ? extractVideoId(youtube_url) : null;

      let segments: TranscriptSegment[] | null = null;
      let transcript: string | null = null;
      let transcriptError: string | null = null;
      let utterances: AssemblyUtteranceStored[] | null = null;
      let speaker_map: Record<string, string | null> | null = null;
      let transcript_source: 'youtube-captions' | 'assemblyai' = 'youtube-captions';

      if (video_id && youtube_url) {
        if (useAssemblyAI && ASSEMBLYAI_API_KEY) {
          // --- AssemblyAI path (Board of Trustees) ---
          try {
            console.log(`  [${date ?? "?"}] AssemblyAI transcription...`);
            const result = await transcribeWithAssemblyAI(youtube_url, video_id, ASSEMBLYAI_API_KEY);

            utterances = result.utterances.map(u => ({
              speaker: u.speaker,
              text: u.text,
              start: u.start,
              end: u.end,
            }));

            segments = utterancesToSegments(result.utterances);
            transcript = result.transcript;
            transcript_source = 'assemblyai';

            if (ANTHROPIC_API_KEY) {
              console.log(`    Identifying speakers...`);
              speaker_map = await identifySpeakers(result.utterances, date, ANTHROPIC_API_KEY);
            }
          } catch (e: any) {
            transcriptError = e?.message ?? String(e);
            console.warn(`    AssemblyAI failed: ${transcriptError}`);
          }
        } else {
          // --- YouTube captions path (Planning Commission, ZBA) ---
          try {
            console.log(`  [${date ?? "?"}] Fetching YouTube captions...`);
            const raw = await fetchTranscript(video_id);
            segments = raw.map(s => ({ text: s.text, offset: Math.round(s.offset) }));
            transcript = segments.map(s => s.text).join(" ").replace(/\s+/g, " ").trim();
            console.log(`    ${transcript.length.toLocaleString()} chars, ${segments.length} segments`);
          } catch (e: any) {
            transcriptError = e?.message ?? String(e);
            console.warn(`    No transcript: ${transcriptError}`);
          }
        }
      } else {
        console.log(`  [${date ?? "?"}] No YouTube URL found`);
      }

      results.push({
        type: listing.type,
        date,
        hct_url,
        youtube_url,
        video_id,
        segments,
        transcript,
        transcriptError,
        transcript_source,
        utterances,
        speaker_map,
        scraped_at: new Date().toISOString(),
      });
    } catch (e) {
      console.warn(`  FAILED: ${hct_url}`, e);
    }
  }
}

writeFileSync("scripts/meetings-output.json", JSON.stringify(results, null, 2));
console.log(`\nWrote ${results.length} meetings to scripts/meetings-output.json`);
