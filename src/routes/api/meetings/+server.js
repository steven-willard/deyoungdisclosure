import { json } from '@sveltejs/kit';
import { requireApiKey } from '$lib/server/api-auth.js';

// GET /api/meetings?type=Board+of+Trustees&limit=50
export async function GET({ request, platform, url }) {
	const denied = requireApiKey(request, platform);
	if (denied) return denied;

	const type = url.searchParams.get('type') ?? null;
	const limit = Math.min(parseInt(url.searchParams.get('limit') ?? '100'), 200);

	try {
		let query = 'SELECT * FROM meetings WHERE deleted_at IS NULL';
		const bindings = [];
		if (type) {
			query += ' AND type = ?';
			bindings.push(type);
		}
		query += ' ORDER BY date DESC LIMIT ?';
		bindings.push(limit);

		const result = await platform.env.DB.prepare(query).bind(...bindings).all();
		const meetings = (result.results ?? []).map(m => ({
			...m,
			highlights: JSON.parse(m.highlights ?? '[]'),
			speaker_map: m.speaker_map ? JSON.parse(m.speaker_map) : null,
			dave_segments: m.dave_segments ? JSON.parse(m.dave_segments) : null,
		}));
		return json({ meetings });
	} catch {
		return json({ error: 'Database unavailable' }, { status: 503 });
	}
}

// POST /api/meetings — upsert (insert or replace)
export async function POST({ request, platform }) {
	const denied = requireApiKey(request, platform);
	if (denied) return denied;

	let body;
	try {
		body = await request.json();
	} catch {
		return json({ error: 'Invalid JSON' }, { status: 400 });
	}

	const { video_id, type, date, youtube_url, hct_url, summary, highlights, transcript_source, speaker_map, dave_segments, scraped_at, summarized_at } = body;

	if (!video_id || !type || !youtube_url || !hct_url) {
		return json({ error: 'video_id, type, youtube_url, and hct_url are required' }, { status: 400 });
	}

	const resolvedHighlights = Array.isArray(highlights) ? highlights : [];
	const resolvedSummary = Array.isArray(summary) ? summary.map(s => `- ${s}`).join('\n') : (summary ?? null);
	const now = new Date().toISOString();

	try {
		await platform.env.DB.prepare(
			`INSERT INTO meetings (video_id, type, date, youtube_url, hct_url, summary, highlights, transcript_source, speaker_map, dave_segments, deleted_at, scraped_at, summarized_at)
			 VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NULL, ?, ?)
			 ON CONFLICT(video_id) DO UPDATE SET
			   type = excluded.type,
			   date = excluded.date,
			   youtube_url = excluded.youtube_url,
			   hct_url = excluded.hct_url,
			   summary = excluded.summary,
			   highlights = excluded.highlights,
			   transcript_source = excluded.transcript_source,
			   speaker_map = excluded.speaker_map,
			   dave_segments = excluded.dave_segments,
			   scraped_at = excluded.scraped_at,
			   summarized_at = excluded.summarized_at`
		).bind(
			video_id, type, date ?? null, youtube_url, hct_url,
			resolvedSummary, JSON.stringify(resolvedHighlights),
			transcript_source ?? 'youtube-captions',
			speaker_map ? JSON.stringify(speaker_map) : null,
			dave_segments ? JSON.stringify(dave_segments) : null,
			scraped_at ?? now, summarized_at ?? null
		).run();

		return json({ meeting: { video_id, type, date, youtube_url, hct_url, summary, highlights: resolvedHighlights, transcript_source, scraped_at, summarized_at } }, { status: 201 });
	} catch (e) {
		return json({ error: 'Database error' }, { status: 503 });
	}
}
