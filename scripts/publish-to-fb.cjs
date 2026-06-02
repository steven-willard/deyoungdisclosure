/**
 * One-off script: publish a post to Facebook manually.
 * Usage:
 *   FB_PAGE_TOKEN=<your_token> FB_PAGE_ID=1256065217579499 node scripts/publish-to-fb.js <post-id>
 *
 * After running, updates the KV record with the returned fb_post_id.
 */

const https = require('https');

const SMM_API_KEY = '83a92a54-8bc3-4351-9db0-7aba63143d8a';
const FB_PAGE_TOKEN = process.env.FB_PAGE_TOKEN;
const FB_PAGE_ID = process.env.FB_PAGE_ID || '1256065217579499';
const GRAPH_API_VERSION = 'v25.0';
const POST_ID = process.argv[2];

if (!FB_PAGE_TOKEN || FB_PAGE_TOKEN === 'paste_your_page_access_token_here') {
	console.error('ERROR: Set FB_PAGE_TOKEN env var to your Page Access Token');
	process.exit(1);
}
if (!POST_ID) {
	console.error('Usage: FB_PAGE_TOKEN=<token> node scripts/publish-to-fb.js <post-id>');
	process.exit(1);
}

function httpsGet(opts) {
	return new Promise((resolve, reject) => {
		const req = https.request(opts, res => {
			let data = '';
			res.on('data', d => (data += d));
			res.on('end', () => resolve({ status: res.statusCode, body: data }));
		});
		req.on('error', reject);
		req.end();
	});
}

function httpsPost(opts, body) {
	return new Promise((resolve, reject) => {
		const req = https.request(opts, res => {
			let data = '';
			res.on('data', d => (data += d));
			res.on('end', () => resolve({ status: res.statusCode, body: data }));
		});
		req.on('error', reject);
		req.write(body);
		req.end();
	});
}

async function run() {
	// 1. Fetch the post
	console.log(`Fetching post ${POST_ID}...`);
	const postRes = await httpsGet({
		hostname: 'deyoungdisclosure.com',
		path: `/api/posts/${POST_ID}`,
		method: 'GET',
		headers: { Authorization: `Bearer ${SMM_API_KEY}` }
	});

	if (postRes.status !== 200) {
		console.error('Failed to fetch post:', postRes.body);
		process.exit(1);
	}

	const obj = JSON.parse(postRes.body);
	const post = obj.post || obj;

	console.log('Title:', post.title);
	console.log('State:', post.state);
	console.log('Platforms:', post.platforms);
	console.log('Social copy length:', (post.social_copy || '').length);

	if (!post.social_copy?.trim()) {
		console.error('Post has no social_copy — cannot publish to Facebook');
		process.exit(1);
	}

	if (post.fb_post_id) {
		console.log('Post already has fb_post_id:', post.fb_post_id);
		console.log('Already published? Proceeding anyway to re-publish...');
	}

	// 2. Publish to Facebook
	console.log('\nPublishing to Facebook Page...');
	const fbBody = JSON.stringify({
		message: post.social_copy.trim(),
		access_token: FB_PAGE_TOKEN,
		...(post.image_url ? { link: post.image_url } : {})
	});

	const fbRes = await httpsPost(
		{
			hostname: 'graph.facebook.com',
			path: `/${GRAPH_API_VERSION}/${FB_PAGE_ID}/feed`,
			method: 'POST',
			headers: {
				'Content-Type': 'application/json',
				'Content-Length': Buffer.byteLength(fbBody)
			}
		},
		fbBody
	);

	const fbData = JSON.parse(fbRes.body);

	if (!fbRes.status.toString().startsWith('2') || fbData.error) {
		console.error('Facebook API error:', JSON.stringify(fbData.error ?? fbData, null, 2));
		process.exit(1);
	}

	console.log('Facebook post created! ID:', fbData.id);

	// 3. Update the post record with fb_post_id via PUT
	console.log('\nUpdating post record with fb_post_id...');
	const updateBody = JSON.stringify({ fb_post_id: fbData.id });
	const updateRes = await httpsPost(
		{
			hostname: 'deyoungdisclosure.com',
			path: `/api/posts/${POST_ID}`,
			method: 'PUT',
			headers: {
				Authorization: `Bearer ${SMM_API_KEY}`,
				'Content-Type': 'application/json',
				'Content-Length': Buffer.byteLength(updateBody)
			}
		},
		updateBody
	);

	if (updateRes.status !== 200) {
		console.warn('Warning: could not update post record with fb_post_id:', updateRes.body);
	} else {
		console.log('Post record updated.');
	}

	console.log('\nDone! Facebook post ID:', fbData.id);
	console.log(`View on Facebook: https://www.facebook.com/${fbData.id.replace('_', '/posts/')}`);
}

run().catch(err => {
	console.error('Unexpected error:', err);
	process.exit(1);
});
