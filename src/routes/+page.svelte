<svelte:head>
	<title>Dave DeYoung | HCT Trustee</title>
</svelte:head>

<main>
	<h1>Hello, Dave.</h1>
	<p>deyoungdisclosure.com is live. Site coming soon.</p>
</main>

<style>
	:global(*, *::before, *::after) {
		box-sizing: border-box;
		margin: 0;
		padding: 0;
	}

	:global(body) {
		background: #0f1923;
		color: #f0f0f0;
		font-family: Georgia, serif;
	}

	main {
		min-height: 100vh;
		display: flex;
		flex-direction: column;
		align-items: center;
		justify-content: center;
		gap: 1rem;
		padding: 2rem;
		text-align: center;
	}

	h1 {
		font-size: clamp(2rem, 6vw, 4rem);
		color: #c9a84c;
		letter-spacing: 0.02em;
	}

	p {
		font-size: 1.1rem;
		color: #888;
	}
</style>
