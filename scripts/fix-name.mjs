import { readFileSync, writeFileSync } from 'fs';

const STORE_PATH = 'scripts/meetings-store.json';
const raw = readFileSync(STORE_PATH, 'utf8');

// Replace all variations the auto-captions / Haiku produced
const fixed = raw
    .replace(/D\. Young/g, 'DeYoung')
    .replace(/D\.Young/g, 'DeYoung')
    .replace(/[Dd] [Yy]oung/g, 'DeYoung')
    .replace(/D\.Young/g, 'DeYoung');

const before = (raw.match(/D\. Young|D\.Young|D Young/g) ?? []).length;
writeFileSync(STORE_PATH, fixed);
console.log(`Replaced ${before} occurrences. Re-seed with: npx tsx scripts/seed-meetings.ts`);
