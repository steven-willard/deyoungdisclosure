<script>
	import SEO from '$lib/SEO.svelte';
	let { data } = $props();
	const { post } = data;

	const url = `https://deyoungdisclosure.com/posts/${post.id}`;
	const formattedDate = new Date(post.created_at).toLocaleDateString('en-US', {
		month: 'long', day: 'numeric', year: 'numeric'
	});
</script>

<SEO
	title={post.title}
	description={post.excerpt}
	image={post.image_url ?? 'https://deyoungdisclosure.com/og-default.jpg'}
	{url}
	type="article"
/>

<svelte:head>
	{@html `<script type="application/ld+json">${JSON.stringify({
		"@context": "https://schema.org",
		"@type": "BlogPosting",
		"headline": post.title,
		"description": post.excerpt,
		"datePublished": post.created_at,
		"author": { "@type": "Person", "name": "Dave DeYoung" },
		"publisher": { "@type": "Organization", "name": "DeYoung Disclosure" },
		"url": url,
		...(post.image_url ? { "image": post.image_url } : {})
	})}<\/script>`}
</svelte:head>

<article class="max-w-3xl mx-auto px-6 py-16">

	<!-- Back -->
	<a href="/posts" class="text-accent text-sm font-medium hover:underline inline-block mb-10">
		← All posts
	</a>

	<!-- Header -->
	{#if post.image_url}
		<img src={post.image_url} alt={post.title} class="w-full rounded-lg mb-8 object-cover max-h-80" />
	{/if}

	<div class="flex flex-wrap gap-2 mb-4">
		{#each post.tags as tag}
			<a href="/posts?tag={tag}" class="px-3 py-1 text-xs font-medium rounded-full border border-accent/40 text-accent hover:bg-accent/10 transition-colors">
				{tag}
			</a>
		{/each}
	</div>

	<h1 class="font-heading text-4xl font-bold text-text leading-tight mb-4">{post.title}</h1>

	<p class="text-muted text-sm mb-10">{formattedDate}</p>

	<!-- Body -->
	<div class="post-body">
		{@html post.html}
	</div>

</article>

<style>
	.post-body :global(h1),
	.post-body :global(h2),
	.post-body :global(h3),
	.post-body :global(h4) {
		font-family: 'Zilla Slab', serif;
		font-weight: 700;
		color: #f0f0f0;
		margin-top: 2rem;
		margin-bottom: 0.75rem;
		line-height: 1.3;
	}
	.post-body :global(h2) { font-size: 1.5rem; }
	.post-body :global(h3) { font-size: 1.25rem; }

	.post-body :global(p) {
		color: rgba(240, 240, 240, 0.8);
		line-height: 1.8;
		margin-bottom: 1.25rem;
	}
	.post-body :global(strong) { color: #f0f0f0; font-weight: 600; }
	.post-body :global(em) { color: rgba(240, 240, 240, 0.7); }

	.post-body :global(a) {
		color: #c9a84c;
		text-decoration: underline;
		text-underline-offset: 3px;
	}
	.post-body :global(a:hover) { filter: brightness(1.2); }

	.post-body :global(ul),
	.post-body :global(ol) {
		color: rgba(240, 240, 240, 0.8);
		padding-left: 1.5rem;
		margin-bottom: 1.25rem;
		line-height: 1.8;
	}
	.post-body :global(ul) { list-style-type: disc; }
	.post-body :global(ol) { list-style-type: decimal; }
	.post-body :global(li) { margin-bottom: 0.25rem; }

	.post-body :global(blockquote) {
		border-left: 3px solid #c9a84c;
		margin: 1.5rem 0;
		padding: 0.5rem 1.25rem;
		color: rgba(240, 240, 240, 0.6);
		font-style: italic;
	}
	.post-body :global(code) {
		background: rgba(255,255,255,0.08);
		padding: 0.15rem 0.4rem;
		border-radius: 4px;
		font-size: 0.875rem;
	}
	.post-body :global(hr) {
		border: none;
		border-top: 1px solid rgba(255,255,255,0.1);
		margin: 2rem 0;
	}
</style>
