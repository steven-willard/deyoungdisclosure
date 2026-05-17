import { json } from '@sveltejs/kit';
import { requireApiKey } from '$lib/server/api-auth.js';

// GET /api/meetings/:id
export async function GET({ request, platform, params }) {
	const denied = requireApiKey(request, platform);
	if (denied) return denied;

	try {
		const row = await platform.env.DB.prepare(
			'SELECT * FROM meetings WHERE video_id = ? AND deleted_at IS NULL'
		).bind(params.id).first();

		if (!row) return json({ error: 'Not found' }, { status: 404 });

		return json({ meeting: { ...row, highlights: JSON.parse(row.highlights ?? '[]') } });
	} catch {
		return json({ error: 'Database unavailable' }, { status: 503 });
	}
}

// DELETE /api/meetings/:id
// Default: soft delete (sets deleted_at)
// ?purge=true: hard delete
export async function DELETE({ request, platform, params, url }) {
	const denied = requireApiKey(request, platform);
	if (denied) return denied;

	const purge = url.searchParams.get('purge') === 'true';

	try {
		const row = await platform.env.DB.prepare(
			'SELECT video_id FROM meetings WHERE video_id = ?'
		).bind(params.id).first();

		if (!row) return json({ error: 'Not found' }, { status: 404 });

		if (purge) {
			await platform.env.DB.prepare('DELETE FROM meetings WHERE video_id = ?').bind(params.id).run();
			return json({ purged: true });
		}

		const now = new Date().toISOString();
		await platform.env.DB.prepare(
			'UPDATE meetings SET deleted_at = ? WHERE video_id = ?'
		).bind(now, params.id).run();

		return json({ deleted: true });
	} catch {
		return json({ error: 'Database error' }, { status: 503 });
	}
}
