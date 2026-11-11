import type { Direction } from "@/features/avatar/types/avatar.types";
import { getObjectDef } from "../data/object-catalog";
import type { LoadedMap, TiledMap, TiledObject, TiledObjectLayer, TiledTileLayer } from "../types/map.types";
import type { PropertyValue, Room, RoomType, WorldObject } from "../types/world.types";

const props = (o: { properties?: TiledObject["properties"] }): Record<string, PropertyValue> =>
  Object.fromEntries((o.properties ?? []).map((p) => [p.name, p.value]));

/** Converts Tiled JSON into engine-independent world data. Pure: used by the scene, the mini-map and the mock server. */
export function parseTiledMap(json: TiledMap): LoadedMap {
  const mapProps = props(json);
  const floorId = String(mapProps.floorId ?? "floor-1");
  const tileSize = json.tilewidth;
  const objectLayer = (name: string) =>
    (json.layers.find((l) => l.type === "objectgroup" && l.name === name) as TiledObjectLayer | undefined)?.objects ?? [];

  const baseCollision = new Uint8Array(json.width * json.height);
  const walls = json.layers.find((l) => l.type === "tilelayer" && l.name === "walls") as TiledTileLayer | undefined;
  walls?.data.forEach((gid, i) => {
    if (gid) baseCollision[i] = 1;
  });
  for (const c of objectLayer("collision"))
    for (let y = Math.floor(c.y / tileSize); y < Math.ceil((c.y + c.height) / tileSize); y++)
      for (let x = Math.floor(c.x / tileSize); x < Math.ceil((c.x + c.width) / tileSize); x++)
        if (x >= 0 && y >= 0 && x < json.width && y < json.height) baseCollision[y * json.width + x] = 1;

  const objects: WorldObject[] = [];
  for (const layerName of ["furniture", "interactive"] as const)
    for (const o of objectLayer(layerName)) {
      const def = getObjectDef(o.type);
      if (!def) continue;
      const { oid, ...rest } = props(o);
      objects.push({
        id: String(oid ?? `obj-${o.id}`), type: o.type, name: o.name, x: o.x, y: o.y, width: o.width, height: o.height,
        layer: def.flat ? "floor" : layerName, interactionType: def.interaction, properties: rest,
      });
    }

  const rooms: Room[] = objectLayer("rooms").map((o) => {
    const p = props(o);
    const base = {
      id: String(p.oid), name: o.name, type: String(p.roomType) as RoomType,
      bounds: { x: o.x, y: o.y, width: o.width, height: o.height },
      capacity: typeof p.capacity === "number" ? p.capacity : null,
      floorId, participants: [], color: String(p.color ?? "#EDEAE4"),
    };
    if (p.zone === "meeting")
      return { ...base, zone: "meeting", isPrivate: true, capacity: Number(p.capacity ?? 8), equipment: String(p.equipment ?? "").split(",").filter(Boolean) };
    if (p.zone === "private") return { ...base, zone: "private", isPrivate: true };
    return { ...base, zone: "open", isPrivate: false, quiet: p.quiet === true };
  });

  return {
    floorId, name: String(mapProps.name ?? "Office"), width: json.width, height: json.height, tileSize, rooms, objects, baseCollision,
    spawns: objectLayer("spawns").map((o) => ({ id: o.name, x: o.x, y: o.y, direction: String(props(o).direction ?? "down") as Direction })),
    labels: objectLayer("labels").map((o) => ({ text: o.name, x: o.x, y: o.y })),
  };
}

export function roomAt(rooms: Room[], x: number, y: number): Room | null {
  let best: Room | null = null;
  for (const r of rooms) {
    const b = r.bounds;
    if (x < b.x || y < b.y || x >= b.x + b.width || y >= b.y + b.height) continue;
    if (!best || b.width * b.height < best.bounds.width * best.bounds.height) best = r;
  }
  return best;
}
