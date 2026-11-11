import { createRng } from "../lib/random";
import { PixelBuffer, pixelText, shade } from "./pixel-buffer";

/**
 * Original furniture, plant, appliance and outdoor sprites.
 * Each sprite is drawn into its own buffer, outlined, then packed into
 * public/assets/furniture/furniture.png by scripts/build-assets.ts.
 *
 * Runtime layout contract: a sprite is centred horizontally on its footprint
 * and its bottom edge sits SPRITE_PAD_BOTTOM px below the footprint bottom.
 */
export const OUTLINE = "#2B2D3A";
export const SPRITE_PAD_BOTTOM = 2;

type Draw = (b: PixelBuffer) => void;
interface SpriteDef {
  w: number;
  h: number;
  draw: Draw;
  raw?: boolean;
}

const defs: Record<string, SpriteDef> = {};
const def = (name: string, w: number, h: number, draw: Draw, raw = false) => {
  defs[name] = { w, h, draw, raw };
};
const flip = (name: string, from: string) => {
  const src = defs[from];
  def(name, src.w, src.h, (b) => {
    const t = new PixelBuffer(src.w, src.h);
    src.draw(t);
    b.blit(t, 0, 0, true);
  });
};

const WOOD = "#D2AE82";
const WOOD_D = "#B08D62";
const WOOD_DD = "#8E6F4B";
const WHITE = "#F6F3EE";
const WHITE_D = "#D8D2C8";
const METAL = "#4A4F5E";
const DARK = "#2F3340";
const LEAF = "#62B271";
const LEAF_D = "#4C9A5E";
const LEAF_L = "#8CCB86";
const POT = "#DB8E6C";

/** Top-down 3/4 box: lit top surface plus a darker front face. */
function slab(b: PixelBuffer, x: number, y: number, w: number, h: number, frontH: number, top: string, front = shade(top, -0.16)) {
  b.rect(x, y, w, h - frontH, top);
  b.rect(x, y, w, 1, shade(top, 0.35));
  b.rect(x, y + h - frontH, w, frontH, front);
  b.rect(x, y + h - frontH, w, 1, shade(front, -0.12));
}

function monitor(b: PixelBuffer, x: number, y: number, screen = "#8FC3EA") {
  b.round(x, y, 28, 18, DARK, 1);
  b.rect(x + 2, y + 2, 24, 13, screen);
  b.rect(x + 4, y + 4, 9, 2, "#FFFFFF", 0.85);
  b.rect(x + 4, y + 8, 15, 1, shade(screen, -0.3));
  b.rect(x + 4, y + 11, 11, 1, shade(screen, -0.3));
  b.rect(x + 20, y + 4, 4, 9, "#F6D56B", 0.9);
  b.rect(x + 12, y + 18, 4, 3, METAL);
  b.rect(x + 8, y + 21, 12, 2, METAL);
}

function keyboard(b: PixelBuffer, x: number, y: number) {
  b.rect(x, y, 20, 5, "#3A3F4D");
  for (let i = 0; i < 9; i++) b.px(x + 1 + i * 2, y + 1, "#8A90A0");
  for (let i = 0; i < 9; i++) b.px(x + 2 + i * 2, y + 3, "#8A90A0");
  b.round(x + 24, y, 4, 5, "#3A3F4D", 1);
}

function leaves(b: PixelBuffer, cx: number, cy: number, r: number) {
  b.ellipse(cx, cy, r, r * 0.9, LEAF);
  b.ellipse(cx - r * 0.45, cy + r * 0.3, r * 0.55, r * 0.5, LEAF_D);
  b.ellipse(cx + r * 0.4, cy - r * 0.3, r * 0.5, r * 0.45, LEAF_L);
  b.px(Math.round(cx - 1), Math.round(cy - r * 0.5), "#B9E2AE");
  b.px(Math.round(cx + r * 0.5), Math.round(cy + r * 0.2), LEAF_D);
}

function pot(b: PixelBuffer, x: number, y: number, w: number, h: number, color = POT) {
  b.rect(x - 1, y, w + 2, 3, shade(color, 0.12));
  b.rect(x, y + 3, w, h - 3, color);
  b.rect(x + w - 2, y + 3, 2, h - 3, shade(color, -0.15));
  b.rect(x + 1, y + h - 1, w - 2, 1, shade(color, -0.25));
}

function mug(b: PixelBuffer, x: number, y: number, c = "#E89B8C") {
  b.rect(x, y, 4, 4, c);
  b.px(x + 4, y + 1, c);
  b.px(x + 4, y + 2, c);
  b.rect(x + 1, y, 2, 1, "#6B4A3A");
}

function books(b: PixelBuffer, x: number, y: number, w: number, h: number, seed: number) {
  const r = createRng(seed);
  const colors = ["#E89B8C", "#A9A2D5", "#A7C9AB", "#A9C9DE", "#F0CF7A", "#D9796B", "#6F8FBF", "#F6F3EE"];
  let cx = x;
  while (cx < x + w - 2) {
    const bw = 2 + Math.floor(r() * 3);
    const bh = Math.max(6, h - Math.floor(r() * 5));
    if (r() < 0.12) {
      cx += bw;
      continue;
    }
    const c = colors[Math.floor(r() * colors.length)];
    b.rect(cx, y + h - bh, Math.min(bw, x + w - cx), bh, c);
    b.rect(cx, y + h - bh + 2, Math.min(bw, x + w - cx), 1, shade(c, -0.25));
    cx += bw + (r() < 0.2 ? 1 : 0);
  }
}

// ---------------------------------------------------------------- desks
function deskBase(b: PixelBuffer, w = 96) {
  slab(b, 0, 24, w, 30, 7, WHITE, WHITE_D);
  b.rect(3, 54, 4, 4, "#9A948A");
  b.rect(w - 7, 54, 4, 4, "#9A948A");
}
def("desk_a", 96, 58, (b) => {
  deskBase(b);
  monitor(b, 34, 3);
  keyboard(b, 36, 37);
  pot(b, 78, 26, 8, 8);
  leaves(b, 82, 20, 7);
  mug(b, 12, 34);
  b.rect(8, 40, 12, 5, "#FBE9A6");
});
def("desk_b", 96, 58, (b) => {
  deskBase(b);
  monitor(b, 18, 3, "#A8D8B9");
  monitor(b, 50, 3);
  keyboard(b, 36, 37);
  mug(b, 82, 36, "#A9A2D5");
  b.rect(6, 34, 8, 10, "#3A3F4D");
  b.rect(7, 35, 6, 1, "#8A90A0");
});
def("desk_c", 96, 58, (b) => {
  deskBase(b);
  b.round(36, 14, 24, 16, DARK, 1);
  b.rect(38, 16, 20, 12, "#F2B8A8");
  b.rect(40, 18, 8, 2, "#FFFFFF", 0.8);
  b.rect(34, 30, 28, 9, "#C8CCD4");
  for (let i = 0; i < 11; i++) b.px(37 + i * 2, 32, "#8A90A0");
  b.rect(44, 35, 8, 3, "#B0B5BF");
  b.rect(8, 28, 16, 4, "#A9A2D5");
  b.rect(9, 32, 14, 4, "#E89B8C");
  b.rect(8, 36, 16, 4, "#A7C9AB");
  b.rect(80, 12, 2, 20, METAL);
  b.round(74, 8, 14, 7, "#F0CF7A", 2);
  b.rect(77, 32, 8, 2, METAL);
});

// ---------------------------------------------------------------- chairs
function chairs(prefix: string, c: string) {
  const d = shade(c, -0.2);
  const l = shade(c, 0.14);
  const base = (b: PixelBuffer) => {
    b.rect(14, 24, 4, 5, METAL);
    b.rect(7, 29, 18, 2, METAL);
    b.rect(6, 31, 3, 2, DARK);
    b.rect(23, 31, 3, 2, DARK);
    b.rect(14, 31, 4, 2, DARK);
  };
  def(`${prefix}_up`, 32, 34, (b) => {
    base(b);
    b.round(6, 15, 20, 10, d, 2);
    b.round(6, 9, 20, 15, c, 2);
    b.round(9, 12, 14, 8, l, 1);
    b.rect(4, 15, 3, 9, d);
    b.rect(25, 15, 3, 9, d);
  });
  def(`${prefix}_down`, 32, 34, (b) => {
    base(b);
    b.round(6, 2, 20, 13, c, 2);
    b.round(9, 4, 14, 8, l, 1);
    b.round(6, 13, 20, 12, l, 2);
    b.rect(6, 23, 20, 2, d);
    b.rect(4, 12, 3, 10, d);
    b.rect(25, 12, 3, 10, d);
  });
  def(`${prefix}_right`, 32, 34, (b) => {
    base(b);
    b.round(5, 4, 7, 20, c, 2);
    b.rect(6, 6, 2, 16, l);
    b.round(10, 13, 17, 12, l, 2);
    b.rect(10, 23, 17, 2, d);
    b.rect(11, 11, 14, 3, d);
  });
  flip(`${prefix}_left`, `${prefix}_right`);
}
chairs("chair", "#566070");
chairs("mchair", "#E8915A");

def("stool", 22, 22, (b) => {
  b.rect(4, 10, 2, 11, WOOD_DD);
  b.rect(16, 10, 2, 11, WOOD_DD);
  b.rect(5, 15, 12, 1, WOOD_DD);
  b.ellipse(11, 7, 10, 6, WOOD_D);
  b.ellipse(11, 6, 10, 5.5, WOOD);
});

// ---------------------------------------------------------------- tables
function table(name: string, w: number, items: Draw) {
  def(name, w, 76, (b) => {
    b.round(0, 2, w, 62, WOOD, 3);
    b.rect(3, 2, w - 6, 1, shade(WOOD, 0.3));
    b.frame(3, 5, w - 6, 50, shade(WOOD, -0.07));
    b.rect(0, 58, w, 8, WOOD_D);
    b.rect(0, 58, w, 1, WOOD_DD);
    b.rect(6, 66, 6, 9, WOOD_DD);
    b.rect(w - 12, 66, 6, 9, WOOD_DD);
    items(b);
  });
}
const laptop = (b: PixelBuffer, x: number, y: number, c = "#C8CCD4") => {
  b.rect(x, y, 14, 9, c);
  b.rect(x + 1, y + 1, 12, 6, "#8FC3EA");
  b.rect(x - 1, y + 9, 16, 3, shade(c, -0.12));
};
const paper = (b: PixelBuffer, x: number, y: number) => {
  b.rect(x, y, 9, 11, "#FFFFFF");
  for (let i = 0; i < 4; i++) b.rect(x + 2, y + 2 + i * 2, 5, 1, "#B9C0C8");
};
table("table_meet_l", 192, (b) => {
  laptop(b, 28, 12);
  laptop(b, 118, 38, "#3A3F4D");
  paper(b, 60, 36);
  paper(b, 150, 12);
  mug(b, 84, 14);
  mug(b, 104, 44, "#A9C9DE");
  pot(b, 91, 24, 8, 7, "#F6F3EE");
  leaves(b, 95, 20, 6);
});
table("table_meet_s", 128, (b) => {
  laptop(b, 22, 14);
  paper(b, 84, 36);
  mug(b, 60, 26);
  b.rect(90, 14, 12, 3, "#A9A2D5");
  b.rect(91, 17, 10, 3, "#F0CF7A");
});
def("table_round", 64, 50, (b) => {
  b.rect(28, 30, 8, 14, WOOD_DD);
  b.ellipse(32, 46, 13, 3.5, WOOD_DD);
  b.ellipse(32, 20, 31, 17, WOOD_D);
  b.ellipse(32, 18, 31, 16.5, "#EAD9BD");
  b.ellipse(32, 17, 26, 12, "#F0E2CA");
  b.ellipse(24, 16, 6, 3.5, "#F6F3EE");
  b.ellipse(24, 15.5, 4, 2, "#E9765B");
  mug(b, 40, 14, "#A9C9DE");
});
def("coffee_table", 64, 38, (b) => {
  b.round(2, 4, 60, 28, WOOD, 3);
  b.rect(5, 4, 54, 1, shade(WOOD, 0.3));
  b.rect(2, 26, 60, 6, WOOD_D);
  b.rect(6, 32, 4, 5, WOOD_DD);
  b.rect(54, 32, 4, 5, WOOD_DD);
  b.rect(12, 9, 14, 10, "#A9C9DE");
  b.rect(14, 11, 10, 2, "#FFFFFF");
  b.rect(30, 12, 12, 9, "#F6F3EE");
  mug(b, 48, 10);
});
def("reading_table", 64, 46, (b) => {
  slab(b, 0, 6, 64, 32, 7, WOOD, WOOD_D);
  b.rect(4, 38, 5, 7, WOOD_DD);
  b.rect(55, 38, 5, 7, WOOD_DD);
  b.rect(10, 14, 11, 12, "#FFFFFF");
  b.rect(21, 14, 11, 12, "#F2EEE6");
  for (let i = 0; i < 4; i++) {
    b.rect(12, 16 + i * 2, 7, 1, "#B9C0C8");
    b.rect(23, 16 + i * 2, 7, 1, "#B9C0C8");
  }
  b.rect(49, 8, 2, 14, "#B08D3A");
  b.round(42, 2, 16, 7, "#5FA47A", 2);
  b.rect(44, 9, 12, 1, "#F6E7A8");
  b.rect(46, 22, 8, 2, "#B08D3A");
});

// ---------------------------------------------------------------- soft seating
function sofas(prefix: string, c: string) {
  const d = shade(c, -0.14);
  const dd = shade(c, -0.28);
  const l = shade(c, 0.22);
  def(`${prefix}_down`, 96, 50, (b) => {
    b.round(0, 0, 96, 22, c, 3);
    b.rect(4, 2, 88, 1, l);
    b.rect(7, 18, 82, 22, l);
    b.rect(47, 18, 2, 20, d);
    b.rect(7, 38, 82, 8, d);
    b.rect(7, 38, 82, 1, dd);
    b.round(0, 12, 8, 34, c, 2);
    b.round(88, 12, 8, 34, c, 2);
    b.rect(1, 13, 6, 1, l);
    b.rect(89, 13, 6, 1, l);
    b.rect(4, 46, 4, 3, WOOD_DD);
    b.rect(88, 46, 4, 3, WOOD_DD);
    b.round(14, 20, 12, 10, "#A9A2D5", 2);
    b.round(70, 20, 12, 10, "#A7C9AB", 2);
  });
  def(`${prefix}_up`, 96, 46, (b) => {
    b.rect(7, 4, 82, 16, l);
    b.rect(47, 4, 2, 14, d);
    b.round(0, 6, 8, 34, c, 2);
    b.round(88, 6, 8, 34, c, 2);
    b.round(0, 18, 96, 24, c, 3);
    b.rect(4, 20, 88, 1, l);
    b.rect(2, 36, 92, 6, d);
    b.rect(4, 42, 4, 3, WOOD_DD);
    b.rect(88, 42, 4, 3, WOOD_DD);
  });
  def(`${prefix}_right`, 36, 100, (b) => {
    b.round(0, 0, 14, 98, c, 3);
    b.rect(2, 3, 1, 90, l);
    b.rect(11, 8, 23, 80, l);
    b.rect(11, 47, 23, 2, d);
    b.rect(11, 84, 23, 8, d);
    b.round(4, 0, 30, 9, c, 2);
    b.round(4, 86, 30, 12, c, 2);
    b.rect(6, 94, 28, 4, d);
    b.round(14, 14, 10, 12, "#F0CF7A", 2);
  });
  flip(`${prefix}_left`, `${prefix}_right`);
}
sofas("sofa", "#E3D2B4");
sofas("sofa_teal", "#8DBFB6");

function armchair(prefix: string, c: string) {
  const d = shade(c, -0.18);
  const l = shade(c, 0.2);
  def(`${prefix}_down`, 32, 40, (b) => {
    b.round(2, 0, 28, 18, c, 3);
    b.rect(6, 14, 20, 16, l);
    b.rect(6, 28, 20, 7, d);
    b.round(2, 10, 5, 25, c, 2);
    b.round(25, 10, 5, 25, c, 2);
    b.rect(4, 35, 3, 4, WOOD_DD);
    b.rect(25, 35, 3, 4, WOOD_DD);
  });
  def(`${prefix}_right`, 32, 40, (b) => {
    b.round(2, 2, 11, 33, c, 3);
    b.rect(11, 10, 18, 20, l);
    b.rect(11, 28, 18, 7, d);
    b.round(6, 4, 24, 7, c, 2);
    b.round(6, 26, 24, 9, c, 2);
    b.rect(8, 32, 22, 3, d);
    b.rect(5, 35, 3, 4, WOOD_DD);
    b.rect(25, 35, 3, 4, WOOD_DD);
  });
  flip(`${prefix}_left`, `${prefix}_right`);
}
armchair("armchair", "#E8915A");

function beanbag(name: string, c: string) {
  def(name, 30, 26, (b) => {
    b.ellipse(15, 16, 14.5, 10, shade(c, -0.14));
    b.ellipse(15, 14, 14, 9.5, c);
    b.ellipse(15, 11, 9, 5, shade(c, 0.2));
    b.px(8, 17, shade(c, -0.25));
    b.px(21, 18, shade(c, -0.25));
  });
}
beanbag("beanbag_coral", "#E89B8C");
beanbag("beanbag_lavender", "#A9A2D5");

// ---------------------------------------------------------------- plants
def("plant_small", 28, 38, (b) => {
  pot(b, 8, 25, 12, 12);
  leaves(b, 14, 14, 11);
  b.ellipse(7, 20, 4, 3, LEAF_D);
  b.ellipse(21, 19, 4, 3, LEAF);
});
def("plant_tall", 32, 64, (b) => {
  pot(b, 9, 49, 14, 14, "#EDE8E0");
  b.rect(15, 26, 2, 24, "#7A5C3E");
  leaves(b, 16, 30, 9);
  leaves(b, 10, 20, 8);
  leaves(b, 22, 18, 8);
  leaves(b, 16, 10, 9);
});
def("plant_fern", 32, 44, (b) => {
  pot(b, 9, 31, 14, 12, "#8F88C9");
  for (let i = 0; i < 7; i++) {
    const a = -1.3 + i * 0.43;
    for (let k = 3; k < 17; k++) {
      const x = Math.round(16 + Math.sin(a) * k * 0.95);
      const y = Math.round(31 - Math.cos(a) * k - k * 0.25);
      b.rect(x - 1, y, 3, 2, k % 4 < 2 ? LEAF : LEAF_D);
    }
  }
  b.ellipse(16, 27, 6, 4, LEAF_L);
});
def("planter", 64, 66, (b) => {
  const r = createRng(77);
  for (let x = 6; x < 58; x += 4) {
    const h = 26 + Math.floor(r() * 16);
    b.rect(x, 46 - h, 2, h, x % 8 === 6 ? "#7FBF78" : "#5FA862");
    for (let y = 46 - h + 4; y < 44; y += 7) {
      b.rect(x - 2, y, 2, 1, LEAF_L);
      b.rect(x + 2, y + 3, 3, 1, LEAF);
    }
  }
  slab(b, 2, 44, 60, 20, 14, "#6C7888", "#566070");
  b.rect(4, 46, 56, 3, "#5C4636");
});

// ---------------------------------------------------------------- storage
def("bookshelf", 64, 76, (b) => {
  b.rect(0, 0, 64, 74, WOOD_D);
  b.rect(0, 0, 64, 2, shade(WOOD, 0.1));
  for (let i = 0; i < 3; i++) {
    b.rect(3, 4 + i * 23, 58, 20, "#6B5138");
    books(b, 4, 5 + i * 23, 56, 19, 31 + i * 17);
    b.rect(3, 24 + i * 23, 58, 2, WOOD);
  }
  b.rect(0, 72, 64, 3, WOOD_DD);
});
def("bookshelf_low", 64, 44, (b) => {
  b.rect(0, 12, 64, 30, WOOD_D);
  b.rect(0, 12, 64, 3, WOOD);
  b.rect(3, 17, 58, 20, "#6B5138");
  books(b, 4, 18, 56, 19, 97);
  b.rect(0, 40, 64, 3, WOOD_DD);
  pot(b, 8, 5, 8, 7, "#F6F3EE");
  leaves(b, 12, 3, 5);
  b.rect(40, 2, 12, 10, "#F6F3EE");
  b.rect(42, 4, 8, 6, "#F2B8A8");
});
def("printer", 30, 40, (b) => {
  b.rect(1, 16, 28, 22, "#C8CCD4");
  b.rect(1, 16, 28, 2, "#E1E4E9");
  b.rect(4, 22, 22, 6, "#AEB3BD");
  b.rect(14, 24, 3, 2, "#8A90A0");
  b.round(0, 4, 30, 13, "#EEF0F3", 2);
  b.rect(4, 2, 22, 4, "#FFFFFF");
  b.rect(20, 9, 6, 3, "#3A3F4D");
  b.px(22, 10, "#21C879");
});
def("trash", 14, 18, (b) => {
  b.rect(1, 3, 12, 14, "#7C8696");
  b.rect(0, 1, 14, 3, "#98A2B0");
  b.rect(3, 6, 1, 9, "#5F6978");
  b.rect(6, 6, 1, 9, "#5F6978");
  b.rect(9, 6, 1, 9, "#5F6978");
});

// ---------------------------------------------------------------- wall mounted
function whiteboard(b: PixelBuffer) {
  b.round(0, 0, 96, 40, "#C9CFD6", 1);
  b.rect(2, 2, 92, 34, "#FCFDFE");
  b.rect(8, 7, 26, 1, "#5B8FC7");
  b.rect(8, 11, 18, 1, "#5B8FC7");
  b.rect(8, 15, 22, 1, "#5B8FC7");
  b.frame(42, 6, 16, 10, "#E56A72");
  b.frame(42, 20, 16, 10, "#21A869");
  b.rect(49, 16, 1, 4, "#3A3F4D");
  b.rect(58, 11, 8, 1, "#3A3F4D");
  b.rect(68, 6, 8, 8, "#F8DE7E");
  b.rect(78, 8, 8, 8, "#F2A7B8");
  b.rect(70, 18, 8, 8, "#A8D8B9");
  b.rect(8, 22, 20, 8, "#A9C9DE", 0.6);
  b.rect(22, 37, 52, 3, "#AEB5BE");
  b.rect(28, 36, 6, 2, "#E56A72");
  b.rect(38, 36, 6, 2, "#5B8FC7");
  b.rect(48, 36, 6, 2, "#3A3F4D");
}
def("whiteboard", 96, 40, whiteboard);
def("whiteboard_stand", 96, 66, (b) => {
  whiteboard(b);
  b.rect(8, 40, 3, 22, METAL);
  b.rect(85, 40, 3, 22, METAL);
  b.rect(2, 62, 16, 2, METAL);
  b.rect(78, 62, 16, 2, METAL);
  b.rect(3, 64, 3, 2, DARK);
  b.rect(89, 64, 3, 2, DARK);
});
def("tv_wall", 64, 38, (b) => {
  b.round(0, 0, 64, 38, DARK, 1);
  b.rect(2, 2, 60, 32, "#26334A");
  [14, 20, 11, 24, 17].forEach((h, i) => b.rect(8 + i * 7, 30 - h, 5, h, ["#A9A2D5", "#E89B8C", "#A7C9AB", "#A9C9DE", "#F0CF7A"][i]));
  b.rect(46, 8, 12, 2, "#FFFFFF", 0.8);
  b.rect(46, 13, 9, 1, "#8FA3C4");
  b.rect(46, 17, 11, 1, "#8FA3C4");
  b.px(60, 35, "#21C879");
});
def("room_panel", 14, 18, (b) => {
  b.round(0, 0, 14, 18, DARK, 1);
  b.rect(2, 2, 10, 11, "#3DCB8B");
  b.rect(4, 4, 6, 1, "#FFFFFF");
  b.rect(4, 7, 4, 1, "#D9F5E7");
  b.rect(5, 15, 4, 1, "#8A90A0");
});
def("frame_a", 26, 22, (b) => {
  b.rect(0, 0, 26, 22, "#3A3F4D");
  b.rect(2, 2, 22, 18, "#F6F3EE");
  b.ellipse(10, 12, 6, 6, "#F0A04B");
  b.rect(12, 6, 8, 8, "#566070");
});
def("frame_b", 26, 22, (b) => {
  b.rect(0, 0, 26, 22, WOOD_D);
  b.rect(2, 2, 22, 18, "#BFE2EF");
  b.rect(2, 13, 22, 7, "#A7C9AB");
  b.ellipse(9, 14, 6, 4, "#7FB98A");
  b.ellipse(18, 6, 2.5, 2.5, "#F8DE7E");
});
def("frame_c", 36, 22, (b) => {
  b.rect(0, 0, 36, 22, "#F6F3EE");
  b.rect(2, 2, 32, 18, "#A9A2D5");
  b.rect(6, 6, 10, 10, "#E89B8C");
  b.ellipse(24, 11, 5, 5, "#F6F3EE");
});
def("clock", 14, 14, (b) => {
  b.ellipse(7, 7, 7, 7, DARK);
  b.ellipse(7, 7, 5.5, 5.5, "#FFFFFF");
  b.rect(7, 3, 1, 4, DARK);
  b.rect(7, 7, 3, 1, "#E56A72");
});
def("sign_welcome", 112, 30, (b) => {
  b.round(0, 0, 112, 30, "#F6F3EE", 2);
  b.frame(2, 2, 108, 26, "#D8D2C8");
  // Placeholder mark. The decided logo is a door with lamp light; this arch stays until that drawing exists.
  b.round(8, 6, 18, 18, "#6C63C7", 3);
  b.round(12, 11, 10, 13, "#F6F3EE", 3);
  b.rect(14, 16, 6, 8, "#E89B8C");
  pixelText(b, 32, 7, "WELCOME", "#282A30", 2);
  pixelText(b, 52, 20, "AJAR", "#777B83", 1);
});
def("sign_quiet", 54, 16, (b) => {
  b.round(0, 0, 54, 16, "#5E6B8F", 2);
  b.ellipse(8, 8, 4, 4, "#F6F3EE");
  b.rect(6, 7, 5, 2, "#5E6B8F");
  pixelText(b, 16, 4, "QUIET", "#F6F3EE", 2);
});
def("elevator", 64, 50, (b) => {
  b.rect(0, 0, 64, 50, "#8E97A3");
  b.rect(2, 0, 60, 8, "#3A3F4D");
  b.rect(27, 2, 2, 4, "#21C879");
  b.rect(26, 3, 4, 1, "#21C879");
  b.rect(34, 2, 6, 4, "#F8DE7E");
  b.rect(5, 10, 26, 40, "#CBD2D9");
  b.rect(33, 10, 26, 40, "#BCC4CC");
  b.rect(7, 12, 3, 36, "#E3E8EC");
  b.rect(35, 12, 3, 36, "#D3DAE0");
  b.rect(31, 10, 2, 40, "#6E7784");
});
def("elevator_buttons", 8, 14, (b) => {
  b.rect(0, 0, 8, 14, "#D8DDE3");
  b.rect(3, 3, 2, 2, "#21C879");
  b.rect(3, 8, 2, 2, "#8A90A0");
});

// ---------------------------------------------------------------- kitchen
const CAB = "#9DBFA6";
function counter(b: PixelBuffer, y = 0) {
  slab(b, 0, y + 0, 32, 18, 3, "#F1ECE3", "#D8D2C8");
  b.rect(0, y + 18, 32, 26, CAB);
  b.frame(2, y + 20, 13, 21, shade(CAB, -0.14));
  b.frame(17, y + 20, 13, 21, shade(CAB, -0.14));
  b.rect(12, y + 28, 1, 5, "#F6F3EE");
  b.rect(19, y + 28, 1, 5, "#F6F3EE");
  b.rect(0, y + 42, 32, 2, shade(CAB, -0.3));
}
def("counter", 32, 44, (b) => {
  counter(b);
  b.rect(8, 4, 14, 8, "#E9D9B8");
  b.ellipse(13, 7, 2.5, 2, "#E9765B");
  b.ellipse(18, 8, 2.5, 2, "#F0CF7A");
});
def("counter_sink", 32, 44, (b) => {
  counter(b);
  b.round(5, 4, 22, 10, "#B9C0C8", 2);
  b.round(7, 6, 18, 6, "#8E97A3", 1);
  b.rect(15, 0, 2, 6, "#D3D9DF");
  b.rect(15, 0, 6, 2, "#D3D9DF");
});
def("counter_coffee", 32, 58, (b) => {
  counter(b, 14);
  b.round(6, 0, 20, 26, "#3A3F4D", 2);
  b.rect(8, 2, 16, 6, "#566070");
  b.px(21, 4, "#E56A72");
  b.px(18, 4, "#21C879");
  b.rect(10, 10, 12, 10, "#22252E");
  b.rect(14, 10, 4, 3, "#8A90A0");
  b.rect(13, 15, 6, 5, "#F6F3EE");
  b.rect(13, 15, 6, 1, "#6B4A3A");
  b.rect(8, 22, 16, 2, "#566070");
});
def("counter_micro", 32, 56, (b) => {
  counter(b, 12);
  b.round(3, 0, 26, 18, "#D8DDE3", 1);
  b.rect(5, 2, 16, 13, "#2F3340");
  b.rect(7, 4, 12, 9, "#4B5263");
  b.rect(23, 3, 4, 3, "#21C879");
  b.rect(23, 8, 4, 2, "#8A90A0");
  b.rect(23, 12, 4, 2, "#8A90A0");
});
def("fridge", 32, 70, (b) => {
  b.round(1, 0, 30, 68, "#E6EBEF", 2);
  b.rect(27, 2, 3, 64, "#CCD4DB");
  b.rect(1, 24, 30, 2, "#B9C2CB");
  b.rect(5, 8, 2, 12, "#8E97A3");
  b.rect(5, 30, 2, 18, "#8E97A3");
  b.rect(12, 6, 8, 6, "#F8DE7E");
  b.rect(16, 32, 7, 7, "#F2A7B8");
  b.rect(3, 68, 4, 2, DARK);
  b.rect(25, 68, 4, 2, DARK);
});
def("water_dispenser", 24, 60, (b) => {
  b.round(5, 0, 14, 22, "#A9D6F0", 3);
  b.rect(7, 3, 3, 14, "#D6EEFA");
  b.rect(8, 18, 8, 4, "#7FBDE2");
  b.round(2, 22, 20, 36, "#F1F3F5", 2);
  b.rect(18, 24, 3, 32, "#D8DDE3");
  b.rect(6, 28, 12, 8, "#C8CCD4");
  b.rect(8, 33, 3, 3, "#5B8FC7");
  b.rect(13, 33, 3, 3, "#E56A72");
  b.rect(6, 40, 12, 2, "#B9C0C8");
});

// ---------------------------------------------------------------- reception & booths
def("reception_desk", 160, 58, (b) => {
  slab(b, 0, 10, 160, 20, 3, WHITE, WHITE_D);
  b.rect(0, 30, 160, 26, "#8F88C9");
  b.rect(0, 30, 160, 1, "#6C63C7");
  for (let x = 12; x < 160; x += 24) b.rect(x, 32, 1, 22, "#7D75BD");
  b.round(62, 35, 36, 16, "#F6F3EE", 2);
  b.round(67, 38, 10, 10, "#6C63C7", 2);
  b.round(70, 41, 4, 7, "#F6F3EE", 1);
  pixelText(b, 80, 41, "HQ", "#282A30", 1);
  b.rect(0, 54, 160, 3, "#6C63C7");
  monitor(b, 16, -6 + 6);
  b.ellipse(120, 18, 4, 3, "#E0B24A");
  b.rect(119, 14, 2, 2, "#B08D3A");
  pot(b, 138, 12, 8, 8, "#F6F3EE");
  leaves(b, 142, 8, 6);
});
def("booth", 96, 72, (b) => {
  const felt = "#8296BD";
  b.round(0, 0, 96, 44, felt, 2);
  for (let y = 5; y < 40; y += 6) for (let x = 12 + ((y / 6) % 2) * 3; x < 86; x += 6) b.px(x, y, shade(felt, 0.2));
  b.rect(0, 0, 9, 68, shade(felt, -0.16));
  b.rect(87, 0, 9, 68, shade(felt, -0.16));
  b.rect(1, 1, 1, 64, shade(felt, 0.15));
  slab(b, 9, 40, 78, 26, 6, WHITE, WHITE_D);
  laptop(b, 40, 42);
  b.rect(70, 30, 2, 14, METAL);
  b.round(64, 26, 14, 6, "#F0CF7A", 2);
  mug(b, 20, 48, "#A9A2D5");
  b.rect(1, 68, 6, 3, DARK);
  b.rect(89, 68, 6, 3, DARK);
});
def("floor_lamp", 20, 62, (b) => {
  b.rect(9, 16, 2, 40, METAL);
  b.ellipse(10, 58, 7, 3, METAL);
  b.round(2, 0, 16, 16, "#F6E7B8", 3);
  b.rect(4, 13, 12, 3, "#F0D68C");
  b.rect(5, 2, 2, 8, "#FFF7DA");
});

// ---------------------------------------------------------------- structures
def("stairs", 96, 64, (b) => {
  b.rect(0, 0, 96, 64, "#CFC6B8");
  for (let i = 0; i < 8; i++) {
    b.rect(5, i * 8, 86, 6, i % 2 ? "#E4DCD0" : "#DAD1C3");
    b.rect(5, i * 8 + 6, 86, 2, "#B9AF9F");
  }
  b.rect(0, 0, 5, 64, "#566070");
  b.rect(91, 0, 5, 64, "#566070");
  b.rect(1, 0, 1, 64, "#7C8696");
  b.rect(92, 0, 1, 64, "#7C8696");
});
def("gong", 38, 60, (b) => {
  b.rect(3, 6, 4, 50, "#9B4A3C");
  b.rect(31, 6, 4, 50, "#9B4A3C");
  b.round(0, 2, 38, 6, "#B5483F", 2);
  b.rect(0, 54, 10, 4, "#7A382E");
  b.rect(28, 54, 10, 4, "#7A382E");
  b.rect(12, 8, 1, 6, "#C9B38A");
  b.rect(25, 8, 1, 6, "#C9B38A");
  b.ellipse(19, 30, 12, 13, "#C99632");
  b.ellipse(19, 29.5, 11, 12, "#E3B84F");
  b.ellipse(19, 30, 7, 7.5, "#D3A43C");
  b.ellipse(19, 30, 3, 3, "#F4D989");
  b.rect(10, 22, 2, 6, "#F4D989", 0.7);
});

// ---------------------------------------------------------------- garden
def("tree_round", 64, 96, (b) => {
  b.rect(27, 62, 10, 30, "#8B6B4A");
  b.rect(33, 62, 4, 30, "#74583C");
  b.rect(24, 90, 16, 3, "#74583C");
  b.ellipse(32, 36, 31, 31, "#5FAE68");
  b.ellipse(32, 33, 29, 28, "#6FBB73");
  b.ellipse(20, 44, 15, 13, "#57A262");
  b.ellipse(44, 26, 15, 13, "#8ACB86");
  b.ellipse(24, 20, 10, 8, "#8ACB86");
  b.ellipse(42, 48, 10, 8, "#57A262");
  const r = createRng(5);
  for (let i = 0; i < 26; i++) b.rect(8 + Math.floor(r() * 46), 8 + Math.floor(r() * 50), 2, 1, r() > 0.5 ? "#A5DB9C" : "#4C9459");
});
def("tree_birch", 64, 100, (b) => {
  b.rect(28, 54, 9, 42, "#EFECE4");
  b.rect(34, 54, 3, 42, "#D6D1C6");
  [60, 70, 78, 88].forEach((y, i) => b.rect(28 + (i % 2) * 4, y, 4, 2, "#5B5F6A"));
  b.rect(25, 94, 15, 3, "#D6D1C6");
  b.ellipse(32, 30, 26, 30, "#86C88A");
  b.ellipse(32, 27, 24, 27, "#97D596");
  b.ellipse(22, 40, 13, 12, "#77BC80");
  b.ellipse(42, 20, 12, 12, "#B2E4AA");
  b.ellipse(40, 46, 10, 8, "#77BC80");
  const r = createRng(8);
  for (let i = 0; i < 24; i++) b.rect(10 + Math.floor(r() * 42), 4 + Math.floor(r() * 50), 2, 1, r() > 0.5 ? "#C6EEBB" : "#69AE75");
});
def("tree_pine", 56, 96, (b) => {
  b.rect(24, 74, 8, 20, "#7A5C3E");
  for (let t = 0; t < 4; t++) {
    const top = 2 + t * 17;
    for (let y = 0; y < 26; y++) {
      const half = Math.round(4 + y * (0.62 + t * 0.12));
      b.rect(28 - half, top + y, half * 2, 1, y > 21 ? "#3F8A5A" : t % 2 ? "#4F9E66" : "#58AA6E");
    }
  }
  b.rect(27, 4, 2, 60, "#6FBE80", 0.5);
});
def("bush", 32, 26, (b) => {
  b.ellipse(16, 15, 15.5, 10.5, LEAF_D);
  b.ellipse(16, 13, 15, 10, LEAF);
  b.ellipse(10, 10, 7, 5, LEAF_L);
  b.ellipse(22, 16, 6, 4, LEAF_D);
});
def("bush_flower", 32, 26, (b) => {
  b.ellipse(16, 15, 15.5, 10.5, LEAF_D);
  b.ellipse(16, 13, 15, 10, LEAF);
  [[8, 9], [15, 6], [22, 11], [12, 16], [20, 18], [26, 14]].forEach(([x, y]) => {
    b.rect(x, y, 2, 2, "#F2A7B8");
    b.px(x, y, "#FFFFFF");
  });
});
def("rock", 28, 18, (b) => {
  b.ellipse(14, 10, 13.5, 8, "#A9ADB5");
  b.ellipse(13, 8, 11, 6, "#C3C6CC");
  b.ellipse(10, 6, 5, 2.5, "#DEE0E4");
});
def("bench_down", 64, 36, (b) => {
  b.rect(4, 12, 4, 22, "#566070");
  b.rect(56, 12, 4, 22, "#566070");
  for (let i = 0; i < 2; i++) b.rect(1, 1 + i * 6, 62, 5, i ? WOOD : shade(WOOD, 0.1));
  for (let i = 0; i < 2; i++) b.rect(1, 14 + i * 6, 62, 5, i ? WOOD_D : WOOD);
  b.rect(1, 25, 62, 2, WOOD_DD);
});
def("pond", 128, 96, (b) => {
  b.ellipse(64, 48, 63, 46, "#D9CEB4");
  b.ellipse(64, 48, 57, 40, "#8FC9E0");
  b.ellipse(62, 45, 50, 33, "#A3D6EA");
  b.ellipse(52, 40, 26, 14, "#B9E3F1");
  [[34, 56], [88, 36], [96, 60]].forEach(([x, y]) => {
    b.ellipse(x, y, 7, 4.5, "#62B271");
    b.px(x + 2, y - 1, "#F2A7B8");
    b.px(x + 3, y - 1, "#F2A7B8");
  });
  b.rect(60, 62, 10, 1, "#FFFFFF", 0.7);
  b.rect(44, 30, 8, 1, "#FFFFFF", 0.7);
  b.ellipse(72, 50, 4, 2, "#F0A04B");
  b.px(76, 50, "#F0A04B");
});
def("lamp_post", 16, 72, (b) => {
  b.rect(7, 16, 2, 52, "#3A3F4D");
  b.rect(4, 68, 8, 3, "#3A3F4D");
  b.round(2, 2, 12, 14, "#F8E8A8", 3);
  b.rect(1, 0, 14, 3, "#3A3F4D");
  b.rect(5, 5, 2, 6, "#FFFBE6");
});
def("flower_bed", 64, 26, (b) => {
  b.round(0, 6, 64, 20, "#8B6B4A", 3);
  b.round(2, 8, 60, 14, "#6F553B", 2);
  const colors = ["#F2A7B8", "#F8DE7E", "#C7B5F0", "#FFFFFF", "#E9765B"];
  for (let i = 0; i < 9; i++) {
    const x = 6 + i * 6;
    const y = 8 + (i % 3) * 3;
    b.rect(x + 1, y + 2, 1, 5, "#5FA862");
    b.rect(x, y, 3, 3, colors[i % colors.length]);
    b.px(x + 1, y + 1, "#FFF3B0");
  }
});

// ---------------------------------------------------------------- desk decorations
def("decor_plant", 10, 13, (b) => {
  pot(b, 2, 7, 6, 6, "#F6F3EE");
  leaves(b, 5, 4, 4);
});
def("decor_cactus", 10, 13, (b) => {
  pot(b, 2, 8, 6, 5);
  b.round(3, 1, 4, 8, "#5FA862", 1);
  b.rect(1, 4, 2, 2, "#5FA862");
  b.rect(7, 3, 2, 2, "#5FA862");
});
def("decor_mug", 8, 8, (b) => {
  b.rect(1, 2, 5, 6, "#A9C9DE");
  b.rect(6, 3, 2, 3, "#A9C9DE");
  b.rect(2, 2, 3, 1, "#6B4A3A");
  b.px(3, 0, "#FFFFFF", 0.7);
});
def("decor_photo", 10, 11, (b) => {
  b.rect(0, 0, 10, 10, WOOD_D);
  b.rect(1, 1, 8, 8, "#BFE2EF");
  b.ellipse(5, 5, 2, 2, "#F3C9A5");
  b.rect(3, 7, 4, 2, "#E89B8C");
});
def("decor_lamp", 10, 14, (b) => {
  b.rect(4, 6, 2, 6, METAL);
  b.rect(2, 12, 6, 2, METAL);
  b.round(0, 0, 10, 6, "#F0CF7A", 2);
});
def("decor_books", 12, 9, (b) => {
  b.rect(0, 6, 12, 3, "#A9A2D5");
  b.rect(1, 3, 10, 3, "#E89B8C");
  b.rect(0, 0, 11, 3, "#A7C9AB");
});
def("decor_duck", 10, 9, (b) => {
  b.ellipse(5, 6, 4.5, 3, "#F8DE7E");
  b.ellipse(7, 3, 2.5, 2.5, "#F8DE7E");
  b.px(9, 3, "#F0A04B");
  b.px(7, 2, DARK);
});
def("decor_trophy", 10, 13, (b) => {
  b.rect(2, 0, 6, 6, "#E3B84F");
  b.px(1, 1, "#E3B84F");
  b.px(8, 1, "#E3B84F");
  b.rect(4, 6, 2, 3, "#C99632");
  b.rect(2, 9, 6, 3, "#566070");
});

// ---------------------------------------------------------------- effects (no outline)
def("char_shadow", 22, 8, (b) => {
  b.ellipse(11, 4, 10, 3.2, "#1E2030", 0.2);
  b.ellipse(11, 4, 7, 2.2, "#1E2030", 0.16);
}, true);
def("marker", 12, 10, (b) => {
  for (let y = 0; y < 6; y++) b.rect(1 + y, 2 + y, 10 - y * 2, 1, "#FFFFFF");
  for (let y = 0; y < 4; y++) b.rect(3 + y, 3 + y, 6 - y * 2, 1, "#6C63C7");
  b.outline(OUTLINE);
}, true);
def("particle", 4, 4, (b) => b.rect(0, 0, 4, 4, "#FFFFFF"), true);
def("steam", 6, 6, (b) => b.ellipse(3, 3, 3, 3, "#FFFFFF", 0.75), true);
def("ring", 40, 18, (b) => {
  b.ellipse(20, 9, 19.5, 8.5, "#FFFFFF", 0.9);
  for (let y = 0; y < 18; y++)
    for (let x = 0; x < 40; x++) {
      const dx = (x + 0.5 - 20) / 17;
      const dy = (y + 0.5 - 9) / 6.5;
      if (dx * dx + dy * dy <= 1) b.clear(x, y, 1, 1);
    }
  b.ellipse(20, 9, 17, 6.5, "#FFFFFF", 0.22);
}, true);

export const SPRITE_NAMES = Object.keys(defs);

/** Renders one sprite with its outline and a soft ground shadow. */
export function buildSprite(name: string): PixelBuffer {
  const d = defs[name];
  if (!d) throw new Error(`Unknown sprite: ${name}`);
  if (d.raw) {
    const b = new PixelBuffer(d.w, d.h);
    d.draw(b);
    return b;
  }
  const inner = new PixelBuffer(d.w, d.h);
  d.draw(inner);
  const out = new PixelBuffer(d.w + 2, d.h + 1 + SPRITE_PAD_BOTTOM);
  out.blit(inner, 1, 1);
  out.outline(OUTLINE);
  out.under(2, d.h + 2, d.w - 2, 1, "#1E2030", 0.18);
  return out;
}
