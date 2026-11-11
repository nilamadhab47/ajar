import type { AvatarAppearance } from "../types/avatar.types";

/**
 * Option registries for the avatar builder. To add a new asset, add an entry
 * here and a matching drawer in render/compose-avatar.ts — the Phaser renderer
 * and the React preview pick it up automatically.
 */
export interface Option {
  id: string;
  label: string;
}

export const SKIN_TONES = ["#FFDFC4", "#F3C9A5", "#E0AC82", "#C68B62", "#9C6B48", "#6F4A33"];
export const HAIR_COLORS = ["#2B2B33", "#4A3428", "#7A5236", "#A5532E", "#E2BC6A", "#C9483A", "#B8BBC2", "#4F7DD1", "#E589B0", "#8566C9"];
export const CLOTHING_COLORS = [
  "#F6F3EE", "#2F3340", "#6C63C7", "#A9A2D5", "#5B8FC7", "#A9C9DE", "#4F9E86", "#A7C9AB",
  "#E3B84F", "#E8915A", "#E89B8C", "#D9596B", "#8B6B4A", "#566070",
];

export const HAIRSTYLES: Option[] = [
  { id: "short", label: "Short" }, { id: "side", label: "Side part" }, { id: "spiky", label: "Spiky" },
  { id: "buzz", label: "Buzz" }, { id: "bob", label: "Bob" }, { id: "long", label: "Long" },
  { id: "pony", label: "Ponytail" }, { id: "bun", label: "Bun" }, { id: "curly", label: "Curly" },
  { id: "bald", label: "Bald" },
];
export const FACES: Option[] = [
  { id: "neutral", label: "Neutral" }, { id: "smile", label: "Smile" }, { id: "wide", label: "Bright eyes" },
  { id: "sleepy", label: "Relaxed" }, { id: "freckles", label: "Freckles" }, { id: "blush", label: "Blush" },
  { id: "beard", label: "Beard" }, { id: "moustache", label: "Moustache" },
];
export const TOPS: Option[] = [
  { id: "tee", label: "T-shirt" }, { id: "shirt", label: "Shirt" }, { id: "hoodie", label: "Hoodie" },
  { id: "jacket", label: "Jacket" }, { id: "sweater", label: "Sweater" },
];
export const BOTTOMS: Option[] = [
  { id: "trousers", label: "Trousers" }, { id: "shorts", label: "Shorts" }, { id: "skirt", label: "Skirt" },
];
export const SHOES: Option[] = [
  { id: "sneakers", label: "Sneakers" }, { id: "boots", label: "Boots" }, { id: "flats", label: "Flats" },
];
export const GLASSES: Option[] = [
  { id: "none", label: "None" }, { id: "round", label: "Round" }, { id: "square", label: "Square" }, { id: "shades", label: "Shades" },
];
export const HATS: Option[] = [
  { id: "none", label: "None" }, { id: "cap", label: "Cap" }, { id: "beanie", label: "Beanie" },
];
export const BAGS: Option[] = [
  { id: "none", label: "None" }, { id: "backpack", label: "Backpack" }, { id: "messenger", label: "Messenger" },
];
export const EXTRAS: Option[] = [
  { id: "none", label: "None" }, { id: "scarf", label: "Scarf" }, { id: "lanyard", label: "Lanyard" },
  { id: "tie", label: "Tie" }, { id: "badge", label: "Badge" },
];

export const DEFAULT_APPEARANCE: AvatarAppearance = {
  characterId: "base",
  skinTone: SKIN_TONES[2],
  hairstyle: "short",
  hairColor: HAIR_COLORS[0],
  face: "smile",
  clothing: { top: "hoodie", topColor: "#6C63C7", bottom: "trousers", bottomColor: "#2F3340", shoes: "sneakers", shoeColor: "#F6F3EE" },
  accessories: { glasses: "none", hat: "none", headphones: false, bag: "none", extra: "none", accentColor: "#E89B8C" },
};

export function randomAppearance(rng: () => number = Math.random): AvatarAppearance {
  const pick = <T,>(items: readonly T[]) => items[Math.floor(rng() * items.length)];
  const maybe = (options: Option[], chance: number) => (rng() < chance ? pick(options.slice(1)).id : "none");
  return {
    characterId: "base",
    skinTone: pick(SKIN_TONES),
    hairstyle: pick(HAIRSTYLES).id,
    hairColor: pick(HAIR_COLORS),
    face: pick(FACES).id,
    clothing: {
      top: pick(TOPS).id, topColor: pick(CLOTHING_COLORS),
      bottom: pick(BOTTOMS).id, bottomColor: pick(["#2F3340", "#566070", "#8B6B4A", "#5B8FC7", "#A9A2D5", "#F6F3EE"]),
      shoes: pick(SHOES).id, shoeColor: pick(["#F6F3EE", "#2F3340", "#8B6B4A", "#E89B8C", "#5B8FC7"]),
    },
    accessories: {
      glasses: maybe(GLASSES, 0.3), hat: maybe(HATS, 0.2), headphones: rng() < 0.15,
      bag: maybe(BAGS, 0.2), extra: maybe(EXTRAS, 0.25), accentColor: pick(CLOTHING_COLORS),
    },
  };
}

/** Stable key for caching composed sprite sheets and Phaser textures. */
export function appearanceKey(a: AvatarAppearance): string {
  const c = a.clothing;
  const x = a.accessories;
  return [
    a.characterId, a.skinTone, a.hairstyle, a.hairColor, a.face, c.top, c.topColor, c.bottom, c.bottomColor,
    c.shoes, c.shoeColor, x.glasses, x.hat, x.headphones ? 1 : 0, x.bag, x.extra, x.accentColor,
  ].join("|");
}
