# DeYoung Disclosure — TODO

Last updated: 2026-05-20

---

## Immediate
- [x] **Purge 3 test posts** — purged 2026-05-20

---

## Public Site

### High Priority
- [x] **Home — wire latest 3 posts** — queries D1 for 3 most recent published posts. Image shown if present, text-only card if not.
- [x] **Posts archive — wire real data** — queries D1 for all published posts. Live client-side tag filtering derived from actual post data.
- [x] **Individual post pages** — `/posts/[id]` with full markdown rendering, SEO meta tags, OG tags, BlogPosting JSON-LD.
- [x] **Markdown rendering** — `marked` installed, rendering server-side on individual post pages with custom dark-theme styles.

### Medium Priority
- [x] **Tag filtering on /posts** — live reactive filtering, tags derived from real post data, no page reload.
- [ ] **Sitemap — include post URLs** — update `sitemap.xml/+server.js` to query D1 for published posts and include `/posts/{id}` entries with real `lastmod` dates.
- [ ] **Social links** — replace placeholder `facebook.com` / `instagram.com` links in nav footer with Dave's real account URLs once confirmed (pending Facebook account setup).

### Low Priority
- [ ] **Related posts** — show 2-3 related posts by tag at bottom of individual post pages.

---

## Admin Dashboard

- [x] **Contact form + inbox** — fully operational. Constituent messages stored in KV, Dave notified via Resend at dave@davedeyoung.com with full message. Admin inbox at /admin/inbox shows permanent archive with expand/delete. Delete is session-protected with confirm dialog.
- [ ] **Post approval notification email** — when Steven submits a post, email Dave a notification with a preview and link to the dashboard. Route to Steven's email during testing.
- [ ] **Reject with edits** — allow Dave to reject a post and attach a note. Note should surface to Steven via the skill's status check.
- [x] **Markdown editor for compose** — live split-pane editor with real-time preview using marked.
- [x] **Surface meeting records in compose** — searchable/filterable meeting panel at bottom of compose. Expand to see highlights, click to inject blockquote + timestamp link or plain meeting link at cursor position.
- [ ] **Image URL preview** — show a thumbnail preview when an image URL is entered in compose. If URL is a webpage, fetch OG image instead.
- [ ] **Pagination on inbox + posts** — KV list returns max 1000 keys; add cursor-based pagination before inbox/post history gets large.

---

## Infrastructure

- [ ] **Move `_context/` to NAS** — migrate local-only context files to NAS for cross-machine access via pi-home MCP. Mirror structure at `Projects/deyoungdisclosure/context/`.
- [ ] **Meta Graph API** — wire Facebook + Instagram publishing. When a post is approved, fire the Graph API to post simultaneously. Requires Meta app setup + Dave's page tokens. Blocked on Dave creating Facebook account.
- [ ] **Cloudflare R2 for images** — when Dave requests it, add R2 bucket for image storage. Update compose + SMM API to accept uploads and return a permanent CDN URL.
- [x] **robots.txt** — present in static/.

---

## Meetings (YouTube Public Record)

- [x] **Scraper** — `scripts/scrape-meetings.ts` scrapes HCT site for all 3 board types, stores transcript segments with offsets and dates.
- [x] **Summarizer** — `scripts/summarize-meetings.ts` summarizes transcripts via Anthropic API (Haiku), stores highlights with `timestamp_sec` for direct YouTube timestamp links. Kill switch + `--max` flag.
- [x] **D1 schema + CRUD API** — `meetings` table in D1, full GET/POST/DELETE API at `/api/meetings` and `/api/meetings/:id`. Upsert via ON CONFLICT. Soft + hard delete.
- [x] **Seeded** — 42 meetings across Board of Trustees (18), Planning Commission (14), ZBA (10) summarized and live in D1.
- [x] **SMM skill** — `sync-youtube` sub-command documented in skill. Skill can query meetings API for factual grounding and direct timestamp links when drafting posts.
- [x] **Meetings page on public site** — `/meetings` grouped by board type, each with YouTube link, expandable summary and key moment highlights with direct timestamp links.

---

## SMM AI Skill (`/smm`)

- [x] **Meeting sync tooling** — full pipeline built and seeded. See Meetings section above.
- [ ] **Post queue workflow** — after building a queue, allow the skill to submit the full batch to the API in sequence with confirmations between each.
- [ ] **Status check on existing posts** — skill should be able to query pending posts and surface Dave's notes on rejected ones so Steven can iterate.
- [ ] **Image sourcing** — document and potentially automate image URL sourcing (Unsplash API by tag, or pull from existing social post URLs).

---

## Nice to Have (Future)

- [ ] **SMS fallback for Dave** — if a post sits in `pending_approval` for 24h without action, send Dave an SMS reminder.
- [ ] **Public post search** — full-text search on the posts archive.
- [ ] **Nextdoor integration** — Nextdoor doesn't have a public API, so this would be manual or clipboard-copy from the skill output.
- [ ] **Email newsletter** — opt-in list for residents who want new posts delivered to their inbox.
