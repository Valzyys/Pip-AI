import { useMemo, useRef } from "react";
import { gsap, useGSAP, SplitText, reducedMotion, isTouch } from "../lib/gsap";
import { Sprite } from "../components/Sprite";
import { PipAvatar } from "../components/PipAvatar";
import { transitionTo } from "../components/PixelTransition";

/** A pixel disc drawn as an SVG of 1×1 rects (radius in pixels). */
export function PixelDisc({ r, className, color }: { r: number; className?: string; color: string }) {
  const rects = useMemo(() => {
    const out: { x: number; y: number; w: number }[] = [];
    for (let y = -r; y < r; y++) {
      const half = Math.floor(Math.sqrt(r * r - (y + 0.5) * (y + 0.5)));
      out.push({ x: r - half, y: y + r, w: half * 2 });
    }
    return out;
  }, [r]);
  return (
    <svg className={className} viewBox={`0 0 ${r * 2} ${r * 2}`} shapeRendering="crispEdges" aria-hidden="true">
      {rects.map((p, i) => (
        <rect key={i} x={p.x} y={p.y} width={p.w} height={1} fill={color} />
      ))}
    </svg>
  );
}

const STARS = Array.from({ length: 46 }, (_, i) => ({
  x: (i * 37.7) % 100,
  y: ((i * 61.3) % 55) + 2,
  s: i % 7 === 0 ? 2 : 1,
  d: (i % 9) * 0.37,
}));

export function Sky({ ready }: { ready: boolean }) {
  const root = useRef<HTMLElement>(null);

  // ---------- intro after the egg hatches ----------
  const { contextSafe } = useGSAP(
    () => {
      if (!ready || reducedMotion) return;
      const split = SplitText.create(".sky__title .ln", { type: "chars", charsClass: "ch" });
      gsap
        .timeline({ defaults: { ease: "steps(5)" } })
        .from(".sky__sun", { yPercent: 60, duration: 1.4, ease: "pip.out" }, 0)
        .from(split.chars, { y: -60, autoAlpha: 0, duration: 0.45, stagger: 0.035 }, 0.2)
        .from(".sky__kicker", { autoAlpha: 0, x: -20, duration: 0.4 }, 0.5)
        .from(".sky__sub", { autoAlpha: 0, y: 16, duration: 0.5 }, 0.9)
        .from(".sky__cta > *", { autoAlpha: 0, y: 20, duration: 0.4, stagger: 0.1 }, 1.0)
        .from(".pi", { x: "-60vw", y: "20vh", duration: 1.4, ease: "pip.out" }, 0.3)
        .from(".sky__bank .sprite", { yPercent: 100, duration: 0.6, stagger: 0.04 }, 0.4);

      // little pixel jump when you hover a letter
      if (!isTouch) {
        split.chars.forEach((ch) =>
          ch.addEventListener("pointerenter", () =>
            gsap.fromTo(ch, { y: 0 }, { y: -14, duration: 0.12, ease: "steps(2)", yoyo: true, repeat: 1, overwrite: true }),
          ),
        );
      }

      // Pip floats and drifts toward the pointer
      gsap.to(".pb", { y: 14, duration: 1.1, ease: "sine.inOut", yoyo: true, repeat: -1 });
      if (!isTouch) {
        const pip = root.current!.querySelector(".pf")!;
        const xTo = gsap.quickTo(pip, "x", { duration: 1.6, ease: "power2" });
        const yTo = gsap.quickTo(pip, "y", { duration: 1.6, ease: "power2" });
        const onMove = (e: PointerEvent) => {
          xTo((e.clientX / window.innerWidth - 0.5) * 120);
          yTo((e.clientY / window.innerHeight - 0.5) * 80);
        };
        window.addEventListener("pointermove", onMove);
        return () => window.removeEventListener("pointermove", onMove);
      }
    },
    { scope: root, dependencies: [ready] },
  );

  // ---------- ambient loops + scroll ----------
  useGSAP(
    () => {
      if (reducedMotion) return;
      // V-formation flock crossing the sky every so often
      gsap.fromTo(
        ".flock",
        { x: "-30vw" },
        { x: "130vw", duration: 18, ease: "none", repeat: -1, repeatDelay: 4 },
      );
      gsap.to(".flock .sprite", { scaleY: -1, duration: 0.25, ease: "steps(1)", repeat: -1, yoyo: true, stagger: 0.08 });

      // we're falling: the sun climbs away, clouds rush up, stars fade
      const st = { trigger: root.current, start: "top top", end: "bottom top", scrub: true };
      gsap.to(".sky__sun", { yPercent: -120, ease: "none", scrollTrigger: st });
      gsap.to(".sky__stars", { autoAlpha: 0, yPercent: -30, ease: "none", scrollTrigger: st });
      gsap.to(".sky__copy", { yPercent: -35, ease: "none", scrollTrigger: st });
      gsap.to(".sky__cloud--a", { yPercent: -260, ease: "none", scrollTrigger: st });
      gsap.to(".sky__cloud--b", { yPercent: -420, ease: "none", scrollTrigger: st });
      gsap.to(".sky__cloud--c", { yPercent: -160, ease: "none", scrollTrigger: st });
      gsap.to(".sky__pip", { yPercent: 180, rotation: 25, ease: "none", scrollTrigger: st });
    },
    { scope: root },
  );

  // click Pip → loop-de-loop
  const loop = contextSafe(() => {
    const el = root.current!.querySelector(".pl");
    gsap.to(el, {
      motionPath: { path: [{ x: 0, y: 0 }, { x: 70, y: -70 }, { x: 0, y: -140 }, { x: -70, y: -70 }, { x: 0, y: 0 }], curviness: 1.4 },
      rotation: "+=360",
      duration: 0.9,
      ease: "power1.inOut",
      overwrite: "auto",
    });
  });

  return (
    <section className="sky" id="sky" ref={root}>
      <div className="sky__stars" aria-hidden="true">
        {STARS.map((s, i) => (
          <i key={i} style={{ left: `${s.x}%`, top: `${s.y}%`, width: s.s * 3, height: s.s * 3, animationDelay: `${s.d}s` }} />
        ))}
      </div>
      <PixelDisc r={22} color="#FFD36B" className="sky__sun" />

      <Sprite name="cloud" className="sky__cloud sky__cloud--a" />
      <Sprite name="cloud" className="sky__cloud sky__cloud--b" />
      <Sprite name="cloudBig" className="sky__cloud sky__cloud--c" />

      <div className="flock" aria-hidden="true">
        {[0, 1, 2, 3, 4].map((i) => (
          <Sprite key={i} name="bird" className={`flock__b flock__b--${i}`} />
        ))}
      </div>

      <div className="sky__copy">
        <p className="sky__kicker px-label">
          <span className="dot" /> asisten JKT48Connect · ketinggian 1200m
        </p>
        <h1 className="sky__title">
          <span className="ln">Burung kecil.</span>
          <span className="ln ln--b">Otak besar.</span>
        </h1>
        <p className="sky__sub">
          Pip menjawab pertanyaan, menulis kode, dan membaca dokumentasi JKT48Connect untukmu. Gulir ke bawah dan ikut
          jatuh ke sarangnya.
        </p>
        <div className="sky__cta">
          <button className="btn-px" onClick={() => transitionTo("/room")}>
            ▶ Ngobrol sama Pip
          </button>
          <span className="sky__hint px-label">
            gulir untuk jatuh <span className="sky__arrow">↓</span>
          </span>
        </div>
      </div>

      <button className="sky__pip" onClick={loop} aria-label="Pip — klik untuk salto">
        {/* nested wrappers: follow / intro / bob / loop each own their own transform */}
        <span className="pf">
          <span className="pi">
            <span className="pb">
              <span className="pl">
                <PipAvatar face="fly" />
              </span>
            </span>
          </span>
        </span>
      </button>

      <div className="sky__bank" aria-hidden="true">
        {Array.from({ length: 9 }, (_, i) => (
          <Sprite key={i} name="cloudBig" />
        ))}
      </div>
    </section>
  );
}
