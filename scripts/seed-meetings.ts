/**
 * Push meetings-store.json → D1 via the meetings CRUD API.
 * Run after summarize-meetings.ts is complete (or whenever you want to sync).
 *
 * Usage:
 *   npx tsx scripts/seed-meetings.ts
 *
 * Requires:
 *   DEYOUNG_API_KEY env var  — your site API key (SMM_AI_API_KEY Wrangler secret)
 */

import { readFileSync, existsSync } from "fs";

const STORE_PATH = "scripts/meetings-store.json";

const API_URL = "https://deyoungdisclosure.com";
const API_KEY = process.env.DEYOUNG_API_KEY;

if (!API_KEY) {
  console.error("Missing DEYOUNG_API_KEY");
  process.exit(1);
}

if (!existsSync(STORE_PATH)) {
  console.error(`Missing ${STORE_PATH} — run summarize-meetings.ts first`);
  process.exit(1);
}

const store = JSON.parse(readFileSync(STORE_PATH, "utf8"));
const meetings = Object.values(store.meetings) as any[];
const summarized = meetings.filter(m => m.summarized_at && !m.deleted_at);

console.log(`Seeding ${summarized.length} summarized meetings to ${API_URL}...\n`);

let ok = 0;
let failed = 0;

for (const m of summarized) {
  try {
    const res = await fetch(`${API_URL}/api/meetings`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${API_KEY}`,
      },
      body: JSON.stringify({
        video_id: m.video_id,
        type: m.type,
        date: m.date,
        youtube_url: m.youtube_url,
        hct_url: m.hct_url,
        summary: m.summary,
        highlights: m.highlights ?? [],
        scraped_at: m.scraped_at,
        summarized_at: m.summarized_at,
      }),
    });

    if (res.ok) {
      console.log(`  ✓ ${m.type} — ${m.date} (${m.video_id})`);
      ok++;
    } else {
      const err = await res.text();
      console.error(`  ✗ ${m.video_id}: ${res.status} ${err}`);
      failed++;
    }
  } catch (e: any) {
    console.error(`  ✗ ${m.video_id}: ${e.message}`);
    failed++;
  }
}

console.log(`\nDone — ${ok} seeded, ${failed} failed.`);
