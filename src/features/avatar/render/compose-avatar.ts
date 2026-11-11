import { PixelBuffer, shade } from "../../../art/pixel-buffer";
import { FRAME_H, FRAME_W, SHEET_COLS, SHEET_ROWS } from "../data/animations";
import type { AvatarAppearance } from "../types/avatar.types";

/**
 * Layered avatar compositor. Draws a complete sprite sheet (idle, walk, sit and
 * action frames in four directions) from an AvatarAppearance. Pure TypeScript:
 * Phaser turns the result into a texture, React into a <canvas> preview.
 *
 * Layers are drawn back-to-front per frame and outlined once at the end, so a
 * new hairstyle/garment only needs a new case in the matching layer function.
 */
const INK = "#2B2D3A";

type Arm = "down" | "up" | "waveA" | "waveB" | "fwd" | "clap";
interface FrontPose {
  bob?: number;
  lift?: [number, number];
  arms?: [Arm, Arm];
  armDy?: [number, number];
  blink?: boolean;
  sit?: boolean;
}
interface SidePose {
  bob?: number;
  /** -1 standing, 0..3 walk cycle. */
  phase?: number;
  swing?: number;
  blink?: boolean;
  sit?: boolean;
}

interface Ctx {
  b: PixelBuffer;
  a: AvatarAppearance;
  oy: number;
  skin: string;
  skinD: string;
  top: string;
  topD: string;
  topL: string;
  hair: string;
  hairD: string;
  hairL: string;
  accent: string;
}

function ctx(b: PixelBuffer, a: AvatarAppearance, oy: number): Ctx {
  return {
    b, a, oy,
    skin: a.skinTone,
    skinD: shade(a.skinTone, -0.16),
    top: a.clothing.topColor,
    topD: shade(a.clothing.topColor, -0.18),
    topL: shade(a.clothing.topColor, 0.25),
    hair: a.hairColor,
    hairD: shade(a.hairColor, -0.22),
    hairL: shade(a.hairColor, 0.2),
    accent: a.accessories.accentColor,
  };
}

// ------------------------------------------------------------------ legs
function shoe(c: Ctx, x: number, top: number, w: number) {
  const { b, a } = c;
  const col = a.clothing.shoeColor;
  const sole = shade(col, -0.35);
  if (a.clothing.shoes === "boots") {
    b.rect(x, top - 2, w, 5, col);
    b.rect(x, top + 2, w, 1, sole);
  } else if (a.clothing.shoes === "flats") {
    b.rect(x, top, w, 1, c.skin);
    b.rect(x, top + 1, w, 2, col);
  } else {
    b.rect(x, top, w, 3, col);
    b.rect(x, top + 2, w, 1, col === "#F6F3EE" ? "#B9BEC8" : "#F6F3EE");
  }
}

function legColor(c: Ctx, row: number): string {
  const kind = c.a.clothing.bottom;
  if (kind === "skirt") return c.skin;
  if (kind === "shorts" && row >= 4) return c.skin;
  return c.a.clothing.bottomColor;
}

function frontLegs(c: Ctx, pose: FrontPose) {
  const { b } = c;
  const top = 33 + c.oy;
  for (let i = 0; i < 2; i++) {
    const x = i === 0 ? 11 : 17;
    const lift = pose.sit ? 0 : (pose.lift?.[i] ?? 0);
    const bottom = 42 - lift;
    for (let y = top; y < bottom; y++) {
      const col = legColor(c, y - top);
      b.rect(x, y, 4, 1, col);
      b.px(i === 0 ? x + 3 : x, y, shade(col, -0.14));
    }
    shoe(c, i === 0 ? x - 1 : x, bottom, 5);
  }
  if (c.a.clothing.bottom === "skirt") {
    const col = c.a.clothing.bottomColor;
    b.rect(10, top, 12, 2, col);
    b.rect(9, top + 2, 14, 3, col);
    b.rect(9, top + 4, 14, 1, shade(col, -0.18));
  }
}

function sideLegs(c: Ctx, pose: SidePose) {
  const { b } = c;
  const pants = c.a.clothing.bottomColor;
  if (pose.sit) {
    const y = 33 + c.oy;
    b.rect(13, y, 9, 4, c.a.clothing.bottom === "skirt" ? pants : legColor(c, 0));
    b.rect(19, y + 2, 4, 42 - (y + 2), legColor(c, 5));
    shoe(c, 19, 42, 6);
    return;
  }
  const top = 33 + (pose.bob ?? 0);
  const leg = (x: number, lift: number, far: boolean) => {
    const bottom = 42 - lift;
    for (let y = top; y < bottom; y++) {
      const col = legColor(c, y - top);
      b.rect(x, y, 4, 1, far ? shade(col, -0.16) : col);
    }
    shoe(c, x, bottom, 5);
  };
  const phase = pose.phase ?? -1;
  if (phase === 0) {
    leg(11, 1, true);
    leg(18, 0, false);
  } else if (phase === 2) {
    leg(17, 0, true);
    leg(12, 1, false);
  } else {
    leg(14, 0, true);
    leg(15, 0, false);
  }
  if (c.a.clothing.bottom === "skirt") {
    b.rect(12, top, 9, 2, pants);
    b.rect(11, top + 2, 11, 3, pants);
    b.rect(11, top + 4, 11, 1, shade(pants, -0.18));
  }
}

// ------------------------------------------------------------------ torso & arms
function frontTorso(c: Ctx, back: boolean) {
  const { b, oy, top, topD, topL } = c;
  const y = 23 + oy;
  b.rect(10, y, 12, 10, top);
  b.rect(21, y, 1, 10, topD);
  b.rect(10, y + 9, 12, 1, topD);
  const kind = c.a.clothing.top;
  if (back) {
    if (kind === "sweater") {
      b.rect(10, y + 3, 12, 1, topL);
      b.rect(10, y + 6, 12, 1, topL);
    }
    return;
  }
  if (kind === "tee") b.rect(14, y, 4, 1, c.skin);
  else if (kind === "shirt") {
    b.rect(13, y, 6, 2, topL);
    b.rect(15, y, 2, 1, c.skin);
    b.px(16, y + 4, topD);
    b.px(16, y + 7, topD);
  } else if (kind === "hoodie") {
    b.rect(10, y, 3, 2, topD);
    b.rect(19, y, 3, 2, topD);
    b.rect(14, y + 1, 1, 3, topL);
    b.rect(17, y + 1, 1, 3, topL);
    b.rect(12, y + 6, 8, 3, topD);
  } else if (kind === "jacket") {
    b.rect(14, y, 4, 10, "#F6F3EE");
    b.rect(13, y, 1, 7, topD);
    b.rect(18, y, 1, 7, topD);
    b.rect(15, y, 2, 1, c.skin);
  } else if (kind === "sweater") {
    b.rect(13, y, 6, 1, topD);
    b.rect(10, y + 3, 12, 1, topL);
    b.rect(10, y + 6, 12, 1, topL);
  }
}

function sleeve(c: Ctx, x: number, y: number, len: number, upward = false) {
  const short = c.a.clothing.top === "tee";
  const col = shade(c.top, -0.08);
  for (let k = 0; k < len; k++) {
    const fromShoulder = upward ? len - 1 - k : k;
    c.b.rect(x, y + k, 3, 1, short && fromShoulder >= 3 ? c.skin : col);
  }
}

function frontArm(c: Ctx, i: number, state: Arm, dy: number) {
  const { b, oy, skin } = c;
  const x = i === 0 ? 7 : 22;
  const out = i === 0 ? -1 : 1;
  switch (state) {
    case "up":
      b.rect(x, 23 + oy, 3, 2, shade(c.top, -0.08));
      sleeve(c, x + out * 2, 14 + oy, 10, true);
      b.rect(x + out * 2, 12 + oy, 3, 2, skin);
      break;
    case "waveA":
      b.rect(x, 23 + oy, 3, 2, shade(c.top, -0.08));
      sleeve(c, x + out * 2, 15 + oy, 9, true);
      b.rect(x + out * 2, 12 + oy, 3, 3, skin);
      break;
    case "waveB":
      b.rect(x, 23 + oy, 3, 2, shade(c.top, -0.08));
      sleeve(c, x + out * 3, 16 + oy, 8, true);
      b.rect(x + out * 4, 13 + oy, 3, 3, skin);
      break;
    case "fwd":
      sleeve(c, x - out, 24 + oy, 5);
      b.rect(i === 0 ? 10 : 19, 27 + oy, 3, 3, skin);
      break;
    case "clap":
      sleeve(c, x - out, 24 + oy, 5);
      b.rect(i === 0 ? 13 : 16, 27 + oy, 3, 3, skin);
      break;
    default:
      sleeve(c, x, 23 + oy + dy, 8);
      b.rect(x, 31 + oy + dy, 3, 2, skin);
  }
}

// ------------------------------------------------------------------ head, face, hair
function faceFront(c: Ctx, blink: boolean) {
  const { b, oy, skinD } = c;
  const id = c.a.face;
  const y = 15 + oy;
  if (id === "beard") b.round(9, 18 + oy, 14, 5, c.hairD, 1);
  if (blink || id === "sleepy") {
    b.rect(11, y + 1, 3, 1, INK);
    b.rect(18, y + 1, 3, 1, INK);
  } else if (id === "wide") {
    b.rect(11, y - 1, 3, 3, INK);
    b.rect(18, y - 1, 3, 3, INK);
    b.px(11, y - 1, "#FFFFFF");
    b.px(18, y - 1, "#FFFFFF");
  } else {
    b.rect(12, y, 2, 2, INK);
    b.rect(18, y, 2, 2, INK);
  }
  if (id === "smile" || id === "wide") {
    b.rect(14, 20 + oy, 4, 1, shade(c.skin, -0.42));
    b.px(13, 19 + oy, shade(c.skin, -0.42));
    b.px(18, 19 + oy, shade(c.skin, -0.42));
  } else if (id === "moustache") b.rect(13, 19 + oy, 6, 2, c.hairD);
  else b.rect(15, 20 + oy, 2, 1, id === "beard" ? c.skin : shade(c.skin, -0.36));
  if (id === "freckles") [[10, 18], [12, 19], [19, 19], [21, 18]].forEach(([x, fy]) => b.px(x, fy + oy, skinD));
  if (id === "blush" || id === "smile") {
    b.rect(10, 18 + oy, 2, 1, "#F09C9C", 0.75);
    b.rect(20, 18 + oy, 2, 1, "#F09C9C", 0.75);
  }
}

function hairFront(c: Ctx) {
  const { b, oy, hair, hairD, hairL } = c;
  const y = oy;
  const cap = () => {
    b.round(8, 7 + y, 16, 5, hair, 2);
    b.rect(8, 12 + y, 2, 3, hair);
    b.rect(22, 12 + y, 2, 3, hair);
    b.rect(11, 8 + y, 5, 1, hairL);
  };
  switch (c.a.hairstyle) {
    case "bald":
      b.rect(12, 10 + y, 3, 1, shade(c.skin, 0.3));
      return;
    case "buzz":
      b.round(8, 8 + y, 16, 4, hairL, 2);
      b.rect(8, 12 + y, 1, 3, hairL);
      b.rect(23, 12 + y, 1, 3, hairL);
      return;
    case "side":
      cap();
      b.rect(8, 12 + y, 11, 2, hair);
      b.rect(8, 14 + y, 3, 2, hair);
      b.rect(18, 12 + y, 1, 1, hairD);
      return;
    case "long":
      cap();
      b.rect(10, 12 + y, 12, 1, hair);
      b.rect(6, 10 + y, 3, 18, hair);
      b.rect(23, 10 + y, 3, 18, hair);
      b.rect(6, 26 + y, 3, 2, hairD);
      b.rect(23, 26 + y, 3, 2, hairD);
      return;
    case "bob":
      b.round(7, 7 + y, 18, 6, hair, 2);
      b.rect(10, 12 + y, 12, 2, hair);
      b.rect(6, 12 + y, 3, 11, hair);
      b.rect(23, 12 + y, 3, 11, hair);
      b.rect(11, 8 + y, 6, 1, hairL);
      return;
    case "pony":
      cap();
      b.rect(10, 12 + y, 5, 2, hair);
      b.rect(18, 12 + y, 4, 1, hair);
      return;
    case "bun":
      cap();
      b.round(12, 2 + y, 8, 6, hair, 2);
      b.rect(14, 3 + y, 3, 1, hairL);
      b.rect(10, 12 + y, 12, 1, hair);
      return;
    case "curly":
      b.round(5, 3 + y, 22, 11, hair, 3);
      b.rect(5, 12 + y, 4, 6, hair);
      b.rect(23, 12 + y, 4, 6, hair);
      [[8, 6], [13, 4], [18, 5], [22, 8], [10, 10], [16, 9], [6, 14], [24, 15]].forEach(([x, hy]) => b.px(x, hy + y, hairL));
      [[11, 7], [20, 6], [15, 11], [7, 11]].forEach(([x, hy]) => b.px(x, hy + y, hairD));
      return;
    case "spiky":
      cap();
      [8, 11, 14, 17, 20].forEach((x, i) => b.rect(x + 1, (i % 2 ? 4 : 5) + y, 2, 3, hair));
      [10, 14, 18].forEach((x) => b.rect(x, 12 + y, 2, 2, hair));
      return;
    default:
      cap();
      b.rect(10, 12 + y, 12, 1, hair);
  }
}

function hairBack(c: Ctx) {
  const { b, oy, hair, hairD, hairL } = c;
  const y = oy;
  switch (c.a.hairstyle) {
    case "bald":
      return;
    case "buzz":
      b.round(8, 8 + y, 16, 11, hairL, 2);
      return;
    case "long":
      b.round(6, 7 + y, 20, 22, hair, 2);
      b.rect(6, 27 + y, 20, 2, hairD);
      break;
    case "bob":
      b.round(6, 7 + y, 20, 17, hair, 2);
      b.rect(6, 22 + y, 20, 2, hairD);
      break;
    case "curly":
      b.round(5, 3 + y, 22, 18, hair, 3);
      [[8, 6], [13, 4], [18, 5], [22, 8], [10, 12], [16, 9], [20, 15], [7, 16], [14, 17]].forEach(([x, hy]) => b.px(x, hy + y, hairL));
      return;
    default:
      b.round(8, 7 + y, 16, 13, hair, 2);
  }
  b.rect(11, 9 + y, 5, 1, hairL);
  if (c.a.hairstyle === "pony") {
    b.rect(14, 16 + y, 4, 12, hair);
    b.rect(14, 16 + y, 4, 1, c.accent);
    b.rect(15, 27 + y, 2, 1, hairD);
  } else if (c.a.hairstyle === "bun") b.round(12, 2 + y, 8, 6, hair, 2);
  else if (c.a.hairstyle === "spiky") [8, 11, 14, 17, 20].forEach((x, i) => b.rect(x + 1, (i % 2 ? 4 : 5) + y, 2, 3, hair));
}

function hairSide(c: Ctx) {
  const { b, oy, hair, hairD, hairL } = c;
  const y = oy;
  const cap = () => {
    b.round(9, 7 + y, 14, 5, hair, 2);
    b.rect(9, 12 + y, 5, 6, hair);
    b.rect(14, 12 + y, 3, 2, hair);
    b.rect(12, 8 + y, 5, 1, hairL);
  };
  switch (c.a.hairstyle) {
    case "bald":
      return;
    case "buzz":
      b.round(9, 8 + y, 14, 4, hairL, 2);
      b.rect(9, 12 + y, 4, 5, hairL);
      return;
    case "side":
      cap();
      b.rect(17, 12 + y, 6, 2, hair);
      return;
    case "long":
      cap();
      b.rect(8, 12 + y, 6, 17, hair);
      b.rect(8, 27 + y, 6, 2, hairD);
      b.rect(19, 12 + y, 3, 1, hair);
      return;
    case "bob":
      b.round(8, 7 + y, 15, 6, hair, 2);
      b.rect(8, 12 + y, 7, 11, hair);
      b.rect(18, 12 + y, 4, 2, hair);
      return;
    case "pony":
      cap();
      b.rect(5, 11 + y, 4, 11, hair);
      b.rect(8, 11 + y, 1, 3, c.accent);
      b.rect(19, 12 + y, 3, 1, hair);
      return;
    case "bun":
      cap();
      b.round(6, 4 + y, 7, 7, hair, 2);
      b.rect(19, 12 + y, 3, 1, hair);
      return;
    case "curly":
      b.round(6, 3 + y, 19, 11, hair, 3);
      b.rect(6, 12 + y, 8, 7, hair);
      [[9, 6], [14, 4], [19, 6], [8, 12], [12, 15], [22, 9]].forEach(([x, hy]) => b.px(x, hy + y, hairL));
      return;
    case "spiky":
      cap();
      [10, 13, 16, 19].forEach((x, i) => b.rect(x, (i % 2 ? 4 : 5) + y, 2, 3, hair));
      b.rect(19, 12 + y, 4, 2, hair);
      return;
    default:
      cap();
      b.rect(19, 12 + y, 3, 1, hair);
  }
}

// ------------------------------------------------------------------ accessories
type View = "front" | "back" | "side";

function headwear(c: Ctx, view: View) {
  const { b, oy, accent } = c;
  const x = c.a.accessories;
  const d = shade(accent, -0.2);
  const l = shade(accent, 0.25);
  const hx = view === "side" ? 9 : 8;
  const hw = view === "side" ? 14 : 16;
  if (x.hat === "cap") {
    b.round(hx, 5 + oy, hw, 7, accent, 2);
    b.rect(hx + 3, 6 + oy, 4, 1, l);
    if (view === "front") b.rect(9, 11 + oy, 14, 2, d);
    if (view === "side") b.rect(19, 10 + oy, 7, 2, d);
  } else if (x.hat === "beanie") {
    b.round(hx, 4 + oy, hw, 8, accent, 3);
    b.rect(hx, 10 + oy, hw, 3, l);
    b.rect(hx + hw / 2 - 2, 2 + oy, 4, 3, l);
  }
  if (x.headphones) {
    if (view === "side") {
      b.rect(15, 5 + oy, 2, 9, INK);
      b.round(13, 13 + oy, 6, 7, "#3A3F4D", 2);
      b.rect(15, 15 + oy, 2, 3, "#E56A72");
    } else {
      b.round(8, 5 + oy, 16, 3, "#3A3F4D", 1);
      b.round(6, 12 + oy, 3, 7, "#3A3F4D", 1);
      b.round(23, 12 + oy, 3, 7, "#3A3F4D", 1);
      b.px(7, 15 + oy, "#E56A72");
      b.px(24, 15 + oy, "#E56A72");
    }
  }
}

function eyewear(c: Ctx, view: View) {
  const { b, oy } = c;
  const g = c.a.accessories.glasses;
  if (g === "none" || view === "back") return;
  const y = 14 + oy;
  if (view === "side") {
    if (g === "shades") b.rect(18, y, 5, 4, INK);
    else b.frame(18, y, 5, 4, g === "square" ? INK : "#7A5236");
    b.rect(13, y + 1, 5, 1, INK);
    return;
  }
  if (g === "shades") {
    b.rect(10, y, 5, 4, INK);
    b.rect(17, y, 5, 4, INK);
    b.px(11, y + 1, "#6F7890");
    b.px(18, y + 1, "#6F7890");
  } else {
    const col = g === "square" ? INK : "#7A5236";
    b.frame(10, y, 5, 5, col);
    b.frame(17, y, 5, 5, col);
    if (g === "round") [[10, y], [14, y], [10, y + 4], [14, y + 4], [17, y], [21, y], [17, y + 4], [21, y + 4]].forEach(([px, py]) => b.px(px, py, c.skin));
  }
  b.rect(15, y + 1, 2, 1, INK);
}

function bagAndExtras(c: Ctx, view: View) {
  const { b, oy, accent } = c;
  const x = c.a.accessories;
  const d = shade(accent, -0.22);
  const y = 23 + oy;
  if (x.bag === "backpack") {
    if (view === "back") {
      b.round(11, y + 1, 10, 9, accent, 1);
      b.rect(13, y + 5, 6, 3, d);
      b.rect(15, y + 1, 2, 1, d);
    } else if (view === "front") {
      b.rect(11, y, 2, 9, d);
      b.rect(19, y, 2, 9, d);
    } else b.round(8, y + 1, 5, 9, accent, 1);
  } else if (x.bag === "messenger") {
    if (view === "side") b.round(13, y + 6, 7, 6, accent, 1);
    else {
      const flipped = view === "back";
      for (let k = 0; k < 9; k++) b.rect(flipped ? 19 - k : 11 + k, y + k, 2, 1, d);
      b.round(flipped ? 8 : 18, y + 7, 6, 5, accent, 1);
    }
  }
  if (x.extra === "scarf") {
    if (view === "side") b.rect(11, y - 1, 11, 3, accent);
    else b.rect(10, y - 1, 12, 3, accent);
    if (view === "front") b.rect(12, y + 2, 3, 4, d);
    if (view === "back") b.rect(17, y + 2, 3, 4, d);
  } else if (view === "front") {
    if (x.extra === "lanyard") {
      b.rect(13, y, 1, 4, accent);
      b.rect(18, y, 1, 4, accent);
      b.rect(14, y + 4, 4, 3, "#FFFFFF");
      b.rect(15, y + 5, 2, 1, "#8A90A0");
    } else if (x.extra === "tie") {
      b.rect(15, y, 2, 7, accent);
      b.rect(15, y + 6, 2, 1, d);
    } else if (x.extra === "badge") b.rect(18, y + 3, 2, 3, "#F5D76E");
  }
}

// ------------------------------------------------------------------ frame assembly
function drawFront(b: PixelBuffer, a: AvatarAppearance, pose: FrontPose, back: boolean) {
  const c = ctx(b, a, (pose.bob ?? 0) + (pose.sit ? 5 : 0));
  const arms = pose.arms ?? ["down", "down"];
  const armDy = pose.armDy ?? [0, 0];
  const view: View = back ? "back" : "front";
  frontLegs(c, pose);
  frontTorso(c, back);
  if (!back) bagAndExtras(c, view);
  frontArm(c, 0, arms[0], armDy[0]);
  frontArm(c, 1, arms[1], armDy[1]);
  b.round(8, 9 + c.oy, 16, 14, c.skin, 2);
  b.rect(7, 15 + c.oy, 1, 3, c.skinD);
  b.rect(24, 15 + c.oy, 1, 3, c.skinD);
  b.rect(10, 22 + c.oy, 12, 1, c.skinD);
  if (back) {
    hairBack(c);
    if (a.clothing.top === "hoodie") b.round(10, 21 + c.oy, 12, 5, c.topD, 2);
    bagAndExtras(c, view);
  } else {
    faceFront(c, !!pose.blink);
    hairFront(c);
    eyewear(c, view);
  }
  headwear(c, view);
}

function drawSide(b: PixelBuffer, a: AvatarAppearance, pose: SidePose) {
  const c = ctx(b, a, (pose.bob ?? 0) + (pose.sit ? 5 : 0));
  const { oy } = c;
  const y = 23 + oy;
  sideLegs(c, pose);
  b.rect(12, y, 9, 10, c.top);
  b.rect(12, y + 9, 9, 1, c.topD);
  const kind = a.clothing.top;
  if (kind === "hoodie") {
    b.round(10, y - 1, 5, 5, c.topD, 1);
    b.rect(16, y + 6, 5, 3, c.topD);
  } else if (kind === "jacket") b.rect(19, y, 2, 10, "#F6F3EE");
  else if (kind === "sweater") {
    b.rect(12, y + 3, 9, 1, c.topL);
    b.rect(12, y + 6, 9, 1, c.topL);
  } else if (kind === "shirt") b.rect(17, y, 4, 1, c.topL);
  bagAndExtras(c, "side");
  const ax = 14 + (pose.swing ?? 0) * 2;
  sleeve(c, ax, y + 1, 7);
  b.rect(ax, y + 8, 3, 2, c.skin);
  b.round(9, 9 + oy, 14, 14, c.skin, 2);
  b.rect(23, 16 + oy, 1, 2, c.skin);
  b.rect(14, 15 + oy, 2, 3, c.skinD);
  if (a.face === "beard") b.round(15, 18 + oy, 8, 5, c.hairD, 1);
  if (a.face === "moustache") b.rect(19, 19 + oy, 4, 2, c.hairD);
  if (pose.blink || a.face === "sleepy") b.rect(19, 16 + oy, 3, 1, INK);
  else b.rect(19, 15 + oy, 2, a.face === "wide" ? 3 : 2, INK);
  if (a.face === "blush" || a.face === "smile") b.rect(19, 18 + oy, 2, 1, "#F09C9C", 0.75);
  hairSide(c);
  eyewear(c, "side");
  headwear(c, "side");
}

const FRONT_POSES: FrontPose[] = [
  {},
  { bob: 1 },
  { blink: true },
  { bob: 1, lift: [0, 2], armDy: [-1, 1] },
  {},
  { bob: 1, lift: [2, 0], armDy: [1, -1] },
  {},
  { sit: true },
];
const SIDE_POSES: SidePose[] = [
  {},
  { bob: 1 },
  { blink: true },
  { bob: 1, phase: 0, swing: 1 },
  { phase: 1 },
  { bob: 1, phase: 2, swing: -1 },
  { phase: 3 },
  { sit: true },
];
const ACTIONS: { pose: FrontPose; dx?: number; jump?: number }[][] = [
  [
    { pose: { arms: ["down", "waveA"] } },
    { pose: { arms: ["down", "waveB"] } },
    { pose: { arms: ["up", "up"] }, dx: -1 },
    { pose: { arms: ["up", "down"], bob: 1 } },
    { pose: { arms: ["up", "up"] }, dx: 1 },
    { pose: { arms: ["down", "up"], bob: 1 } },
    { pose: { arms: ["clap", "clap"] } },
    { pose: { arms: ["fwd", "fwd"] } },
  ],
  [{ pose: { arms: ["up", "up"] }, jump: 3 }, { pose: { arms: ["up", "up"], bob: 1 } }],
];

export function composeAvatarSheet(a: AvatarAppearance): PixelBuffer {
  const sheet = new PixelBuffer(FRAME_W * SHEET_COLS, FRAME_H * SHEET_ROWS);
  const put = (col: number, row: number, draw: (b: PixelBuffer) => void, o: { dx?: number; jump?: number; flip?: boolean } = {}) => {
    const frame = new PixelBuffer(FRAME_W, FRAME_H);
    draw(frame);
    frame.outline(INK);
    sheet.blit(frame, col * FRAME_W + (o.dx ?? 0), row * FRAME_H - (o.jump ?? 0), o.flip);
  };
  FRONT_POSES.forEach((pose, col) => {
    put(col, 0, (b) => drawFront(b, a, pose, false));
    put(col, 2, (b) => drawFront(b, a, pose, true));
  });
  SIDE_POSES.forEach((pose, col) => {
    put(col, 1, (b) => drawSide(b, a, pose));
    put(col, 3, (b) => drawSide(b, a, pose), { flip: true });
  });
  ACTIONS.forEach((row, r) => row.forEach((f, col) => put(col, 4 + r, (b) => drawFront(b, a, f.pose, false), f)));
  return sheet;
}
