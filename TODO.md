# DeYoung Disclosure — TODO

Last updated: 2026-06-02

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
- [x] **Post approval notification email** — fires on pending_approval from both compose form and API. Shared `sendPostApprovalEmail` in `src/lib/server/notify.js`. Email to `APPROVAL_NOTIFY_EMAIL` const (rockerw@live.com for testing → dave@davedeyoung.com on handoff). Markdown body rendered as HTML, social copy included if present.
- [x] **Approve/reject gated to OWNER_EMAIL** — only Dave can approve or reject. Steven sees "Awaiting Dave's approval." Non-owners cannot trigger either action.
- [x] **Reject with reason** — Dave rejects via dashboard with optional reason text field. Stored as `dave_note` in KV + post_transitions. SMM skill queries `GET /api/posts?state=rejected` to surface notes and iterate.
- [x] **Markdown editor for compose** — live split-pane editor with toolbar (bold, italic, headings, blockquote, inline/block code, link, bullet/numbered list, HR). Toolbar applies to all selected lines for list prefixes.
- [x] **Surface meeting records in compose** — searchable/filterable meeting panel at bottom of compose. Expand to see highlights, click to inject blockquote + timestamp link or plain meeting link at cursor position.
- [x] **Image URL preview in compose** — live thumbnail below image URL field. Error message if URL fails to load.
- [x] **Social copy field** — plain-text field for Facebook/Instagram shown when either platform is checked. Required validation (client + server). "Convert from markdown" button uses `remove-markdown` to generate a starting point with URLs preserved. Character counter (2,200 Instagram limit).
- [x] **Markdown rendered in approval cards** — pending posts show full markdown-rendered body + image preview. Social copy shown in distinct panel.
- [ ] **Pagination on inbox + posts** — KV list returns max 1000 keys; add cursor-based pagination before inbox/post history gets large.

---

## Infrastructure

- [ ] **Move `_context/` to NAS** — migrate local-only context files to NAS for cross-machine access via pi-home MCP. Mirror structure at `Projects/deyoungdisclosure/context/`.
- [x] **Meta Graph API — Facebook** — wired. Approved posts auto-publish to Facebook Page via Graph API. `social_copy` is the payload. `fb_post_id` stored back to KV on success.
- [ ] **Meta Graph API — Instagram (Phase 2)** — Instagram requires images on every post and a separate API call (`POST /{ig-user-id}/media` + `/media_publish`). Needs `instagram_basic` + `instagram_content_publish` permissions. Deferred until consistent image strategy is in place. Dave aware — phase 1 is site + Facebook only.
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
- [x] **Status check on existing posts** — skill queries all post states (pending, rejected, published). Surfaces `dave_note` on rejected posts for iteration loop.
- [x] **Full API visibility** — skill documents all endpoints: list by state, get single post, submit, update, soft delete, purge, rejection feedback loop, meetings API.
- [ ] **Post queue workflow** — after building a queue, allow the skill to submit the full batch to the API in sequence with confirmations between each.
- [ ] **Image sourcing** — document and potentially automate image URL sourcing (Unsplash API by tag, or pull from existing social post URLs).

---

## Nice to Have (Future)

- [ ] **SMS fallback for Dave** — if a post sits in `pending_approval` for 24h without action, send Dave an SMS reminder.
- [ ] **Public post search** — full-text search on the posts archive.
- [ ] **Nextdoor integration** — Nextdoor doesn't have a public API, so this would be manual or clipboard-copy from the skill output.
- [x] **Email newsletter** — fully live. Double opt-in subscribe form in site footer. Confirmation email requires button click (not GET) to prevent email scanner pre-confirmation. Newsletter blasts on post approval to all confirmed subscribers. CAN-SPAM compliant unsubscribe. Resend free tier: 3,000/month, 100/day — upgrade to $20/month when subscriber list exceeds ~95.
