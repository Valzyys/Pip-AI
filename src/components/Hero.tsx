import { useRef } from "react";
import { gsap, useGSAP, SplitText, reducedMotion, isTouch } from "../lib/gsap";
import { Sprite } from "./Sprite";

const WORDS = [
  { w: "write", c: "var(--lime)" },
  { w: "code", c: "var(--sky)" },
  { w: "reason", c: "var(--pink)" },
  { w: "ship", c: "var(--yolk)" },
];

// Column heights (bottom → top colours) for the two block staircases.
const LEFT = [["var(--yolk)", "var(--lime)"], ["var(--mint)"], ["var(--lime)"], ["var(--yolk)"]];
const RIGHT = [["var(--sky)"], ["var(--pink)", "var(--sky)"]];

export function Hero({ ready }: { ready: boolean }) {
  const root = useRef<HTMLElement>(null);

  // ---------- Intro + idle loops (after preloader) ----------
  const { contextSafe } = useGSAP(
    () => {
      if (!ready) return;
      const q = gsap.utils.selector(root);

      // Rotating word in the sub-headline
      const track = q(".rotator__track")[0] as HTMLElement;
      const items = q(".rotator__track b") as HTMLElement[];
      const rotator = q(".rotator")[0] as HTMLElement;
      const n = WORDS.length;
      gsap.set(rotator, { width: items[0].offsetWidth });
      const rot = gsap.timeline({ repeat: -1, delay: 1.8 });
      for (let i = 1; i <= n; i++) {
        rot
          .to(track, { yPercent: (-100 * i) / (n + 1), duration: 0.7, ease: "pip.inOut" }, "+=1.4")
          .to(rotator, { width: items[i].offsetWidth, duration: 0.7, ease: "pip.inOut" }, "<");
      }
      rot.set(track, { yPercent: 0 });

      if (reducedMotion) return;

      const split = SplitText.create(".hero__title .line", { type: "chars", charsClass: "char" });

      const tl = gsap.timeline({ defaults: { ease: "pip.out" } });
      tl.from(".hero__vline", { scaleY: 0, transformOrigin: "50% 0%", duration: 1.4, ease: "pip.inOut" }, 0)
        .from(".hero__hline", { scaleX: 0, transformOrigin: "0% 50%", duration: 1.4, ease: "pip.inOut" }, 0.1)
        .from(".hero__dot", { scale: 0, duration: 0.4, stagger: 0.1, ease: "pip.pop" }, 0.8)
        .fromTo(
          ".hero__arc path",
          { strokeDashoffset: 1 },
          { strokeDashoffset: 0, duration: 2.2, ease: "pip.inOut" },
          0.2,
        )
        .from(
          split.chars,
          {
            yPercent: 120,
            rotate: () => gsap.utils.random(-14, 14),
            autoAlpha: 0,
            duration: 1.1,
            stagger: 0.025,
          },
          0.15,
        )
        .from(".hero__inline", { scale: 0, rotate: -90, duration: 0.8, ease: "pip.pop" }, 0.7)
        .from(".hero__kicker, .hero__sub", { y: 24, autoAlpha: 0, duration: 0.9, stagger: 0.1 }, 0.6)
        // Blocks rain down column by column, with a bouncy landing
        .from(
          ".stairs i",
          {
            y: () => -window.innerHeight * 1.1,
            duration: 1.1,
            ease: "bounce.out",
            stagger: { each: 0.09, from: "end" },
          },
          0.35,
        )
        .from(".hero__tree, .hero__tower", { scaleY: 0, transformOrigin: "50% 100%", duration: 0.7, ease: "pip.pop", stagger: 0.12 }, 1.2)
        // Pip drops onto the tallest block and squashes on landing
        .from(".hero__pip", { y: () => -window.innerHeight, duration: 0.7, ease: "power3.in" }, 1.25)
        .to(".pip-body", { scaleY: 0.62, scaleX: 1.25, duration: 0.09, transformOrigin: "50% 100%" }, ">")
        .to(".pip-body", { scaleY: 1, scaleX: 1, duration: 0.6, ease: "elastic.out(1.1, 0.35)" }, ">")
        .from(".cloud", { autoAlpha: 0, x: -60, duration: 1.4, stagger: 0.2 }, 0.6)
        .from(".hero__drone", { yPercent: -160, duration: 1.4, ease: "pip.pop" }, 1.1)
        .from(".spark", { scale: 0, duration: 0.5, stagger: 0.15, ease: "pip.pop" }, 1.6);

      // Idle loops
      gsap.to(".cloud--1", { x: "18vw", duration: 26, ease: "none", yoyo: true, repeat: -1 });
      gsap.to(".cloud--2", { x: "-14vw", duration: 32, ease: "none", yoyo: true, repeat: -1 });
      gsap.to(".spark", {
        scale: 0.3,
        autoAlpha: 0.4,
        duration: 0.6,
        ease: "steps(3)",
        repeat: -1,
        yoyo: true,
        stagger: { each: 0.4, repeat: -1, yoyo: true },
        delay: 2.4,
      });
      gsap.fromTo(
        ".hero__drone",
        { rotation: -6 },
        { rotation: 6, duration: 2.2, ease: "sine.inOut", yoyo: true, repeat: -1, transformOrigin: "50% 0%" },
      );

      // Blink every few seconds
      const blink = () => {
        gsap
          .timeline({ onComplete: () => void gsap.delayedCall(gsap.utils.random(1.8, 4.2), blink) })
          .set(".pip-open", { autoAlpha: 0 })
          .set(".pip-blink", { autoAlpha: 1 })
          .set(".pip-open", { autoAlpha: 1 }, 0.12)
          .set(".pip-blink", { autoAlpha: 0 }, 0.12);
      };
      gsap.delayedCall(2.6, blink);

      // Little idle hop
      gsap
        .timeline({ repeat: -1, repeatDelay: 2.6, delay: 3.4 })
        .to(".pip-body", { scaleY: 0.8, scaleX: 1.12, duration: 0.12, transformOrigin: "50% 100%" })
        .to(".pip-body", { y: "-38%", scaleY: 1.08, scaleX: 0.94, duration: 0.28, ease: "power2.out" })
        .to(".pip-body", { y: 0, scaleY: 1, scaleX: 1, duration: 0.32, ease: "bounce.out" });

      // Pip faces the pointer
      if (!isTouch) {
        const flip = q(".pip-flip")[0] as HTMLElement;
        let facing = 1;
        const onMove = (e: PointerEvent) => {
          const r = flip.getBoundingClientRect();
          const next = e.clientX < r.left + r.width / 2 ? -1 : 1;
          if (next !== facing) {
            facing = next;
            gsap.to(flip, { scaleX: next, duration: 0.25, ease: "pip.pop" });
          }
        };
        window.addEventListener("pointermove", onMove);
        return () => window.removeEventListener("pointermove", onMove);
      }
    },
    { scope: root, dependencies: [ready] },
  );

  // ---------- Scroll-driven exit (scrubbed) ----------
  useGSAP(
    () => {
      if (reducedMotion) return;
      const st = { trigger: root.current, start: "top top", end: "bottom top", scrub: 0.6 };
      gsap.to(".hero__copy", { yPercent: -40, autoAlpha: 0, scale: 0.94, ease: "none", scrollTrigger: st });
      gsap.to(".hero__arc", { scale: 1.4, autoAlpha: 0, transformOrigin: "100% 0%", ease: "none", scrollTrigger: st });
      gsap.utils.toArray<HTMLElement>(".stairs .col").forEach((col, i) => {
        gsap.to(col, {
          yPercent: 30 + i * 18,
          ease: "none",
          scrollTrigger: st,
        });
      });
      gsap.to(".hero__pipwrap", { y: "-30vh", rotate: -20, ease: "none", scrollTrigger: st });
    },
    { scope: root },
  );

  // ---------- Pet Pip: jump + pixel hearts ----------
  const pet = contextSafe(() => {
    const scene = root.current!.querySelector(".hero__scene") as HTMLElement;
    const pip = root.current!.querySelector(".hero__pip") as HTMLElement;
    const sr = scene.getBoundingClientRect();
    const pr = pip.getBoundingClientRect();

    gsap
      .timeline()
      .to(".pip-body", { scaleY: 0.7, scaleX: 1.2, duration: 0.08, transformOrigin: "50% 100%" })
      .to(".pip-body", { y: "-90%", scaleY: 1.1, scaleX: 0.9, rotate: 360, duration: 0.5, ease: "power2.out" })
      .to(".pip-body", { y: 0, scaleY: 1, scaleX: 1, duration: 0.45, ease: "bounce.out" })
      .set(".pip-body", { rotate: 0 });

    for (let i = 0; i < 7; i++) {
      const heart = document.createElement("div");
      heart.className = "heart";
      heart.innerHTML = HEART_SVG;
      heart.style.left = `${pr.left - sr.left + pr.width / 2}px`;
      heart.style.top = `${pr.top - sr.top + pr.height * 0.2}px`;
      scene.appendChild(heart);
      gsap.fromTo(
        heart,
        { scale: 0, x: 0, y: 0, rotate: 0 },
        {
          scale: gsap.utils.random(0.6, 1.3),
          x: gsap.utils.random(-140, 140),
          y: gsap.utils.random(-260, -120),
          rotate: gsap.utils.random(-30, 30),
          duration: gsap.utils.random(0.9, 1.4),
          ease: "pip.out",
          onComplete: () => {
            gsap.to(heart, { autoAlpha: 0, duration: 0.3, ease: "steps(3)", onComplete: () => heart.remove() });
          },
        },
      );
    }
  });

  return (
    <section className="hero" ref={root}>
      <div className="hero__grid" aria-hidden="true">
        <i className="hero__vline" />
        <i className="hero__hline" />
        <i className="hero__dot hero__dot--a" />
        <i className="hero__dot hero__dot--b" />
        <svg className="hero__arc" viewBox="0 0 1000 1000" preserveAspectRatio="none">
          <path d="M0 640 C 380 640, 760 420, 1000 0" pathLength={1} />
        </svg>
      </div>

      <div className="hero__sky" aria-hidden="true">
        <Sprite name="cloud" className="cloud cloud--1" />
        <Sprite name="cloud" className="cloud cloud--2" />
        <Sprite name="spark" className="spark spark--1" />
        <Sprite name="spark" className="spark spark--2" />
        <Sprite name="spark" className="spark spark--3" />
        <div className="hero__drone">
          <span className="hero__rope" />
          <Sprite name="seed" />
        </div>
      </div>

      <div className="hero__copy">
        <p className="pixel-tag hero__kicker">
          <span className="blink-sq" /> Pip-AI · by JKT48Connect · OpenAI-compatible
        </p>
        <h1 className="hero__title">
          <span className="line">
            Tiny bird<Sprite name="pipHead" className="hero__inline" />
          </span>
          <span className="line">Big brain.</span>
        </h1>
        <p className="hero__sub">
          Pip helps you{" "}
          <span className="rotator">
            <span className="rotator__track">
              {[...WORDS, WORDS[0]].map((x, i) => (
                <b key={i} style={{ color: x.c }}>
                  {x.w}
                </b>
              ))}
            </span>
          </span>{" "}
          — from your browser, your terminal, your agent.
        </p>
      </div>

      <div className="hero__scene">
        <div className="stairs stairs--left" aria-hidden="true">
          {LEFT.map((col, i) => (
            <div className="col" key={i}>
              {col.map((c, j) => (
                <i key={j} style={{ background: c }} />
              ))}
            </div>
          ))}
        </div>

        <div className="hero__pipwrap">
          <button className="hero__pip" aria-label="Pet Pip" data-cursor="pet" onClick={pet}>
            <span className="pip-flip">
              <span className="pip-body">
                <Sprite name="pip" className="pip-open" />
                <Sprite name="pipBlink" className="pip-blink" />
              </span>
            </span>
          </button>
        </div>

        <Sprite name="tree" className="hero__tree" />
        <Sprite name="tower" className="hero__tower" />

        <div className="stairs stairs--right" aria-hidden="true">
          {RIGHT.map((col, i) => (
            <div className="col" key={i}>
              {col.map((c, j) => (
                <i key={j} style={{ background: c }} />
              ))}
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

const HEART_SVG = `<svg viewBox="0 0 7 6" shape-rendering="crispEdges"><path fill="#FF5FA2" d="M1 0h2v1H1zM4 0h2v1H4zM0 1h7v2H0zM1 3h5v1H1zM2 4h3v1H2z"/><path fill="#C2306F" d="M3 5h1v1H3z"/></svg>`;
