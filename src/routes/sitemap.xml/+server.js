export async function GET() {
	const pages = [
		{ url: '/', priority: '1.0', changefreq: 'weekly' },
		{ url: '/posts', priority: '0.9', changefreq: 'daily' },
		{ url: '/about', priority: '0.7', changefreq: 'monthly' },
		{ url: '/contact', priority: '0.5', changefreq: 'monthly' }
	];

	const base = 'https://deyoungdisclosure.com';
	const today = new Date().toISOString().split('T')[0];

	const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${pages.map(p => `  <url>
    <loc>${base}${p.url}</loc>
    <lastmod>${today}</lastmod>
    <changefreq>${p.changefreq}</changefreq>
    <priority>${p.priority}</priority>
  </url>`).join('\n')}
</urlset>`;

	return new Response(xml, {
		headers: {
			'Content-Type': 'application/xml',
			'Cache-Control': 'max-age=3600'
		}
	});
}
