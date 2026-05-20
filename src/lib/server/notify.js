import { marked } from 'marked';

// Notification email for post approval requests.
// Testing → rockerw@live.com. Change to dave@davedeyoung.com on handoff.
const APPROVAL_NOTIFY_EMAIL = 'rockerw@live.com';

/**
 * Send a pending-approval notification email via Resend.
 * Non-blocking — caller should not await if post is already saved.
 */
export async function sendPostApprovalEmail(post, resendApiKey) {
	const bodyHtml = marked.parse(post.body ?? '');
	const socialSection = post.social_copy
		? `<h3 style="margin-top:1.5rem">Social Copy (Facebook/Instagram)</h3>
		   <div style="background:#f5f5f5;padding:12px 16px;border-radius:6px;white-space:pre-wrap;font-family:sans-serif;font-size:14px">${post.social_copy}</div>`
		: '';

	await fetch('https://api.resend.com/emails', {
		method: 'POST',
		headers: {
			'Authorization': `Bearer ${resendApiKey}`,
			'Content-Type': 'application/json'
		},
		body: JSON.stringify({
			from: 'noreply@deyoungdisclosure.com',
			to: APPROVAL_NOTIFY_EMAIL,
			subject: `Post pending approval: ${post.title}`,
			html: `
				<h2>New post submitted for approval</h2>
				<table>
					<tr><td><strong>Title</strong></td><td>${post.title}</td></tr>
					<tr><td><strong>Submitted by</strong></td><td>${post.created_by}</td></tr>
					<tr><td><strong>Platforms</strong></td><td>${(post.platforms ?? []).join(', ') || '—'}</td></tr>
					<tr><td><strong>Tags</strong></td><td>${(post.tags ?? []).join(', ') || '—'}</td></tr>
				</table>
				<h3>Post Body</h3>
				<div style="border-left:3px solid #c9a84c;padding:8px 16px;background:#fafafa">${bodyHtml}</div>
				${socialSection}
				<p style="margin-top:1.5rem"><a href="https://deyoungdisclosure.com/admin">Review in dashboard →</a></p>
			`
		})
	});
}
