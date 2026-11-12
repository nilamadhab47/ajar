# Ajar — a quiet office for remote teams

Be around, on your terms.

Ajar is a top-down pixel-art office for distributed teams. You can see who is around, knock before a conversation starts, or leave people alone. Not every hello needs a meeting.

The name means a door left slightly open: approachable, not wide open. Walking near someone makes them knockable. It never opens a microphone. Each person has a **status** (what they are doing) and a **door** (how they want to be approached). The door shows as a lantern: a full lamp is ajar, a half lamp means ask first, an unlit lamp means closed.

This repository is the playable frontend. There is no backend yet. A mock adapter in the browser plays the other people. "Marigold Studio" is the demo company. The office you walk into is named Ajar.

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

`/` redirects to `/workspace/demo/office`. `/workspace/demo` is the lobby you land on after "Leave office".

## The door

| Door | What a knock does | Lantern |
|---|---|---|
| Ajar | Accepted on the click. Text chat opens. | Full gold lamp |
| Ask first (the default) | They accept, decline, or reply later | Half lamp |
| Closed | Leave a note, up to 280 characters | Unlit lamp with a slash |

Focus and Do not disturb close the door until that status ends. A knock does not turn the microphone or camera on. In the demo the other person is simulated, and the conversation card says **Simulated**.

Desk drops, personal office hours, the focus timer, and "while you were away" are specified and not built yet. See [docs/ROADMAP.md](docs/ROADMAP.md).

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
| M · V | Microphone · camera (only when you choose) |
| H | Emote menu |
| G | Walk to my desk |
| Esc | Close panels, cancel walking |

Shortcuts are rebindable in Settings and pause while you type or a dialog has the keyboard.

## Things to try

1. First run opens the avatar builder. Pick a name and a look.
2. Set your door from the status menu: Door ajar, Ask first, or Door closed.
3. Walk up to someone. Within 5 tiles they appear in **Nearby**. Knock, wave, or message them. Priya's door is ajar. Ingrid's is closed, so you leave a note.
4. Claim a desk in Product, Engineering, or Design. Press **E**, decorate it, and sit.
5. Step into Atlas, Birch, the Kitchen, Library, Lounge, Quiet Zone, Reception, Studio, or the Garden. Each room has a name on the floor. A quiet room shrinks knock range to about a tile.
6. In Atlas, press **E** at the wall display to open the room and join "Design Crit".
7. Ring the gong, brew a coffee, open a whiteboard, or take the elevator to another floor.
8. Settings → **Map edit mode** to select, drag, remove, and add objects. Publish waits on a backend.
9. Settings → **Simulate a network drop** to see the reconnecting state.

## What you can walk through

One furnished floor, 64 × 40 tiles: an open workspace with 12 desks, Atlas and Birch, a kitchen, a library, a lounge, a quiet zone, reception, a studio, and a garden. Floors 2–5 are walkable placeholders, reached by elevator, stairs, or the mini-map.

Characters are layered: skin, hair, face, clothes, glasses, hats, and small accessories. They idle, walk, sit, wave, dance, clap, and celebrate. Nameplates show status and the lantern.

Around the map: People, chat, meetings, a mini-map, a profile card, a nearby card, whiteboards, and an avatar builder. Chat has channels, a group, and direct messages. Nearby speech bubbles stay separate from that history. Demo people are always labelled **Demo**.

Your name, look, door, desk, and a few UI preferences persist in this browser under keys prefixed `ajar.`.

## Stack

| Concern | Choice |
|---|---|
| App | Next.js 16, React 19, TypeScript |
| World | Phaser 3, client-only. Audio in Phaser is off. |
| UI | Tailwind CSS v4, Radix, Zustand |

The planned backend is a NestJS API, a Go floor gateway, PostgreSQL, Redis, and LiveKit. LiveKit would carry audio only after a knock is accepted. The design is in [docs/SYSTEM_DESIGN.md](docs/SYSTEM_DESIGN.md). The API can send a magic link and issue a session. Google, Microsoft, the gateway, Redis, and LiveKit are not running.

## API shell

From the repo root, with Docker running. Postgres is published on port 55432 so it does not collide with a database already on 5432.

```
docker compose up -d postgres mailpit
npm --prefix server install
npm --prefix server run migrate
```

Copy `server/.env.example` to `server/.env` and set `JWT_SECRET` to at least 32 characters. Then:

```
npm --prefix server run start:dev
```

`GET http://localhost:4000/health` checks Postgres. `POST /auth/magic-link` sends a sign-in link to Mailpit at http://127.0.0.1:8025. `POST /auth/password/sign-up` sends a confirmation link and saves the password only after that link is used. `POST /auth/password/sign-in` signs in a person who already confirmed one. Set `RESEND_API_KEY` and a verified `MAIL_FROM` when the message should reach a real inbox. The office in the browser still runs without the API. There is no sign-up page yet.

## Connecting a backend later

Set in `.env.local`:

```
NEXT_PUBLIC_API_BASE_URL=https://api.example.com/v1
NEXT_PUBLIC_WS_URL=wss://rt.example.com/office
NEXT_PUBLIC_REALTIME_MODE=websocket
```

- **Realtime** — `src/services/realtime/`. The app talks only to `RealtimeAdapter`. Event names are in `realtime-events.ts`.
- **REST** — `src/services/api/`. `setAuthTokenProvider()` in `api-client.ts` attaches the access token. The token stays in memory.
- **Media** — implement `MediaAdapter` and return it from `getMediaAdapter()`. Do not label a conversation connected unless the transport is real.

## Docs

| Doc | For |
|---|---|
| [docs/PRODUCT_CONTEXT.md](docs/PRODUCT_CONTEXT.md) | What exists, where code lives, rules not to break |
| [docs/BRAND.md](docs/BRAND.md) | The name, voice, and consent rules |
| [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md) | How Phaser and React meet |
| [docs/SYSTEM_DESIGN.md](docs/SYSTEM_DESIGN.md) | Backend, database, and realtime design |
| [docs/ROADMAP.md](docs/ROADMAP.md) | What to build next |
| [docs/ASSETS.md](docs/ASSETS.md) | Art pipeline and licences |

## Still ahead

| Area | Today | Next |
|---|---|---|
| Sign-in and roles | A local profile in this browser | Accounts we build ourselves: magic link, Google, Microsoft. Roles are owner, admin, member, and guest per office. |
| Other people | 14 simulated coworkers | The Go gateway |
| Audio and video | Local preview only | LiveKit after an accepted knock |
| Desks | Claimed in this browser | One desk per person per office |
| Chat, meetings, whiteboards, map edits | In this browser | The API |
| Desk drops, office hours, away digest | Not built | [docs/ROADMAP.md](docs/ROADMAP.md) |

Job titles such as CEO or HR are a line on the profile. They are not permissions. Product, Engineering, and Design are names on the floor, not department membership.

## Known limits

- Characters can walk through each other.
- The canvas is CSS pixels, so the pixel art is crisp but not drawn at device-pixel resolution.
- Edit mode cannot create rooms, paint tiles, or publish.
- Floors 2–5 are placeholders.
- The mark in the corner is still the older arch. The welcome sign reads AJAR. The door-and-lamp logo is not drawn yet.
- The art in `public/assets` is generated by this repo. It is starter art, meant to be replaced.
- In demo mode, `window.__ajar` exposes the world stores and the command bus for debugging.
