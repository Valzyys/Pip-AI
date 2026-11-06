import { Sprite } from "./Sprite";
import type { SpriteName } from "../lib/sprites";

export type Face = "idle" | "talk" | "happy" | "think" | "dizzy" | "fly";
export type Hat = "none" | "headphones" | "glasses";

const HAT_SPRITE: Record<Exclude<Hat, "none">, SpriteName> = {
  headphones: "hatHeadphones",
  glasses: "hatGlasses",
};

interface Props {
  face?: Face;
  hat?: Hat;
  className?: string;
}

/**
 * Pip with all expression frames stacked. The visible frame (and the blink / beak-flap /
 * wing-flap loops) is chosen purely in CSS from `data-face`, so switching expression is a
 * single attribute change — no re-render storms while a reply streams in.
 */
export function PipAvatar({ face = "idle", hat = "none", className }: Props) {
  return (
    <span className={`pipa${className ? ` ${className}` : ""}`} data-face={face} aria-hidden="true">
      <Sprite name="pip" className="f f-idle" />
      <Sprite name="pipBlink" className="f f-blink" />
      <Sprite name="pipTalk" className="f f-talk" />
      <Sprite name="pipHappy" className="f f-happy" />
      <Sprite name="pipThink" className="f f-think" />
      <Sprite name="pipDizzy" className="f f-dizzy" />
      <Sprite name="pipFlyUp" className="f f-up" />
      <Sprite name="pipFlyDown" className="f f-down" />
      {hat !== "none" && <Sprite name={HAT_SPRITE[hat]} className="f-hat" />}
    </span>
  );
}
