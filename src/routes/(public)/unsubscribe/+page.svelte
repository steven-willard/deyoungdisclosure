<script>
	let { data } = $props();
</script>

<svelte:head>
	<title>Unsubscribed — DeYoung Disclosure</title>
</svelte:head>

<section class="max-w-xl mx-auto px-6 py-24 text-center">
	{#if data.status === 'ok'}
		<h1 class="font-heading text-2xl font-bold text-white mb-4">You've been unsubscribed</h1>
		<p class="text-muted">
			<strong class="text-white">{data.email}</strong> has been removed from the list.
		</p>
		<a href="/" class="inline-block mt-8 text-sm text-accent hover:underline">← Back to home</a>
	{:else if data.status === 'invalid'}
		<h1 class="font-heading text-2xl font-bold text-white mb-4">Link not found</h1>
		<p class="text-muted">This unsubscribe link is invalid or has already been used.</p>
		<a href="/" class="inline-block mt-8 text-sm text-accent hover:underline">← Back to home</a>
	{:else}
		<h1 class="font-heading text-2xl font-bold text-white mb-4">Something went wrong</h1>
		<p class="text-muted">Please try again in a moment.</p>
	{/if}
</section>
