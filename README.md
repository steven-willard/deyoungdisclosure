# DeYoung Disclosure

Civic transparency site for Dave DeYoung, Holland Charter Township Trustee.
Live at [deyoungdisclosure.com](https://deyoungdisclosure.com).

## Stack

| Concern | Solution |
|---|---|
| Framework | SvelteKit 2 + Svelte 5 |
| Styling | Tailwind CSS 4 |
| Hosting | Cloudflare Workers + Assets |
| State storage | Cloudflare KV (`DEYOUNG_KV`) |
| Permanent record | Cloudflare D1 (`deyoung_db`) |
| Email | Resend |
| Adapter | `@sveltejs/adapter-cloudflare` |

## Route Structure

```
src/routes/
  (public)/           — Public site with nav/footer layout
    +layout.svelte
    +page.svelte
    about/
    contact/
    posts/
    sitemap.xml/

  (admin)/admin/      — Admin shell (no public nav)
    +layout.server.js — Session guard — redirects to /admin/login if unauthenticated
    +layout.svelte    — Sidebar + topbar
    +page.svelte      — Dashboard: pending approvals, stats, inbox preview
    +page.server.js
    login/            — Magic link login form
    compose/          — Draft a post (Steven → pending, Dave → published)
    posts/            — Post history
    inbox/            — Contact messages

  api/
    auth/verify/      — Magic link consumer, sets session cookie
    auth/logout/      — Clears session
    contact/          — Contact form handler
    posts/            — SMM AI CRUD API
    posts/[id]/
```

## Auth

### Admin (magic link)
- `/admin/login` — enter email, receive magic link via Resend
- `/api/auth/verify` — validates HMAC token, creates session in KV, sets cookie
- Session: `HttpOnly; Secure; SameSite=Strict`, 7-day TTL
- Guard: `(admin)/admin/+layout.server.js` — validates session on every admin request

### SMM AI API (API key)
- `Authorization: Bearer <SMM_AI_API_KEY>` on all `/api/posts` requests

## Post Pipeline

```
smm-ai drafts → POST /api/posts → state: pending_approval
Dave logs in → approves on dashboard → state: published
Dave rejects → state: rejected
Dave composes directly → state: published (no approval needed)
Steven composes → state: pending_approval
```

## SMM AI API

Base URL: `https://deyoungdisclosure.com`
Auth: `Authorization: Bearer <SMM_AI_API_KEY>`

| Method | Endpoint | Description |
|---|---|---|
| GET | `/api/posts` | List posts (excludes deleted by default) |
| GET | `/api/posts?state=<state>` | Filter by state |
| POST | `/api/posts` | Create post |
| GET | `/api/posts/:id` | Get single post |
| PUT | `/api/posts/:id` | Update post (partial) |
| DELETE | `/api/posts/:id` | Soft delete (state → deleted) |
| DELETE | `/api/posts/:id?purge=true` | Hard delete (permanent) |

### Post schema

```json
{
  "id": "uuid",
  "title": "string",
  "body": "string (markdown supported)",
  "tags": ["string"],
  "image_url": "string | null",
  "platforms": ["Facebook", "Instagram", "Website"],
  "state": "pending_approval | published | rejected | deleted",
  "created_by": "email | smm-ai",
  "created_at": "ISO8601",
  "updated_at": "ISO8601",
  "dave_note": "string | null"
}
```

### Post states

```
pending_approval → published    (Dave approves)
pending_approval → rejected     (Dave rejects)
rejected → pending_approval     (resubmit via PUT)
any → deleted                   (soft delete, recoverable via PUT)
any → purged                    (DELETE ?purge=true, permanent)
```

## KV Schema

```
session:{sessionId}           → { email, expires_at }         TTL: 7d
magic:{token}                 → { email }                     TTL: 15min
posts:{postId}                → { full post object }          no TTL
contact:{timestamp}_{id}      → { name, email, message, created_at }
```

## D1 Schema

```sql
posts (id, title, body, tags, image_url, platforms, state,
       created_by, created_at, updated_at, dave_note)

post_transitions (id, post_id, from_state, to_state,
                  actor, note, transitioned_at)
```

## Worker Secrets

| Secret | Description |
|---|---|
| `SESSION_SECRET` | HMAC key for magic link tokens |
| `ADMIN_EMAILS` | Comma-separated authorized admin emails |
| `OWNER_EMAIL` | Dave's email — posts by this user self-publish |
| `RESEND_API_KEY` | Resend API key for email delivery |
| `SMM_AI_API_KEY` | Bearer token for SMM AI API access |

## Local Skill

`/dave-post` — AI social media manager skill. Drafts posts in Dave's voice, checks against rules, and submits approved drafts to the API.
