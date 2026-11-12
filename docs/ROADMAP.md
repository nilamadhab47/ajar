# Ajar — Roadmap and Differentiators

> What to build next, in order, and where the product can beat a conventional virtual office. Pairs with
> [PRODUCT_CONTEXT.md](PRODUCT_CONTEXT.md) (what exists), [SYSTEM_DESIGN.md](SYSTEM_DESIGN.md) (how) and
> [BRAND.md](BRAND.md) (why and voice).
> Sizes: **S** ≤ 2 days · **M** ≤ 1 week · **L** 2–4 weeks (one engineer). Layers: FE / BE / DB / Infra.
> Updated 12 Nov 2026 from the essentials note: chat, huddles, meetings, calendar and integrations, each with one twist.

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

The pitch is the whole door: ask first and closed, the hours that set it, the note an unanswered knock becomes, and that same door on the rest of the workday. Roam and Sococo already let someone knock. A check of a handful of vendor pages did not find this model together.

Chat, huddles, meetings, calendar and integrations are what make a company able to buy Ajar. Each one does the familiar job first, then one twist from these four rules. A feature with no twist ships quietly and is mentioned in one line. Full catalogue: [§7](#7-essentials-our-way).

1. **It obeys the door.** Open, ask first or closed changes how the feature reaches you. A closed door gets nothing live.
2. **It lives somewhere.** A channel is a room, a decision sits on a wall, a note sits on a desk. People find things by walking.
3. **It works across time zones.** Every feature has an answer for the person who is asleep.
4. **It has an off switch.** Closing your door for the day holds every ping until you open it.

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

### 1.9 What the essentials reuse

The twists in [§7](#7-essentials-our-way) sit on this model. They do not grow a second way to interrupt someone.

- A stop-by (§1.3) carries handoff items, table notes, written answers, and a seat for someone who was asleep.
- Message weight **now** is a knock (§1.2). **Whenever** waits. **Today** surfaces in the next open window.
- Office hours v2 (§1.5) is the calendar setting the door. A manual change wins over the calendar.
- The away digest (§1.7) is how a handoff arrives. The rule for "closed for the day" and the once-a-day email is still open ([§7](#7-essentials-our-way)).
- The focus bubble (§1.6) is the quiet huddle and the hold on messages during focus.

## 2. Remaining work, prioritised

### Already in the product

Sign-in is a page: magic link, email and password, Google, and Microsoft. A signed-in person can create a company, invite members and guests, and switch offices. The last owner cannot leave. Office rows stay inside that office. A member can ask for a 60-second floor ticket; the access token stays off the socket address. The gateway that accepts the ticket is not built, and the office in the browser is still the demo. With no API address, the demo opens on its own.

### P0 — Real multiplayer and the knock

Order matters: each step unlocks the next. The mock knock can start beside the gateway.

| # | Feature | Layers | Size | Notes |
|---|---|---|---|---|
| 1 | World Gateway v1: one floor actor, join/snapshot/move/stop, presence | BE | L | Go; port `CollisionSystem` + `PathfindingSystem`; 20 Hz. Join with the floor ticket, once. Loose validation only (speed clamp, walls); the purpose is true positions for knocks and audio |
| 2 | Client handles `player:corrected` + batched `world:tick` | FE | S | |
| 3 | **Door states + lantern + persisted presence** | FE BE DB | M | `door:set`, `door:updated`, nameplate/minimap/People indicators; default Ask first |
| 4 | **Mock-mode knock flow** (the signature feature in the demo first) | FE | M | Demo participants accept, decline, leave notes; the Nearby card's **Talk** becomes **Knock** |
| 5 | **Knock + stop-by + text conversation on accept** | FE BE DB | M | Knock events, rate limits, cool-off, stop-by table |
| 6 | **Notification delivery service** (in-app + email) | BE Infra | M | Needed for stop-bys; the digest worker comes with the async core |
| 7 | **LiveKit audio on accept** + `LiveKitMediaAdapter` | FE BE Infra | L | Hearing set = accepted-conversation members + private zones; mic permission at accept. Huddles and meetings share this layer |
| 8 | Reconnect + resume (position, seat, conversation, pending knocks) | FE BE | S | |
| 9 | Observability, rate limits, error reporting | BE Infra | S | OTel, Sentry |

### After the knock — essentials, in order

This is the purchase path. Detail, guardrails and the open questions are in [§7](#7-essentials-our-way). Prototype **the Handoff** and **the agenda is the room** in the demo, with no backend, once the mock knock exists. They are the two clips: lost context, and meetings that did not need to be calls.

| # | Step | What lands | Size |
|---|---|---|---|
| 1 | **Foundations** | DMs, threads, files, search, and a conversation on each room. One LiveKit layer for huddles and meetings, with screen share, captions, and guest links through reception. Google and Microsoft calendar sync. Lite mode (audio-only default, idle 30 fps, sleep when hidden, list view). The Slack-bridge question in §7 is answered before channel parity is built | L |
| 2 | **Door-aware delivery** | Held at the door, message weight, time-zone aware send, and closing the door for the day holds pings. Desktop and push notifications follow the same rule | M |
| 3 | **Async core** | Desks persisted (one desk per person per office). Desk drops v1. The Handoff. Table notes. A seat for the absent. While you were away, delivered by the digest worker | M |
| 4 | **Meetings our way** | Answer in writing instead. Knock to join late. Listen at the window. Avatars and voice by default, camera on one click. Room locks use the same knock | M |
| 5 | **Calendar our way** | Office hours v1 and the focus timer can start as soon as doors exist. Then the calendar sets the door, golden hours, the Ajar Hour, fair rotation (private, team-level), and meetings on the map | M |
| 6 | **Bridge and setup** | Slack bridge, door and status mirrored out, five-minute setup, the 10-person office template. Directory import is opt-in; a desk is assigned when that person joins | M |
| 7 | **Spatial signatures** | The agenda is the room. Hallway chat and the decision wall. A room owns its conversation (map labels stay labels). Lean in stays off until the open question is answered. Relay huddle, which is the voice drop | L |
| 8 | **Purchase readiness** | SSO (SAML/OIDC), SCIM, audit export, a written answer on data residency. Mobile: presence, chat, join audio. Onboarding walk. All-hands stage. Captions are already in step 1 | L |

### Still later, and not dropped

Map storage, versioned drafts, publish, and Tiled import/export (differentiator A). Character soft collision, HiDPI, i18n, admin spotlight, follow-with-consent. Billing with regional pricing, including INR, when a pilot is ready to pay. Scale to 500 on a floor, and an events floor, only if a pilot needs it.

### P2 — Later

Voice drops beyond the relay huddle, file drops (v3), optional AI summary, full map editor (resize rooms, paint tiles, templates), custom asset upload, real floors 2–5, custom sprite sheets after pilots show retention, integrations beyond Slack, Linear, Jira and GitHub, native apps after the mobile slice, seasonal decorations, music, pets, dark mode, photo booth, time-of-day lighting.

### Deliberately postponed

Advanced AI meeting summaries, a large integration marketplace, multiple fully developed floors, a complex map editor, a custom-avatar marketplace, native mobile apps as the first mobile client, enterprise analytics, microservices for every backend module (start as a modular monolith plus the Go gateway). A Slack-depth chat client waits on the open question in §7.

## 3. The field around Ajar

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

The same check, still a handful of pages and not a full survey:

| Product | Already has | What that means here |
|---|---|---|
| [Roam](https://ro.am/drop-in-meetings) | Knock to drop in, locked rooms, AI notes, chat, theatre for large events, Google and Office 365 calendar | Knock, AI notes and big events are already on the market |
| Sococo | An instant door-knock, rooms per department (via a [SoWork article](https://www.sowork.com/blog/best-virtual-office-for-distributed-teams-2026), itself a competitor) | Same for the knock |
| [Slack (Feb 2026)](https://slack.com/blog/news/feature-drop-feb26) | Huddles with a join preview, semantic search, an MCP server | Meet Slack in the office; leave channel depth to Slack until pilots say otherwise |
| SoWork | Slack-like chat, AI summaries, calendar, Slack and GitHub, a free plan (self-reported) | Chat and AI notes on their own do not distinguish Ajar |

Aim at the interaction model: consent first, and an answer for the person who is asleep. Also aim where Gather 2.0 stepped back (custom maps, office size, Slack, Outlook, performance) and where a buyer in a second time zone feels it (low bandwidth, regional pricing, privacy). AI meeting notes are already a category. Privacy-first AI stays optional and off by default.

## 4. Differentiators vs Gather

Ranked by (edge × feasibility). ★ = first stretch of the product. **F** and **D** are the signature features in §1. The three twists to explain in one sentence, once they exist, are held at the door, answer in writing instead, and golden hours ([§7](#7-essentials-our-way)).

### ★ F. Consent-first social design → §1.1, §1.2, §1.6
The core. Proximity creates awareness; the other person decides. Specified in §1. The same door then governs chat, huddles, meetings and the calendar.

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

## 5. Suggested sequencing

Auth, offices and the floor ticket are already behind us. The sequence from here follows §2.

| Phase | Theme | Deliver |
|---|---|---|
| Now | **Doors and the knock** | P0 #1–6 and #8: gateway, synced lanterns, mock knock beside it, then knock, stop-by, text on accept, notifications. Two browsers see each other and each other's lanterns. **Pilots can start on text.** |
| Next | **Talk, then the note** | P0 #7: audio on accept. Essentials #2 and #3: held messages, desks, desk drops, the Handoff in the demo and then for real, while you were away |
| Then | **Meetings and the calendar** | Essentials #1's LiveKit layer if it is not already up, then #4 and #5. Office hours and the focus timer as soon as doors exist. Prototype the agenda-room in the demo before building stations on the server |
| Then | **Beside Slack** | Essentials #6. The 10-person template. Tiled import (A) when a pilot asks to bring their own office |
| Then | **The spatial twists** | Essentials #7, lean in only after the open question |
| When a company asks to buy | **The review packet** | Essentials #8. Billing when a pilot is ready to pay. Scale (B) only if a pilot needs it |

## 6. Success metrics

**North star (review weekly, 4 numbers):**
1. **Weekly active teams**
2. **Accepted knocks per active user per week** (spontaneity; a healthy range, not "more is better")
3. **Desk drops opened within 24 h** of delivery (async value)
4. **Week-4 team retention**

**Supporting:** activation (in week 1, moved and had one accepted knock or one drop), time to first meaningful
interaction, office return frequency, time from accept to first audio (< 800 ms), team-level knock acceptance
(too low means people feel pestered), unanswered knocks that became stop-bys, knocks sent to people in Focus
(should be ~0), messages delivered while a door was closed (should be ~0), handoff cards read by the tagged
person within a day, invites answered in writing, idle CPU and reconnect success.

**Privacy rule:** every behavioural metric is aggregated per team or workspace. No admin view ever shows a
person's knocks, declines, reply times, or out-of-hours meetings.

## 7. Essentials, our way

12 Nov 2026. The pains below are the ones with public evidence. Every idea answers at least one of them. Sizes match the top of this file.

| Pain | Evidence | What answers it |
|---|---|---|
| Interruption overload | Interrupted about every 2 minutes; 153 chat messages and 117 emails a day; 57% of meetings are ad hoc calls with no invite ([Microsoft, 2025](https://news.microsoft.com/de-ch/2025/06/17/new-microsoft-study-reveals-the-rise-of-the-infinite-workday-40-of-employees-check-email-before-6-a-m-evening-meetings-up-16/)) | Door states, held-at-the-door delivery, message weight |
| Time zones | Nearly a third of meetings span time zones, up 35% since 2021; meetings after 8pm up 16% in a year (Microsoft, 2025) | Golden hours, the Ajar Hour, fair rotation |
| Lost context at a handoff | With a 6–8 hour gap, a misunderstanding a short call would fix can stall work for a day ([thoughtbot](https://thoughtbot.com/blog/working-across-time-zones-when-async-becomes-the-default)) | The Handoff, decision walls, one-round-trip questions |
| Can't switch off | 22% name not being able to unplug as their biggest struggle; 81% check email outside work hours ([Buffer, 2023](https://buffer.com/resources/insights-2023-state-of-remote-work/)) | Closing your door for the day holds every ping |
| Loneliness | 23% list loneliness as a struggle (Buffer, 2023) | Lean in, quiet huddles, the coffee table |
| Trust with new teammates | Async is weakest at building trust with new people (thoughtbot) | Onboarding walk, a buddy desk, a who's-who wall |

### Chat

Baseline: channels, DMs, groups, threads, reactions, files, search, mentions. The twist is chat that respects the door and survives the gap. The working start is a Slack bridge plus desk drops. Whether Ajar then grows its own channel client is an open question below.

| Idea | What it is | Effort |
|---|---|---|
| The Handoff | Closing the door for the day can leave one card: done, blocked, what I need, decisions. The next time zone finds those cards on the desk in their morning | M |
| Held at the door | A message to someone Closed or in Focus waits. The sender sees when the door opens | S |
| Message weight | Whenever (default), today, or now. Now is a knock | S |
| Time-zone aware send | A send during someone's night can offer delivery at their 9am. A group send delivers per person | S |
| Hallway and wall | Room chat fades after a day. A pinned decision (what, why, alternatives, who) stays on the wall | M |
| One-round-trip questions | Context, options, your leaning, a deadline. One tap answers. A miss becomes a stop-by | M |
| Channels are rooms | Walking into a room opens its conversation and shows who is there. A channel can exist with no room. Map labels stay labels, not departments | M |

The Handoff is optional, skippable, and asked once. Items can tag a person; tagged items also become stop-bys. Held messages carry a delivery state and release on `door:updated`. The sender can upgrade a held message to a knock.

### Huddles

Baseline: a short audio call for a few people, with screen share and a text thread. In Ajar it forms where people are standing, so it has a door and a place. A huddle is an accepted conversation with its own door. The LiveKit grant is the members only.

| Idea | What it is | Effort |
|---|---|---|
| A huddle has a door | Open means walk in, ask first means knock, closed means private. A sign shows who is in it and an optional topic. Passers-by hear nothing | S |
| Lean in | At the edge of an open huddle, listen at low volume. Your name shows as listening. Step in to speak. Members can turn listening off. Default off until the open question is answered | M |
| Quiet huddle | Mics off, a shared 25/45/60 timer, doors Closed for the duration. Working side by side | S |
| Table note | The last person to leave writes one line. It stays on the table and on the room's wall | S |
| Relay huddle | A voice thread on a table. Each person adds up to a minute in their own daytime. Playback is in order. Transcript off by default | M |

### Video meetings

Baseline: scheduled video with screen share, recording, chat, captions, guest links, and a stage for all-hands. A meeting is a huddle in a room, with cameras and an agenda. Huddles and meetings share one LiveKit layer.

| Idea | What it is | Effort |
|---|---|---|
| The agenda is the room | Each agenda item is a station. The group moves from station to station and pins a decision at each one. A latecomer sees the current station. The notes are the stations and the pins | L |
| Answer in writing instead | An invite can become a written round: the question, a deadline, one answer each, on the room's wall. It can become a call again if it stalls | M |
| Listen at the window | An optional attendee follows captions from their desk and knocks if they are needed. Captions only, no audio grant | M |
| Knock to join late | The knock shows the stations already done and their pins, then the person enters | S |
| A seat for the absent | Someone who was asleep gets the stations, pins, and a recording as a desk drop in their morning. Recording is optional and consented | S |
| Avatars by default | The meeting opens on avatars and voice. The camera is one click. The room's lamp dims as time runs out | S |

Still required, with no twist of their own: guest links (guests come through reception), screen share, recording, captions, and a stage room for all-hands.

### Calendar

Baseline: Google and Microsoft 365 sync, upcoming meetings, an automatic "In a meeting" status, reminders.

| Idea | What it is | Effort |
|---|---|---|
| The calendar sets your door | A busy block sets Ask first, a focus block sets Closed, free time restores the office-hours door. A manual change wins | M |
| Golden hours | Scheduling offers slots where working hours and Open doors overlap, and warns when a slot falls in someone's night | M |
| The Ajar Hour | The team's best daily overlap is protected. No meetings in it by default. Every lantern is Open. It is for knocks and short questions | S |
| Fair rotation | A private ledger of who took the last out-of-hours call, shown to the organiser when they schedule. Team-level. Never a public score | S |
| Meetings on the map | Five minutes before, the room lights up and offers "walk me there" | S |

Golden hours are where a meeting may be suggested. The Ajar Hour is the overlap kept for knocks, so the scheduler does not offer it as a meeting slot.

### Integrations and moving in

Baseline: Slack, Google Workspace, Microsoft 365, GitHub, Linear and Jira, and webhooks. Work shows up in the office, and Ajar can sit beside Slack.

| Idea | What it is | Effort |
|---|---|---|
| Bridge before a full chat client | Chosen Slack channels mirror into rooms, both ways. Desk drops and handoffs can reach a Slack DM for someone who is not in Ajar yet. `/ajar` shows who is in the office | M |
| Work on the desk | The current pull request or issue on the desk monitor, the board on the team wall, a deploy or a closed deal on the gong | M each |
| Five-minute setup | Google or Microsoft sign-in, an office template sized to the team, invites sent. Directory import is opt-in. A desk is assigned when that person joins | M |
| Status everywhere | The door and status also show in Slack and on the calendar | S |

### What a distributed company needs before it can buy

Must blocks a purchase. Should is expected within a few months of the first paying teams. Later waits.

| Need | Why | Our angle | Priority |
|---|---|---|---|
| Google and Microsoft sign-in; SSO later | IT reviews start here. Email and password stay for people without those accounts. Both are already built; SSO is not | — | Must |
| Dependable audio, video, screen share | The call has to work | Low-bandwidth mode (§4 C) | Must |
| Guest links | Teams meet clients and candidates | Guests enter through reception | Must |
| Google and Microsoft calendars | The meetings already live there | The calendar sets the door | Must |
| Slack bridge | Teams arrive with Slack | Bridge first | Must |
| Search across chat, walls and drops | People have to find a decision later | Search the walls first | Must |
| Notifications with a boundary | Most people check mail after hours | Closing the door for the day holds pings | Must |
| Admin roles, an audit log, a residency answer | The security review | [SYSTEM_DESIGN.md §12.10](SYSTEM_DESIGN.md) | Must |
| Captions | Accessibility, and people working in a second language | Listen at the window | Must |
| Mobile: presence, chat, join audio | People leave the desk | — | Should |
| A first week: a walk, a buddy desk, a who's-who wall | New teammates feel the gap most | The walk is through the office | Should |
| A coffee table and silent co-working | Loneliness is a named struggle | Quiet huddle; lean in only after it is tested | Should |
| An all-hands stage | Large meetings keep growing in the Microsoft data | A stage room | Should |
| A kudos wall and a gong | People teams pay for rituals | The gong is rung by a real event | Later |
| Billing, with regional prices including INR | Some markets are price-sensitive | — | Later |

### How the page talks about this

The stance stays: a quiet office, presence without pressure. Essentials are named so a buyer knows the workday is covered. A twist is showcased only after it works.

- One compact section, "Everything a workday needs, quieter", listing chat, huddles, meetings, calendar and integrations. Each row is tagged in the demo, in development, or planned.
- Held at the door, answer in writing instead, and golden hours are the three to lead with, once they exist. Each is one sentence, and the pages we checked did not show them.
- Lines worth testing, when the feature is real: "Not every hello needs a meeting." "Start the day with a handoff, not a hundred unreads." "One hour where everyone's door is open."
- The page does not say the knock is unique, and it does not say AI notes are new. It does not show a control the demo cannot do.

The second and third lines are candidates for [BRAND.md](BRAND.md). They stay off the brand lockup until the feature exists. "Not every hello needs a meeting" is already the campaign line.

### Open questions

- [ ] Build our own channel client, or ship the Slack bridge and decide after pilots? Until that is answered, step 1 in §2 persists DMs, room conversations, files and search, and does not chase Slack parity.
- [ ] Is the Handoff prompt welcome at the end of the day, or another chore? Test it with the pilot teams. A likely shape, if the prompt feels heavy: the card is filled from the day Ajar already saw, and the person confirms it.
- [ ] Closing the door for the day holds every ping. The away digest also wants one email when someone has not opened Ajar. Those two rules have to become one rule before the digest worker is built.
- [ ] Lean in: overhearing, or eavesdropping? It stays off, and off the page, until a pilot says otherwise.
- [ ] Recording consent, per region, before "a seat for the absent" includes a recording.
- [ ] Is door-aware chat priced in place of a Slack seat, or as an add-on beside it?
- [ ] A deeper pass on Roam, Sococo, Teamflow and Kumospace before any sentence that says only Ajar does something.

### Sources

- [Microsoft Work Trend Index special report, June 2025](https://news.microsoft.com/de-ch/2025/06/17/new-microsoft-study-reveals-the-rise-of-the-infinite-workday-40-of-employees-check-email-before-6-a-m-evening-meetings-up-16/)
- [Buffer, State of Remote Work 2023](https://buffer.com/resources/insights-2023-state-of-remote-work/)
- [thoughtbot, Working across time zones](https://thoughtbot.com/blog/working-across-time-zones-when-async-becomes-the-default)
- [Roam, Drop-In Meetings](https://ro.am/drop-in-meetings)
- [Slack feature drop, February 2026](https://slack.com/blog/news/feature-drop-feb26)
- [SoWork, best virtual offices for distributed teams 2026](https://www.sowork.com/blog/best-virtual-office-for-distributed-teams-2026) (published by a competitor)
