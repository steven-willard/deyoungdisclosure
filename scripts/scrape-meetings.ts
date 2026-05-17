import { fetchTranscript } from "youtube-transcript";
import { writeFileSync } from "fs";

const BASE = "https://hct.holland.mi.us";

const LISTING_PAGES = [
  { type: "Board of Trustees", path: "/township-meeting-recordings/board-of-trustees-meeting-recordings" },
  { type: "Planning Commission", path: "/township-meeting-recordings/planning-commission-meeting-recordings" },
  { type: "Zoning Board of Appeals", path: "/township-meeting-recordings/zoning-board-of-appeals-meeting-recordings" },
];

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
  // Match href + nearby date text in table rows
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

    // Try to pull a date from the row text
    const dateMatch = row.match(/(\w+ \d{1,2} \d{4})/);
    results.push({ path, date: dateMatch ? dateMatch[1] : extractDateFromSlug(path) });
  }

  // Fallback: plain href scan if table approach found nothing
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
  // e.g. /.../ 2400-board-of-trustees-4-16-2026 → 2026-04-16
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
  offset: number; // seconds
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
  scraped_at: string;
}

const results: Meeting[] = [];

for (const listing of LISTING_PAGES) {
  console.log(`\nFetching ${listing.type} listing...`);
  const html = await fetchHtml(`${BASE}${listing.path}`);
  const links = extractMeetingLinks(html);
  console.log(`  Found ${links.length} meetings`);

  for (const { path, date } of links) {
    const hct_url = `${BASE}${path}`;
    try {
      const meetingHtml = await fetchHtml(hct_url);
      const youtube_url = extractYouTubeUrl(meetingHtml);
      const video_id = youtube_url ? extractVideoId(youtube_url) : null;

      let segments: TranscriptSegment[] | null = null;
      let transcript: string | null = null;
      let transcriptError: string | null = null;

      if (video_id) {
        try {
          console.log(`  [${date ?? "?"}] Fetching transcript...`);
          const raw = await fetchTranscript(video_id);
          segments = raw.map(s => ({ text: s.text, offset: Math.round(s.offset) }));
          transcript = segments.map(s => s.text).join(" ").replace(/\s+/g, " ").trim();
          console.log(`    ${transcript.length.toLocaleString()} chars, ${segments.length} segments`);
        } catch (e: any) {
          transcriptError = e?.message ?? String(e);
          console.warn(`    No transcript: ${transcriptError}`);
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
        scraped_at: new Date().toISOString(),
      });
    } catch (e) {
      console.warn(`  FAILED: ${hct_url}`, e);
    }
  }
}

writeFileSync("scripts/meetings-output.json", JSON.stringify(results, null, 2));
console.log(`\nWrote ${results.length} meetings to scripts/meetings-output.json`);
