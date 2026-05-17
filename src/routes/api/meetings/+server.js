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
			highlights: JSON.parse(m.highlights ?? '[]')
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

	const { video_id, type, date, youtube_url, hct_url, summary, highlights, scraped_at, summarized_at } = body;

	if (!video_id || !type || !youtube_url || !hct_url) {
		return json({ error: 'video_id, type, youtube_url, and hct_url are required' }, { status: 400 });
	}

	const resolvedHighlights = Array.isArray(highlights) ? highlights : [];
	const now = new Date().toISOString();

	try {
		await platform.env.DB.prepare(
			`INSERT INTO meetings (video_id, type, date, youtube_url, hct_url, summary, highlights, deleted_at, scraped_at, summarized_at)
			 VALUES (?, ?, ?, ?, ?, ?, ?, NULL, ?, ?)
			 ON CONFLICT(video_id) DO UPDATE SET
			   type = excluded.type,
			   date = excluded.date,
			   youtube_url = excluded.youtube_url,
			   hct_url = excluded.hct_url,
			   summary = excluded.summary,
			   highlights = excluded.highlights,
			   scraped_at = excluded.scraped_at,
			   summarized_at = excluded.summarized_at`
		).bind(
			video_id, type, date ?? null, youtube_url, hct_url,
			summary ?? null, JSON.stringify(resolvedHighlights),
			scraped_at ?? now, summarized_at ?? null
		).run();

		return json({ meeting: { video_id, type, date, youtube_url, hct_url, summary, highlights: resolvedHighlights, scraped_at, summarized_at } }, { status: 201 });
	} catch (e) {
		return json({ error: 'Database error' }, { status: 503 });
	}
}
