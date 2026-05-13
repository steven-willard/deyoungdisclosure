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

	const id = crypto.randomUUID();
	const timestamp = Date.now();
	const key = `contact:${timestamp}_${id}`;

	await platform.env.DEYOUNG_KV.put(key, JSON.stringify({
		name: name.toString().trim(),
		email: email.toString().trim().toLowerCase(),
		message: message.toString().trim(),
		created_at: new Date(timestamp).toISOString()
	}));

	// Notify Dave via Resend
	await fetch('https://api.resend.com/emails', {
		method: 'POST',
		headers: {
			'Authorization': `Bearer ${platform.env.RESEND_API_KEY}`,
			'Content-Type': 'application/json'
		},
		body: JSON.stringify({
			from: 'noreply@deyoungdisclosure.com',
			to: 'dave@davedeyoung.com',
			subject: `New contact message from ${name}`,
			html: `
				<p><strong>From:</strong> ${name} &lt;${email}&gt;</p>
				<p><strong>Message:</strong></p>
				<blockquote>${message.toString().replace(/\n/g, '<br>')}</blockquote>
				<p><a href="https://deyoungdisclosure.com/admin/inbox">View in admin inbox</a></p>
			`
		})
	});

	return json({ ok: true });
}
