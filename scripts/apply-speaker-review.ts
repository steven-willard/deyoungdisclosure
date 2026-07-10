/**
 * Apply manual speaker map corrections from speaker-review.json back to
 * meetings-store.json and re-seed the affected meetings to D1.
 *
 * Usage:
 *   DEYOUNG_API_KEY=<key> npx tsx scripts/apply-speaker-review.ts
 *
 * Only updates meetings where the speaker_map differs from what's in the store.
 */

import { readFileSync, writeFileSync, existsSync } from 'fs';

const STORE_PATH = 'scripts/meetings-store.json';
const REVIEW_PATH = 'scripts/speaker-review.json';
const API_URL = 'https://deyoungdisclosure.com';
const API_KEY = process.env.DEYOUNG_API_KEY;

if (!API_KEY) { console.error('Missing DEYOUNG_API_KEY'); process.exit(1); }
if (!existsSync(STORE_PATH)) { console.error(`Missing ${STORE_PATH}`); process.exit(1); }
if (!existsSync(REVIEW_PATH)) { console.error(`Missing ${REVIEW_PATH} — run review-speakers.ts first`); process.exit(1); }

const store = JSON.parse(readFileSync(STORE_PATH, 'utf8'));
const review = JSON.parse(readFileSync(REVIEW_PATH, 'utf8'));

let changed = 0;
let skipped = 0;
let failed = 0;

for (const entry of review.meetings) {
  const current = store.meetings[entry.video_id];
  if (!current) {
    console.warn(`  ⚠ ${entry.video_id} not found in store — skipping`);
    skipped++;
    continue;
  }

  const currentJson = JSON.stringify(current.speaker_map ?? {});
  const reviewJson = JSON.stringify(entry.speaker_map ?? {});

  if (currentJson === reviewJson) {
    skipped++;
    continue;
  }

  console.log(`  Updating ${entry.date} (${entry.video_id})...`);

  // Update store
  store.meetings[entry.video_id] = {
    ...current,
    speaker_map: entry.speaker_map,
  };

  // Re-seed this meeting to D1
  try {
    const m = store.meetings[entry.video_id];
    const res = await fetch(`${API_URL}/api/meetings`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${API_KEY}`,
      },
      body: JSON.stringify({
        video_id: m.video_id,
        type: m.type,
        date: m.date,
        youtube_url: m.youtube_url,
        hct_url: m.hct_url,
        summary: m.summary,
        highlights: m.highlights ?? [],
        transcript_source: m.transcript_source,
        speaker_map: entry.speaker_map,
        dave_segments: m.dave_segments ?? null,
        scraped_at: m.scraped_at,
        summarized_at: m.summarized_at,
      }),
    });

    if (res.ok) {
      console.log(`    ✓ Updated`);
      changed++;
    } else {
      console.error(`    ✗ D1 push failed: ${res.status}`);
      failed++;
    }
  } catch (e: any) {
    console.error(`    ✗ ${e.message}`);
    failed++;
  }
}

// Save store regardless (changes are already in memory)
store.last_synced = new Date().toISOString();
writeFileSync(STORE_PATH, JSON.stringify(store, null, 2));

console.log(`\nDone — ${changed} updated, ${skipped} unchanged, ${failed} failed.`);
if (failed > 0) console.log('Re-run to retry failed D1 pushes.');
