import { useRef } from "react";
import { gsap, useGSAP, reducedMotion } from "../lib/gsap";
import { navigate } from "../lib/router";

const COLS = 10;
const ROWS = 7;
const EVT = "pip:transition";

/** Navigate with a pixel-block wipe: blocks fill the screen, the route swaps, blocks clear. */
export function transitionTo(to: string) {
  window.dispatchEvent(new CustomEvent(EVT, { detail: to }));
}

export function PixelTransition() {
  const root = useRef<HTMLDivElement>(null);
  const busy = useRef(false);

  useGSAP(
    () => {
      const cells = gsap.utils.toArray<HTMLElement>(".ptx i", root.current);
      gsap.set(cells, { scale: 0 });

      const onGo = (e: Event) => {
        const to = (e as CustomEvent<string>).detail;
        if (reducedMotion) return navigate(to);
        if (busy.current) return;
        busy.current = true;
        gsap
          .timeline({ onComplete: () => void (busy.current = false) })
          .set(root.current, { visibility: "visible" })
          .to(cells, { scale: 1, duration: 0.35, ease: "steps(3)", stagger: { amount: 0.45, from: "random" } })
          .add(() => navigate(to))
          .to(cells, { scale: 0, duration: 0.35, ease: "steps(3)", stagger: { amount: 0.5, from: "random" } }, "+=0.25")
          .set(root.current, { visibility: "hidden" });
      };
      window.addEventListener(EVT, onGo);
      return () => window.removeEventListener(EVT, onGo);
    },
    { scope: root },
  );

  return (
    <div className="ptx" ref={root} aria-hidden="true">
      {Array.from({ length: COLS * ROWS }, (_, i) => (
        <i key={i} style={{ background: ["#141018", "#141018", "#141018", "#FFC93C", "#C6F432"][i % 5 === 0 ? (i % 3) + 2 : 0] }} />
      ))}
    </div>
  );
}
