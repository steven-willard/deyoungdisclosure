import { json } from '@sveltejs/kit';
import { requireApiKey } from '$lib/server/api-auth.js';

// GET /api/posts/:id
export async function GET({ request, platform, params }) {
	const denied = requireApiKey(request, platform);
	if (denied) return denied;

	const raw = await platform.env.DEYOUNG_KV.get(`posts:${params.id}`);
	if (!raw) return json({ error: 'Not found' }, { status: 404 });

	const post = JSON.parse(raw);
	return json({ post });
}

// PUT /api/posts/:id
export async function PUT({ request, platform, params }) {
	const denied = requireApiKey(request, platform);
	if (denied) return denied;

	const raw = await platform.env.DEYOUNG_KV.get(`posts:${params.id}`);
	if (!raw) return json({ error: 'Not found' }, { status: 404 });

	let body;
	try {
		body = await request.json();
	} catch {
		return json({ error: 'Invalid JSON' }, { status: 400 });
	}

	const existing = JSON.parse(raw);
	const now = new Date().toISOString();
	const prevState = existing.state;

	const updated = {
		...existing,
		title: body.title ?? existing.title,
		body: body.body ?? existing.body,
		tags: body.tags ?? existing.tags,
		image_url: body.image_url !== undefined ? body.image_url : existing.image_url,
		platforms: body.platforms ?? existing.platforms,
		state: body.state ?? existing.state,
		dave_note: body.dave_note !== undefined ? body.dave_note : existing.dave_note,
		updated_at: now
	};

	await platform.env.DEYOUNG_KV.put(`posts:${params.id}`, JSON.stringify(updated));

	try {
		await platform.env.DB.prepare(
			`UPDATE posts SET title=?, body=?, tags=?, image_url=?, platforms=?, state=?, dave_note=?, updated_at=?
			 WHERE id=?`
		).bind(
			updated.title, updated.body, JSON.stringify(updated.tags), updated.image_url,
			JSON.stringify(updated.platforms), updated.state, updated.dave_note, now, params.id
		).run();

		if (body.state && body.state !== prevState) {
			await platform.env.DB.prepare(
				`INSERT INTO post_transitions (post_id, from_state, to_state, actor, note, transitioned_at)
				 VALUES (?, ?, ?, ?, ?, ?)`
			).bind(params.id, prevState, body.state, 'smm-ai', body.dave_note ?? null, now).run();
		}
	} catch {
		// D1 write failed
	}

	return json({ post: updated });
}

// DELETE /api/posts/:id
// Default: soft delete (state → 'deleted'), recoverable, audit trail preserved
// ?purge=true: hard delete — removes from KV + D1 permanently, use with intent
export async function DELETE({ request, platform, params, url }) {
	const denied = requireApiKey(request, platform);
	if (denied) return denied;

	const raw = await platform.env.DEYOUNG_KV.get(`posts:${params.id}`);
	if (!raw) return json({ error: 'Not found' }, { status: 404 });

	const purge = url.searchParams.get('purge') === 'true';

	if (purge) {
		await platform.env.DEYOUNG_KV.delete(`posts:${params.id}`);
		try {
			await platform.env.DB.prepare('DELETE FROM post_transitions WHERE post_id = ?').bind(params.id).run();
			await platform.env.DB.prepare('DELETE FROM posts WHERE id = ?').bind(params.id).run();
		} catch {
			// D1 write failed
		}
		return json({ purged: true });
	}

	const existing = JSON.parse(raw);
	const now = new Date().toISOString();
	const prevState = existing.state;

	const updated = { ...existing, state: 'deleted', updated_at: now };
	await platform.env.DEYOUNG_KV.put(`posts:${params.id}`, JSON.stringify(updated));

	try {
		await platform.env.DB.prepare(
			'UPDATE posts SET state=?, updated_at=? WHERE id=?'
		).bind('deleted', now, params.id).run();

		await platform.env.DB.prepare(
			`INSERT INTO post_transitions (post_id, from_state, to_state, actor, note, transitioned_at)
			 VALUES (?, ?, ?, ?, ?, ?)`
		).bind(params.id, prevState, 'deleted', 'smm-ai', null, now).run();
	} catch {
		// D1 write failed
	}

	return json({ deleted: true, post: updated });
}
