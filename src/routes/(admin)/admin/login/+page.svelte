<script>
	import { enhance } from '$app/forms';

	let { form } = $props();
	let status = $state('idle'); // idle | sending | sent | error
</script>

<svelte:head>
	<title>Admin Login</title>
</svelte:head>

<div class="min-h-screen bg-primary flex items-center justify-center px-4">
	<div class="w-full max-w-sm">
		<div class="mb-8 text-center">
			<p class="text-accent text-xs font-medium tracking-widest uppercase mb-2">Restricted</p>
			<h1 class="font-heading text-2xl font-bold text-text">Admin Access</h1>
			<p class="text-text/50 text-sm mt-2">Enter your email to receive a sign-in link.</p>
		</div>

		{#if status === 'sent'}
			<div class="bg-surface border border-accent/30 rounded-lg p-6 text-center">
				<p class="font-heading text-lg font-bold text-accent mb-1">Check your email</p>
				<p class="text-text/60 text-sm">If that address is authorized, a sign-in link is on its way.</p>
			</div>
		{:else}
			<form
				method="POST"
				use:enhance={() => {
					status = 'sending';
					return async ({ result }) => {
						if (result.type === 'success') {
							status = 'sent';
						} else {
							status = 'error';
						}
					};
				}}
				class="space-y-4"
			>
				<div>
					<label for="email" class="block text-sm font-medium text-text/70 mb-2">Email address</label>
					<input
						id="email"
						name="email"
						type="email"
						required
						autocomplete="email"
						class="w-full bg-surface border border-white/20 rounded px-4 py-3 text-text placeholder-muted focus:outline-none focus:border-accent transition-colors"
						placeholder="you@example.com"
					/>
				</div>

				{#if status === 'error' || form?.error}
					<p class="text-red-400 text-sm">{form?.error ?? 'Something went wrong. Try again.'}</p>
				{/if}

				<button
					type="submit"
					disabled={status === 'sending'}
					class="w-full py-3 bg-accent text-primary font-heading font-bold rounded text-sm tracking-wide hover:brightness-110 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
				>
					{status === 'sending' ? 'Sending...' : 'Send sign-in link'}
				</button>
			</form>
		{/if}
	</div>
</div>
