/**
 * Hand-drawn pixel sprites. Each row is a string; each char maps to a colour in PALETTE.
 * "." = transparent, "C" = currentColor (tint from CSS).
 * Rows may be shorter than the widest row — they are padded on the right.
 */
export const PALETTE: Record<string, string> = {
  Y: "#FFC93C", // yolk
  y: "#E39A12", // yolk shadow
  O: "#FF7A1A", // beak / feet
  K: "#141018", // ink
  W: "#FFFFFF",
  E: "#F6EEDC", // egg / paper
  e: "#CFC3A8", // egg shadow
  s: "#C6F432", // lime
  L: "#C6F432",
  g: "#7FB21A", // lime dark
  M: "#3FE0A1", // mint
  m: "#1FA877", // mint dark
  T: "#8A5A2B", // wood
  t: "#B97C3E", // wood light
  B: "#4AA8FF", // sky
  b: "#2B6FD6", // sky dark
  R: "#FF5FA2", // pink
  r: "#C2306F", // pink dark
  P: "#F6EEDC", // paper
  c: "#D9CDB4", // cloud shade
  G: "#8E8799", // grey
  V: "#6B4FD8", // violet
  C: "currentColor",
};

const PIP_TOP = ["......y.y.....", ".....YYYYY....", "....YYYYYYY...", "...YYYYYYYYY.."];
const PIP_BODY = [".yyYYYYYYYYYO.", "yyyyYYYYYYYY..", "yyyyyYYYYYYY..", ".yyyyyYYYYYy..", "..yyyyyyyyy..."];
const PIP_FEET = ["....O...O.....", "...OO..OO....."];

export const SPRITES = {
  // ---------- Pip expressions (all 14×14, same silhouette so frames can swap) ----------
  pip: [...PIP_TOP, "...YYYYYKWYY..", "...YYYYYKKYOO.", "...YYYYYYYYOOO", ...PIP_BODY, ...PIP_FEET],
  pipBlink: [...PIP_TOP, "...YYYYYYYYY..", "...YYYYKKKYOO.", "...YYYYYYYYOOO", ...PIP_BODY, ...PIP_FEET],
  pipTalk: [...PIP_TOP, "...YYYYYKWYY..", "...YYYYYKKYOOO", "...YYYYYYYYK..", ".yyYYYYYYYYOOO", ...PIP_BODY.slice(1), ...PIP_FEET],
  pipHappy: [...PIP_TOP, "...YYYYYYKYY..", "...YYYYYKYKOO.", "...YYYYYYYYOOO", ...PIP_BODY, ...PIP_FEET],
  pipThink: [
    "......y.y.....",
    ".....YYYYY....",
    "....YYYYYYY...",
    "...YYYYYKWYY..",
    "...YYYYYKKYY..",
    "...YYYYYYYYOO.",
    "...YYYYYYYYOOO",
    ...PIP_BODY,
    ...PIP_FEET,
  ],
  pipDizzy: [...PIP_TOP, "...YYYYYKYKY..", "...YYYYYYKYOO.", "...YYYYYKYKOOO", ...PIP_BODY, ...PIP_FEET],
  pipFlyUp: [
    ...PIP_TOP,
    "y..YYYYYKWYY..",
    "yy.YYYYYKKYOO.",
    "yyyYYYYYYYYOOO",
    ".yyYYYYYYYYYO.",
    "...YYYYYYYYY..",
    "...YYYYYYYYY..",
    "....YYYYYYYy..",
    ".....yyyyyy...",
    "......O.O.....",
    "..............",
  ],
  pipFlyDown: [
    ...PIP_TOP,
    "...YYYYYKWYY..",
    "...YYYYYKKYOO.",
    "...YYYYYYYYOOO",
    ".yyYYYYYYYYYO.",
    "yyyyYYYYYYYY..",
    "yyyyyYYYYYYY..",
    "yyyyyyYYYYYy..",
    ".yyyy.yyyyy...",
    "......O.O.....",
    "..............",
  ],

  // ---------- Accessories (14×14 overlays aligned to Pip) ----------
  hatHeadphones: [
    "..............",
    "......KKKK",
    ".....K....K",
    "....K......K",
    "...BBB",
    "...BbB",
    "...BBB",
  ],
  hatGlasses: ["..............", "", "", ".......KKKK", "....KKKK..K", ".......K..K", ".......KKKK"],
  hatScarf: ["..............", "", "", "", "", "", "", "...RRRRRRRR", "...rRRRRRRr", "..RR", "..Rr"],

  // ---------- Props ----------
  pipHead: ["..YYYY...", ".YYYYYY..", "YYYYKWYY.", "YYYYKKYOO", "YYYYYYYO.", ".yYYYYY..", "..yyyy..."],
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
  umbrella: [
    ".....RRRRRR.....",
    "...RRRRRRRRRR...",
    "..RRRWRRRRWRRR..",
    ".RRRWWRRRRWWRRR.",
    "RRRRWWRRRRWWRRRR",
    ".r..r..rr..r..r.",
    ".......K",
    ".......K",
    ".......K",
    ".......K",
    ".......K",
    "......KK",
  ],
  cloud: [".....PPPP.......", "...PPPPPPPP.....", ".PPPPPPPPPPPPP..", "PPPPPPPPPPPPPPPP", ".cccccccccccccc."],
  cloudBig: [
    "..........PPPPP...........",
    "......PPPPPPPPPPP.........",
    "....PPPPPPPPPPPPPPPP..PPP.",
    "..PPPPPPPPPPPPPPPPPPPPPPPP",
    "PPPPPPPPPPPPPPPPPPPPPPPPPP",
    ".cccccccccccccccccccccccc.",
  ],
  spark: ["..Y..", "..Y..", "YYWYY", "..Y..", "..Y.."],
  star: [".W.", "WWW", ".W."],
  bird: ["K...K", ".K.K.", "..K.."],
  heart: [".RR.RR.", "RRRRRRR", "RRRRRRR", ".RRRRR.", "..RRR..", "...r..."],
  note: ["...KK", "...KK", "...K.", "...K.", "KKKK.", "KKK.."],
  plane: ["P.......", "PPP.....", "PPPPP...", "PPPPPPPP", ".ccPPP..", "..cc....", "...c...."],
  chev: ["P....", "PP...", ".PP..", "..PP.", ".PP..", "PP...", "P...."],
  plant: [
    "...M..M...",
    "..MMm.MM..",
    ".MMmMMMmM.",
    "MmMMmMMMMm",
    ".MMMMmMMM.",
    "...MMMM...",
    "..TTTTTT..",
    "..TtTTtT..",
    "...TTTT...",
    "...TTTT...",
  ],
  nest: [".TTtTTtTTtTTtTTtTT.", "TtTTtTTtTTtTTtTTtTT", "TTTtTTTTtTTTTtTTTTT", ".TTTTTTTTTTTTTTTTT."],
  crt: [
    "GGGGGGGGGGGGGG",
    "GKKKKKKKKKKKKG",
    "GKggggKKggKKKG",
    "GKKKggggggKKKG",
    "GKggKKggKKKKKG",
    "GKKKKggggKKKKG",
    "GKKKKKKKKKKKKG",
    "GGGGGGGGGGGGGG",
    ".....GGGG.....",
    "...GGGGGGGG...",
  ],
  book: ["RRRRRRRR", "RPPPRPPR", "RPPPRPPR", "RPPPRPPR", "RRRRRRRR", ".rrrrrr."],
  moon: ["..EEE.", ".EEee.", "EEee..", "EEe...", "EEee..", ".EEee.", "..EEE."],
  fossil: [
    "....GG.....",
    "...GGGG....",
    "..GG.GGG.G.",
    ".G..GGGGGG.",
    "G.G.GG.G..",
    "...G..G...",
  ],
  broom: ["......T", ".....T.", "....T..", "...T...", "..YY...", ".YYYY..", "YYYYY.."],
  speaker: ["...C...", "..CC.C.", "CCCC..C", "CCCC..C", "CCCC..C", "..CC.C.", "...C..."],
  mute: ["...C...", "..CC...", "CCCC.C.C", "CCCC..C.", "CCCC.C.C", "..CC...", "...C..."],
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
  // overlays are always 14×14 so they line up with Pip
  const h = name.startsWith("hat") ? 14 : rows.length;
  const out = { w, h, runs };
  cache.set(name, out);
  return out;
}

/** 5×7 pixel glyphs used for big pixel wordmarks. */
export const GLYPHS: Record<string, string[]> = {
  P: ["1111", "1001", "1001", "1110", "1000", "1000", "1000"],
  I: ["111", "010", "010", "010", "010", "010", "111"],
};
