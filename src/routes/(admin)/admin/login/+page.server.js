import { fail } from '@sveltejs/kit';
import { generateToken } from '$lib/server/auth.js';

export const actions = {
	default: async ({ request, platform, url }) => {
		const data = await request.formData();
		const email = data.get('email')?.toString().trim().toLowerCase();

		if (!email) return fail(400, { error: 'Email is required.' });

		const adminEmails = (platform.env.ADMIN_EMAILS ?? '')
			.split(',')
			.map(e => e.trim().toLowerCase());

		// Always return success — no email enumeration
		if (!adminEmails.includes(email)) {
			return { sent: true };
		}

		const token = await generateToken({ email }, platform.env.SESSION_SECRET);

		// Store magic token in KV (TTL 15 min)
		await platform.env.DEYOUNG_KV.put(
			`magic:${token}`,
			JSON.stringify({ email }),
			{ expirationTtl: 60 * 15 }
		);

		const magicLink = `${url.origin}/api/auth/verify?token=${encodeURIComponent(token)}`;

		// Send via Resend
		await fetch('https://api.resend.com/emails', {
			method: 'POST',
			headers: {
				'Authorization': `Bearer ${platform.env.RESEND_API_KEY}`,
				'Content-Type': 'application/json'
			},
			body: JSON.stringify({
				from: 'noreply@deyoungdisclosure.com',
				to: email,
				subject: 'Sign in to DeYoung Disclosure Admin',
				html: `
					<p>Click the link below to sign in. This link expires in 15 minutes.</p>
					<p><a href="${magicLink}">${magicLink}</a></p>
					<p>If you didn't request this, ignore this email.</p>
				`
			})
		});

		return { sent: true };
	}
};
