import { fail, redirect } from '@sveltejs/kit';
import { normalizeHighlightTimestamps } from '$lib/server/meetings.js';

// Notification email for post approval requests.
// Testing → rockerw@live.com. Change to dave@davedeyoung.com when handing off.
const APPROVAL_NOTIFY_EMAIL = 'rockerw@live.com';

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

		if (!title || !body) {
			return fail(400, { error: 'Title and body are required.' });
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
			state,
			created_by: createdBy,
			created_at: now,
			updated_at: now,
			dave_note: null
		};

		await platform.env.DEYOUNG_KV.put(`posts:${id}`, JSON.stringify(post));

		try {
			await platform.env.DB.prepare(
				`INSERT INTO posts (id, title, body, tags, image_url, platforms, state, created_by, created_at, updated_at, dave_note)
				 VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
			).bind(
				id, title, body, JSON.stringify(tags), imageUrl,
				JSON.stringify(platforms), state, createdBy, now, now, null
			).run();

			await platform.env.DB.prepare(
				`INSERT INTO post_transitions (post_id, from_state, to_state, actor, note, transitioned_at)
				 VALUES (?, ?, ?, ?, ?, ?)`
			).bind(id, 'draft', state, createdBy, null, now).run();
		} catch {
			// D1 not available
		}

		if (state === 'pending_approval') {
			const preview = post.body.length > 400
				? post.body.slice(0, 400).trimEnd() + '…'
				: post.body;

			try {
				await fetch('https://api.resend.com/emails', {
					method: 'POST',
					headers: {
						'Authorization': `Bearer ${platform.env.RESEND_API_KEY}`,
						'Content-Type': 'application/json'
					},
					body: JSON.stringify({
						from: 'noreply@deyoungdisclosure.com',
						to: APPROVAL_NOTIFY_EMAIL,
						subject: `Post pending approval: ${title}`,
						html: `
							<h2>New post submitted for approval</h2>
							<table>
								<tr><td><strong>Title</strong></td><td>${title}</td></tr>
								<tr><td><strong>Submitted by</strong></td><td>${createdBy}</td></tr>
								<tr><td><strong>Platforms</strong></td><td>${platforms.join(', ') || '—'}</td></tr>
								<tr><td><strong>Tags</strong></td><td>${tags.join(', ') || '—'}</td></tr>
							</table>
							<h3>Preview</h3>
							<pre style="white-space:pre-wrap;font-family:sans-serif">${preview}</pre>
							<p><a href="https://deyoungdisclosure.com/admin">Review in dashboard →</a></p>
						`
					})
				});
			} catch {
				// Email failure is non-blocking — post is already saved
			}
		}

		throw redirect(303, '/admin');
	}
};
