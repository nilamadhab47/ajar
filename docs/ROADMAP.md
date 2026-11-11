# Ajar — Roadmap and Differentiators

> What to build next, in order, and where the product can beat Gather. Pairs with
> [PRODUCT_CONTEXT.md](PRODUCT_CONTEXT.md) (what exists), [SYSTEM_DESIGN.md](SYSTEM_DESIGN.md) (how) and
> [BRAND.md](BRAND.md) (why and voice).
> Sizes: **S** ≤ 2 days · **M** ≤ 1 week · **L** 2–4 weeks (one engineer). Layers: FE / BE / DB / Infra.

## 0. Positioning decides the order

The brand promises **presence without pressure**: *see who's around, knock don't ambush, works when you don't
overlap.* Five signature features carry that promise. They define Ajar and are built before anything that
merely matches a conventional virtual office:

1. **Knock system** with the Open / Ask first / Closed door states
2. **Desk drops** (asynchronous notes left on a desk)
3. **Personal office hours** (time-zone-aware availability)
4. **Focus bubble** (respectful focus time)
5. **While you were away** (continuity across time zones)

Guiding rules:
- **Proximity is awareness, never a connection.** Walking near someone never opens audio or chat.
- **Compete on the quality of the experience, not the number of features.**
- If a decision is in doubt, choose what makes the office calmer and less intrusive.
- Sequence for fast learning: prove the knock with **text chat on accept** first, add audio second.

## 1. Signature features (specification)

Full backend design: [SYSTEM_DESIGN.md §12](SYSTEM_DESIGN.md).

### 1.1 Interaction model: status vs door

| | Traditional virtual office | Ajar |
|---|---|---|
| See someone nearby | Start talking | **Knock → they decide** |
| Meaning of proximity | Implicit invitation | An opportunity, not an obligation |

Two independent settings per person:

- **Status** (exists today): Available, Busy, Focus, In a meeting, Away, Do not disturb, Offline. *What I'm doing.*
- **Door** (new): **Open / Ask first / Closed**. *How I want to be approached.*

Someone can be Available and still Closed to spontaneous conversation.

| Door | Meaning | What a visitor can do | Lantern |
|---|---|---|---|
| **Open** | Happy to be approached | Knock is **accepted instantly** (still one click, nobody is connected by walking past) | Warm, full glow |
| **Ask first** (default for new users) | Send a request, I'll decide | Knock → recipient gets Accept / Decline / Reply later | Soft glow |
| **Closed** | Leave me undisturbed | No knock prompt; the prompt offers **Leave a note** instead | Unlit |

Defaults and links: Focus status ⇒ door Closed for the focus duration. Do not disturb ⇒ Closed. Office hours can
schedule the door. The door is shown on the nameplate, desk, mini-map and People list.

### 1.2 Knock system

1. You walk within knock range of Priya (5 tiles, 1 in quiet zones). Her lantern is glowing; the prompt reads
   **"Priya's door is ajar. Knock?"**
2. You click **Knock**. Nothing connects yet, no mic or camera.
3. Priya gets a quiet in-app notification: **Accept · Decline · Reply later**.
4. **Accept** → "Come on in." The conversation opens as **text chat at once**; audio starts after both sides
   allow it (the browser asks for microphone permission only now; camera stays off until switched on).
5. **Decline** → sender sees "Not right now. We've let them know you stopped by." One-tap replies:
   *Free after 3pm · Leave me a note · In a meeting.* **Reply later** works the same with a promise to answer.
6. No answer within 2 minutes → the knock expires.

Every knock that isn't accepted (declined, later, expired, auto-declined outside office hours) becomes a
**stop-by** on the recipient's desk (§1.3), so nothing is lost and nobody is ghosted.

Safety rules (server-enforced):
- Max 10 knocks per hour per person, and a 10-minute cool-off on the same person after a decline or expiry.
- People can block someone; the blocked person simply sees a Closed door.
- Recipients can disable knocks (Closed). Per-person knock outcomes are never shown to admins.
- Conversations end automatically when participants leave range (short grace period).

### 1.3 Stop-by: one model for knocks and desk drops

A **stop-by** is "someone came to your desk". Its kinds: `knock` (an unanswered or declined knock), `note`
(sticky note), `link`, later `voice` and `file`. One table, one delivery path, one unread count. A desk drop is a
knock with a message. This keeps the product simple and feeds the away digest.

### 1.4 Desk drops

| Version | Scope |
|---|---|
| **v1** | Sticky note (≤ 280 chars) with optional link; appears as a note on the recipient's desk; unread badge; reply thread; history per pair |
| **v2** | **Voice drop** 15–60 s (Opus, S3), optional transcript (off by default) |
| **v3** | File attachment (virus-scanned) |
| **Not planned** | Tasks and reminders. That is a task manager; link to Linear/Jira instead (integration E) |

Guardrails: daily send limit per sender (so it doesn't become another Slack), mute per person, **no read
receipts by default** (the sender sees "delivered", not when it was read; an opt-in setting can share "opened").
Delivery outside the app: see §1.7.

### 1.5 Personal office hours

- **v1:** one weekly schedule in your own time zone with a door per block (e.g. 10–12 Open, 12–14 Closed,
  14–16 Ask first), plus quick overrides ("Closed for 45 min"). Others see "Open until 4pm (their time)" and
  the desk shows local time; the lamp dims during their night. Outside hours, knocks auto-decline into a stop-by.
- **v2:** infer from the calendar (busy blocks become Ask first, focus blocks become Closed). Don't make people
  maintain a schedule by hand.
- Others see only the current door and when it changes, not the whole schedule.

### 1.6 Focus bubble

Focus is **Closed + a timer + a visual**: a soft ring around the character and "Focus until 3:45" on the
nameplate. Durations 25 / 45 / 60 min or custom. The person stays fully visible (no disappearing); visitors see
"Leave a note" instead of Knock; nearby chat still possible if the person allows it. When the timer ends the
previous door is restored. This reuses the existing Focus status and focused coworking.

### 1.7 While you were away

- **v1 (minimal):** when you return after 2+ hours or on a new day, a short chronological panel: stop-bys
  (missed knocks), unread desk drops, mentions, meeting invitations. Dismissable. No feed.
- **Outside the app:** a once-a-day **email digest** at your local start of day (and later a Slack DM) when there
  is something unread and you haven't opened Ajar. Quiet hours respected. This is what makes desk drops work
  for people who don't keep Ajar open.
- **AI summary:** optional, off by default, needs workspace opt-in and a personal toggle. Never required.

### 1.8 Lantern language (visual)

Lantern states are shown on the nameplate, desk, mini-map and People list. **Never colour-only**: open = lit
flame, ask first = half-lit with a knocker, closed = unlit, each with an accessible text label. Warm lamp-light
(`#F4C36B`) is used only for "approachable".

## 2. Remaining work, prioritised

### P0 — Real multiplayer and the knock (month 1–3)

Order matters: each step unlocks the next.

| # | Feature | Layers | Size | Notes |
|---|---|---|---|---|
| 1 | Auth (Google/Microsoft OIDC + magic link), `/users/me`, replace `LOCAL_USER_ID` | FE BE DB | M | `setAuthTokenProvider`, sign-in page |
| 2 | Workspace + members + invites + roles (owner/admin/member/guest) | FE BE DB | M | Invite links, join flow |
| 3 | World Gateway v1: one floor actor, join/snapshot/move/stop, presence | BE | L | Go; port `CollisionSystem` + `PathfindingSystem`; 20 Hz. Loose validation only (speed clamp, walls); real purpose is knowing true positions for knocks and audio |
| 4 | Client handles `player:corrected` + batched `world:tick` | FE | S | |
| 5 | **Door states + lantern + persisted presence** | FE BE DB | M | `door:set`, `door:updated`, nameplate/minimap/People indicators; default Ask first |
| 6 | **Mock-mode knock flow** (build the signature feature in the demo first) | FE | M | Demo participants accept, decline, leave notes; replaces today's "Talk" button with **Knock**. Can start now, before any backend |
| 7 | **Knock + stop-by + text conversation on accept** | FE BE DB | M | Knock events, rate limits, cool-off, stop-by table |
| 8 | **Notification delivery service** (in-app + email) | BE Infra | M | Needed for stop-bys; digest worker comes later |
| 9 | **LiveKit audio on accept** + `LiveKitMediaAdapter` | FE BE Infra | L | Hearing set = accepted-conversation members + private zones; mic permission at accept |
| 10 | Reconnect + resume (position, seat, conversation, pending knocks) | FE BE | S | |
| 11 | Observability, rate limits, error reporting | BE Infra | S | OTel, Sentry |

### P1 — Async, rhythm and what a paying team expects (month 3–6)

| Feature | Layers | Size | Notes |
|---|---|---|---|
| **Desk drops v1** (sticky + link, unread badge on desk, replies) | FE BE DB | M | Needs desks persisted |
| Desks persisted: claim, release, decor, desk manager | FE BE DB | S | One desk per user **per workspace**. First join takes the nearest free desk; later joins return to it. |
| **While you were away v1** + **email digest** worker | FE BE | M | §1.7 |
| **Personal office hours v1** + **Focus timer**, time-zone desks | FE BE DB | M | §1.5, §1.6 |
| Persistent chat: channels, DMs, groups, history, unread, reactions, threads | FE BE DB | M | Cursor pagination |
| Meetings persisted + room occupancy from server | FE BE DB | M | |
| Calendar sync (Google + Microsoft 365): auto status, door from busy blocks, reminders | FE BE | L | Webhook subscriptions; worker |
| **Lite mode** (C): audio-only default, idle 30 fps, sleep when hidden, list view | FE | M | Measure CPU/RAM on low-end laptops |
| **Small-team office template** (10 people, one cosy room) | FE | S | A 10-person team lost in a 64×40 map feels empty |
| Knock to enter private rooms; room locks | FE BE | S | Same knock model |
| Map storage: load from API, versioned drafts, publish; **Tiled import/export** (A) | FE BE DB | M–L | Rooms/desks derived on publish |
| Notifications: desktop/push, @mentions, waves while tab hidden, quiet mode | FE BE | M | Service worker; respects Closed |
| Screen share distributed to the conversation/room | FE BE | M | LiveKit screen track |
| Admin announcement / spotlight | FE BE | S | Permission-gated |
| Follow / "bring someone to me" with consent requests | FE BE | S | |
| Character soft collision (personal space) | FE BE | S | Don't block doorways |
| HiDPI rendering | FE | S | |
| Accessibility: list view of the office, keyboard "walk to person", captions, reduced-motion mode | FE | M | |
| File uploads (presigned S3) + previews | FE BE Infra | S | |
| Slack integration (E) | BE | M | Door/status mirror, digest DM |
| Billing (Stripe, regional pricing incl. INR) | FE BE | M | |
| SSO (SAML/OIDC), SCIM, audit export | BE | L | Enterprise |
| i18n | FE | M | |

### P2 — Later

Voice drops (v2) and file drops (v3), optional AI summary, full map editor (resize rooms, paint tiles,
templates), custom asset upload, real floors 2–5, **custom sprite sheets replacing the procedural art** (after
pilots show retention), scale to 500/floor and events floor (B), integrations beyond Slack/Linear/GitHub, mobile
PWA polish then native, seasonal decorations, music, pets, dark mode, photo booth, time-of-day lighting.

### Deliberately postponed

Advanced AI meeting summaries, a large integration marketplace, multiple fully developed floors, a complex map
editor, a custom-avatar marketplace, native mobile apps, enterprise analytics, microservices for every backend
module (start as a modular monolith plus the Go gateway).

## 3. Gather today (to aim correctly)

From Gather's own docs and changelog (Nov 2026):
- **Gather 2.0 ships:** nearby chat, channels and threads; calendar view; casual and focused coworking; music
  in meetings; **AI meeting notes and transcriptions**; calendar-based smart status; one-click join of
  conversations; GitHub, Spotify and webhook "smart objects"; a Studio editor (add/resize rooms, floor and wall
  colours); up to 5 extra floors; a desk manager. ([Gather 1.0 vs 2.0](https://support.gather.town/hc/en-us/articles/40236526012948))
- **Recent changelog:** SSO (SAML/OIDC), more floors, moving desks, admin announcements, per-person volume,
  avatar costumes and seasonal objects. ([What's New](https://www.gather.town/whats-new-2-0))
- **Limits in 2.0:** recommended office size **up to 200** (1.0 allowed 500); **custom map upload, Slack and
  Outlook Calendar integrations not available**; custom object upload, Office & Team Insights "coming soon";
  mobile app in beta; billing per member. ([Gather 1.0 vs 2.0](https://support.gather.town/hc/en-us/articles/40236526012948))
- **Third-party claims (competitor-published, treat with care):** no free tier, roughly $12–15/user/month,
  reviews mentioning slowness on older machines, founder moving to Figma with the AI team in early 2026.
  ([SoWork, a competitor](https://www.sowork.com/blog/gather-vs-sowork-active-development-2026))

So: don't compete on "we also have AI notes". Compete on the **interaction model** (consent-first, async),
where 2.0 stepped back (custom maps, size, integrations, performance) and where nobody is strong (low bandwidth,
regional pricing, privacy, openness).

## 4. Differentiators vs Gather

Ranked by (edge × feasibility). ★ = first 6 months. **F** and **D** are now the signature features in §1.

### ★ F. Consent-first social design → §1.1, §1.2, §1.6
The core differentiator. Proximity creates awareness; the other person decides. Specified in §1.

### ★ D. Async presence → §1.3–1.7
Desk drops, office hours, time-zone desks, "while you were away". Specified in §1. Still to consider later:
**ghost replay** ("who was in the lounge this afternoon", opt-in, coarse).

### ★ C. Lightweight and low-bandwidth mode
- Audio-only by default, adaptive video, 2D renderer at 30 fps when idle, sleeps when the tab is hidden,
  **"lite view"** (list of rooms + people, no canvas) for slow machines, reduced-animation mode.
- Opus at low bitrate, TURN over 443, aggressive reconnect.
- Measured target: < 3% CPU idle, < 150 MB RAM, works on 1 Mbps; tested on low-end laptops.
- **Why:** performance is a recurring complaint about Gather; also unlocks India/SEA/LatAm teams.

### ★ A. Bring-your-own-world (open map format)
Gather 2.0 removed custom map upload. Ajar's maps are **Tiled-compatible JSON** already.
- Import/export Tiled maps and tilesets; templates marketplace; "fork this office".
- Custom objects with declared footprint/seats/interaction in a JSON manifest (the `object-catalog` schema).
- **Layers:** FE editor + BE asset validation + S3. **Size:** M–L. **Why:** designers and agencies can build
  branded offices; community templates spread the product.

### ★ E. Work-graph integrations that live *in the world*
- **Slack** (missing in 2.0): mirror door/status, `/ajar` to see who's in the office, desk-drop digests.
- **Linear / Jira / GitHub:** your desk monitor shows your current issue/PR; deploys ring the gong.
- **Google/Microsoft calendar** both supported (2.0 lacks Outlook).
- **Layers:** BE workers + FE in-world renderers. **Size:** M per integration.

### B. Bigger offices without degrading
Gather recommends ≤ 200 per office. Floor-actor sharding, AOI filtering and a single SFU room per floor
(SYSTEM_DESIGN §5) target **500 per floor**. Add an "events floor" mode (stage + audience) for all-hands.
Not needed for the 10–200 target segment early on, so it comes later.

### G. Privacy-first AI (not AI-first)
- Optional, off by default: summaries and transcription only with workspace opt-in and visible indicators;
  on-device or self-hosted option; notes stored in the workspace's region.
- Weekly "pulse": aggregated, anonymous team signals, never per-person.
- **Why:** Gather has AI notes; the edge here is trust and data residency.

### H. Recognition and rituals built into the space
Kudos wall, gong rung by real events, team streaks, birthdays board, onboarding quests for new hires
("find the library, meet 3 people"). **Size:** S–M.

### I. Self-host / data residency / regional pricing
Docker Compose and Helm chart; per-org data region; INR and regional pricing; generous free tier.

### J. Developer platform
Public realtime + REST API, webhook objects, plugin SDK for interactive objects (the `INTERACTIONS` registry
is already shaped for this).

## 5. Suggested sequencing (first 6 months)

| Month | Theme | Deliver |
|---|---|---|
| 1 | **Real multiplayer + doors** | P0 #1–5: auth, workspaces, gateway, door states and lanterns synced. Mock-mode knock flow (#6) done in parallel. Small-team template. Two browsers see each other and each other's lanterns |
| 2 | **The knock** | P0 #7, #8, #10: knock, stop-by, text chat on accept, notifications. **Start pilots with 2–3 teams here.** This is the signature loop |
| 3 | **Talk + leave notes** | P0 #9: audio on accept. P1: desks persisted, **desk drops v1**, email digest, **while you were away v1** |
| 4 | **Rhythm** | Office hours v1, Focus timer, time-zone desks, persisted DMs, calendar sync, lite mode (C) |
| 5 | **Own your office + integrations** | Map storage, editor publish, Tiled import (A); Slack (E); voice drops |
| 6 | **Sell** | Billing with regional pricing, SSO, notifications polish, onboarding quest (H); scale work (B) only if pilots need it |

## 6. Success metrics

**North star (review weekly, 4 numbers):**
1. **Weekly active teams**
2. **Accepted knocks per active user per week** (spontaneity; a healthy range, not "more is better")
3. **Desk drops opened within 24 h** of delivery (async value)
4. **Week-4 team retention**

**Supporting:** activation (in week 1, moved and had one accepted knock or one drop), time to first meaningful
interaction, office return frequency, time from accept to first audio (< 800 ms), team-level knock acceptance
(too low means people feel pestered), unanswered knocks that became stop-bys, knocks sent to people in Focus
(should be ~0), idle CPU and reconnect success.

**Privacy rule:** every behavioural metric is aggregated per team or workspace. No admin view ever shows a
person's knocks, declines or reply times.
