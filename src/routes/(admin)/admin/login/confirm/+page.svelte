<script>
	import { enhance } from '$app/forms';

	let { data, form } = $props();
</script>

<svelte:head>
	<title>Sign in — DeYoung Disclosure Admin</title>
</svelte:head>

<div class="min-h-screen bg-primary flex items-center justify-center px-4">
	<div class="w-full max-w-sm text-center">
		<div class="mb-8">
			<p class="text-accent text-xs font-medium tracking-widest uppercase mb-2">Admin Access</p>
			<h1 class="font-heading text-2xl font-bold text-text">Sign in</h1>
			<p class="text-text/50 text-sm mt-2">Click below to complete sign-in.</p>
		</div>

		{#if form?.error}
			<div class="mb-6 bg-red-500/10 border border-red-500/30 rounded-lg px-4 py-3">
				<p class="text-red-400 text-sm">{form.error}</p>
				<a href="/admin/login" class="text-accent text-xs underline mt-2 block">Request a new link</a>
			</div>
		{:else}
			<form method="POST" use:enhance>
				<input type="hidden" name="token" value={data.token} />
				<button
					type="submit"
					class="w-full py-3 bg-accent text-primary font-heading font-bold rounded text-sm tracking-wide hover:brightness-110 transition-all"
				>
					Sign in to Admin
				</button>
			</form>
		{/if}
	</div>
</div>
