import { json } from '@sveltejs/kit';
import { requireApiKey } from '$lib/server/api-auth.js';

// GET /api/posts?state=pending_approval&limit=50
export async function GET({ request, platform, url }) {
	const denied = requireApiKey(request, platform);
	if (denied) return denied;

	const state = url.searchParams.get('state') ?? null;
	const limit = Math.min(parseInt(url.searchParams.get('limit') ?? '50'), 100);

	try {
		let query = 'SELECT * FROM posts';
		const bindings = [];
		if (state) {
			query += ' WHERE state = ?';
			bindings.push(state);
		}
		query += ' ORDER BY created_at DESC LIMIT ?';
		bindings.push(limit);

		const result = await platform.env.DB.prepare(query).bind(...bindings).all();
		const posts = (result.results ?? []).map(p => ({
			...p,
			tags: JSON.parse(p.tags ?? '[]'),
			platforms: JSON.parse(p.platforms ?? '[]')
		}));
		return json({ posts });
	} catch {
		return json({ error: 'Database unavailable' }, { status: 503 });
	}
}

// POST /api/posts
export async function POST({ request, platform }) {
	const denied = requireApiKey(request, platform);
	if (denied) return denied;

	let body;
	try {
		body = await request.json();
	} catch {
		return json({ error: 'Invalid JSON' }, { status: 400 });
	}

	const { title, body: postBody, tags, image_url, platforms, state, created_by } = body;

	if (!title || !postBody) {
		return json({ error: 'title and body are required' }, { status: 400 });
	}

	const id = crypto.randomUUID();
	const now = new Date().toISOString();
	const resolvedState = state ?? 'pending_approval';
	const resolvedTags = Array.isArray(tags) ? tags : [];
	const resolvedPlatforms = Array.isArray(platforms) ? platforms : [];
	const resolvedCreatedBy = created_by ?? 'smm-ai';

	const post = {
		id, title,
		body: postBody,
		tags: resolvedTags,
		image_url: image_url ?? null,
		platforms: resolvedPlatforms,
		state: resolvedState,
		created_by: resolvedCreatedBy,
		created_at: now,
		updated_at: now,
		dave_note: null
	};

	// Write to KV
	await platform.env.DEYOUNG_KV.put(`posts:${id}`, JSON.stringify(post));

	// Write to D1
	try {
		await platform.env.DB.prepare(
			`INSERT INTO posts (id, title, body, tags, image_url, platforms, state, created_by, created_at, updated_at, dave_note)
			 VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
		).bind(
			id, title, postBody, JSON.stringify(resolvedTags), image_url ?? null,
			JSON.stringify(resolvedPlatforms), resolvedState, resolvedCreatedBy, now, now, null
		).run();

		await platform.env.DB.prepare(
			`INSERT INTO post_transitions (post_id, from_state, to_state, actor, note, transitioned_at)
			 VALUES (?, ?, ?, ?, ?, ?)`
		).bind(id, 'draft', resolvedState, resolvedCreatedBy, null, now).run();
	} catch {
		// D1 write failed — KV is source of truth
	}

	return json({ post }, { status: 201 });
}
