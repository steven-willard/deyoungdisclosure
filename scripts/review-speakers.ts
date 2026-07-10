/**
 * Generate speaker-review.json for manual review/correction of speaker maps.
 *
 * Shows ALL Board of Trustees meetings with AssemblyAI transcripts so you can
 * confirm every speaker map, not just the uncertain ones.
 *
 * Usage:
 *   npx tsx scripts/review-speakers.ts
 *
 * Output: scripts/speaker-review.json
 *   - "confirmed": false  → needs your review. Set to true once you're happy.
 *   - Edit "speaker_map" values to correct any names. Set to null to clear.
 *   - "dave_segments_preview" gives YouTube deep links to spot-check Dave's voice.
 *   - Then run: npx tsx scripts/apply-speaker-review.ts
 */

import { readFileSync, writeFileSync, existsSync } from 'fs';

const STORE_PATH = 'scripts/meetings-store.json';
const OUT_PATH = 'scripts/speaker-review.json';

if (!existsSync(STORE_PATH)) {
  console.error(`Missing ${STORE_PATH} — run backfill first`);
  process.exit(1);
}

// Preserve existing confirmations so re-running doesn't wipe your work
let existing: Record<string, { confirmed?: boolean }> = {};
if (existsSync(OUT_PATH)) {
  try {
    const prev = JSON.parse(readFileSync(OUT_PATH, 'utf8'));
    for (const m of prev.meetings ?? []) {
      existing[m.video_id] = { confirmed: m.confirmed ?? false };
    }
  } catch {}
}

const store = JSON.parse(readFileSync(STORE_PATH, 'utf8'));
const meetings = Object.values(store.meetings as Record<string, any>)
  .filter((m: any) => m.transcript_source === 'assemblyai' && !m.deleted_at)
  .sort((a: any, b: any) => (b.date ?? '').localeCompare(a.date ?? ''));

const output = {
  _instructions: [
    '1. Review each meeting below. Open youtube_url to watch the meeting.',
    '2. Check dave_segments_preview — click a youtube_url to jump to that moment and verify the voice.',
    '3. Edit speaker_map values to correct any names. Set to null to clear a wrong ID.',
    '4. Set "confirmed": true once you are happy with a meeting\'s speaker map.',
    '5. Run: DEYOUNG_API_KEY=<key> npx tsx scripts/apply-speaker-review.ts',
    '   → Only meetings where speaker_map changed get re-seeded to D1.',
    'Re-running this script preserves your confirmed flags and edits.',
  ],
  generated_at: new Date().toISOString(),
  summary: {
    total: meetings.length,
    confirmed: 0,     // filled in below
    needs_review: 0,  // filled in below
  },
  meetings: meetings.map((m: any) => {
    const speakerMap: Record<string, string | null> = m.speaker_map ?? {};
    const daveSegments: any[] = m.dave_segments ?? [];
    const hasDave = Object.values(speakerMap).some(
      n => n?.toLowerCase().includes('deyoung') || n?.toLowerCase().includes('de young')
    );
    const prevConfirmed = existing[m.video_id]?.confirmed ?? false;

    return {
      video_id: m.video_id,
      date: m.date,
      youtube_url: m.youtube_url,
      confirmed: prevConfirmed,
      dave_identified: hasDave,
      dave_segment_count: daveSegments.length,
      speaker_map: speakerMap,
      // 5 preview segments with YouTube deep links — click to verify the voice
      dave_segments_preview: daveSegments.slice(0, 5).map((s: any) => ({
        topic: s.topic,
        text: s.text,
        youtube_url: s.youtube_url,
      })),
    };
  }),
};

// Fill summary counts
output.summary.confirmed = output.meetings.filter(m => m.confirmed).length;
output.summary.needs_review = output.meetings.filter(m => !m.confirmed).length;

writeFileSync(OUT_PATH, JSON.stringify(output, null, 2));

console.log(`\nWrote ${OUT_PATH}`);
console.log(`  ${output.summary.total} BOT meetings total`);
console.log(`  ${output.summary.confirmed} confirmed`);
console.log(`  ${output.summary.needs_review} still need review`);
if (output.summary.needs_review > 0) {
  const unconfirmed = output.meetings.filter(m => !m.confirmed);
  const noDave = unconfirmed.filter(m => !m.dave_identified);
  if (noDave.length > 0) {
    console.log(`\n  ⚠ Dave NOT identified in ${noDave.length} meeting(s):`);
    noDave.forEach(m => console.log(`    ${m.date} — ${m.youtube_url}`));
  }
}
console.log(`\nEdit ${OUT_PATH}, then run: npx tsx scripts/apply-speaker-review.ts`);
