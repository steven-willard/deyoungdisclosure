import { json } from '@sveltejs/kit';

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export async function POST({ request, platform }) {
	let body;
	try {
		body = await request.json();
	} catch {
		return json({ error: 'Invalid request.' }, { status: 400 });
	}

	const email = body?.email?.toString().trim().toLowerCase();
	if (!email || !EMAIL_RE.test(email)) {
		return json({ error: 'Please enter a valid email address.' }, { status: 400 });
	}

	const db = platform.env.DB;

	// Check existing subscriber
	let existing;
	try {
		existing = await db.prepare(
			'SELECT id, confirmed, confirm_token FROM subscribers WHERE email = ?'
		).bind(email).first();
	} catch {
		return json({ error: 'Something went wrong. Please try again.' }, { status: 500 });
	}

	if (existing?.confirmed) {
		return json({ ok: true, already: true });
	}

	const { sendConfirmationEmail } = await import('$lib/server/newsletter.js');

	if (existing) {
		// Pending — resend confirmation
		try {
			await sendConfirmationEmail(email, existing.confirm_token, platform.env.RESEND_API_KEY);
		} catch { /* non-blocking */ }
		return json({ ok: true, resent: true });
	}

	// New subscriber
	const id = crypto.randomUUID();
	const confirmToken = crypto.randomUUID();
	const unsubToken = crypto.randomUUID();
	const now = new Date().toISOString();

	try {
		await db.prepare(
			`INSERT INTO subscribers (id, email, confirmed, confirm_token, unsubscribe_token, created_at)
			 VALUES (?, ?, 0, ?, ?, ?)`
		).bind(id, email, confirmToken, unsubToken, now).run();
	} catch {
		return json({ error: 'Something went wrong. Please try again.' }, { status: 500 });
	}

	try {
		await sendConfirmationEmail(email, confirmToken, platform.env.RESEND_API_KEY);
	} catch { /* non-blocking */ }

	return json({ ok: true });
}
