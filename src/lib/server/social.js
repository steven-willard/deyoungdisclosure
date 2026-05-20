const GRAPH_API_VERSION = 'v25.0';
const GRAPH_BASE = `https://graph.facebook.com/${GRAPH_API_VERSION}`;

/**
 * Publish a post to the Facebook Page.
 * Uses post.social_copy as the message — plain text, no markdown.
 * Non-blocking: caller should wrap in try/catch.
 *
 * Requires env vars:
 *   FB_PAGE_ID    — the Facebook Page ID
 *   FB_PAGE_TOKEN — a Page Access Token with pages_manage_posts + pages_read_engagement
 *
 * NOTE: The token from Graph API Explorer is short-lived (~1hr).
 * For production, exchange for a long-lived Page Access Token.
 * See: https://developers.facebook.com/docs/facebook-login/guides/access-tokens/get-long-lived
 */
export async function publishToFacebook(post, env) {
	if (!env.FB_PAGE_ID || !env.FB_PAGE_TOKEN) {
		throw new Error('FB_PAGE_ID or FB_PAGE_TOKEN not configured');
	}

	const message = post.social_copy?.trim();
	if (!message) {
		throw new Error('No social_copy on post — cannot publish to Facebook');
	}

	const body = { message, access_token: env.FB_PAGE_TOKEN };

	// Attach link if image_url is present
	if (post.image_url) {
		body.link = post.image_url;
	}

	const res = await fetch(`${GRAPH_BASE}/${env.FB_PAGE_ID}/feed`, {
		method: 'POST',
		headers: { 'Content-Type': 'application/json' },
		body: JSON.stringify(body)
	});

	const data = await res.json();

	if (!res.ok || data.error) {
		throw new Error(`Facebook API error: ${JSON.stringify(data.error ?? data)}`);
	}

	// Returns { id: "{page-id}_{post-id}" }
	return data;
}
