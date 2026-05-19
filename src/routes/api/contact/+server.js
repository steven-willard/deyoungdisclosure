import { json } from '@sveltejs/kit';

export async function POST({ request, platform }) {
	let body;
	try {
		body = await request.json();
	} catch {
		return json({ error: 'Invalid request.' }, { status: 400 });
	}

	const { name, email, message } = body;
	if (!name || !email || !message) {
		return json({ error: 'All fields are required.' }, { status: 400 });
	}

	const cleanName = name.toString().trim();
	const cleanEmail = email.toString().trim().toLowerCase();
	const cleanMessage = message.toString().trim();

	// Store in KV — permanent archive regardless of email outcome
	const id = crypto.randomUUID();
	const timestamp = Date.now();
	await platform.env.DEYOUNG_KV.put(
		`contact:${timestamp}_${id}`,
		JSON.stringify({
			name: cleanName,
			email: cleanEmail,
			message: cleanMessage,
			created_at: new Date(timestamp).toISOString()
		})
	);

	// Notify Dave via Resend
	try {
		const resendRes = await fetch('https://api.resend.com/emails', {
			method: 'POST',
			headers: {
				'Authorization': `Bearer ${platform.env.RESEND_API_KEY}`,
				'Content-Type': 'application/json'
			},
			body: JSON.stringify({
				from: 'noreply@deyoungdisclosure.com',
				to: 'rockerw@live.com',
				subject: `New message from ${cleanName}`,
				html: `
					<p style="font-family:sans-serif;color:#333;">
						You have a new contact message via <strong>deyoungdisclosure.com</strong>.
					</p>
					<table style="font-family:sans-serif;font-size:14px;color:#333;border-collapse:collapse;width:100%;max-width:600px;">
						<tr><td style="padding:8px 0;font-weight:600;width:80px;">From:</td><td>${cleanName}</td></tr>
						<tr><td style="padding:8px 0;font-weight:600;">Email:</td><td><a href="mailto:${cleanEmail}">${cleanEmail}</a></td></tr>
					</table>
					<div style="font-family:sans-serif;font-size:14px;color:#333;margin-top:16px;padding:16px;background:#f5f5f5;border-left:4px solid #c9a84c;white-space:pre-wrap;">${cleanMessage.replace(/</g, '&lt;').replace(/>/g, '&gt;')}</div>
					<p style="font-family:sans-serif;font-size:12px;color:#999;margin-top:24px;">
						<a href="https://deyoungdisclosure.com/admin/inbox">View all messages in your inbox →</a>
					</p>
				`
			})
		});

		if (!resendRes.ok) {
			console.error('Resend failed:', resendRes.status, await resendRes.text());
		}
	} catch (e) {
		console.error('Resend error:', e);
	}

	// Always return success — message is saved to KV regardless of email
	return json({ ok: true });
}

// DELETE /api/contact?key=contact:timestamp_uuid
// Protected by session cookie (admin only)
export async function DELETE({ url, platform, cookies }) {
	const { getSession } = await import('$lib/server/auth.js');
	const session = await getSession(cookies, platform);
	if (!session) return json({ error: 'Unauthorized' }, { status: 401 });

	const key = url.searchParams.get('key');
	if (!key?.startsWith('contact:')) {
		return json({ error: 'Invalid key' }, { status: 400 });
	}

	await platform.env.DEYOUNG_KV.delete(key);
	return json({ deleted: true });
}
