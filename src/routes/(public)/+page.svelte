<script>
	import SEO from '$lib/SEO.svelte';
	let { data } = $props();
	const { posts } = data;

	function formatDate(iso) {
		return new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
	}
</script>

<SEO
	title="Dave DeYoung | HCT Trustee"
	description="Transparency from an elected trustee. Dave DeYoung, Holland Charter Township Trustee — holding the line on accountability and civic transparency in Holland, Michigan."
	url="https://deyoungdisclosure.com"
/>

<!-- Hero -->
<section class="relative min-h-screen flex items-center justify-center overflow-hidden">

	<!-- Background -->
	<div class="absolute inset-0 bg-gradient-to-br from-primary via-[#0d1a28] to-[#1a2d3f]"></div>
	<div class="absolute inset-0 opacity-10 bg-[radial-gradient(ellipse_at_top_right,_#c9a84c,_transparent_60%)]"></div>

	<!-- Content -->
	<div class="relative z-10 max-w-5xl mx-auto px-6 py-24 text-center">
		<p class="text-accent text-sm font-medium tracking-widest uppercase mb-4">
			Holland Charter Township Trustee
		</p>
		<h1 class="font-heading text-5xl md:text-7xl font-bold text-text leading-tight mb-6">
			Dave DeYoung
		</h1>
		<p class="font-heading text-2xl md:text-3xl text-accent font-semibold mb-4">
			I serve the people.<br class="hidden md:block"> Not the institution.
		</p>
		<p class="text-text/60 text-lg max-w-xl mx-auto mb-10">
			Transparency and accountability from an elected trustee in Holland, Michigan.
			Every statement. Every post. Permanent record.
		</p>
		<div class="flex flex-col sm:flex-row gap-4 justify-center">
			<a href="/posts"
				class="px-8 py-3 bg-accent text-primary font-heading font-bold rounded text-sm tracking-wide hover:brightness-110 transition-all">
				Read the Posts
			</a>
			<a href="/contact"
				class="px-8 py-3 border border-accent/40 text-accent font-heading font-semibold rounded text-sm tracking-wide hover:border-accent hover:bg-accent/10 transition-all">
				Contact Dave
			</a>
		</div>
	</div>

	<!-- Scroll indicator -->
	<div class="absolute bottom-8 left-1/2 -translate-x-1/2 text-muted animate-bounce">
		<svg xmlns="http://www.w3.org/2000/svg" class="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
			<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7" />
		</svg>
	</div>
</section>

<!-- Latest Posts -->
<section class="max-w-5xl mx-auto px-6 py-20">
	<div class="flex items-end justify-between mb-10">
		<div>
			<p class="text-accent text-xs font-medium tracking-widest uppercase mb-2">Latest</p>
			<h2 class="font-heading text-3xl font-bold text-text">From the Record</h2>
		</div>
		<a href="/posts" class="text-accent text-sm font-medium hover:underline">
			See all posts →
		</a>
	</div>

	{#if posts.length === 0}
		<p class="text-muted text-sm">No published posts yet.</p>
	{:else}
		<div class="grid grid-cols-1 md:grid-cols-3 gap-6">
			{#each posts as post}
				<article class="bg-surface rounded-lg overflow-hidden border border-white/10 hover:border-accent/30 transition-colors group">
					{#if post.image_url}
						<img src={post.image_url} alt={post.title} class="aspect-video w-full object-cover" />
					{:else}
						<div class="aspect-video bg-primary/60 flex items-center justify-center">
							<span class="text-muted text-xs">No image</span>
						</div>
					{/if}
					<div class="p-5">
						<p class="text-muted text-xs mb-2">
							{formatDate(post.created_at)}{post.tags[0] ? ` · ${post.tags[0]}` : ''}
						</p>
						<h3 class="font-heading text-lg font-semibold text-text group-hover:text-accent transition-colors leading-snug mb-2">
							<a href="/posts/{post.id}">{post.title}</a>
						</h3>
						<p class="text-text/60 text-sm line-clamp-2">{post.excerpt}</p>
					</div>
				</article>
			{/each}
		</div>
	{/if}
</section>
