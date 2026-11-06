import { memo } from "react";
import { compile, type SpriteName } from "../lib/sprites";

interface Props {
  name: SpriteName;
  className?: string;
  title?: string;
}

/** Renders a pixel sprite as a crisp, scalable SVG. Size it with CSS width. */
export const Sprite = memo(function Sprite({ name, className, title }: Props) {
  const { w, h, runs } = compile(name);
  return (
    <svg
      className={className ? `sprite ${className}` : "sprite"}
      viewBox={`0 0 ${w} ${h}`}
      shapeRendering="crispEdges"
      role={title ? "img" : undefined}
      aria-hidden={title ? undefined : true}
      aria-label={title}
    >
      {runs.map((r, i) => (
        <rect key={i} x={r.x} y={r.y} width={r.w} height={1} fill={r.fill} />
      ))}
    </svg>
  );
});
