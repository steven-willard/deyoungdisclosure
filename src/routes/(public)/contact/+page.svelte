<script>
	import SEO from '$lib/SEO.svelte';

	let name = $state('');
	let email = $state('');
	let message = $state('');
	let status = $state('idle'); // idle | sending | success | error

	async function handleSubmit(e) {
		e.preventDefault();
		status = 'sending';
		try {
			const res = await fetch('/api/contact', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ name, email, message })
			});
			status = res.ok ? 'success' : 'error';
			if (res.ok) window.scrollTo({ top: 0, behavior: 'smooth' });
		} catch {
			status = 'error';
		}
	}
</script>

<SEO
	title="Contact Dave DeYoung"
	description="Reach out to Dave DeYoung, Holland Charter Township Trustee. Share your experience or ask a question."
	url="https://deyoungdisclosure.com/contact"
/>

<div class="max-w-2xl mx-auto px-6 py-16">
	<div class="mb-12">
		<p class="text-accent text-xs font-medium tracking-widest uppercase mb-2">Get in Touch</p>
		<h1 class="font-heading text-4xl font-bold text-text mb-3">Contact Dave</h1>
		<p class="text-text/60">
			Experienced selective enforcement in Holland Charter Township? Have a question?
			Dave wants to hear from you.
		</p>
	</div>

	{#if status === 'success'}
		<div class="bg-surface border border-accent/30 rounded-lg p-8 text-center">
			<p class="font-heading text-xl font-bold text-accent mb-2">Message received.</p>
			<p class="text-text/60 text-sm">Dave will be in touch.</p>
		</div>
	{:else}
		<form onsubmit={handleSubmit} class="space-y-6">
			<div>
				<label for="name" class="block text-sm font-medium text-text/70 mb-2">Name</label>
				<input
					id="name"
					type="text"
					bind:value={name}
					required
					class="w-full bg-surface border border-white/20 rounded px-4 py-3 text-text placeholder-muted focus:outline-none focus:border-accent transition-colors"
					placeholder="Your name"
				/>
			</div>
			<div>
				<label for="email" class="block text-sm font-medium text-text/70 mb-2">Email</label>
				<input
					id="email"
					type="email"
					bind:value={email}
					required
					class="w-full bg-surface border border-white/20 rounded px-4 py-3 text-text placeholder-muted focus:outline-none focus:border-accent transition-colors"
					placeholder="your@email.com"
				/>
			</div>
			<div>
				<label for="message" class="block text-sm font-medium text-text/70 mb-2">Message</label>
				<textarea
					id="message"
					bind:value={message}
					required
					rows="6"
					class="w-full bg-surface border border-white/20 rounded px-4 py-3 text-text placeholder-muted focus:outline-none focus:border-accent transition-colors resize-none"
					placeholder="What's on your mind?"
				></textarea>
			</div>

			{#if status === 'error'}
				<p class="text-red-400 text-sm">Something went wrong. Try emailing dave@davedeyoung.com directly.</p>
			{/if}

			<button
				type="submit"
				disabled={status === 'sending'}
				class="w-full py-3 bg-accent text-primary font-heading font-bold rounded text-sm tracking-wide hover:brightness-110 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
			>
				{status === 'sending' ? 'Sending...' : 'Send Message'}
			</button>
		</form>
	{/if}
</div>
