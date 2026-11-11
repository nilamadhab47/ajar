import { LOCAL_USER_ID } from "@/data/demo-workspace";
import { BRAND } from "@/lib/config";
import { deskOwner, useDeskStore } from "@/features/desk/desk-store";
import { usePeopleStore } from "@/features/people/people-store";
import { getRealtime } from "@/services/realtime/realtime-client";
import { useUiStore } from "@/stores/ui-store";
import { getObjectDef } from "../data/object-catalog";
import type { InteractionType, WorldObject } from "../types/world.types";
import { useWorldStore, type InteractionPrompt } from "../world-store";
import type { WorldContext } from "./world-context";

interface InteractionHandler {
  /** Text for the "[E] …" prompt. */
  describe?: (object: WorldObject, ctx: WorldContext) => Partial<Omit<InteractionPrompt, "objectId">>;
  run: (object: WorldObject, ctx: WorldContext) => void;
}

const ui = () => useUiStore.getState();
const broadcast = (object: WorldObject, action: string) => getRealtime().send("player:interaction", { playerId: LOCAL_USER_ID, objectId: object.id, action });
const center = (o: WorldObject) => ({ x: o.x + o.width / 2, y: o.y });

const BOOKS = ["Thinking in Systems", "The Design of Everyday Things", "A Pattern Language", "Team Topologies", "The Pragmatic Programmer"];

/**
 * One handler per interaction type. Objects opt in through their catalog entry,
 * so adding a new interactive object never requires touching sprite code.
 */
export const INTERACTIONS: Record<Exclude<InteractionType, "none">, InteractionHandler> = {
  seat: {
    describe: (o) => ({ detail: o.properties.deskId ? `Desk ${o.properties.deskId}` : undefined }),
    run: (o, ctx) => ctx.sitOn(o),
  },
  desk: {
    describe: (o) => {
      const deskId = String(o.properties.deskId ?? "");
      const ownerId = deskOwner(useDeskStore.getState(), deskId);
      const owner = ownerId === LOCAL_USER_ID ? "Your desk" : ownerId ? (usePeopleStore.getState().users[ownerId]?.displayName ?? "Assigned") : o.properties.hot ? "Hot desk" : "Unassigned";
      return { title: `${getObjectDef(o.type)?.label} ${deskId}`, detail: owner };
    },
    run: (o) => ui().openDialog({ type: "desk", objectId: o.id, deskId: String(o.properties.deskId ?? o.id), label: getObjectDef(o.type)?.label ?? "Desk", hot: !!o.properties.hot }),
  },
  whiteboard: {
    describe: (o) => ({ title: String(o.properties.title ?? "Whiteboard") }),
    run: (o) => ui().openDialog({ type: "whiteboard", boardId: String(o.properties.boardId ?? o.id), title: String(o.properties.title ?? "Whiteboard") }),
  },
  "meeting-room": {
    describe: (o) => {
      const world = useWorldStore.getState();
      const room = world.rooms.find((r) => r.id === o.properties.roomId);
      if (!room) return {};
      const count = world.roomOccupants[room.id]?.length ?? 0;
      return { title: room.name, detail: `${count}/${room.capacity ?? "–"} inside` };
    },
    run: (o) => {
      if (o.properties.roomId) ui().openDialog({ type: "room", roomId: String(o.properties.roomId) });
    },
  },
  coffee: {
    run: (o, ctx) => {
      ctx.views.get(o.id)?.nudge();
      ctx.effect("steam", center(o).x, o.y - 6);
      ctx.player.showEmote("☕");
      ui().toast({ title: "Coffee's ready", body: "Freshly brewed. Take it back to your desk.", tone: "success" });
      ui().logActivity("You brewed a coffee");
      broadcast(o, "coffee");
    },
  },
  water: {
    run: (o, ctx) => {
      ctx.views.get(o.id)?.nudge();
      ctx.player.showEmote("💧");
      ui().toast({ title: "Stay hydrated", body: "You filled a glass of water." });
      broadcast(o, "water");
    },
  },
  fridge: {
    run: (o, ctx) => {
      ctx.views.get(o.id)?.nudge();
      ctx.player.showEmote("🥪");
      ui().toast({ title: "Snack time", body: "You grabbed something from the fridge." });
    },
  },
  gong: {
    run: (o, ctx) => {
      ctx.views.get(o.id)?.nudge();
      ctx.shake();
      ctx.effect("confetti", center(o).x, o.y - 20);
      ctx.player.playAction("celebrate");
      ui().toast({ title: "GONG!", body: "You rang the gong. Something worth celebrating?", tone: "success" });
      ui().logActivity("You rang the gong 🎉");
      broadcast(o, "gong");
    },
  },
  elevator: { run: () => ui().openDialog({ type: "floors", via: "elevator" }) },
  stairs: { run: () => ui().openDialog({ type: "floors", via: "stairs" }) },
  reception: {
    describe: () => ({ title: "Reception", detail: "Visitor check-in" }),
    run: (_o, ctx) => {
      ctx.player.showEmote("👋");
      ui().toast({ title: `Welcome to ${BRAND.product}`, body: "Visitors check in here. With a backend connected, this notifies their host." });
    },
  },
  bookshelf: {
    run: (o, ctx) => {
      ctx.player.showEmote("📖");
      ui().toast({ title: "From the shelf", body: `You flip through “${BOOKS[(o.x + o.y) % BOOKS.length]}”.` });
    },
  },
  printer: {
    run: (o, ctx) => {
      ctx.views.get(o.id)?.nudge();
      ctx.player.showEmote("🖨️");
      ui().toast({ title: "Printer", body: "Nothing in the print queue." });
    },
  },
};
