import { json } from '@sveltejs/kit';
import { requireApiKey } from '$lib/server/api-auth.js';

// GET /api/meetings/segments
// Returns Dave's labeled statements across all Board of Trustees meetings, newest first.
export async function GET({ request, platform }) {
	const denied = requireApiKey(request, platform);
	if (denied) return denied;

	const limit = Math.min(parseInt(new URL(request.url).searchParams.get('limit') ?? '500'), 1000);

	try {
		const result = await platform.env.DB.prepare(
			`SELECT video_id, type, date, youtube_url, dave_segments
			 FROM meetings
			 WHERE deleted_at IS NULL
			   AND transcript_source = 'assemblyai'
			   AND dave_segments IS NOT NULL
			 ORDER BY date DESC
			 LIMIT ?`
		).bind(limit).all();

		const segments = [];
		for (const row of result.results ?? []) {
			const daveSeg = JSON.parse(row.dave_segments ?? '[]');
			for (const seg of daveSeg) {
				segments.push({
					video_id: row.video_id,
					date: row.date,
					meeting_type: row.type,
					youtube_url: row.youtube_url,
					...seg,
				});
			}
		}

		return json({ segments, total: segments.length });
	} catch (e) {
		return json({ error: 'Database unavailable' }, { status: 503 });
	}
}
