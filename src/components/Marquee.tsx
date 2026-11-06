import { useRef } from "react";
import { gsap, useGSAP, ScrollTrigger, reducedMotion, scrollToTarget } from "../lib/gsap";
import { Sprite } from "./Sprite";
import type { SpriteName } from "../lib/sprites";

const ROW_A: [string, SpriteName][] = [
  ["Chat", "spark"],
  ["Code", "pipHead"],
  ["Docs", "spark"],
  ["Agents", "pipHead"],
  ["Tools", "spark"],
  ["Streaming", "pipHead"],
];
const ROW_B = ["OpenAI-compatible", "Codex ready", "Claude Code ready", "120K context", "Function calling", "SSE streaming"];

export function Announce() {
  return (
    <a
      className="announce"
      href="#demo"
      onClick={(e) => {
        e.preventDefault();
        scrollToTarget("#demo");
      }}
    >
      <span className="announce__icon">
        <Sprite name="pipHead" />
      </span>
      <span className="announce__text">
        <span className="pixel-tag announce__tag">new</span> Pip now plugs into Codex & Claude Code — one API key.
      </span>
      <span className="announce__go">
        <Sprite name="chev" />
      </span>
    </a>
  );
}

/** Two infinite rows whose speed + direction react to scroll velocity. */
export function Marquee() {
  const root = useRef<HTMLElement>(null);

  useGSAP(
    () => {
      if (reducedMotion) return;
      const rows = gsap.utils.toArray<HTMLElement>(".marquee__inner", root.current);
      const state = rows.map((el, i) => ({
        el,
        x: 0,
        dir: i % 2 === 0 ? -1 : 1,
        half: el.scrollWidth / 2,
        setX: gsap.quickSetter(el, "x", "px") as (v: number) => void,
      }));
      const skewTo = gsap.quickTo(".marquee__inner", "skewX", { duration: 0.6, ease: "power3" });

      let boost = 0;
      let sign = 1;
      ScrollTrigger.create({
        trigger: root.current,
        start: "top bottom",
        end: "bottom top",
        onUpdate: (self) => {
          const v = self.getVelocity();
          boost = Math.min(Math.abs(v) / 120, 18);
          sign = self.direction;
          skewTo(gsap.utils.clamp(-12, 12, v / -280));
        },
      });

      const resize = () => state.forEach((s) => (s.half = s.el.scrollWidth / 2));
      window.addEventListener("resize", resize);

      const tick = (_t: number, dt: number) => {
        boost *= 0.92;
        state.forEach((s) => {
          s.x += s.dir * sign * (0.9 + boost) * (dt / 16.67);
          s.x = gsap.utils.wrap(-s.half, 0, s.x);
          s.setX(s.x);
        });
      };
      gsap.ticker.add(tick);
      return () => {
        gsap.ticker.remove(tick);
        window.removeEventListener("resize", resize);
      };
    },
    { scope: root },
  );

  const a = (k: number) =>
    ROW_A.map(([t, s], i) => (
      <span className="marquee__item" key={`${k}${i}`}>
        <span>{t}</span>
        <Sprite name={s} />
      </span>
    ));
  const b = (k: number) =>
    ROW_B.map((t, i) => (
      <span className="marquee__item" key={`${k}${i}`}>
        <span>{t}</span>
        <Sprite name="seed" />
      </span>
    ));

  return (
    <section className="marquee" ref={root} aria-label="Pip capabilities">
      <div className="marquee__row">
        <div className="marquee__inner">
          {a(0)}
          {a(1)}
        </div>
      </div>
      <div className="marquee__row marquee__row--alt">
        <div className="marquee__inner">
          {b(0)}
          {b(1)}
        </div>
      </div>
    </section>
  );
}
