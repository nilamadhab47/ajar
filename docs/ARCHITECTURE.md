# Architecture

## The one rule

**Phaser owns the world. React owns the application.** They never reach into each other.

```
            commands (imperative, typed)
 React UI ─────────────────────────────────▶ OfficeScene (Phaser)
   ▲                worldCommands                 │
   │                                              │ low-frequency facts
   │   zustand stores  ◀──────────────────────────┤ (room, nearby, prompt, zoom…)
   │                                              │
   └── worldRuntime (plain object, read on demand)◀┘ per-frame data (positions, camera rect)
```

- `src/features/world/world-bridge.ts` is the only channel. React sends a `WorldCommand`
  (`walk-to-user`, `zoom`, `change-floor`, …). The scene never imports a React component.
- The scene writes to zustand stores only when something *changes* (entered a room, nearby set changed),
  never per frame. Per-frame data goes to `worldRuntime`, which the mini-map samples on a timer. Opening
  panels, typing in chat or resizing therefore never restarts or re-renders the world.
- The Phaser `Game` instance lives in a ref inside `WorldCanvas`, never in a store.

## Layout

```
src/
  app/                         Next.js App Router. "/" → /workspace/demo/office; /workspace/[id] is the lobby.
  art/                         Procedural pixel art (PixelBuffer, tiles, furniture). Source of public/assets.
  components/
    layout/                    AppShell, TopNavigation, NavigationRail, RightSidebar, BottomToolbar, Lobby
    overlays/                  Cards over the map: profile, nearby, room banner, conversation, prompt, toasts, DialogHost
    common/ ui/                AvatarImage, StatusIndicator, SearchInput · Button, Dialog, Menu, Tooltip (Radix)
  data/                        Seeded demo workspace, participants, chat, meetings
  features/
    world/
      engine/                  OfficeScene + systems (below), game-config
      entities/                Character, PlayerCharacter, RemoteCharacter, Nameplate, InteractiveObject, DeskObject
      data/object-catalog.ts   Every placeable object kind: sprite, footprint, collision, seats, interaction
      components/              WorldCanvas, Minimap, FloorSelector, EditPanel, TouchJoystick, SpriteThumb
      types/                   WorldObject, Room (OpenArea | PrivateZone | MeetingRoom), Tiled map types
    avatar/                    Appearance model, option registries, sprite-sheet compositor, builder UI
    people/ presence/ chat/ meetings/ conversation/ desk/ media/ whiteboard/ settings/ activity/
  services/
    api/                       REST clients with mock branches
    realtime/                  Adapter interface, event contracts, mock + WebSocket adapters, MovementPublisher
    media/                     MediaAdapter interface + local-capture-only adapter
  stores/                      app-store (workspace, connection), ui-store (panels, dialogs, toasts, prefs)
  lib/                         config (tunable world constants), env, shortcuts, emitter, utils
  types/domain.ts              User, Player, Workspace, Floor, Presence, ChatMessage, Meeting
scripts/                       build-assets.ts, build-maps.ts (+ MapBuilder DSL), preview.ts
public/assets, public/maps     Generated PNG atlases and Tiled JSON maps
```

Domain types (`types/domain.ts`, `world/types`) import nothing from Phaser or React.

## Engine systems

| File | Responsibility |
|---|---|
| `OfficeScene.ts` | Composition root: loads the floor, builds views, runs the frame loop, routes commands and realtime events |
| `MapLoader.ts` | Tiled JSON → `LoadedMap` (rooms, objects, spawns, labels, base collision). Pure. |
| `CollisionSystem.ts` | `NavGrid`: tile walkability from walls + object footprints; box-vs-grid movement with axis sliding |
| `PathfindingSystem.ts` | A* (8-way, no corner cutting), nearest walkable tile, path simplification. Pure; reused by the mock server. |
| `InputController.ts` | Pointer: drag = pan, click, double-click, wheel. Movement intent comes from the shortcut manager or joystick. |
| `CameraController.ts` | Follow with lerp, free-look after a drag, zoom steps, pan-to, bounds, publishes the view rectangle |
| `InteractionSystem.ts` + `interaction-handlers.ts` | Finds the nearest interactable in range, publishes the prompt, runs the handler for its `interactionType` |
| `ProximitySystem.ts` | Discovery/close radii, quiet areas, private zones, do-not-disturb. Pure. |
| `DepthSortingSystem.ts` | Depth bands; everything standing on the floor sorts by the Y of its base |
| `EditController.ts` | Edit mode: select, drag on the grid, add, remove; rebuilds collision and seats |
| `seats.ts` | Seat slots from catalog definitions, approach tiles |

**Adding an interactive object** takes two edits: a `def(...)` line in `object-catalog.ts` and, for a new
behaviour, one entry in `INTERACTIONS`. No sprite code changes.

**Movement** is velocity × real frame delta (clamped to 100 ms), sub-stepped in ≤ 6 px moves so slow frames cannot
tunnel through walls. `smoothStep` is off so speed is correct on slow frames and in unfocused tabs.

**Depth**: tile layers sit below; flat objects (rugs, stairs, pond) at a fixed low depth; everything else at
`10 + baseY`. Seated characters facing the camera get a +1 bias over their seat; facing away they naturally sort
behind the chair back.

## Maps

Maps are Tiled-compatible JSON (`public/maps`). Tile layers: `ground`, `floor-decor`, `rugs`, `walls`,
`foreground`. Object layers: `furniture`, `interactive`, `rooms`, `collision`, `spawns`, `labels`.
Objects carry `type` (a catalog kind) and custom properties (`oid`, `deskId`, `roomId`, …).

The demo maps are authored in `scripts/build-maps.ts` with a small `MapBuilder` DSL (rooms, walls with automatic
cap/face tiles, doors, rugs, objects) and exported with `npm run maps`. They also open in Tiled; if you edit
there, keep the layer names. `Floor.mapUrl` decides where a map is fetched from, so a backend can serve
per-workspace maps in the same shape.

Rooms are a discriminated union: `OpenArea` (optionally `quiet`), `PrivateZone`, `MeetingRoom` (capacity,
equipment). Proximity rules read `room.zone`, nothing else.

Prepared for a full editor: objects are plain data, collision and seats are derived, `worldApi.saveObjects` is
the publish hook. Room creation/resizing and tile painting are not built.

## Avatars

`AvatarAppearance` is plain data. `compose-avatar.ts` draws a 8 × 6 frame sheet (32 × 48 px frames) from
layered drawers; `getAnimation(state, direction)` maps states to frames. Phaser registers the sheet as a canvas
texture keyed by `appearanceKey`; React uses the same sheet for portraits and previews. To add clothing or hair:
add an option in `avatar-options.ts` and a branch in the matching drawer.

## Realtime contract

`RealtimeAdapter` (`connect`, `disconnect`, `on`, `off`, `send`, `getState`, `onStateChange`). Chosen by
`NEXT_PUBLIC_REALTIME_MODE` in `realtime-client.ts`; no component knows which one is active.

Client → server: `player:join`, `player:leave`, `player:move`, `player:stop`, `player:status:update`,
`player:avatar:update`, `player:interaction`, `player:wave`, `room:join`, `room:leave`, `conversation:join`,
`conversation:leave`, `chat:send`.

Server → client: `world:snapshot`, `player:joined`, `player:left`, `player:moved`, `player:stopped`,
`player:status:updated`, `player:avatar:updated`, `player:interaction`, `player:waved`, `room:updated`,
`conversation:participant:joined`, `conversation:participant:left`, `chat:message`, `world:error`.

`player:avatar:update(d)` is an addition to the suggested list, needed so avatar edits propagate.
Payload types are in `realtime-events.ts`. These are proposals; rename them in one file or translate in
`WebSocketRealtimeAdapter.encode/decode`.

- **Movement**: `MovementPublisher` sends at most 12 Hz (`WORLD_CONFIG.network.movementHz`), only on change, with
  `timestamp` and `seq`. State changes (start/stop/sit) are sent immediately.
- **Remote players** are rendered ~140 ms in the past and interpolated between buffered samples; they snap after
  the tab was hidden.
- **Reconnect**: the WebSocket adapter backs off exponentially, drops queued movement, replays other queued
  events, and expects a fresh `world:snapshot`. The UI shows a reconnecting badge and a "Back online" toast.
- **Mock adapter** is a small in-browser server: it loads the same map, runs seeded participant routines with the
  shared A* module, and speaks only through the event contract — so it exercises the same code paths a real
  backend will.

## Media boundary

`MediaAdapter`: `setMicrophone`, `setCamera`, `setScreenShare`, `getLocalStream`, `getParticipantTracks`,
`joinConversation`, `leaveConversation`, state subscription. `LocalOnlyMediaAdapter` performs real
`getUserMedia` / `getDisplayMedia` capture for local previews and always reports transport `none`; the UI labels
such conversations **Simulated**. A real adapter returns `connecting`/`connected` and remote tracks.
The planned model replaces “Talk” with a knock: proximity only makes someone knock-able, and audio starts
after they accept ([ROADMAP.md §1](ROADMAP.md#1-signature-features-specification), [SYSTEM_DESIGN.md §12](SYSTEM_DESIGN.md)).
That flow is not built yet.

## State

Feature stores, not one global store: `world-store` (floor, rooms, occupants, current room, nearby, prompt,
camera, edit selection), `people-store`, `presence-store` (local profile + status, persisted), `avatar-store`
(persisted), `desk-store` (claim + decorations, persisted), `chat-store`, `meeting-store`,
`conversation-store`, `whiteboard-store`, media mirror in `media-controller`, `ui-store` (panels, dialog, toasts,
activity; preferences persisted), `app-store` (workspace, connection). Persisted keys are prefixed `ajar.`.

## Keyboard

`lib/shortcuts.ts` installs one window listener. Held actions (movement, run) are polled by the scene; discrete
actions are subscribed to. Keys are ignored while an input, textarea, contenteditable, open dialog or menu has
focus, and held keys are released on blur and focus changes. Phaser's own keyboard plugin is disabled.

## Decisions worth knowing

- Tile-resolution collision (not per-pixel): simple, matches the furniture grid, and shares one grid with A*.
- Labels are Phaser objects scaled by `1/zoom` rather than DOM nodes: no per-frame React work.
- Next.js 16 with Cache Components: the office and lobby are client-only (`dynamic(..., { ssr: false })`), so
  Phaser and `localStorage` never run on the server.
- React Hook Form + Zod are used where there are real forms (profile/onboarding); simple controls use local state.
