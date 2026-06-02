const SITE_URL = 'https://deyoungdisclosure.com';
const FROM = 'noreply@deyoungdisclosure.com';

/**
 * Send double opt-in confirmation email.
 * Non-blocking — caller should not await in critical paths.
 */
export async function sendConfirmationEmail(email, confirmToken, resendApiKey) {
	const confirmUrl = `${SITE_URL}/subscribe/confirm?token=${confirmToken}`;
	await fetch('https://api.resend.com/emails', {
		method: 'POST',
		headers: {
			'Authorization': `Bearer ${resendApiKey}`,
			'Content-Type': 'application/json'
		},
		body: JSON.stringify({
			from: FROM,
			to: email,
			subject: 'Confirm your subscription — DeYoung Disclosure',
			html: `
				<div style="font-family:sans-serif;max-width:480px;margin:0 auto;color:#1a1a1a">
					<h2 style="margin-bottom:8px">One more step</h2>
					<p style="color:#555">Click below to confirm your subscription to DeYoung Disclosure. You'll get an email whenever Dave DeYoung publishes a new post.</p>
					<p style="margin:24px 0">
						<a href="${confirmUrl}"
						   style="background:#c9a84c;color:#0d0d0d;padding:12px 24px;border-radius:6px;text-decoration:none;font-weight:600;display:inline-block">
							Confirm subscription →
						</a>
					</p>
					<p style="font-size:12px;color:#999">If you didn't sign up, ignore this email. The link expires in 48 hours.</p>
				</div>
			`
		})
	});
}

/**
 * Send a newsletter email to one subscriber when a post is published.
 * Non-blocking — caller should not await in critical paths.
 */
export async function sendNewsletterEmail(post, email, unsubscribeToken, resendApiKey) {
	const postUrl = `${SITE_URL}/posts/${post.id}`;
	const unsubUrl = `${SITE_URL}/unsubscribe?token=${unsubscribeToken}`;

	// Use social_copy as excerpt if available, otherwise strip markdown from body
	const rawExcerpt = (post.social_copy || post.body || '').replace(/[#*_`>\-\[\]]/g, '').trim();
	const excerpt = rawExcerpt.length > 300 ? rawExcerpt.slice(0, 297) + '...' : rawExcerpt;

	await fetch('https://api.resend.com/emails', {
		method: 'POST',
		headers: {
			'Authorization': `Bearer ${resendApiKey}`,
			'Content-Type': 'application/json'
		},
		body: JSON.stringify({
			from: FROM,
			to: email,
			subject: `New post: ${post.title}`,
			html: `
				<div style="font-family:sans-serif;max-width:560px;margin:0 auto;color:#1a1a1a">
					<p style="font-size:12px;color:#999;margin-bottom:24px">DeYoung Disclosure · Holland Charter Township</p>
					<h2 style="margin-bottom:12px;font-size:22px">${post.title}</h2>
					<p style="color:#444;line-height:1.6;margin-bottom:24px">${excerpt}</p>
					<p>
						<a href="${postUrl}"
						   style="background:#c9a84c;color:#0d0d0d;padding:12px 24px;border-radius:6px;text-decoration:none;font-weight:600;display:inline-block">
							Read the full post →
						</a>
					</p>
					<hr style="border:none;border-top:1px solid #eee;margin:32px 0">
					<p style="font-size:11px;color:#aaa">
						You're receiving this because you subscribed at deyoungdisclosure.com.<br>
						<a href="${unsubUrl}" style="color:#aaa">Unsubscribe</a>
					</p>
				</div>
			`
		})
	});
}
