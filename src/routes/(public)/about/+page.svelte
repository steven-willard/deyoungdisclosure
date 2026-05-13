<script>
	import SEO from '$lib/SEO.svelte';

	const REALTOR_START = 1995;
	const TOP_PRODUCER_START = 2009;

	const yearsInRealEstate = new Date().getFullYear() - REALTOR_START;
	const yearsTopProducer = new Date().getFullYear() - TOP_PRODUCER_START;
</script>

<SEO
	title="About Dave DeYoung"
	description="Dave DeYoung is a Holland Charter Township Trustee and {yearsInRealEstate}-year real estate veteran committed to transparency and accountability in Holland, Michigan."
	url="https://deyoungdisclosure.com/about"
/>

<div class="max-w-5xl mx-auto px-6 py-16">

	<!-- Header -->
	<div class="mb-16">
		<p class="text-accent text-xs font-medium tracking-widest uppercase mb-2">About</p>
		<h1 class="font-heading text-4xl font-bold text-text">Dave DeYoung</h1>
	</div>

	<div class="grid grid-cols-1 md:grid-cols-3 gap-12">

		<!-- Photo + contact -->
		<div class="md:col-span-1">
			<div class="aspect-[3/4] bg-surface rounded-lg border border-white/10 overflow-hidden mb-6">
				<img
					src="https://wisdomrealestategroup.com/files/2023/01/Screen-Shot-2023-01-04-at-5.22.06-PM.jpg"
					alt="Dave DeYoung — Holland Charter Township Trustee"
					class="w-full h-full object-cover object-top"
				/>
			</div>
			<div class="space-y-2">
				<p class="text-text font-medium">Dave DeYoung</p>
				<p class="text-muted text-sm">Holland Charter Township Trustee</p>
				<p class="text-muted text-sm">Associate Broker, Wisdom Real Estate</p>
				<a href="mailto:dave@davedeyoung.com"
					class="block text-accent text-sm hover:underline mt-3">
					dave@davedeyoung.com
				</a>
				<a href="tel:6162186699"
					class="block text-accent text-sm hover:underline">
					(616) 218-6699
				</a>
			</div>
		</div>

		<!-- Bio -->
		<div class="md:col-span-2 space-y-10">

			<div>
				<h2 class="font-heading text-2xl font-bold text-accent mb-4">
					I serve the people. Not the institution.
				</h2>
				<p class="text-text/80 leading-relaxed">
					Running for public office was never part of the plan. What changed that was watching Holland
					Charter Township staff enforce ordinances selectively — applying rules to some residents
					that were not applied to others in identical situations. When that pattern reached his own
					family, Dave made a decision: run for the board, earn a seat at the table, and hold the
					township accountable from the inside.
				</p>
				<p class="text-text/80 leading-relaxed mt-4">
					He won. He took his seat. And his mission expanded — from protecting his own family to
					making sure no other Holland Charter Township resident faces the same treatment.
				</p>
				<p class="text-text/80 leading-relaxed mt-4">
					This site exists to document that work. Every post is archived here permanently. Nothing
					gets buried.
				</p>
			</div>

			<div>
				<h2 class="font-heading text-xl font-bold text-text mb-4">Professional Background</h2>
				<p class="text-text/80 leading-relaxed">
					Dave has spent {yearsInRealEstate} years in West Michigan real estate, earning the Coldwell Banker
					Diamond Society distinction and recognition as a Top Producer for {yearsTopProducer} consecutive
					years. Nearly 96% of his clients return or refer him — because trust is built through
					consistent action, not empty words.
				</p>
				<p class="text-text/80 leading-relaxed mt-4">
					That same standard applies to public service.
				</p>
			</div>

			<!-- Credentials — derived, never hardcoded -->
			<div class="grid grid-cols-2 gap-4">
				{#each [
					{ label: 'Years in Real Estate', value: `${yearsInRealEstate}+` },
					{ label: 'Years Top Producer', value: `${yearsTopProducer}` },
					{ label: 'Client Return Rate', value: '96%' },
					{ label: 'Designation', value: 'Diamond Society' }
				] as stat}
					<div class="bg-surface rounded-lg border border-white/10 p-4">
						<p class="text-accent font-heading text-2xl font-bold">{stat.value}</p>
						<p class="text-muted text-xs mt-1">{stat.label}</p>
					</div>
				{/each}
			</div>

		</div>
	</div>
</div>
