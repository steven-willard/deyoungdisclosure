/**
 * Generate speaker-review.json for manual review/correction of speaker maps.
 *
 * Usage:
 *   npx tsx scripts/review-speakers.ts
 *
 * Output: scripts/speaker-review.json
 *   - Edit the "speaker_map" entries to correct any names
 *   - Set a value to null to clear a wrong identification
 *   - Then run: npx tsx scripts/apply-speaker-review.ts
 */

import { readFileSync, writeFileSync, existsSync } from 'fs';

const STORE_PATH = 'scripts/meetings-store.json';
const OUT_PATH = 'scripts/speaker-review.json';

if (!existsSync(STORE_PATH)) {
  console.error(`Missing ${STORE_PATH} — run backfill first`);
  process.exit(1);
}

const store = JSON.parse(readFileSync(STORE_PATH, 'utf8'));
const meetings = Object.values(store.meetings as Record<string, any>)
  .filter((m: any) => m.transcript_source === 'assemblyai' && !m.deleted_at)
  .sort((a: any, b: any) => (b.date ?? '').localeCompare(a.date ?? ''));

const output = {
  _instructions: [
    'Edit the speaker_map values in each meeting to correct any names.',
    'Set a value to null to clear a wrong identification.',
    'Meetings flagged needs_review: true are the ones most likely to need attention.',
    'Use the dave_segments_preview + youtube_url to spot-check Dave\'s identification.',
    'After editing, run: npx tsx scripts/apply-speaker-review.ts',
  ],
  generated_at: new Date().toISOString(),
  meetings: meetings.map((m: any) => {
    const speakerMap: Record<string, string | null> = m.speaker_map ?? {};
    const daveSegments: any[] = m.dave_segments ?? [];
    const identifiedCount = Object.values(speakerMap).filter(Boolean).length;
    const hasDave = Object.values(speakerMap).some(
      n => n?.toLowerCase().includes('deyoung') || n?.toLowerCase().includes('de young')
    );
    const needsReview = !hasDave || identifiedCount === 0;

    return {
      video_id: m.video_id,
      date: m.date,
      youtube_url: m.youtube_url,
      needs_review: needsReview,
      speaker_map: speakerMap,
      // First 3 Dave segments let you spot-check the identification in context
      dave_segments_preview: daveSegments.slice(0, 3).map((s: any) => ({
        topic: s.topic,
        text: s.text,
        youtube_url: s.youtube_url,
      })),
    };
  }),
};

writeFileSync(OUT_PATH, JSON.stringify(output, null, 2));

const needsReviewCount = output.meetings.filter(m => m.needs_review).length;
console.log(`\nWrote ${OUT_PATH}`);
console.log(`  ${output.meetings.length} BOT meetings with AssemblyAI transcripts`);
console.log(`  ${needsReviewCount} flagged as needs_review`);
if (needsReviewCount > 0) {
  console.log(`\nMeetings needing attention:`);
  output.meetings.filter(m => m.needs_review).forEach(m => {
    console.log(`  ${m.date} — ${m.youtube_url}`);
  });
}
console.log(`\nEdit ${OUT_PATH}, then run: npx tsx scripts/apply-speaker-review.ts`);
