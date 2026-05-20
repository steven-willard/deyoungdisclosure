import { fail, redirect } from '@sveltejs/kit';
import { normalizeHighlightTimestamps } from '$lib/server/meetings.js';
import { sendPostApprovalEmail } from '$lib/server/notify.js';

export async function load({ platform }) {
	try {
		const result = await platform.env.DB.prepare(
			`SELECT video_id, type, date, youtube_url, highlights
			 FROM meetings WHERE deleted_at IS NULL ORDER BY date DESC`
		).all();
		const raw = (result.results ?? []).map(m => ({
			...m,
			highlights: JSON.parse(m.highlights ?? '[]')
		})).sort((a, b) => new Date(b.date ?? 0) - new Date(a.date ?? 0));
		return { meetings: normalizeHighlightTimestamps(raw) };
	} catch {
		return { meetings: [] };
	}
}

export const actions = {
	default: async ({ request, platform }) => {
		const data = await request.formData();

		const title = data.get('title')?.toString().trim();
		const body = data.get('body')?.toString().trim();
		const tagsRaw = data.get('tags')?.toString().trim() ?? '';
		const imageUrl = data.get('image_url')?.toString().trim() || null;
		const platforms = data.getAll('platforms').map(p => p.toString());
		const socialCopy = data.get('social_copy')?.toString().trim() || null;

		if (!title || !body) {
			return fail(400, { error: 'Title and body are required.' });
		}

		const needsSocialCopy = platforms.includes('Facebook') || platforms.includes('Instagram');
		if (needsSocialCopy && !socialCopy) {
			return fail(400, { error: 'Social copy is required when posting to Facebook or Instagram.' });
		}

		const sessionId = request.headers.get('cookie')?.match(/session=([^;]+)/)?.[1];
		const { getSession } = await import('$lib/server/auth.js');
		const session = await getSession(platform.env.DEYOUNG_KV, sessionId);
		const createdBy = session?.email ?? 'admin';

		const ownerEmail = (platform.env.OWNER_EMAIL ?? '').trim().toLowerCase();
		const isDave = ownerEmail && createdBy === ownerEmail;
		const state = isDave ? 'published' : 'pending_approval';

		const id = crypto.randomUUID();
		const now = new Date().toISOString();
		const tags = tagsRaw ? tagsRaw.split(',').map(t => t.trim()).filter(Boolean) : [];

		const post = {
			id, title, body, tags,
			image_url: imageUrl,
			platforms,
			social_copy: socialCopy,
			state,
			created_by: createdBy,
			created_at: now,
			updated_at: now,
			dave_note: null
		};

		await platform.env.DEYOUNG_KV.put(`posts:${id}`, JSON.stringify(post));

		try {
			await platform.env.DB.prepare(
				`INSERT INTO posts (id, title, body, tags, image_url, platforms, social_copy, state, created_by, created_at, updated_at, dave_note)
				 VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
			).bind(
				id, title, body, JSON.stringify(tags), imageUrl,
				JSON.stringify(platforms), socialCopy, state, createdBy, now, now, null
			).run();

			await platform.env.DB.prepare(
				`INSERT INTO post_transitions (post_id, from_state, to_state, actor, note, transitioned_at)
				 VALUES (?, ?, ?, ?, ?, ?)`
			).bind(id, 'draft', state, createdBy, null, now).run();
		} catch {
			// D1 not available
		}

		if (state === 'pending_approval') {
			try {
				await sendPostApprovalEmail(post, platform.env.RESEND_API_KEY);
			} catch {
				// Email failure is non-blocking — post is already saved
			}
		}

		if (state === 'published' && post.platforms?.includes('Facebook')) {
			try {
				const { publishToFacebook } = await import('$lib/server/social.js');
				await publishToFacebook(post, platform.env);
			} catch {
				// Social publish failure is non-blocking — post is already saved
			}
		}

		throw redirect(303, '/admin');
	}
};
