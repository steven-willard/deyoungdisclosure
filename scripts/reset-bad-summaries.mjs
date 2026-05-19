/**
 * Clears summarized_at for meetings where ALL highlight timestamps are <= 10800
 * (these were corrupted by the formatSegmentsForPrompt ms-as-seconds bug).
 * Run this, then re-run summarize-meetings.ts --max all to fix them.
 */
import { readFileSync, writeFileSync } from 'fs';

const STORE_PATH = 'scripts/meetings-store.json';
const store = JSON.parse(readFileSync(STORE_PATH, 'utf8'));

let reset = 0;
for (const [id, m] of Object.entries(store.meetings)) {
    const highlights = m.highlights ?? [];
    if (highlights.length === 0) continue;
    const max = Math.max(...highlights.map(h => h.timestamp_sec ?? 0));
    if (max <= 10800) {
        store.meetings[id].summarized_at = null;
        store.meetings[id].summary = null;
        store.meetings[id].highlights = null;
        console.log(`Reset: ${id} (${m.date}) — max was ${max}`);
        reset++;
    }
}

store.last_synced = new Date().toISOString();
writeFileSync(STORE_PATH, JSON.stringify(store, null, 2));
console.log(`\nReset ${reset} meetings. Run: npx tsx scripts/summarize-meetings.ts --max all`);
