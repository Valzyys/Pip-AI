import { useRef } from "react";
import { gsap, useGSAP, reducedMotion } from "../lib/gsap";
import { Sprite } from "./Sprite";
import type { SpriteName } from "../lib/sprites";

interface Card {
  n: string;
  tag: string;
  icon: SpriteName;
  color: string;
  title: string;
  body: string;
  viz: "think" | "code" | "see" | "act";
}

const CARDS: Card[] = [
  {
    n: "01",
    tag: "pip",
    icon: "bulb",
    color: "var(--lime)",
    title: "Thinks out loud with you",
    body: "The everyday profile: brainstorm, explain, summarise and write — streamed token by token as it thinks.",
    viz: "think",
  },
  {
    n: "02",
    tag: "pip-code",
    icon: "code",
    color: "var(--sky)",
    title: "Writes code that runs",
    body: "Tuned for coding work. Drop it into Codex or Claude Code with a few lines of config.",
    viz: "code",
  },
  {
    n: "03",
    tag: "pip-docs",
    icon: "eye",
    color: "var(--pink)",
    title: "Reads the docs for you",
    body: "Answers grounded in the public JKT48Connect documentation — endpoints, params and examples.",
    viz: "see",
  },
  {
    n: "04",
    tag: "tools",
    icon: "bolt",
    color: "var(--yolk)",
    title: "Calls your tools",
    body: "Function calling with up to 128 tools. Your client runs them, Pip decides what to call next.",
    viz: "act",
  },
];

const CODE = `def hatch(idea):
    pip = Pip("mini")
    plan = pip.think(idea)
    return pip.ship(plan)`;

function Viz({ kind }: { kind: Card["viz"] }) {
  if (kind === "think")
    return (
      <div className="viz viz-think">
        {[38, 64, 52, 88, 72, 96].map((h, i) => (
          <i key={i} style={{ height: `${h}%` }} />
        ))}
      </div>
    );
  if (kind === "code")
    return (
      <pre className="viz viz-code">
        <code>{CODE}</code>
        <span className="viz-code__caret" />
      </pre>
    );
  if (kind === "see")
    return (
      <div className="viz viz-see">
        {Array.from({ length: 48 }, (_, i) => (
          <i key={i} />
        ))}
        <span className="viz-see__scan" />
        <span className="viz-see__box" />
      </div>
    );
  return (
    <div className="viz viz-act">
      {["read_file()", "run_tests()", "apply_patch()"].map((t) => (
        <span key={t}>
          <b>✓</b> {t}
        </span>
      ))}
    </div>
  );
}

export function Features() {
  const root = useRef<HTMLElement>(null);

  useGSAP(
    () => {
      const section = root.current!;
      const track = section.querySelector<HTMLElement>(".features__track")!;
      const cards = gsap.utils.toArray<HTMLElement>(".fcard", section);
      const distance = () => track.scrollWidth - track.clientWidth;

      if (reducedMotion) return;

      // Pinned horizontal scroll
      const scrollTween = gsap.to(track, {
        x: () => -distance(),
        ease: "none",
        scrollTrigger: {
          trigger: section,
          start: "top top",
          end: () => `+=${distance()}`,
          pin: true,
          scrub: 0.8,
          invalidateOnRefresh: true,
          anticipatePin: 1,
        },
      });

      gsap.to(".features__progress i", {
        scaleX: 1,
        ease: "none",
        scrollTrigger: { trigger: section, start: "top top", end: () => `+=${distance()}`, scrub: true },
      });

      // Cards tilt in as they travel across
      cards.forEach((card) => {
        gsap.fromTo(
          card,
          { rotate: 4, yPercent: 8 },
          {
            rotate: -2,
            yPercent: -2,
            ease: "none",
            scrollTrigger: {
              trigger: card,
              containerAnimation: scrollTween,
              start: "left right",
              end: "right left",
              scrub: true,
            },
          },
        );
      });

      // Per-card illustrations play when the card reaches the centre
      const visibleAtStart = cards.map((c) => c.offsetLeft + c.offsetWidth * 0.3 < window.innerWidth);
      const at = (i: number): ScrollTrigger.Vars =>
        visibleAtStart[i]
          ? { trigger: section, start: "top 45%", toggleActions: "play none none reverse" }
          : { trigger: cards[i], containerAnimation: scrollTween, start: "left 75%", toggleActions: "play none none reverse" };
      gsap.from(cards[0].querySelectorAll(".viz-think i"), {
        scaleY: 0,
        transformOrigin: "50% 100%",
        ease: "steps(6)",
        duration: 0.9,
        stagger: 0.08,
        scrollTrigger: at(0),
      });

      const code = cards[1].querySelector("code")!;
      const full = CODE;
      const typed = { n: 0 };
      gsap.to(typed, {
        n: full.length,
        duration: 1.8,
        ease: "none",
        scrollTrigger: at(1),
        onUpdate: () => {
          code.textContent = full.slice(0, Math.round(typed.n));
        },
      });
      gsap.to(cards[1].querySelector(".viz-code__caret"), { autoAlpha: 0, repeat: -1, yoyo: true, duration: 0.5, ease: "steps(1)" });

      const seeTl = gsap.timeline({ scrollTrigger: at(2) });
      seeTl
        .from(cards[2].querySelectorAll(".viz-see i"), {
          autoAlpha: 0,
          scale: 0,
          duration: 0.3,
          stagger: { each: 0.012, from: "random" },
        })
        .fromTo(cards[2].querySelector(".viz-see__scan"), { top: "0%" }, { top: "100%", duration: 1.2, ease: "pip.inOut" })
        .from(cards[2].querySelector(".viz-see__box"), { scale: 0, autoAlpha: 0, duration: 0.5, ease: "pip.pop" }, "-=0.3");

      gsap.from(cards[3].querySelectorAll(".viz-act span"), {
        x: -30,
        autoAlpha: 0,
        duration: 0.6,
        stagger: 0.35,
        ease: "pip.pop",
        scrollTrigger: at(3),
      });

      // Icon bob on hover
      cards.forEach((card) => {
        const icon = card.querySelector(".fcard__icon");
        card.addEventListener("pointerenter", () =>
          gsap.fromTo(icon, { y: 0, rotate: 0 }, { y: -10, rotate: 10, duration: 0.3, yoyo: true, repeat: 1, ease: "power2.out" }),
        );
      });
    },
    { scope: root },
  );

  return (
    <section className="features" id="features" ref={root}>
      <div className="features__head">
        <p className="pixel-tag section-tag">[ 01 ] capabilities</p>
        <h2 className="h2 js-split">
          One API key.
          <br />
          Four big tricks.
        </h2>
      </div>
      <div className="features__track">
        {CARDS.map((c) => (
          <article className="fcard" key={c.n} style={{ "--c": c.color } as React.CSSProperties}>
            <div className="fcard__top">
              <span className="pixel-tag">
                {c.n} / {c.tag}
              </span>
              <Sprite name={c.icon} className="fcard__icon" />
            </div>
            <h3>{c.title}</h3>
            <p>{c.body}</p>
            <Viz kind={c.viz} />
          </article>
        ))}
      </div>
      <div className="features__progress">
        <i />
      </div>
    </section>
  );
}
