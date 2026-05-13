import { fail, redirect } from '@sveltejs/kit';

export const actions = {
	default: async ({ request, platform, locals }) => {
		const data = await request.formData();

		const title = data.get('title')?.toString().trim();
		const body = data.get('body')?.toString().trim();
		const tagsRaw = data.get('tags')?.toString().trim() ?? '';
		const imageUrl = data.get('image_url')?.toString().trim() || null;
		const platforms = data.getAll('platforms').map(p => p.toString());

		if (!title || !body) {
			return fail(400, { error: 'Title and body are required.' });
		}

		// Get user from layout data (session already validated by layout guard)
		const sessionId = request.headers.get('cookie')?.match(/session=([^;]+)/)?.[1];
		const { getSession } = await import('$lib/server/auth.js');
		const session = await getSession(platform.env.DEYOUNG_KV, sessionId);
		const createdBy = session?.email ?? 'admin';

		const id = crypto.randomUUID();
		const now = new Date().toISOString();
		const tags = tagsRaw ? tagsRaw.split(',').map(t => t.trim()).filter(Boolean) : [];

		const post = {
			id,
			title,
			body,
			tags,
			image_url: imageUrl,
			platforms,
			state: 'pending_approval',
			created_by: createdBy,
			created_at: now,
			updated_at: now,
			dave_note: null
		};

		await platform.env.DEYOUNG_KV.put(`posts:${id}`, JSON.stringify(post));

		// Also insert into D1
		try {
			await platform.env.DB.prepare(
				`INSERT INTO posts (id, title, body, tags, image_url, platforms, state, created_by, created_at, updated_at, dave_note)
				 VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
			).bind(
				id, title, body, JSON.stringify(tags), imageUrl,
				JSON.stringify(platforms), 'pending_approval', createdBy, now, now, null
			).run();

			await platform.env.DB.prepare(
				`INSERT INTO post_transitions (post_id, from_state, to_state, actor, note, transitioned_at)
				 VALUES (?, ?, ?, ?, ?, ?)`
			).bind(id, 'draft', 'pending_approval', createdBy, null, now).run();
		} catch {
			// D1 not available
		}

		throw redirect(303, '/admin');
	}
};
