# DeYoung Disclosure — TODO

Last updated: 2026-05-17

---

## Public Site

### High Priority
- [ ] **Home — wire latest 3 posts** — add `+page.server.js` to query D1 for 3 most recent published posts, replace placeholder cards with real data. Show `image_url` if present, styled fallback if not.
- [ ] **Posts archive — wire real data** — add `+page.server.js` to query D1 for all published posts, replace "CMS coming soon" placeholder with real post cards.
- [ ] **Individual post pages** — create `src/routes/(public)/posts/[id]/+page.svelte` + `+page.server.js`. Load post from D1 by ID. Render `body` as markdown. Full SEO (title, description, OG tags, BlogPosting JSON-LD).
- [ ] **Markdown rendering** — install a markdown renderer (e.g. `marked` or `@sveltejs/remark`) and render post `body` on individual post pages and in previews.

### Medium Priority
- [ ] **Tag filtering on /posts** — make tag buttons functional, filter displayed posts by selected tag. Tags should be derived from actual post data, not hardcoded.
- [ ] **Sitemap — include post URLs** — update `sitemap.xml/+server.js` to query D1 for published posts and include `/posts/{id}` entries with real `lastmod` dates.
- [ ] **Social links** — replace placeholder `facebook.com` / `instagram.com` links in nav footer with Dave's real account URLs once confirmed.

### Low Priority
- [ ] **OG image per post** — add dynamic Open Graph image support per post (use `image_url` if set, fallback to site default OG image).
- [ ] **BlogPosting JSON-LD** — add structured data on individual post pages for SEO.
- [ ] **Related posts** — show 2-3 related posts by tag at bottom of individual post pages.
- [ ] **Post excerpt on cards** — truncate `body` to ~150 chars for card previews, stripping markdown.

---

## Admin Dashboard

- [ ] **Post approval notification email** — when Steven submits a post, email Dave a notification with a preview and link to the dashboard. Currently Dave has to check the dashboard manually.
- [ ] **Reject with edits** — allow Dave to reject a post and attach a note. Currently reject just changes state. Note should surface to Steven.
- [ ] **Markdown editor for compose** — replace plain textarea with a simple markdown editor (e.g. CodeMirror or a lightweight MD editor) for compose page.
- [ ] **Image URL preview** — show a thumbnail preview when an image URL is entered in compose.
- [ ] **Pagination on inbox + posts** — KV list returns max 1000 keys; add cursor-based pagination before inbox/post history gets large.

---

## Infrastructure

- [ ] **Move `_context/` to NAS** — migrate local-only context files to NAS for cross-machine access via pi-home MCP. Mirror structure at `Projects/deyoungdisclosure/context/`.
- [ ] **Cloudflare R2 for images** — when Dave requests it, add R2 bucket for image storage. Update compose + SMM API to accept uploads and return a permanent CDN URL.
- [ ] **Meta Graph API** — wire Facebook + Instagram publishing. When a post is approved, fire the Graph API to post simultaneously. Requires Meta app setup + page tokens.
- [ ] **robots.txt** — add `static/robots.txt` allowing all crawlers, referencing sitemap URL.

---

## SMM AI Skill (`/smm`)

- [x] **Meeting sync tooling** — `scrape-meetings.ts`, `summarize-meetings.ts`, `seed-meetings.ts` built and run. 42 meetings (Board of Trustees, Planning Commission, ZBA) scraped, summarized via Anthropic API, and seeded into D1. SMM skill updated with `sync-youtube` sub-command.
- [ ] **Post queue workflow** — after building a queue, allow the skill to submit the full batch to the API in sequence with confirmations between each.
- [ ] **Status check on existing posts** — skill should be able to query pending posts and surface Dave's notes on rejected ones so Steven can iterate.
- [ ] **Image sourcing** — document and potentially automate image URL sourcing (Unsplash API by tag, or pull from existing social post URLs).

---

## Nice to Have (Future)

- [ ] **SMS fallback for Dave** — if a post sits in `pending_approval` for 24h without action, send Dave an SMS reminder.
- [ ] **Public post search** — full-text search on the posts archive.
- [ ] **Nextdoor integration** — Nextdoor doesn't have a public API, so this would be manual or clipboard-copy from the skill output.
- [ ] **Email newsletter** — opt-in list for residents who want new posts delivered to their inbox.
