import type { MapLabel, Room, SpawnPoint, WorldObject } from "./world.types";

/** Subset of the Tiled JSON map format (https://doc.mapeditor.org) that we read. */
export interface TiledProperty {
  name: string;
  type: "string" | "int" | "float" | "bool";
  value: string | number | boolean;
}
export interface TiledObject {
  id: number;
  name: string;
  type: string;
  x: number;
  y: number;
  width: number;
  height: number;
  properties?: TiledProperty[];
}
export interface TiledTileLayer {
  id: number;
  name: string;
  type: "tilelayer";
  width: number;
  height: number;
  data: number[];
  visible: boolean;
  opacity: number;
  x: number;
  y: number;
}
export interface TiledObjectLayer {
  id: number;
  name: string;
  type: "objectgroup";
  objects: TiledObject[];
  visible: boolean;
  opacity: number;
  x: number;
  y: number;
  draworder: "topdown";
}
export type TiledLayer = TiledTileLayer | TiledObjectLayer;
export interface TiledMap {
  type: "map";
  version: string;
  tiledversion: string;
  orientation: "orthogonal";
  renderorder: "right-down";
  infinite: false;
  width: number;
  height: number;
  tilewidth: number;
  tileheight: number;
  nextlayerid: number;
  nextobjectid: number;
  properties?: TiledProperty[];
  tilesets: {
    firstgid: number; name: string; image: string; imagewidth: number; imageheight: number;
    tilewidth: number; tileheight: number; margin: number; spacing: number; columns: number; tilecount: number;
  }[];
  layers: TiledLayer[];
}

export const TILE_LAYER_NAMES = ["ground", "floor-decor", "rugs", "walls", "foreground"] as const;

/** Engine-independent result of parsing a map. */
export interface LoadedMap {
  floorId: string;
  name: string;
  /** Tiles. */
  width: number;
  height: number;
  tileSize: number;
  rooms: Room[];
  objects: WorldObject[];
  spawns: SpawnPoint[];
  labels: MapLabel[];
  /** 1 = blocked by walls or explicit collision rectangles (objects are added at runtime). */
  baseCollision: Uint8Array;
}
