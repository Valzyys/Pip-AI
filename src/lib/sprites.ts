/**
 * Hand-drawn pixel sprites. Each row is a string; each char maps to a colour in PALETTE.
 * "." = transparent, "C" = currentColor (so a sprite can be tinted from CSS).
 */
export const PALETTE: Record<string, string> = {
  Y: "#FFC93C", // yolk
  y: "#E39A12", // yolk shadow
  O: "#FF7A1A", // beak / feet
  K: "#111210", // ink
  W: "#FFFFFF",
  E: "#F3EEE3", // egg / paper
  e: "#CFC6B2", // egg shadow
  s: "#C6F432", // lime
  L: "#C6F432",
  g: "#7FB21A", // lime dark
  M: "#3FE0A1", // mint
  m: "#1FA877", // mint dark
  T: "#8A5A2B", // trunk
  B: "#4AA8FF", // sky
  b: "#2B6FD6", // sky dark
  R: "#FF5FA2", // pink
  P: "#F3EEE3", // paper
  c: "#D9D2C2", // cloud shade
  H: "#FF5FA2", // heart
  h: "#C2306F",
  C: "currentColor",
};

export const SPRITES = {
  pip: [
    "......y.y.....",
    ".....YYYYY....",
    "....YYYYYYY...",
    "...YYYYYYYYY..",
    "...YYYYYKWYY..",
    "...YYYYYKKYOO.",
    "...YYYYYYYYOOO",
    ".yyYYYYYYYYYO.",
    "yyyyYYYYYYYY..",
    "yyyyyYYYYYYY..",
    ".yyyyyYYYYYy..",
    "..yyyyyyyyy...",
    "....O...O.....",
    "...OO..OO.....",
  ],
  pipBlink: [
    "......y.y.....",
    ".....YYYYY....",
    "....YYYYYYY...",
    "...YYYYYYYYY..",
    "...YYYYYYYYY..",
    "...YYYYKKKYOO.",
    "...YYYYYYYYOOO",
    ".yyYYYYYYYYYO.",
    "yyyyYYYYYYYY..",
    "yyyyyYYYYYYY..",
    ".yyyyyYYYYYy..",
    "..yyyyyyyyy...",
    "....O...O.....",
    "...OO..OO.....",
  ],
  pipCool: [
    "......y.y.....",
    ".....YYYYY....",
    "....YYYYYYY...",
    "...YYYYYYYYY..",
    "..KKKKKKKKKKK.",
    "...YKKKKYKKKOO",
    "...YYKKYYKKOOO",
    ".yyYYYYYYYYYO.",
    "yyyyYYYYYYYY..",
    "yyyyyYYYYYYY..",
    ".yyyyyYYYYYy..",
    "..yyyyyyyyy...",
    "....O...O.....",
    "...OO..OO.....",
  ],
  pipHead: [
    "..YYYY...",
    ".YYYYYY..",
    "YYYYKWYY.",
    "YYYYKKYOO",
    "YYYYYYYO.",
    ".yYYYYY..",
    "..yyyy...",
  ],
  egg: [
    "...EEEE...",
    "..EEEEEE..",
    ".EEEsEEEE.",
    ".EEEEEEsE.",
    "EEsEEEEEEE",
    "EEEEEEEEEE",
    "EEEEEsEEEE",
    "EEEEEEEEee",
    "eEEsEEEEee",
    ".eEEEEEee.",
    "..eeeeee..",
    "...eeee...",
  ],
  cloud: [
    ".....PPPP.......",
    "...PPPPPPPP.....",
    ".PPPPPPPPPPPPP..",
    "PPPPPPPPPPPPPPPP",
    ".cccccccccccccc.",
  ],
  spark: ["..Y..", "..Y..", "YYWYY", "..Y..", "..Y.."],
  seed: ["..g..", ".LLL.", "LLLLL", ".LLL.", "..L.."],
  heart: [".HH.HH.", "HHHHHHH", "HHHHHHH", ".HHHHH.", "..HHH..", "...h..."],
  chev: ["P....", "PP...", ".PP..", "..PP.", ".PP..", "PP...", "P...."],
  tower: [
    "....R.....",
    "....RR....",
    "....B.....",
    "...BBB....",
    "...BWB....",
    "..BBBBB...",
    "..BWBWB...",
    "..BBBBB...",
    ".bBBBBBb..",
    ".bWBWBWb..",
    ".bBBBBBb..",
    "bbBBBBBbb.",
    "bWBWBWBWb.",
    "bBBBBBBBb.",
    "bBBWWWBBb.",
    "bBBWWWBBb.",
  ],
  tree: [
    "....M....",
    "...MMM...",
    "..MMmMM..",
    "..MMMMM..",
    ".MMmMMMM.",
    ".MMMMMmM.",
    "MMMMMMMMM",
    "MmMMMMMMM",
    ".MMMMMMM.",
    "....T....",
    "....T....",
    "...TTT...",
  ],
  bulb: [
    "..CCCCC..",
    ".CCCCCCC.",
    "CCCPCCCCC",
    "CCPCCCCCC",
    "CCCCCCCCC",
    ".CCCCCCC.",
    "..CCCCC..",
    "...PPP...",
    "...PPP...",
  ],
  code: [
    "..C...P.C..",
    ".C....P..C.",
    "C....P....C",
    ".C..P....C.",
    "..C.P...C..",
  ],
  eye: [
    "...CCCCC...",
    ".CC.....CC.",
    "C...PPP...C",
    "C..PPKPP..C",
    "C...PPP...C",
    ".CC.....CC.",
    "...CCCCC...",
  ],
  bolt: [
    "...CCC.",
    "..CCC..",
    ".CCC...",
    "CCCCCC.",
    "..CCC..",
    ".CCC...",
    ".CC....",
    "CC.....",
    "C......",
  ],
} as const;

export type SpriteName = keyof typeof SPRITES;

export interface Run {
  x: number;
  y: number;
  w: number;
  fill: string;
}

const cache = new Map<SpriteName, { w: number; h: number; runs: Run[] }>();

/** Merge horizontal pixel runs of the same colour into single rects (fewer DOM nodes). */
export function compile(name: SpriteName) {
  const hit = cache.get(name);
  if (hit) return hit;
  const rows = SPRITES[name] as readonly string[];
  const runs: Run[] = [];
  let w = 0;
  rows.forEach((row, y) => {
    w = Math.max(w, row.length);
    let x = 0;
    while (x < row.length) {
      const ch = row[x];
      if (ch === ".") {
        x++;
        continue;
      }
      let len = 1;
      while (row[x + len] === ch) len++;
      runs.push({ x, y, w: len, fill: PALETTE[ch] ?? "#f0f" });
      x += len;
    }
  });
  const out = { w, h: rows.length, runs };
  cache.set(name, out);
  return out;
}

/** 5×7 pixel glyphs for the footer wordmark. */
export const GLYPHS: Record<string, string[]> = {
  P: ["1111", "1001", "1001", "1110", "1000", "1000", "1000"],
  I: ["111", "010", "010", "010", "010", "010", "111"],
};
