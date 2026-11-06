import { memo } from "react";

/**
 * Pixel art as a grid of real DOM squares (not an SVG), so GSAP can animate every pixel —
 * assemble, scatter, ripple. Rows use "#" for a lit pixel and "." for empty;
 * any other character maps through `colors`.
 */
export const ICONS = {
  image: [
    "##########",
    "#........#",
    "#.....##.#",
    "#.....##.#",
    "#...#....#",
    "#..###...#",
    "#.#####.##",
    "##########",
  ],
  doc: ["######..", "#....##.", "#.##.###", "#......#", "#.####.#", "#......#", "#.####.#", "#......#", "########"],
  code: ["..#....#..", ".#.....#..", "#.....#..#", ".#...#..#.", "..#.#..#.."],
  book: ["###..###", "#..##..#", "#..##..#", "#..##..#", "#..##..#", "########"],
  bolt: ["...###", "..###.", ".###..", "#####.", "..###.", ".###..", ".##...", "##...."],
  plug: ["..#..#..", "..#..#..", "########", "#......#", "#......#", ".######.", "...##...", "...##..."],
  chat: ["########", "#......#", "#.##.#.#", "#......#", "########", ".##.....", "#......."],
} as const;

export type IconName = keyof typeof ICONS;

interface Props {
  rows: readonly string[];
  className?: string;
  colors?: Record<string, string>;
  /** colour lit pixels by row, top → bottom, across this ramp */
  ramp?: readonly string[];
}

export const Pixels = memo(function Pixels({ rows, className, colors, ramp }: Props) {
  const w = Math.max(...rows.map((r) => r.length));
  const cells: { ch: string; k: string; y: number }[] = [];
  rows.forEach((r, y) => {
    for (let x = 0; x < w; x++) cells.push({ ch: r[x] ?? ".", k: `${x}-${y}`, y });
  });
  const rampColor = (y: number) => (ramp ? ramp[Math.min(ramp.length - 1, Math.floor((y / rows.length) * ramp.length))] : undefined);
  return (
    <span
      className={`px-grid${className ? ` ${className}` : ""}`}
      style={{ gridTemplateColumns: `repeat(${w}, 1fr)`, aspectRatio: `${w} / ${rows.length}` }}
      aria-hidden="true"
    >
      {cells.map(({ ch, k, y }) => {
        if (ch === ".") return <i key={k} className="px-off" />;
        const bg = colors?.[ch] ?? rampColor(y);
        return <i key={k} className="px-on" style={bg ? { background: bg } : undefined} />;
      })}
    </span>
  );
});

export function PixelIcon({ name, className, ramp }: { name: IconName; className?: string; ramp?: readonly string[] }) {
  return <Pixels rows={ICONS[name]} className={className} ramp={ramp} />;
}

/** The warm block ramp used across the site. */
export const RAMP = ["#FFE36E", "#FFC93C", "#FFA62B", "#FF7A1A", "#F2541B"];
