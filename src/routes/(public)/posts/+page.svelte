<script>
	import SEO from '$lib/SEO.svelte';
	let { data } = $props();
	const { posts } = data;

	let activeTag = $state('All');

	const allTags = $derived(['All', ...new Set(posts.flatMap(p => p.tags))]);
	const filtered = $derived(activeTag === 'All' ? posts : posts.filter(p => p.tags.includes(activeTag)));

	function formatDate(iso) {
		return new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
	}
</script>

<SEO
	title="Posts & Disclosures"
	description="Every public statement, post, and disclosure from Dave DeYoung, Holland Charter Township Trustee. Permanent archive — nothing gets buried."
	url="https://deyoungdisclosure.com/posts"
/>

<div class="max-w-5xl mx-auto px-6 py-16">
	<div class="mb-12">
		<p class="text-accent text-xs font-medium tracking-widest uppercase mb-2">Archive</p>
		<h1 class="font-heading text-4xl font-bold text-text mb-3">Posts & Disclosures</h1>
		<p class="text-text/60 max-w-xl">
			Every post lives here permanently. Nothing gets buried in a feed.
		</p>
	</div>

	<!-- Tag filters -->
	<div class="flex gap-2 flex-wrap mb-10">
		{#each allTags as tag}
			<button
				onclick={() => activeTag = tag}
				class="px-3 py-1 text-xs font-medium rounded-full border transition-colors
					{activeTag === tag
						? 'border-accent text-accent bg-accent/10'
						: 'border-white/20 text-muted hover:border-accent hover:text-accent'}">
				{tag}
			</button>
		{/each}
	</div>

	{#if filtered.length === 0}
		<div class="bg-surface rounded-lg border border-white/10 p-8 text-center">
			<p class="text-muted text-sm">No posts yet.</p>
		</div>
	{:else}
		<div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
			{#each filtered as post}
				<article class="bg-surface rounded-lg overflow-hidden border border-white/10 hover:border-accent/30 transition-colors group">
					{#if post.image_url}
						<img src={post.image_url} alt={post.title} class="aspect-video w-full object-cover" />
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
</div>
