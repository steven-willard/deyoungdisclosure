import { readFileSync } from 'fs';
const store = JSON.parse(readFileSync('./scripts/meetings-store.json', 'utf8'));
const src = JSON.parse(readFileSync('./scripts/meetings-output.json', 'utf8'));

// Show re-summarized meetings (summarized_at recent) and their timestamps
const meetings = Object.values(store.meetings)
    .filter(m => m.summarized_at && m.highlights?.length)
    .sort((a, b) => new Date(b.summarized_at) - new Date(a.summarized_at))
    .slice(0, 5);

for (const m of meetings) {
    console.log(`\n=== ${m.video_id} | ${m.date} | summarized: ${m.summarized_at}`);
    const rawMeeting = src.find(s => s.video_id === m.video_id);
    const maxRawOffset = rawMeeting ? Math.max(...rawMeeting.segments.map(s => s.offset)) : '?';
    console.log(`  raw max offset: ${maxRawOffset} (${Math.round(maxRawOffset/1000)}s)`);
    m.highlights.forEach(h => {
        console.log(`  ts=${h.timestamp_sec}s | topic: ${h.topic.slice(0,45)}`);
    });
}
