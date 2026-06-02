<script>
	import { enhance } from '$app/forms';
	let { data, form } = $props();

	const status = $derived(form?.status ?? data.status);
	const email = $derived(form?.email ?? null);
</script>

<svelte:head>
	<title>Confirm Subscription — DeYoung Disclosure</title>
</svelte:head>

<section class="max-w-xl mx-auto px-6 py-24 text-center">
	{#if status === 'ok'}
		<div class="text-5xl mb-6">✓</div>
		<h1 class="font-heading text-2xl font-bold text-accent mb-4">You're subscribed</h1>
		<p class="text-muted">
			You'll get an email at <strong class="text-white">{email}</strong> whenever Dave publishes a new post.
		</p>
		<a href="/" class="inline-block mt-8 text-sm text-accent hover:underline">← Back to home</a>

	{:else if status === 'already'}
		<div class="text-5xl mb-6">✓</div>
		<h1 class="font-heading text-2xl font-bold text-accent mb-4">Already confirmed</h1>
		<p class="text-muted">You're already subscribed. No action needed.</p>
		<a href="/" class="inline-block mt-8 text-sm text-accent hover:underline">← Back to home</a>

	{:else if status === 'pending'}
		<div class="text-5xl mb-6">✉</div>
		<h1 class="font-heading text-2xl font-bold text-white mb-4">Confirm your subscription</h1>
		<p class="text-muted mb-8">Click below to confirm you want to receive updates from Dave DeYoung.</p>
		<form method="POST" action="?/confirm" use:enhance>
			<input type="hidden" name="token" value={data.token} />
			<button
				type="submit"
				class="px-6 py-3 bg-accent text-primary font-heading font-bold rounded hover:brightness-110 transition-all"
			>
				Yes, confirm my subscription →
			</button>
		</form>
		<a href="/" class="inline-block mt-6 text-sm text-muted hover:text-accent">← Back to home</a>

	{:else if status === 'invalid'}
		<div class="text-5xl mb-6">⚠</div>
		<h1 class="font-heading text-2xl font-bold text-white mb-4">Link not valid</h1>
		<p class="text-muted">This confirmation link has already been used or has expired.</p>
		<a href="/" class="inline-block mt-8 text-sm text-accent hover:underline">← Back to home</a>

	{:else}
		<h1 class="font-heading text-2xl font-bold text-white mb-4">Something went wrong</h1>
		<p class="text-muted">Please try again in a moment.</p>
	{/if}
</section>
