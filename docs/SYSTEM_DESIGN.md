# Ajar — System Design (frontend, backend, database, infrastructure)

> Status: **frontend built, backend proposed.** Everything under "Frontend" exists in this repo.
> Everything under "Backend", "Database" and "Infrastructure" is a design for you to implement. It is written
> against the contracts the frontend already speaks (`src/services/**`), so the two meet without rewrites.
> Companion docs: [PRODUCT_CONTEXT.md](PRODUCT_CONTEXT.md) (what exists, for the IDE) ·
> [ROADMAP.md](ROADMAP.md) (what's next) · [ARCHITECTURE.md](ARCHITECTURE.md) (frontend internals).

---

## 1. Product in one paragraph

A persistent 2D office for remote teams. Everyone is a pixel-art character on a shared map. Walking near
someone makes them *knock-able*: you knock, they decide, and a conversation opens only after they accept.
Entering a meeting room joins that room, sitting at your desk tells people you're working, and a lantern
shows how approachable each person is (open / ask first / closed). People who aren't online can be left a
note on their desk. Around the map sit chat, meetings, presence and a desk system. The map is the
coordination layer: *where* you are communicates *what* you're doing. Signature flows: §12.

## 2. Goals and non-goals

| Goals | Non-goals (for v1) |
|---|---|
| Consent-first conversations: proximity creates awareness, a knock (accepted) opens chat and audio | Full video-conferencing replacement for 300-person all-hands |
| Asynchronous presence: desk drops, office hours, away digest | Task management (link to Linear/Jira instead) |
| Always-on presence that is cheap to keep open all day | 3D, VR, or free-form avatars |
| 200–500 people per floor, many floors per workspace | Public metaverse / cross-company worlds |
| Server-authoritative positions (no teleport cheats) | Physics, combat, game mechanics |
| Works on mid-range laptops and patchy networks | Native desktop app on day one (PWA first) |
| Self-hostable / data-residency friendly | Bespoke per-customer art pipelines |

## 3. High-level architecture

```
                          ┌──────────────────────────────────────────────┐
  Browser (Next.js)       │                 AWS region                    │
 ┌─────────────────┐      │                                               │
 │ React app shell │─HTTPS┼─▶ CloudFront ─▶ Next.js (static + SSR shell)  │
 │ Phaser world    │      │                                               │
 │ RealtimeAdapter │─WSS──┼─▶ ALB ─▶ World Gateway (Go)  ◀──┐             │
 │ MediaAdapter    │─────┐│         │  floor actors        │ Redis leases │
 └─────────────────┘     ││         ▼                      │ + pub/sub    │
          │ REST         ││   ┌──────────────┐     ┌───────┴──────┐       │
          └──────────────┼┼─▶ │ API (NestJS) │────▶│ Redis 7      │       │
                         ││   │  REST + auth │     └──────────────┘       │
                         ││   └──────┬───────┘                            │
                         ││          ▼                                    │
                         ││   ┌──────────────┐   ┌──────────────┐         │
                         ││   │ PostgreSQL 16│   │ S3 (maps,    │         │
                         ││   │ (RDS)        │   │ attachments, │         │
                         ││   └──────────────┘   │ board snaps) │         │
                         ││                      └──────────────┘         │
                         │└─UDP/WebRTC─▶ LiveKit SFU (media) ◀─ token/grants from World Gateway
                         │              Workers: calendar sync, notifications, AI jobs (queue on Redis Streams)
                         └──────────────────────────────────────────────┘
```

**Service split and why**

| Service | Language | Owns | Why separate |
|---|---|---|---|
| **API** | NestJS (TypeScript) | Auth, workspaces, members, desks, chat persistence, meetings, maps, uploads | CRUD-heavy, shares types with the frontend |
| **World Gateway** | Go | WebSocket sessions, floor simulation, movement validation, proximity, presence fan-out, media grants | Hot path: thousands of small messages/s per floor; goroutine-per-floor actor model fits |
| **Workers** | Go or Node | Calendar sync, email/push, AI summaries, map thumbnailing, retention jobs | Async, retryable, off the request path |
| **LiveKit SFU** | (Go, off-the-shelf) | Audio/video/screen tracks | Don't build an SFU. Apache-2.0, self-host or managed |

A single Go monolith that does both API and world is also fine at the start. Keep the module boundary even if
you deploy one binary.

## 4. Frontend (built)

Detail lives in [ARCHITECTURE.md](ARCHITECTURE.md). The contract with the backend:

| Concern | Frontend file | Backend counterpart |
|---|---|---|
| REST | `src/services/api/*.ts` (`apiRequest`, `setAuthTokenProvider`) | API service |
| Realtime | `src/services/realtime/realtime-adapter.ts`, `realtime-events.ts`, `websocket-realtime-adapter.ts` | World Gateway |
| Media | `src/services/media/media-adapter.ts` (implement a LiveKit adapter) | LiveKit + grants from World Gateway |
| Config | `src/lib/env.ts` (`NEXT_PUBLIC_API_BASE_URL`, `NEXT_PUBLIC_WS_URL`, `NEXT_PUBLIC_REALTIME_MODE`) | — |
| Domain types | `src/types/domain.ts`, `src/features/world/types/*` | Mirror in Go structs / Nest DTOs |

Frontend responsibilities that stay client-side even with a backend: rendering, input, camera, local
prediction of your own movement, interpolation of others (~140 ms behind), nameplate layout, UI state.

Frontend changes needed when the backend lands (small, listed in [ROADMAP.md](ROADMAP.md) §2, P0):
replace `LOCAL_USER_ID` with the authenticated user id, implement `LiveKitMediaAdapter`, handle server position
corrections, fetch maps from the API instead of `/public/maps`, wire auth.

## 5. Backend — World Gateway (the interesting part)

### 5.1 Unit of scale: the floor instance

Everything spatial happens inside one **floor instance** (`workspaceId:floorId`). One floor instance runs as one
actor (goroutine + mailbox) on exactly one gateway node. All players on that floor connect to that node.

**Placement:** the node that owns a floor holds a Redis lease: `SET floor:{ws}:{floor}:owner {nodeId} NX PX 15000`,
renewed every 5 s. On join, the client calls `POST /floors/:id/session` (API). The API reads the lease (or picks
the least-loaded node from `gateway:nodes` and lets it claim) and returns `{ wsUrl, ticket }`. The client connects
straight to that node. Switching floors may mean reconnecting to a different node, which the frontend
already treats as a scene restart.

**Failure:** if a node dies, its leases expire within 15 s, clients reconnect (adapter backs off), the API
reassigns the floor, the new owner rebuilds state from Redis presence plus the map. Nothing in a floor actor is
durable by itself, so losing it is cheap.

### 5.2 Floor actor loop

```
every 50 ms (20 Hz):
  drain inbound queue (move, stop, interact, wave, status, chat:nearby, conversation:*)
  for each move: validate (speed ≤ run speed × 1.2 × dt, target tile walkable, seq increasing)
                 accept → update position; reject → enqueue correction to that client
  every 3rd tick (~6.7 Hz): recompute proximity groups and room membership
  diff → per-client batch filtered by area of interest → send
  every 10 s: persist coarse positions to Redis (for reconnect + "where is X")
```

- **Nav grid:** load the same Tiled JSON as the client, build the same walkability grid (port
  `CollisionSystem.ts` and `PathfindingSystem.ts`; both are small and pure). Server checks tiles, not pixels.
- **Area of interest (AOI):** split the floor into 8×8-tile cells. A client receives movement for players in its
  own cell and the 8 around it (~24×24 tiles, larger than any screen at default zoom). Presence/status for
  everyone on the floor still goes out, at low frequency, for the People panel and mini-map.
- **Movement authority:** the client predicts its own movement for responsiveness. The server is the authority.
  Corrections are rare (walls, cheats). The client snaps only if the error is > 1 tile, otherwise eases.
- **Seats:** server keeps `seatId → userId`; a second `sit` on an occupied seat is rejected.

### 5.3 Proximity → conversations → media

> **Ajar change:** proximity no longer opens audio by itself. Distance decides who can **knock** on whom and
> how loud an *accepted* conversation is; the hearing set is built from accepted conversations, private
> zones and broadcasts (flows in §12). The current client still has the older auto-connect behaviour
> (simulated); it is replaced by the knock flow.

Rules (mirroring the client's `ProximitySystem.ts`, configurable per workspace):

| Situation | Who you hear |
|---|---|
| Open area | Only members of an **accepted knock conversation**, while within 5 tiles (full volume ≤ 2 tiles, linear fade 2→5); they drop after a 5 s grace when they leave range |
| Quiet area | Knock range shrinks to 1 tile; same rules |
| Private zone / meeting room | Everyone inside the same zone, nobody outside, distance ignored. People outside see a count on the door, not positions inside |
| Door **closed** / Do not disturb | No knock is accepted; visitors are offered a note instead |
| Spotlight / admin broadcast | Everyone on the floor (or workspace) hears the speaker |

The actor computes, for each player, the set of peers they should hear. It turns that into **LiveKit
subscription permissions**: one LiveKit room per floor instance; each participant may subscribe only to the
tracks of peers in its hearing set. When sets change, the gateway calls LiveKit's server API to update
permissions and sends `conversation:participant:joined/left` to clients. Volume fade (2→5 tiles) is done
client-side with Web Audio gain from positions the client already has.

Why one LiveKit room per floor instead of one per bubble: bubbles change several times a minute. Moving a
participant between rooms means renegotiating, which costs seconds and causes audio gaps. Changing who may
subscribe to what is just a permission update inside the room you're already in.

### 5.4 Wire protocol

Start with JSON envelopes `{ "event": "player:move", "payload": {...} }`, which `WebSocketRealtimeAdapter`
already speaks. Switch the hot events (`player:moved`, batched) to a binary frame (MessagePack or a fixed
layout) once a floor has > 100 people. The adapter's `encode/decode` is the only frontend change.

Batched server frame (proposed addition): `world:tick { t, moves: [[playerId, x, y, dir, anim, seq], ...] }`
instead of one `player:moved` per player.

Event list (already typed in `src/services/realtime/realtime-events.ts`):

- **Client → server:** `player:join`, `player:leave`, `player:move`, `player:stop`, `player:status:update`,
  `player:avatar:update`, `player:interaction`, `player:wave`, `room:join`, `room:leave`, `conversation:join`,
  `conversation:leave`, `chat:send`
- **Server → client:** `world:snapshot`, `player:joined`, `player:left`, `player:moved`, `player:stopped`,
  `player:status:updated`, `player:avatar:updated`, `player:interaction`, `player:waved`, `room:updated`,
  `conversation:participant:joined`, `conversation:participant:left`, `chat:message`, `world:error`
- **Proposed additions:** `world:tick` (batched moves), `player:corrected` (authoritative position),
  `media:grant` (LiveKit URL + token + refresh), `floor:object:updated` (live map edits),
  `notification:new`, `presence:bulk` (periodic full status for the floor).
- **Ajar signature events** (`door:*`, `knock:*`, `stopby:*`, `conversation:started`): see §12.3.

### 5.5 Capacity estimate (one floor, 200 people)

| Flow | Rate |
|---|---|
| Inbound moves | ≤ 12 Hz × people walking (~30% at a time) → ~720 msg/s |
| Outbound batches | 200 clients × 20 Hz = 4,000 frames/s; ~25 visible movers × 14 B ≈ 350 B/frame → ~1.4 MB/s |
| Proximity recompute | 200² pair checks ≈ 40k distance checks every 150 ms, trivial; use the AOI grid past 500 |

One modest Go node (2 vCPU) can comfortably host several such floors. The SFU, not the gateway, is the
expensive part: plan LiveKit capacity per concurrent speaker, not per connected user.

### 5.6 Presence

- `presence:{ws}` Redis hash: `userId → {status, emoji, floorId, roomId, activity, lastSeen}`.
- Gateway writes on change and on a 30 s heartbeat; entries older than 90 s are treated as offline.
- Status choice is also saved to Postgres (`users.status`) so it survives sessions.
- Auto-away: client reports idle after N minutes (no input + tab hidden); server sets `away`.
- Calendar-driven status (in a meeting) is set by the calendar worker.

## 6. Backend — API service

REST, JSON, JWT bearer (`setAuthTokenProvider` on the client). Every route is scoped by workspace membership.

| Method & path | Purpose | Frontend caller |
|---|---|---|
| `GET /users/me` · `PATCH /users/me` | Profile, avatar, status | `usersApi` |
| `GET /workspaces/:ws` | Workspace + floors | `workspaceApi.getWorkspace` |
| `GET /workspaces/:ws/members?query=` | Directory | People panel (search beyond online) |
| `POST /workspaces/:ws/invites` · `POST /invites/:token/accept` | Invitations | new |
| `POST /floors/:floor/session` | Pick gateway, return `{ wsUrl, ticket }` | `RealtimeAdapter.connect` |
| `GET /floors/:floor/map` · `PUT /floors/:floor/map` (draft) · `POST /floors/:floor/map/publish` | Maps and editor | `worldApi.getMap`, `worldApi.saveObjects` |
| `POST /workspaces/:ws/desks/:desk/claim` · `DELETE …/claim` | Desk claim | `worldApi.claimDesk/releaseDesk` |
| `PUT /workspaces/:ws/desks/:desk/decor` | Desk decorations | desk store (to add) |
| `GET /workspaces/:ws/channels` · `POST …/channels` | Channels, DMs, groups | `chatApi.listChannels` |
| `GET /channels/:ch/messages?before=&limit=` | History (cursor) | `chatApi.getHistory` (move to per-channel) |
| `POST /channels/:ch/messages` · `POST /messages/:id/reactions` · `DELETE …` | Send, react | also via WS `chat:send` |
| `POST /uploads` → presigned S3 PUT | Attachments, custom art | composer attachment UI |
| `GET /workspaces/:ws/meetings?from=&to=` · `PUT /workspaces/:ws/meetings/:id` | Meetings | `workspaceApi.listMeetings/saveMeeting` |
| `GET /whiteboards/:id` (snapshot) + WS sync | Whiteboards | whiteboard store |
| `POST /integrations/:provider/connect` | Google/Microsoft calendar, Slack, Linear, GitHub | new |

**Chat send path:** `POST` (or WS `chat:send`) → insert in Postgres → publish to Redis `ws:{ws}:chat` →
every gateway node relays `chat:message` to connected members of that channel. `channelId: "nearby"` is never
persisted; the floor actor relays it to players within range.

**Whiteboards:** use a CRDT (Yjs, MIT) over a WebSocket provider; persist compacted snapshots to S3 and an
index row in Postgres. The current local whiteboard store maps cleanly onto a Yjs doc (strokes array + notes map).

## 7. Database

### 7.1 PostgreSQL schema (initial)

IDs are ULIDs (`text`, time-sortable) or UUIDv7. All tables have `created_at`, most `updated_at` (omitted
below for brevity).

```sql
-- Identity and tenancy
create table organizations (id text primary key, name text not null, plan text not null default 'trial',
  data_region text not null default 'ap-south-1');
create table users (id text primary key, email citext unique not null, display_name text not null,
  title text, avatar jsonb not null,               -- AvatarAppearance
  status text not null default 'available', status_emoji text, last_seen_at timestamptz);
create table workspaces (id text primary key, org_id text not null references organizations,
  name text not null, office_name text not null, logo_url text, default_floor_id text,
  settings jsonb not null default '{}');           -- proximity radii, features
create table workspace_members (workspace_id text references workspaces, user_id text references users,
  role text not null check (role in ('owner','admin','member','guest')),
  primary key (workspace_id, user_id));
create table invites (token text primary key, workspace_id text references workspaces, email citext,
  role text not null, expires_at timestamptz not null, accepted_by text references users);

-- World
create table floors (id text primary key, workspace_id text not null references workspaces,
  level int not null, name text not null, published_map_version_id text, unique (workspace_id, level));
create table map_versions (id text primary key, floor_id text not null references floors,
  version int not null, status text not null check (status in ('draft','published','archived')),
  tiled_json_url text not null,                    -- S3 key, Tiled-compatible JSON
  author_id text references users, unique (floor_id, version));
create table rooms (id text primary key, floor_id text not null references floors,
  name text not null, zone text not null check (zone in ('open','private','meeting')),
  type text not null, bounds jsonb not null,      -- {x, y, width, height} in world px
  capacity int, quiet bool not null default false,
  equipment text[] not null default '{}');         -- denormalised from the published map for queries
create table desks (id text primary key, floor_id text not null references floors,
  label text not null, object_id text not null, hot bool not null default false);
create table desk_assignments (desk_id text primary key references desks,
  workspace_id text not null references workspaces,
  user_id text not null references users, assigned_at timestamptz not null default now(),
  unique (workspace_id, user_id));
create table desk_decor (desk_id text references desks, item text not null, position smallint not null,
  primary key (desk_id, position));

-- Chat
create table channels (id text primary key, workspace_id text not null references workspaces,
  kind text not null check (kind in ('channel','dm','group','meeting')), name text, topic text,
  is_private bool not null default false, meeting_id text);
create table channel_members (channel_id text references channels, user_id text references users,
  last_read_message_id text, muted bool not null default false, primary key (channel_id, user_id));
create table messages (id text not null, channel_id text not null, sender_id text not null,
  body text not null, thread_parent_id text, attachments jsonb, edited_at timestamptz,
  deleted_at timestamptz, created_at timestamptz not null default now(),
  primary key (channel_id, id));   -- one table for pilots; hash-partition by channel only after a channel is hot
create index on messages (channel_id, thread_parent_id, id);
create table message_reactions (message_id text, user_id text, emoji text,
  primary key (message_id, user_id, emoji));

-- Meetings
create table meetings (id text primary key, workspace_id text not null references workspaces,
  title text not null, kind text not null check (kind in ('meeting','coworking-casual','coworking-focused')),
  room_id text references rooms, host_id text references users,
  status text not null check (status in ('scheduled','waiting','active','ended')),
  starts_at timestamptz not null, ends_at timestamptz, external_ref jsonb);  -- calendar event ids
create table meeting_participants (meeting_id text references meetings, user_id text references users,
  state text not null check (state in ('invited','joined','left','declined')),
  joined_at timestamptz, left_at timestamptz, primary key (meeting_id, user_id));

-- Collaboration and integrations
create table whiteboards (id text primary key, workspace_id text references workspaces,
  object_id text, title text, snapshot_url text, version bigint not null default 0);
create table integrations (id text primary key, workspace_id text references workspaces,
  user_id text references users, provider text not null, encrypted_tokens bytea not null,
  scopes text[] not null, unique (workspace_id, user_id, provider));

-- Audit and analytics (opt-in, aggregated)
create table audit_log (id bigserial primary key, workspace_id text, actor_id text, action text not null,
  target text, meta jsonb, at timestamptz not null default now());
create table presence_daily (workspace_id text, user_id text, day date,
  minutes_online int, minutes_in_conversation int, primary key (workspace_id, user_id, day));
```

Notes:
- Keep `messages` as one table for pilots. Hash-partition by channel only after a channel is actually hot,
  and add time-based archival to S3 later.
- `unique (workspace_id, user_id)` enforces one desk per person per workspace. A global unique on `user_id`
  would block the same person from a desk in a second workspace. Hot desks have no assignment row.
- `presence_daily` is an internal rollup. Do not show per-person minutes in an admin screen. Behavioural
  reports stay aggregated per workspace ([ROADMAP.md §6](ROADMAP.md#6-success-metrics)).
- Rooms and desks are **derived** from the published map on publish (the map JSON is the source of truth for
  geometry). This lets the editor stay a document editor while queries stay relational.
- Row-level security on `workspace_id` is worth turning on early if the API is multi-tenant.

### 7.2 Redis keys

| Key | Type | TTL | Purpose |
|---|---|---|---|
| `floor:{ws}:{floor}:owner` | string | 15 s, renewed | Gateway lease |
| `gateway:nodes` | zset (score = load) | — | Placement |
| `presence:{ws}` | hash | field-level heartbeat | Live status, location |
| `pos:{ws}:{floor}` | hash | 10 min | Last coarse position per user (reconnect, "locate") |
| `ws:{ws}:chat` | pub/sub | — | Chat fan-out across nodes |
| `ws:{ws}:events` | pub/sub | — | Status, avatar, announcements across nodes |
| `ratelimit:{user}:{bucket}` | string | window | Token buckets |
| `jobs:*` | streams | — | Calendar sync, notifications, AI |
| `ticket:{id}` | string | 60 s | One-time WS auth ticket |

### 7.3 Object storage (S3)

`maps/{ws}/{floor}/{version}.json`, `maps/{ws}/assets/*` (custom tiles/objects), `attachments/{ws}/{ulid}/{name}`,
`whiteboards/{id}/{version}.bin`, `avatars/custom/*`. Served via CloudFront with signed URLs for private content.

## 8. Security and privacy

- **Auth:** OIDC (Google, Microsoft) + magic link; SAML/OIDC SSO for enterprise. Short-lived JWT for REST; the
  WS uses a one-time `ticket` from `/floors/:id/session` (never put long-lived tokens in WS URLs; the current
  adapter's `?token=` is a placeholder to replace with this).
- **Authorization:** every event is checked against workspace membership and floor access; private zones
  checked server-side before granting media.
- **Media:** LiveKit tokens are minted per floor session, short TTL, subscription permissions enforced by the
  SFU, never by the client. DTLS-SRTP by default; optional E2EE for meeting rooms later.
- **Abuse:** rate limits on move (≤ 20/s), chat, waves; movement validation; message size caps; upload type and
  size checks; CSP on the web app.
- **Privacy:** no recording or transcription without visible indicators and room-level consent; presence
  analytics aggregated daily and opt-in per workspace; data region chosen per organisation.

## 9. Infrastructure (AWS)

| Component | Choice |
|---|---|
| Web app | Next.js on Vercel or a container behind CloudFront |
| API, gateway, workers | Containers on EKS (or ECS Fargate to start); HPA on CPU + connections |
| WebSockets | ALB with long idle timeout (≥ 300 s); gateway pods addressable per node for direct connect |
| SFU | LiveKit on EC2 with host networking (UDP 50000–60000), or LiveKit Cloud; TURN on 443/TLS for strict networks |
| Database | RDS PostgreSQL 16, Multi-AZ, PgBouncer |
| Cache / bus | ElastiCache Redis 7 (cluster mode later) |
| Storage | S3 + CloudFront |
| Secrets | AWS Secrets Manager; KMS for integration tokens |
| Observability | OpenTelemetry → Grafana/Tempo/Loki or Datadog; Sentry on web |

**Key metrics:** WS connections per node, floor actor tick duration (p99 < 10 ms), correction rate, time to
time from an accepted knock to first audio (target < 800 ms), SFU packet loss, reconnect rate, chat send latency.

**Environments:** `local` (docker compose: postgres, redis, livekit-server in dev mode, gateway, api) →
`staging` → `prod`. The frontend's mock mode stays available for demos and UI work.

## 10. Testing strategy

- Pure engine modules (collision, pathfinding, proximity, map loader) shared logic: unit tests on both client
  and the Go port with the **same fixtures** (map JSON + expected results).
- Gateway: load test with headless bots (reuse the mock adapter's routines) — 500 bots per floor, measure tick
  time and bandwidth.
- Contract tests: JSON schema generated from `realtime-events.ts` validated in the Go gateway CI.
- E2E: Playwright against mock mode (already used during development) and against staging.

## 11. Build order

0. **In parallel, frontend only:** door state, lantern and the knock flow in mock mode (§12).
1. Auth + `/users/me` + workspace read; replace `LOCAL_USER_ID`.
2. World Gateway with one floor actor, movement, presence, **door state**. Two real browsers see each other
   and each other's lanterns.
3. **Knock + stop-by + text conversation on accept**, notification service (in-app + email). Start pilots.
4. LiveKit; media grants built from accepted conversations. Two people knock, accept and talk.
5. **Desk drops v1**, persisted desks, email digest worker, while-you-were-away panel.
6. Office hours scheduler + Focus timer, chat persistence, meetings, calendar sync.
7. Map storage + editor publish (Tiled import), invites and roles.
8. Scale-out (leases, multiple nodes), observability, load tests.

## 12. Ajar signature flows: doors, knocks, stop-bys, digests

> The product rule behind this section: **proximity is awareness, never a connection.** A conversation opens
> only after a knock is accepted. Product spec: [ROADMAP.md §1](ROADMAP.md#1-signature-features-specification).
> Frontend status: today's build still has a "Talk" button on the Nearby card and simulated conversations.
> The knock flow replaces it, and should be built in **mock mode first** (`MockRealtimeAdapter` plays the
> other side) so the signature interaction is demoable with no backend.

### 12.1 Door state

`door ∈ { open, ask, closed }`, independent of `status`. Sources, in precedence order:
`focus` timer > manual override (with optional `until`) > office-hours schedule > default `ask`.
Status `dnd` forces `closed`; status `focus` forces `closed` for its duration. When a timer or override ends, the
previous door is restored (`prev_door`).

### 12.2 Knock state machine (live, owned by the floor actor)

```
 visitor: knock:send ─▶ validate ─┬─▶ target.door = closed ─▶ knock:updated{rejected:closed} (+ offer a note)
                                  ├─▶ target.door = open   ─▶ auto-accept ─────────────┐
                                  └─▶ target.door = ask    ─▶ knock:received → target  │
                                         │ accept ────────────────────────────────────┤
                                         │ decline / later / 120 s expiry             │
                                         ▼                                            ▼
                                create stop-by (kind=knock)                  conversation:started
                                knock:updated → visitor                      + media:grant (mic permission
                                                                               asked client-side, after accept)
```

Validation (server-side, using **server** positions, not client claims):
1. Both players are on the same floor and within knock range (5 tiles, 1 in quiet zones, or both in the same
   private zone).
2. Not blocked (a blocked visitor is treated as `closed`, without saying so).
3. Rate limits: ≤ 10 knocks/hour per sender; ≥ 10 min cool-off for the same pair after a decline or expiry.
4. Sender has no other pending knock to the same person.

Accepted conversation rules: members hear each other only while within 5 tiles (volume fade 2→5) or inside the
same private zone; leaving range ends the conversation after a 5 s grace. Text chat is available immediately;
audio is granted with `media:grant` only after acceptance; camera is never auto-enabled.

### 12.3 Events (additions to §5.4)

| Direction | Event | Payload |
|---|---|---|
| C→S | `door:set` | `{ door, until?, source: "manual" \| "focus" }` |
| C→S | `knock:send` | `{ toUserId }` (position comes from the server, not the payload) |
| C→S | `knock:respond` | `{ knockId, action: "accept" \| "decline" \| "later", preset?: string }` |
| C→S | `knock:cancel` | `{ knockId }` |
| S→C | `door:updated` | `{ userId, door, until? }` (also in `world:snapshot` and `presence:bulk`) |
| S→C | `knock:received` | `{ knockId, fromUserId, expiresAt }` |
| S→C | `knock:updated` | `{ knockId, status: "accepted" \| "declined" \| "later" \| "expired" \| "rejected", preset? }` |
| S→C | `conversation:started` | `{ conversationId, participantIds, textOnly }` (followed by `media:grant`) |
| S→C | `stopby:received` | `{ stopby }` (online recipients; offline ones get it through notifications) |
| C→S | `stopby:create` / `stopby:reply` / `stopby:seen` | same shapes as the REST calls in §12.6 (WS or REST) |

Frontend: add these to `realtime-events.ts` and `RealtimeAdapter`; new stores `door-store`, `knock-store`,
`stopby-store`, `away-store`; `MockRealtimeAdapter` simulates demo participants answering knocks (accept, decline
with a preset, expire), leaving notes, and changing doors.

### 12.4 Stop-bys and desk drops

One entity for unanswered knocks and desk drops (kinds `knock`, `note`, `link`, later `voice`, `file`).
- **Delivery:** online → `stopby:received` and an unread badge on the recipient's desk. Offline → stays unread;
  the digest worker emails once per day (§12.7).
- **Voice (v2):** client records Opus/WebM ≤ 60 s (≤ 1.5 MB) → presigned S3 PUT → `stopby:create` with the
  attachment key. Optional transcript job, off by default (workspace opt-in).
- **Files (v3):** virus-scan job before delivery.
- **Receipts:** `seen_at` is stored for the unread badge. The sender sees only "delivered", unless the recipient
  turned on "share when I've opened it".
- **Limits:** per-sender daily cap (default 20), per-pair mute, 90-day retention (voice 30 days).

### 12.5 Office hours and focus (scheduler)

- Weekly blocks are stored in the user's time zone. A scheduler keeps a Redis zset `door:transitions` (score =
  next transition epoch). A worker pops due entries, updates `users.door`, publishes `door:updated`, and
  schedules the next one.
- Focus timer = `door:set { door: "closed", until, source: "focus" }`, which also sets status `focus`.
- Calendar worker (later): busy blocks → `ask`, focus-tagged blocks → `closed`.
- Visibility: other users receive the current door, `until` and the owner's local time. They never receive the
  full schedule.

### 12.6 REST additions (API service)

| Method & path | Purpose |
|---|---|
| `PUT /users/me/door` | Set door (+ `until`) |
| `GET /users/me/office-hours` · `PUT /users/me/office-hours` | Weekly schedule (with time zone) |
| `GET /stopbys?box=inbox\|sent&cursor=` | List stop-bys |
| `POST /stopbys` | Create a desk drop (also works when the recipient is offline; no range check, but rate-limited) |
| `POST /stopbys/:id/reply` · `POST /stopbys/:id/seen` · `DELETE /stopbys/:id` | Reply, mark seen, archive |
| `GET /workspaces/:ws/away-digest?since=` · `POST /workspaces/:ws/away-digest/ack` | While you were away |
| `GET /users/me/notification-prefs` · `PUT …` | Email digest, push, quiet hours, digest hour |
| `POST /users/:id/block` · `DELETE /users/:id/block` | Block / unblock (silent to the other person) |

Knocks are **WebSocket only**, because they need live server-side positions.

### 12.7 While you were away and the digest

- **Panel:** on `player:join`, if `last_seen_at` is older than 2 h or it is a new local day, the client calls
  `away-digest?since=last_seen_at`. The server returns, chronologically: stop-bys (including missed knocks),
  unread drops, mentions, meeting invitations. `ack` records it as seen.
- **Email digest worker:** daily at the user's `digest_hour` (default 09:00 local). Sends one email when there are
  unread stop-bys or mentions **and** the user hasn't been online since the previous day. Dedupe via
  `digests_sent (user_id, day)`. Quiet hours respected. Slack DM later.
- **Optional AI summary:** generated from the same query result, only when the workspace has opted in and the
  user has switched it on.

### 12.8 Postgres additions

```sql
alter table users
  add column door text not null default 'ask' check (door in ('open','ask','closed')),
  add column prev_door text, add column door_until timestamptz,
  add column door_source text not null default 'manual' check (door_source in ('manual','schedule','focus','calendar')),
  add column timezone text not null default 'UTC',
  add column digest_hour smallint not null default 9;

create table office_hours (id text primary key, user_id text not null references users,
  weekday smallint not null check (weekday between 0 and 6),
  start_minute smallint not null, end_minute smallint not null,   -- minutes from local midnight
  door text not null check (door in ('open','ask','closed')));
create index on office_hours (user_id, weekday);

create table knocks (id text primary key, workspace_id text not null references workspaces,
  from_user_id text not null references users, to_user_id text not null references users,
  floor_id text not null references floors,
  status text not null check (status in ('pending','accepted','declined','later','expired','cancelled','rejected')),
  preset text, conversation_id text, created_at timestamptz not null default now(), resolved_at timestamptz);
create index on knocks (to_user_id, created_at desc);

create table stopbys (id text primary key, workspace_id text not null references workspaces,
  from_user_id text not null references users, to_user_id text not null references users,
  kind text not null check (kind in ('knock','note','link','voice','file')),
  body text, attachment_key text, desk_id text references desks,
  parent_id text references stopbys, knock_id text references knocks,
  created_at timestamptz not null default now(), delivered_at timestamptz,
  seen_at timestamptz, archived_at timestamptz);
create index on stopbys (to_user_id, created_at desc);
create index on stopbys (to_user_id) where seen_at is null;       -- unread badge / digest

create table user_blocks (user_id text references users, blocked_user_id text references users,
  primary key (user_id, blocked_user_id));
create table notification_prefs (user_id text primary key references users,
  email_digest bool not null default true, push bool not null default false,
  quiet_hours jsonb, share_opened bool not null default false);
create table digests_sent (user_id text references users, day date, sent_at timestamptz not null default now(),
  primary key (user_id, day));
```

Row-level security: a `stopbys` or `knocks` row is visible only to its sender and recipient. Workspace admins
cannot read stop-by bodies. `audit_log` does not record knock outcomes per person.

### 12.9 Redis additions

| Key | Type | TTL | Purpose |
|---|---|---|---|
| `knock:{id}` | hash | 130 s | Live knock (status, from, to, expiresAt) |
| `knockcool:{from}:{to}` | string | 600 s | Cool-off after decline / expiry |
| `knockcount:{from}` | string (counter) | 3600 s | ≤ 10 knocks/hour |
| `door:{ws}` | hash | — | `userId → {door, until}` for fast gateway reads |
| `door:transitions` | zset | — | Scheduler (score = next transition epoch) |
| `conv:{id}` | hash | until ended | Accepted conversations (members, started_at) |
| `jobs:digest` | stream | — | Digest and notification workers |

S3 additions: `stopbys/{ws}/{ulid}.webm` (voice), `stopbys/{ws}/{ulid}/{name}` (files, after scanning).

### 12.10 Privacy and safety guarantees (enforced in the server, not the client)

- Knock eligibility uses server positions. Clients cannot knock from across the map.
- Microphone and camera are never requested or enabled by a knock; permission is requested after acceptance.
- Blocks are silent. A blocked sender sees a Closed door.
- No admin or analytics view exposes per-person knock counts, acceptance, decline or reply-time data. Behaviour
  metrics are aggregated per workspace or team (ROADMAP §6).
- Admins cannot read desk-drop bodies. Retention is limited and configurable.
- Others see a person's current door, its end time and their local time, not their full schedule.
- AI features (summaries, transcripts) are off by default and need workspace and personal opt-in.
