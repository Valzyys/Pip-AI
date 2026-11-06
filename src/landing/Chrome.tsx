import { useRef } from "react";
import { gsap, useGSAP, ScrollTrigger, reducedMotion } from "../lib/gsap";
import { Sprite } from "../components/Sprite";
import { transitionTo } from "../components/PixelTransition";

/** Fixed top bar: logo + the one action that matters. */
export function TopBar({ ready }: { ready: boolean }) {
  const root = useRef<HTMLElement>(null);
  useGSAP(
    () => {
      if (!ready || reducedMotion) return;
      gsap.from(".tb > *", { y: -40, autoAlpha: 0, duration: 0.5, ease: "steps(4)", stagger: 0.1, delay: 0.6 });
    },
    { scope: root, dependencies: [ready] },
  );
  return (
    <header className="tb" ref={root}>
      <a
        className="tb__logo"
        href="/"
        onClick={(e) => {
          e.preventDefault();
          window.scrollTo({ top: 0 });
        }}
      >
        <Sprite name="pipHead" />
        <span>pip</span>
      </a>
      <button className="btn-px btn-px--sm" onClick={() => transitionTo("/room")}>
        Masuk kamar <span aria-hidden="true">▶</span>
      </button>
    </header>
  );
}

export const STOPS = [
  { id: "sky", label: "langit", alt: 1200 },
  { id: "fall", label: "awan", alt: 600 },
  { id: "city", label: "kota", alt: 0 },
  { id: "under", label: "tanah", alt: -40 },
  { id: "nest", label: "sarang", alt: -99 },
];

/**
 * Altimeter on the right edge: the page is a fall from the sky into Pip's nest, so the
 * scroll position is shown as altitude rather than a generic progress bar.
 */
export function Altimeter() {
  const root = useRef<HTMLDivElement>(null);

  useGSAP(
    () => {
      const marker = root.current!.querySelector<HTMLElement>(".alt__marker")!;
      const readout = root.current!.querySelector<HTMLElement>(".alt__read")!;
      const labels = gsap.utils.toArray<HTMLElement>(".alt__stop", root.current);
      const track = root.current!.querySelector<HTMLElement>(".alt__track")!;
      gsap.set(marker, { yPercent: -50 });
      const setY = gsap.quickTo(marker, "y", { duration: 0.35, ease: "power3" });
      // pinned sections are wrapped in a pin-spacer; measure that so pinning doesn't skew offsets
      const topOf = (id: string) => {
        const el = document.getElementById(id);
        if (!el) return 0;
        const box = el.parentElement?.classList.contains("pin-spacer") ? el.parentElement : el;
        return box.offsetTop;
      };

      let bounds: { start: number; end: number; a0: number; a1: number }[] = [];
      const measure = () => {
        const max = ScrollTrigger.maxScroll(window) || 1;
        bounds = STOPS.map((s, i) => {
          const start = Math.min(topOf(s.id), max);
          const end = STOPS[i + 1] ? Math.min(topOf(STOPS[i + 1].id), max) : max;
          return { start, end, a0: s.alt, a1: STOPS[i + 1]?.alt ?? s.alt - 20 };
        });
        labels.forEach((l, i) => (l.style.top = `${(bounds[i].start / max) * 100}%`));
      };

      const st = ScrollTrigger.create({
        start: 0,
        end: "max",
        onRefresh: measure,
        onUpdate: (self) => {
          const y = self.scroll();
          setY(self.progress * track.clientHeight);
          const b = bounds.find((x) => y >= x.start && y < x.end) ?? bounds[bounds.length - 1];
          if (!b) return;
          const t = gsap.utils.clamp(0, 1, (y - b.start) / Math.max(1, b.end - b.start));
          readout.textContent = `${Math.round(gsap.utils.interpolate(b.a0, b.a1, t))}m`;
          labels.forEach((l, i) => l.classList.toggle("is-on", bounds[i] === b));
        },
      });
      measure();
      return () => st.kill();
    },
    { scope: root },
  );

  return (
    <div className="alt" ref={root} aria-hidden="true">
      <div className="alt__track">
        {STOPS.map((s) => (
          <span className="alt__stop" key={s.id}>
            {s.label}
          </span>
        ))}
        <div className="alt__marker">
          <Sprite name="pipHead" />
          <span className="alt__read">1200m</span>
        </div>
      </div>
    </div>
  );
}
