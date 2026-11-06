import { useMemo, useRef } from "react";
import { gsap, useGSAP, reducedMotion, isTouch, scrollToTarget } from "../lib/gsap";
import { GLYPHS, type SpriteName } from "../lib/sprites";
import { Sprite } from "./Sprite";

/* ------------------------------------------------------------------ */
/* Numbers                                                             */
/* ------------------------------------------------------------------ */

const STATS = [
  { to: 120, unit: "K", label: "token context window", c: "var(--lime)", fill: 0.82 },
  { to: 128, unit: "tools", label: "per request, max", c: "var(--sky)", fill: 0.64 },
  { to: 16, unit: "K tok", label: "max output per reply", c: "var(--pink)", fill: 0.9 },
  { to: 4, unit: "APIs", label: "OpenAI, Responses, Messages, Models", c: "var(--yolk)", fill: 1 },
];

export function Numbers() {
  const root = useRef<HTMLElement>(null);

  useGSAP(
    () => {
      gsap.utils.toArray<HTMLElement>(".stat", root.current).forEach((el, i) => {
        const n = el.querySelector<HTMLElement>(".js-n")!;
        const to = Number(n.dataset.to);
        if (reducedMotion) {
          n.textContent = String(to);
          return;
        }
        const tl = gsap.timeline({ scrollTrigger: { trigger: el, start: "top 85%" }, delay: i * 0.12 });
        tl.from(el, { y: 60, autoAlpha: 0, duration: 0.9 })
          .from(n, { textContent: 0, duration: 1.6, ease: "power2.out", snap: { textContent: 1 } }, "<0.1")
          .from(el.querySelector(".stat__bar i"), { scaleX: 0, duration: 1.4, ease: "steps(14)" }, "<");
      });
    },
    { scope: root },
  );

  return (
    <section className="numbers" id="numbers" ref={root}>
      <div className="numbers__head">
        <p className="pixel-tag section-tag">[ 03 ] the numbers</p>
        <h2 className="h2 js-split">Fast is a feature.</h2>
      </div>
      <div className="numbers__grid">
        {STATS.map((s) => (
          <div className="stat" key={s.label}>
            <div className="stat__n">
              <span className="js-n" data-to={s.to}>
                {s.to}
              </span>
              <small>{s.unit}</small>
            </div>
            <p>{s.label}</p>
            <div className="stat__bar">
              <i style={{ background: s.c, width: `${s.fill * 100}%` }} />
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}

/* ------------------------------------------------------------------ */
/* Models                                                              */
/* ------------------------------------------------------------------ */

const MODELS: { name: string; spec: string; sprite: SpriteName; c: string; feat?: boolean; points: string[] }[] = [
  { name: "pip", spec: "general · chat + writing", sprite: "pip", c: "var(--yolk)", feat: true, points: ["Everyday questions", "Writing & summaries", "Fast streaming replies"] },
  { name: "pip-code", spec: "coding · codex + claude code", sprite: "pipCool", c: "var(--sky)", points: ["Code, refactors, reviews", "Function & tool calls", "Responses + Messages APIs"] },
  { name: "pip-docs", spec: "docs · jkt48connect", sprite: "egg", c: "var(--lime)", points: ["Grounded in public docs", "Endpoint & param lookups", "Copy-ready examples"] },
];

export function Models() {
  const root = useRef<HTMLElement>(null);

  useGSAP(
    () => {
      const cards = gsap.utils.toArray<HTMLElement>(".mcard", root.current);
      if (reducedMotion) return;

      gsap.from(cards, {
        y: 160,
        rotate: (i) => [-8, 0, 8][i] ?? 0,
        autoAlpha: 0,
        duration: 1.2,
        stagger: 0.12,
        scrollTrigger: { trigger: ".models__grid", start: "top 80%" },
      });
      gsap.to(".mcard__sprite", { y: -8, duration: 0.9, ease: "sine.inOut", repeat: -1, yoyo: true, stagger: 0.3 });

      if (isTouch) return;
      cards.forEach((card) => {
        const rx = gsap.quickTo(card, "rotationX", { duration: 0.6, ease: "power3" });
        const ry = gsap.quickTo(card, "rotationY", { duration: 0.6, ease: "power3" });
        const sx = gsap.quickTo(card.querySelector(".mcard__sprite"), "x", { duration: 0.6, ease: "power3" });
        gsap.set(card, { transformPerspective: 900 });
        card.addEventListener("pointermove", (e) => {
          const r = card.getBoundingClientRect();
          const px = (e.clientX - r.left) / r.width - 0.5;
          const py = (e.clientY - r.top) / r.height - 0.5;
          rx(py * -12);
          ry(px * 14);
          sx(px * 24);
        });
        card.addEventListener("pointerenter", () =>
          gsap.to(card.querySelector(".mcard__corner"), { scale: 22, duration: 0.7, ease: "pip.inOut" }),
        );
        card.addEventListener("pointerleave", () => {
          rx(0);
          ry(0);
          sx(0);
          gsap.to(card.querySelector(".mcard__corner"), { scale: 1, duration: 0.6, ease: "pip.inOut" });
        });
      });
    },
    { scope: root },
  );

  return (
    <section className="models" id="models" ref={root}>
      <div className="models__head">
        <p className="pixel-tag section-tag">[ 04 ] three profiles</p>
        <h2 className="h2 js-split">Pick your bird.</h2>
      </div>
      <div className="models__grid">
        {MODELS.map((m) => (
          <article key={m.name} className={`mcard${m.feat ? " mcard--feat" : ""}`} style={{ "--c": m.c } as React.CSSProperties} data-cursor="hover">
            <span className="mcard__corner" />
            <div className="mcard__content">
              {m.feat && <span className="mcard__badge pixel-tag">default</span>}
              <Sprite name={m.sprite} className="mcard__sprite" />
              <h3>{m.name}</h3>
              <p className="pixel-tag">{m.spec}</p>
              <ul>
                {m.points.map((p) => (
                  <li key={p}>{p}</li>
                ))}
              </ul>
            </div>
          </article>
        ))}
      </div>
    </section>
  );
}

/* ------------------------------------------------------------------ */
/* Pixel wipe — the dark page dissolves into lime, pixel by pixel      */
/* ------------------------------------------------------------------ */

const WIPE_COLS = 12;
const WIPE_ROWS = 8;
const WIPE_ACCENTS = ["var(--yolk)", "var(--mint)", "var(--sky)", "var(--pink)"];

export function PixelWipe() {
  const root = useRef<HTMLElement>(null);
  const cells = useMemo(
    () =>
      Array.from({ length: WIPE_COLS * WIPE_ROWS }, (_, i) => {
        const row = Math.floor(i / WIPE_COLS);
        // more accent pixels near the top edge, solid lime towards the bottom
        const accent = Math.random() < 0.28 - row * 0.035;
        return accent ? WIPE_ACCENTS[i % WIPE_ACCENTS.length] : "var(--lime)";
      }),
    [],
  );

  useGSAP(
    () => {
      const els = gsap.utils.toArray<HTMLElement>(".wipe__grid i", root.current);
      if (reducedMotion) {
        gsap.set(els, { scale: 1 });
        return;
      }
      gsap.fromTo(
        els,
        { scale: 0 },
        {
          scale: 1,
          ease: "power1.in",
          stagger: { amount: 1, grid: [WIPE_ROWS, WIPE_COLS], from: "end", axis: "y" },
          scrollTrigger: { trigger: root.current, start: "top 85%", end: "bottom 60%", scrub: 0.4 },
        },
      );
      // then every accent pixel flips back to lime
      gsap.to(".wipe__grid i.is-accent", {
        backgroundColor: "#C6F432",
        ease: "steps(1)",
        stagger: { amount: 0.4, from: "random" },
        scrollTrigger: { trigger: root.current, start: "center 60%", end: "bottom 30%", scrub: true },
      });
    },
    { scope: root },
  );

  return (
    <section className="wipe" ref={root} aria-hidden="true">
      <div className="wipe__grid" style={{ "--cols": WIPE_COLS } as React.CSSProperties}>
        {cells.map((c, i) => (
          <i key={i} className={c === "var(--lime)" ? "" : "is-accent"} style={{ background: c }} />
        ))}
      </div>
    </section>
  );
}

/* ------------------------------------------------------------------ */
/* CTA                                                                 */
/* ------------------------------------------------------------------ */

export function Cta() {
  const root = useRef<HTMLElement>(null);

  useGSAP(
    () => {
      if (reducedMotion) return;
      gsap.from(".btn", {
        y: 40,
        autoAlpha: 0,
        stagger: 0.1,
        duration: 0.9,
        ease: "pip.pop",
        scrollTrigger: { trigger: ".cta__actions", start: "top 90%" },
      });
      gsap.fromTo(
        ".cta__pip",
        { x: "-30vw", y: 0 },
        {
          x: "0vw",
          ease: "none",
          scrollTrigger: { trigger: root.current, start: "top 80%", end: "center center", scrub: 1 },
        },
      );
      if (isTouch) return;
      // Magnetic buttons
      gsap.utils.toArray<HTMLElement>(".magnetic", root.current).forEach((btn) => {
        const xTo = gsap.quickTo(btn, "x", { duration: 0.6, ease: "elastic.out(1, 0.4)" });
        const yTo = gsap.quickTo(btn, "y", { duration: 0.6, ease: "elastic.out(1, 0.4)" });
        const label = btn.querySelector("span");
        const lx = gsap.quickTo(label, "x", { duration: 0.6, ease: "elastic.out(1, 0.4)" });
        const ly = gsap.quickTo(label, "y", { duration: 0.6, ease: "elastic.out(1, 0.4)" });
        btn.addEventListener("pointermove", (e) => {
          const r = btn.getBoundingClientRect();
          const dx = e.clientX - (r.left + r.width / 2);
          const dy = e.clientY - (r.top + r.height / 2);
          xTo(dx * 0.35);
          yTo(dy * 0.45);
          lx(dx * 0.15);
          ly(dy * 0.15);
        });
        btn.addEventListener("pointerleave", () => {
          xTo(0);
          yTo(0);
          lx(0);
          ly(0);
        });
      });
    },
    { scope: root },
  );

  return (
    <section className="cta" id="cta" ref={root}>
      <p className="pixel-tag section-tag">[ 05 ] let's build</p>
      <h2 className="cta__title js-split">
        Let Pip take flight
        <br />
        in your stack.
      </h2>
      <div className="cta__row">
        <div className="cta__actions">
          <a
            className="btn btn--dark magnetic"
            href="#demo"
            onClick={(e) => {
              e.preventDefault();
              scrollToTarget("#demo");
            }}
          >
            <span>Start building</span>
          </a>
          <a className="btn btn--line magnetic" href="mailto:hello@pip-ai.dev">
            <span>Talk to us</span>
          </a>
        </div>
        <Sprite name="pip" className="cta__pip" />
      </div>
    </section>
  );
}

/* ------------------------------------------------------------------ */
/* Footer with assembling pixel wordmark                               */
/* ------------------------------------------------------------------ */

export function Footer() {
  const root = useRef<HTMLElement>(null);
  const word = "PIP";
  const glyphs = word.split("").map((ch) => GLYPHS[ch]);

  useGSAP(
    () => {
      const px = gsap.utils.toArray<HTMLElement>(".footer__word i.on", root.current);
      if (reducedMotion) return;
      gsap.from(px, {
        x: () => gsap.utils.random(-400, 400),
        y: () => gsap.utils.random(-500, 100),
        rotate: () => gsap.utils.random(-180, 180),
        scale: 0,
        ease: "power2.out",
        stagger: { amount: 0.6, from: "random" },
        scrollTrigger: { trigger: ".footer__word", start: "top bottom", end: "bottom bottom", scrub: 1 },
      });
      if (isTouch) return;
      px.forEach((p) =>
        p.addEventListener("pointerenter", () =>
          gsap.fromTo(
            p,
            { backgroundColor: "#FF5FA2", y: 0 },
            { backgroundColor: "#0D0E0B", y: -12, duration: 0.5, ease: "pip.pop", yoyo: true, repeat: 1, overwrite: true },
          ),
        ),
      );
    },
    { scope: root },
  );

  return (
    <footer className="footer" ref={root}>
      <div className="footer__word" aria-label={word} role="img">
        {glyphs.map((g, gi) => (
          <div className="glyph" key={gi} style={{ "--w": g[0].length } as React.CSSProperties}>
            {g.flatMap((row, y) => row.split("").map((b, x) => <i key={`${x}-${y}`} className={b === "1" ? "on" : ""} />))}
          </div>
        ))}
      </div>
      <div className="footer__row">
        <span>© 2026 Pip-AI</span>
        <span className="footer__links">
          <a href="#features" onClick={(e) => (e.preventDefault(), scrollToTarget("#features"))}>
            Capabilities
          </a>
          <a href="#models" onClick={(e) => (e.preventDefault(), scrollToTarget("#models"))}>
            Models
          </a>
          <a href="#demo" onClick={(e) => (e.preventDefault(), scrollToTarget("#demo"))}>
            Playground
          </a>
        </span>
        <span className="pixel-tag">powered by jkt48connect · served from the edge</span>
      </div>
    </footer>
  );
}
