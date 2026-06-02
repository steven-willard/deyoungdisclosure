<script>
	let { data } = $props();
</script>

<svelte:head>
	<title>Subscription Confirmed — DeYoung Disclosure</title>
</svelte:head>

<section class="max-w-xl mx-auto px-6 py-24 text-center">
	{#if data.status === 'ok'}
		<div class="text-5xl mb-6">✓</div>
		<h1 class="font-heading text-2xl font-bold text-accent mb-4">You're subscribed</h1>
		<p class="text-muted">
			You'll get an email at <strong class="text-white">{data.email}</strong> whenever Dave publishes a new post.
		</p>
		<a href="/" class="inline-block mt-8 text-sm text-accent hover:underline">← Back to home</a>
	{:else if data.status === 'invalid'}
		<div class="text-5xl mb-6">⚠</div>
		<h1 class="font-heading text-2xl font-bold text-white mb-4">Link not valid</h1>
		<p class="text-muted">This confirmation link has already been used or has expired.</p>
		<a href="/" class="inline-block mt-8 text-sm text-accent hover:underline">← Back to home</a>
	{:else}
		<h1 class="font-heading text-2xl font-bold text-white mb-4">Something went wrong</h1>
		<p class="text-muted">Please try again in a moment.</p>
	{/if}
</section>
