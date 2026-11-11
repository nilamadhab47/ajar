# Ajar — multiplayer virtual office (frontend starter)

A playable, top-down 2D office for remote teams: walk around, bump into people, sit at your desk, join a room,
chat. Phaser 3 renders and simulates the world; React renders the application around it. Everything runs
without a backend through a mock realtime adapter, and the integration seams for your backend are typed and
isolated.

The product name is Ajar. "Marigold Studio" is the demo company. All artwork is original and generated from code in this
repository (see [docs/ASSETS.md](docs/ASSETS.md)). Brand, voice and the name: [docs/BRAND.md](docs/BRAND.md).

## Run it

Requires Node 20+.

```bash
npm install
cp .env.example .env.local   # optional; defaults to mock mode
npm run dev                  # http://localhost:3000  →  /workspace/demo/office
```

| Script | What it does |
|---|---|
| `npm run dev` | Development server |
| `npm run build` / `npm start` | Production build and server |
| `npm run typecheck` | `tsc --noEmit` |
| `npm run lint` | ESLint |
| `npm run assets` | Regenerates `public/assets/**` from `src/art` |
| `npm run maps` | Regenerates `public/maps/*.json` from `scripts/build-maps.ts` |

Routes: `/` redirects to `/workspace/demo/office` (the office). `/workspace/demo` is the lobby you land on after
"Leave office".

## Controls

| Input | Action |
|---|---|
| W A S D / arrow keys | Walk (diagonals are normalised) |
| Shift (hold) | Walk faster |
| Double-click the floor | Walk there (A* around furniture and walls) |
| Drag | Pan the camera · scroll to zoom |
| L | Recenter on your character |
| E | Interact with the highlighted object / stand up |
| Enter | Say something to people nearby (speech bubble) |
| C · P · Tab | Chat · People · People search |
| M · V | Microphone · camera |
| H | Emote menu |
| G | Walk to my desk |
| Esc | Close panels, cancel walking |

Shortcuts are rebindable in Settings and are suspended while you type or a dialog/menu has the keyboard.

## Things to try in the demo

1. First run opens the avatar builder. Pick a name and a look.
2. Walk up to a desk in the open workspace, press **E**, claim it, decorate it, sit.
3. Walk to the lounge. People within 5 tiles appear in **Nearby**; wave, talk, or message them.
4. Enter the Atlas Room (private area): the banner lists who is inside and offers the room conversation.
   Press **E** at the wall display to open the room and join "Design Crit".
5. Ring the gong, brew a coffee, open a whiteboard, take the elevator to another floor.
6. Settings → **Map edit mode** to select, drag, remove and add objects.
7. Settings → **Simulate a network drop** to see the reconnecting state.

## Connecting your backend

Set in `.env.local`:

```
NEXT_PUBLIC_API_BASE_URL=https://api.example.com/v1
NEXT_PUBLIC_WS_URL=wss://rt.example.com/office
NEXT_PUBLIC_REALTIME_MODE=websocket
```

- **Realtime** — `src/services/realtime/`. `RealtimeAdapter` is the only interface the app uses.
  `WebSocketRealtimeAdapter` sends `{ event, payload }` JSON envelopes with reconnection and backoff; override its
  `encode`/`decode` to match your wire format. Event names and payload types are in `realtime-events.ts`.
- **REST** — `src/services/api/`. Each function has a mock branch and a proposed endpoint.
  `setAuthTokenProvider()` in `api-client.ts` injects your auth token.
- **Media** — `src/services/media/media-adapter.ts`. Implement `MediaAdapter` for your SFU/mesh and return it from
  `getMediaAdapter()` in `src/features/media/media-controller.ts`.

Details, data flow and the full event list: [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md).

## Docs

| Doc | For |
|---|---|
| [docs/PRODUCT_CONTEXT.md](docs/PRODUCT_CONTEXT.md) | Product, what's built, file map, conventions (start here; IDE assistants load it via `AGENTS.md` / `CLAUDE.md` / `.cursor/rules`) |
| [docs/SYSTEM_DESIGN.md](docs/SYSTEM_DESIGN.md) | Backend, database, realtime, media and AWS design |
| [docs/ROADMAP.md](docs/ROADMAP.md) | Prioritised remaining features and differentiators vs Gather |
| [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md) | Frontend internals |
| [docs/ASSETS.md](docs/ASSETS.md) | Art pipeline and licences |

## What is complete

**World** — one fully furnished floor (64 × 40 tiles): open workspace with 12 desks, two meeting rooms, kitchen,
library, collaboration lounge, quiet zone with booths, reception, creative studio, garden. Tiled-compatible JSON
maps with five tile layers plus object, room, spawn, label and collision layers. Four placeholder floors reachable
by elevator and stairs.

**Characters** — layered avatar compositor (skin, 10 hairstyles, 8 faces, 5 tops, 3 bottoms, 3 shoes, glasses,
hats, headphones, bags, small accessories). Idle with breathing and blinking, four-direction walk, sit, wave,
dance, clap, celebrate. Shadows, Y-sorted depth, nameplates with status dot and emoji that declutter and shrink
when zoomed out.

**Movement and camera** — frame-rate independent movement with sub-stepped grid collision, A* click-to-move with
nearest-reachable fallback, follow a person, camera follow / pan / zoom / recenter / bounds.

**Interaction** — one registry keyed by interaction type: desks, seats (chairs, sofas, benches, stools, bean
bags), whiteboards, meeting-room displays and panels, coffee machine, water, fridge, gong, bookshelves, printer,
reception, elevator, stairs.

**Proximity** — configurable discovery (5 tiles) and close (2 tiles) radii, quiet areas (1 tile), private zones
that group everyone inside and exclude everyone outside, do-not-disturb respected, conversations that end when you
walk away.

**Application UI** — top navigation with global search, navigation rail, right drawer (People, Chat, Meetings,
Activity), floating toolbar, mini-map with click-to-pan and floor switcher, profile card, nearby card, room
banner, conversation card, meeting view, room dialog, desk dialog, whiteboard, avatar builder, settings with
shortcut rebinding, help, notifications, lobby.

**Chat** — channels, group, DMs, timestamps, avatars, unread counts, reactions, threads, attachments (names
only), cross-conversation search, Enter / Shift+Enter, nearby speech bubbles kept separate from permanent chat.

**Demo mode** — 14 seeded participants with routines (desk work with breaks, a meeting, a lounge group, a
receptionist, a coffee break), presence changes, channel chatter, DM auto-replies, waving back. Always labelled
as demo. Avatar, profile, status, desk, decorations and UI preferences persist in `localStorage`.

## What needs your backend

| Area | State today | To finish |
|---|---|---|
| Authentication, user profile | Local profile in `localStorage` | `usersApi`, `setAuthTokenProvider` |
| Presence and movement of real users | Simulated by `MockRealtimeAdapter` | Serve the events in `realtime-events.ts` |
| Audio / video | Local capture and preview only; conversations are marked **Simulated** and never report "connected" | A `MediaAdapter` on your signalling + SFU |
| Screen sharing | Real `getDisplayMedia` capture, local preview | Distribute the track through the media layer |
| Chat persistence, history, file upload | In-memory; attachments record name and size only | `chatApi` + `chat:send` / `chat:message` |
| Meetings, calendar, invitations | Seeded and local | `workspaceApi.listMeetings/saveMeeting`, calendar integration |
| Desk assignment | Local claim; seeded assignments for demo users | `worldApi.claimDesk/releaseDesk` |
| Whiteboard sync | Per-browser session memory | Stroke/note sync (CRDT or op stream) |
| Map publishing | Edit mode changes live in memory until reload | `worldApi.saveObjects` |
| Multiple workspaces | One demo workspace; switcher shows it | `workspaceApi` |
| Floors 2–5 | Walkable placeholders | Design them in `scripts/build-maps.ts` or Tiled |

## Known limitations

- Characters do not collide with each other (you can walk through people).
- The canvas renders at CSS-pixel resolution; pixel art stays crisp through nearest-neighbour scaling, but it is
  not rendered at device-pixel resolution on HiDPI screens.
- Verified in headless Chromium (software rendering) only. Frame rate on real hardware and behaviour on touch
  devices (virtual joystick) have not been measured.
- The art is procedural starter art: cohesive and original, but intended to be replaced or extended by an artist.
- In demo mode `window.__ajar` exposes the world stores and command bus for debugging.
