import { useRef } from "react";
import { gsap, useGSAP, reducedMotion } from "../lib/gsap";
import { Sprite } from "../components/Sprite";
import { PipAvatar } from "../components/PipAvatar";

const LINES = [
  { big: "Tanya apa aja.", small: "ngobrol, nulis, ngerangkum", tag: "pip", c: "var(--yolk)" },
  { big: "Minta kodenya.", small: "debug, refactor, review", tag: "pip-code", c: "var(--sky)" },
  { big: "Cari di docs.", small: "dari dokumentasi JKT48Connect", tag: "pip-docs", c: "var(--lime)" },
];

// deterministic "random" cloud field
const CLOUDS = Array.from({ length: 16 }, (_, i) => ({
  x: (i * 43.1) % 92,
  y: (i * 23.7) % 300,
  w: 90 + ((i * 53) % 180),
  big: i % 3 === 0,
  o: 0.55 + ((i * 17) % 40) / 100,
}));

/**
 * Pinned: Pip opens an umbrella and drifts down while clouds rush past upward.
 * Three statements (one per Pip profile) twinkle in pixel by pixel, one after another.
 */
export function Fall() {
  const root = useRef<HTMLElement>(null);

  useGSAP(
    () => {
      if (reducedMotion) return;
      const lines = gsap.utils.toArray<HTMLElement>(".fall__line", root.current);

      const tl = gsap.timeline({
        defaults: { ease: "none" },
        scrollTrigger: { trigger: root.current, start: "top top", end: "+=260%", pin: true, scrub: 0.6 },
      });

      tl.fromTo(".fall__field", { yPercent: 0 }, { yPercent: -66, duration: 1 }, 0)
        .fromTo(".fall__pip", { top: "-12%" }, { top: "62%", duration: 1 }, 0)
        .fromTo(".fall__sky", { backgroundPositionY: "0%" }, { backgroundPositionY: "100%", duration: 1 }, 0);

      // sway the umbrella like a falling leaf
      const sway = gsap.timeline();
      for (let i = 0; i < 6; i++) {
        sway.to(".fall__pip-sway", { x: i % 2 ? -40 : 40, rotation: i % 2 ? -8 : 8, duration: 1 / 6, ease: "sine.inOut" });
      }
      tl.add(sway, 0);

      lines.forEach((line, i) => {
        const at = 0.03 + i * 0.32;
        const chars = line.querySelectorAll(".fall__big .ch");
        tl.fromTo(chars, { autoAlpha: 0 }, { autoAlpha: 1, duration: 0.01, ease: "steps(1)", stagger: { amount: 0.05, from: "random" } }, at)
          .fromTo(line.querySelector(".fall__small"), { autoAlpha: 0, x: -20 }, { autoAlpha: 1, x: 0, duration: 0.03, ease: "steps(3)" }, at + 0.04)
          .fromTo(line.querySelector(".fall__tag"), { scale: 0 }, { scale: 1, duration: 0.03, ease: "steps(3)" }, at + 0.05);
        if (i < lines.length - 1)
          tl.to(chars, { autoAlpha: 0, duration: 0.01, ease: "steps(1)", stagger: { amount: 0.04, from: "random" } }, at + 0.25).to(
            [line.querySelector(".fall__small"), line.querySelector(".fall__tag")],
            { autoAlpha: 0, duration: 0.04, ease: "steps(2)" },
            at + 0.27,
          );
      });

      gsap.to(".fall__umbrella", { rotation: 4, duration: 0.6, yoyo: true, repeat: -1, ease: "sine.inOut", transformOrigin: "50% 100%" });
    },
    { scope: root },
  );

  return (
    <section className="fall" id="fall" ref={root}>
      <div className="fall__sky" />
      <div className="fall__field" aria-hidden="true">
        {CLOUDS.map((c, i) => (
          <span
            key={i}
            className="fall__cloud-wrap"
            style={{ left: `${c.x}%`, top: `${c.y / 3}%`, width: c.w, opacity: c.o }}
          >
            <Sprite name={c.big ? "cloudBig" : "cloud"} />
          </span>
        ))}
      </div>

      <div className="fall__pip" aria-hidden="true">
        <div className="fall__pip-sway">
          <Sprite name="umbrella" className="fall__umbrella" />
          <PipAvatar face="happy" className="fall__pip-body" />
        </div>
      </div>

      <div className="fall__lines">
        {LINES.map((l) => (
          <div className="fall__line" key={l.tag}>
            <p className="fall__big" aria-label={l.big}>
              {l.big.split(" ").map((word, w) => (
                <span className="w" key={w} aria-hidden="true">
                  {Array.from(word).map((ch, j) => (
                    <span className="ch" key={j}>
                      {ch}
                    </span>
                  ))}
                  {w < l.big.split(" ").length - 1 ? "\u00a0" : null}
                </span>
              ))}
            </p>
            <p className="fall__small">
              <span className="fall__tag" style={{ background: l.c }}>
                {l.tag}
              </span>
              {l.small}
            </p>
          </div>
        ))}
      </div>
    </section>
  );
}
