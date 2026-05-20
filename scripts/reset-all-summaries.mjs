/**
 * Clears summarized_at for ALL meetings so they will be re-processed
 * with the fixed summarizer (quote-matched timestamps).
 */
import { readFileSync, writeFileSync } from 'fs';

const STORE_PATH = 'scripts/meetings-store.json';
const store = JSON.parse(readFileSync(STORE_PATH, 'utf8'));

let count = 0;
for (const id of Object.keys(store.meetings)) {
    store.meetings[id].summarized_at = null;
    store.meetings[id].summary = null;
    store.meetings[id].highlights = null;
    count++;
}

store.last_synced = new Date().toISOString();
writeFileSync(STORE_PATH, JSON.stringify(store, null, 2));
console.log(`Reset ${count} meetings. Run: npx tsx scripts/summarize-meetings.ts --max all`);
