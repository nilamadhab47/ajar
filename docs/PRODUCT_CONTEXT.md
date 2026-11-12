# Ajar — Product & Codebase Context (read this first)

> For AI assistants and new engineers. It answers: what is this product, what exists today, where does each
> thing live, what is real vs simulated, and which conventions must not be broken.
> Deeper docs: [BRAND.md](BRAND.md) (name, voice, consent) · [ARCHITECTURE.md](ARCHITECTURE.md) (frontend internals) · [SYSTEM_DESIGN.md](SYSTEM_DESIGN.md)
> (backend/DB plan) · [ROADMAP.md](ROADMAP.md) (what to build next) · [ASSETS.md](ASSETS.md) (art + licences).

## 1. The product

**Ajar** — *a quiet office for remote teams. Be around, on your terms.* It is a multiplayer 2D virtual office
(in the spirit of Gather, but calmer): a top-down pixel-art office where each teammate is an animated character.
Walk up to someone to talk, enter a meeting room to join it, sit at your desk to signal you're working. Chat,
meetings, presence and desks surround the map. The name means a door left slightly open: approachable, not
wide open.

- **Brand promise (guides every product decision):** *presence without pressure*: see who's around, knock
  don't ambush, and it works when people don't overlap. Details, voice and visuals: [BRAND.md](BRAND.md). When
  writing UI copy, use the voice rules there; the name/descriptor/tagline live in `BRAND` (`src/lib/config.ts`).
- **Who it's for:** distributed teams (10–200 people), especially across time zones, who want hallway moments
  back without scheduling a call for everything or being walked up to.
- **Core loop:** open the office in the morning → see who's around and what they're doing → bump into people,
  join rooms, sit at your desk → leave it open all day like a tab you glance at.
- **Positioning vs Gather:** see [ROADMAP.md §4](ROADMAP.md#4-differentiators-vs-gather).
- **Signature interaction model (planned; the current build still has the older "Talk" flow):** *see someone
  nearby → knock → they decide.* Each person has a **door** (Open / Ask first / Closed) shown by a lantern,
  separate from their **status**. Five signature features: Knock, Desk drops, Personal office hours, Focus
  bubble, While you were away. Spec: [ROADMAP.md §1](ROADMAP.md#1-signature-features-specification); backend:
  [SYSTEM_DESIGN.md §12](SYSTEM_DESIGN.md).

## 2. Current state (as of this commit)

| Layer | State |
|---|---|
| Frontend | **Built and playable.** Next.js + Phaser. Typecheck, lint and production build pass. |
| Backend | **Sign-in is a page.** `/login` covers the magic link, password, Google, and Microsoft. `/invite` accepts an invitation. `/offices` lists the offices that person belongs to. A member can ask for a 60-second floor ticket. The access token stays off the socket address. With no API address, the demo office still opens on its own. |
| Database | **Row security is on for office tables.** The API user is a superuser, so office queries switch to `ajar_app` for the transaction. The app still persists in this browser under `ajar.` keys. |
| Audio/video | Local capture + preview only. No transport. UI labels conversations **Simulated**. Phaser audio is off. |
| Art | Original, procedurally generated from code (`src/art`). Starter quality, replaceable. |

Run: `npm install && npm run dev` → `http://localhost:3000` → redirects to `/workspace/demo/office`.

## 3. Tech stack

| Concern | Choice | Version |
|---|---|---|
| Framework | Next.js App Router (**v16, has breaking changes vs older Next — read `node_modules/next/dist/docs/` before using unfamiliar APIs**) | 16.4.6 |
| UI | React + TypeScript | 19.3 / 5.x |
| Game engine | Phaser 3 (client-only, dynamically imported) | 3.90 |
| Styling | Tailwind CSS v4 (`@theme` tokens in `src/app/globals.css`) | 4.3 |
| Primitives | Radix Dialog / DropdownMenu / Tooltip, wrapped in `src/components/ui` | — |
| Icons | lucide-react | — |
| State | zustand (feature stores; `persist` for local prefs) | 5 |
| Forms | react-hook-form + zod (profile/onboarding) | — |
| Motion | framer-motion (UI), Phaser tweens/anims (world) | — |

Intended backend stack (from SYSTEM_DESIGN.md): Go World Gateway, NestJS API, PostgreSQL 16, Redis 7,
LiveKit SFU, S3, AWS (EKS/RDS/ElastiCache).

## 4. Features that exist (complete list)

### World
- One fully furnished floor (64×40 tiles @ 32px): Open Workspace (12 desks in Product / Engineering / Design
  pods), Atlas Room (meeting, 10 seats, display + whiteboard), Birch Room (meeting, 6 seats), Kitchen (coffee,
  water, fridge, table), Library (shelves, reading tables), Collaboration Lounge (sofas, rug, gong), Quiet Zone
  (4 focus booths + hot desks), Reception (desk, welcome sign), Creative Studio, outdoor Garden (trees, pond,
  paths, benches). Elevator and stairs.
- Floors 2–5: walkable placeholder maps, reachable via elevator/stairs/mini-map; fade transition, no page reload.
- Tiled-compatible JSON maps with tile layers `ground, floor-decor, rugs, walls, foreground` and object layers
  `furniture, interactive, rooms, collision, spawns, labels`.
- Y-sorted depth; seated characters layer correctly with chairs; floor labels; zone colours.

### Characters
- Layered avatar compositor: 6 skin tones, 10 hairstyles, 10 hair colours, 8 faces, 5 tops, 3 bottoms,
  3 shoes, glasses, hats, headphones, bags, small accessories, accent colour.
- Animations: idle (breathing + blink), walk ×4 directions, sit ×4, wave, dance, clap, celebrate.
- Shadow, local-player ring, nameplate (status dot, emoji, talking outline), compact nameplates when zoomed out,
  nameplate de-cluttering, speech bubbles, emote pop-ups.

### Movement & camera
- WASD / arrows, Shift to run, normalised diagonals, frame-rate independent, sub-stepped grid collision.
- Double-click to walk with A* (8-way, no corner cutting), nearest-reachable fallback, "Can't get there" toast.
- Follow a person, walk to person / room / object.
- Camera follow with lerp, drag to pan (free-look), wheel/toolbar zoom (0.5×–3×), recenter (L), bounds.
- Touch joystick on coarse pointers.

### Interactions (`E`)
Desk (profile, claim/release, sit, decorate with up to 3 items), any seat (sit/stand), whiteboard (drawing,
eraser, undo, draggable sticky notes), meeting room display/panel (room dialog, start/join meeting),
coffee (steam + emote), water, fridge, gong (confetti + shake + celebrate), bookshelf, printer, reception,
elevator, stairs.

### Proximity & conversations
- Nearby detection at 5 tiles, "close" at 2, quiet areas at 1, private zones group everyone inside, DND respected.
- Nearby card: wave, talk, DM per person; nearby speech bubbles (Enter).
- Conversation card: participants, simulated badge, timer, mic/camera toggles, expand/minimise/leave;
  auto-ends when you walk away. Room banner with "Join room conversation".

### Application UI
- Top bar: logo, workspace switcher (single workspace), floor name, global search (people → locate,
  rooms → walk, channels → open), notifications, help, settings, profile menu.
- Navigation rail: Office, Chat, People, Calendar, Activities, Settings.
- Right drawer tabs: People (filters, search, locate/walk/DM), Chat, Meetings, Activity.
- Bottom toolbar: mic, camera, screen share, status, emotes, avatar actions, zoom, recenter, leave.
- Mini-map: rooms, players (nearby highlighted), camera rectangle, click/drag to pan, floor switcher, collapsible.
- Dialogs: onboarding, avatar builder, profile, desk, room, meeting view, whiteboard, floors, settings
  (shortcut rebinding, edit mode, integration info, simulate network drop, reset demo), help, leave.
- Lobby page (`/workspace/[id]`) after leaving.
- Toast notifications with actions; activity log.

### Chat
Channels (#general, #engineering, #random), a group, DMs; timestamps; avatars; unread badges; reactions;
threads; attachment chips (name + size only); search across conversations; Enter / Shift+Enter; meeting chat
per meeting.

### Meetings
States scheduled / waiting / active / ended; start meeting, casual coworking, focused coworking (sets status to
Focus); join/leave (restores previous status); invite; meeting view with participant tiles, local camera,
real screen-capture preview, participants/chat tabs, duration.

### Presence
Available, Busy, Focus, In a meeting, Away, Do not disturb, Offline + status emoji; shown in nameplates,
People panel, profiles, conversation UI.

### Demo mode (mock backend)
14 seeded participants (always tagged **Demo**) with routines: desk workers who take breaks, a meeting group in
Atlas Room, a lounge group, a receptionist, a coffee-break wanderer. They walk with real A*, change status,
post channel messages, auto-reply to DMs, wave back, join simulated conversations.

### Edit mode (developer)
Toggle in Settings: select, drag on grid, remove, add from palette, revert. Publish is disabled (needs backend).

## 5. Where things live

```
src/app/                         routes: / → redirect; /workspace/[workspaceId] (lobby); …/office (the office)
src/components/layout/           AppShell (composition root), TopNavigation, NavigationRail, RightSidebar, BottomToolbar, Lobby
src/components/overlays/         DialogHost, UserProfilePopover, NearbyPanel, RoomBanner, ConversationOverlay,
                                 InteractionPrompt, NotificationContainer, StatusBadges, LocalMediaTiles
src/components/ui|common/        Button/IconButton, Dialog, Menu, Tooltip · AvatarImage, StatusIndicator, SearchInput, LoadingState
src/features/world/engine/       OfficeScene (frame loop + command router) and systems: Camera, Input, Collision,
                                 Pathfinding, Interaction(+handlers), Proximity, DepthSorting, Edit, MapLoader, seats
src/features/world/entities/     Character, PlayerCharacter, RemoteCharacter, Nameplate, InteractiveObject, DeskObject
src/features/world/data/         object-catalog.ts — every object kind (sprite, footprint, collision, seats, interaction)
src/features/world/              world-bridge.ts (React→Phaser commands, worldRuntime), world-store.ts
src/features/<feature>/          avatar, people, presence, chat, meetings, conversation, desk, media, whiteboard,
                                 settings, activity — each with its store and components
src/services/api/                REST clients (mock branch + proposed endpoint each)
src/services/realtime/           adapter interface, event contracts, mock adapter (in-browser server), WebSocket adapter
src/services/media/              MediaAdapter interface + LocalOnlyMediaAdapter
src/data/                        demo workspace, participants, chat seeds, meetings
src/lib/                         config.ts (WORLD_CONFIG, BRAND), storage.ts (ajar.* keys), env.ts, shortcuts.ts, utils, emitter, random
src/art/                         procedural pixel art (tiles, furniture, PixelBuffer)
scripts/                         build-assets.ts, build-maps.ts (MapBuilder DSL), preview.ts
public/assets, public/maps       GENERATED — do not hand-edit
```

## 6. Rules and conventions (don't break these)

1. **Phaser owns the world, React owns the app.** React talks to the scene only through
   `sendWorldCommand(...)` (`world-bridge.ts`). The scene publishes to zustand stores only on *change*; per-frame
   data goes to `worldRuntime`. Never render world things with React DOM, never put the Phaser `Game` in a store.
2. **Phaser is client-only.** It's imported dynamically in `WorldCanvas`. Pages that touch the office use
   `dynamic(..., { ssr: false })`. Never import `phaser` from a server component or shared module.
3. **Keyboard goes through `src/lib/shortcuts.ts`.** Don't add `window.addEventListener('keydown')`
   elsewhere. Phaser's keyboard plugin is disabled on purpose. The manager ignores keys while typing or when a
   dialog/menu is open.
4. **New object kinds** = one `def(...)` in `object-catalog.ts` (+ sprite in `src/art/furniture.ts`, then
   `npm run assets`). New behaviour = one entry in `INTERACTIONS` (`interaction-handlers.ts`). Never hard-code
   behaviour per sprite instance.
5. **Maps are generated.** Edit `scripts/build-maps.ts` then `npm run maps`. Hand edits to `public/maps/*.json`
   are overwritten. Object ids come from the `oid` property. Desk ids follow `deskSeatId()` in `desk-store.ts`
   (desk `W-05` ↔ seat object `seat-w05`).
6. **Art is generated.** Edit `src/art/*` or `compose-avatar.ts`, then `npm run assets`. Output is deterministic.
7. **Domain types don't import Phaser or React** (`src/types/domain.ts`, `features/world/types`).
8. **Never fake media.** Media state comes from `MediaAdapter`. Don't show "connected" unless transport is real.
   Demo participants must always be labelled Demo.
9. **Every visible button works or is disabled with a reason** (tooltip `hint`).
10. **Tunables live in `WORLD_CONFIG`** (`src/lib/config.ts`): speeds, radii, zoom levels, network Hz, bubble time.
11. **Persisted keys** are `ajar.profile`, `ajar.avatar`, `ajar.desk`, `ajar.ui`. `migrateLegacyStorage()` copies a
    leftover `veranda.*` key once. Bump the `version` in the store's `persist` options when changing their shape.
12. **Next 16 typing:** `PageProps<...>` route helpers didn't resolve here; pages declare
    `{ params: Promise<{ workspaceId: string }> }` explicitly.
13. **Proximity is awareness, never a connection.** Don't add features that open audio or chat because
    two characters are close. Connections come from an accepted knock, a private zone, or a meeting.
14. **Door ≠ status.** `status` is what I'm doing; `door` (`open | ask | closed`) is how I want to be
    approached. Keep them separate in types, stores and UI.
15. **UI copy follows [BRAND.md](BRAND.md) §5** (plain, warm, no pressure) and consent rules (§8).

## 7. What's simulated and where it gets replaced

| Simulated thing | File | Replace with |
|---|---|---|
| Server, other players, presence | `services/realtime/mock-realtime-adapter.ts` | `NEXT_PUBLIC_REALTIME_MODE=websocket` + Go gateway |
| Local user identity | `LOCAL_USER_ID = "local-user"` in `data/demo-workspace.ts` (used in ~19 files) | Authenticated user id from `/users/me` |
| Profile/status/avatar/desk persistence | zustand `persist` → localStorage | `usersApi`, `worldApi` |
| Workspace, channels, history, meetings | `data/demo-workspace.ts` via `services/api/*` mock branches | API service |
| Remote audio/video | `LocalOnlyMediaAdapter` | `LiveKitMediaAdapter` (to write) |
| Whiteboards | `features/whiteboard/whiteboard-store.ts` (memory) | Yjs doc synced over WS |
| Map source | `/public/maps/*.json` | `GET /floors/:id/map` |

## 8. Commands

| Command | Use |
|---|---|
| `npm run dev` | Dev server (Strict Mode; one Phaser instance is guaranteed by WorldCanvas cleanup) |
| `npm run build && npm start` | Production |
| `npm run typecheck` / `npm run lint` | Must pass before committing |
| `npm run assets` / `npm run maps` | Regenerate art / maps |
| `npx tsx scripts/preview.ts public/maps/demo-office.json <dir>` | Render a map + avatars to PNG |

Debug in mock mode: `window.__ajar` → `{ worldRuntime, world, ui, send }`. Example:
`__ajar.send({ type: "walk-to-room", roomId: "meeting-a" })`.

## 9. Known gaps

- Characters don't collide with each other.
- Canvas renders at CSS-pixel resolution (crisp but not HiDPI-sharp).
- Edit mode: no room create/resize, no tile painting, no publish.
- Only verified in headless Chromium; real-device FPS and touch not measured.
- Workspace switcher is single-workspace; floors 2–5 are placeholders.
- The signature features (door states, lantern, knock, stop-bys/desk drops, office hours, Focus bubble,
  away digest) are specified but **not built**. The Nearby card still uses "Talk", which the knock flow
  will replace. Next frontend task: build them in mock mode.
- The logo mark is still the old purple arch. The welcome sign's word is AJAR. The door-with-lamp-light mark
  in [BRAND.md](BRAND.md) is not drawn yet.

## 10. Product vocabulary (use these names in code and copy)

| Term | Meaning | Planned type / store |
|---|---|---|
| **Door** | How approachable someone is: `open`, `ask`, `closed` | `DoorState`, `door-store` |
| **Lantern** | The in-world indicator of the door (lit / half-lit / unlit) | sprite + nameplate part |
| **Knock** | A request to talk; the recipient accepts, declines or replies later | `Knock`, `knock-store` |
| **Stop-by** | Someone came to your desk: an unanswered knock or a desk drop | `StopBy`, `stopby-store` |
| **Desk drop** | A note, link (later voice or file) left on someone's desk | a `StopBy` with a kind |
| **Office hours** | Weekly schedule (in your time zone) that sets your door | `OfficeHours` |
| **Focus bubble** | Closed door + timer + visual ring | door `closed` with `source: focus` |
| **While you were away** | Chronological return digest (and a daily email) | `away-store` |
