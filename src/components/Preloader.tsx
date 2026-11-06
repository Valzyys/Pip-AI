import { useRef } from "react";
import { gsap, useGSAP, reducedMotion } from "../lib/gsap";
import { Sprite } from "./Sprite";

interface Props {
  /** Fires as the curtain starts lifting, so the intro overlaps the reveal. */
  onReveal: () => void;
  /** Fires when the preloader is fully gone and can unmount. */
  onDone: () => void;
}

const COLS = 8;

/** An egg wobbles, cracks, and Pip pops out — then the curtain lifts in pixel columns. */
export function Preloader({ onReveal, onDone }: Props) {
  const root = useRef<HTMLDivElement>(null);

  useGSAP(
    () => {
      if (reducedMotion) {
        onReveal();
        onDone();
        return;
      }
      const counter = { v: 0 };
      const countEl = root.current!.querySelector<HTMLElement>(".js-count")!;

      gsap
        .timeline()
        .from(".pre__egg", { y: 30, scale: 0.4, autoAlpha: 0, duration: 0.5, ease: "steps(4)" })
        .to(
          counter,
          {
            v: 100,
            duration: 1.4,
            ease: "power2.inOut",
            onUpdate: () => {
              countEl.textContent = String(Math.round(counter.v)).padStart(3, "0");
            },
          },
          "<",
        )
        .to(".pre__egg", { rotation: 10, duration: 0.08, repeat: 11, yoyo: true, ease: "steps(1)", transformOrigin: "50% 90%" }, "<0.3")
        .set(".pre__egg", { rotation: 0 })
        .to(".pre__shell--top", { y: -70, x: 26, rotation: 45, autoAlpha: 0, duration: 0.5, ease: "steps(5)" })
        .to(".pre__shell--bot", { y: 30, autoAlpha: 0, duration: 0.4, ease: "steps(4)" }, "<")
        .fromTo(".pre__pip", { scale: 0 }, { scale: 1, duration: 0.4, ease: "steps(4)" }, "<")
        .to(".pre__pip", { y: -16, duration: 0.15, yoyo: true, repeat: 1, ease: "steps(2)" })
        .to(".pre__center", { autoAlpha: 0, duration: 0.25, ease: "steps(3)" }, "+=0.05")
        .add(onReveal, "-=0.05")
        .to(".pre__cols span", { yPercent: -100, duration: 0.7, ease: "pip.inOut", stagger: { each: 0.045, from: "center" } }, "<")
        .add(onDone);
    },
    { scope: root },
  );

  return (
    <div className="pre" ref={root} aria-hidden="true">
      <div className="pre__cols">
        {Array.from({ length: COLS }, (_, i) => (
          <span key={i} />
        ))}
      </div>
      <div className="pre__center">
        <div className="pre__stage">
          <div className="pre__egg">
            <Sprite name="egg" className="pre__shell pre__shell--top" />
            <Sprite name="egg" className="pre__shell pre__shell--bot" />
          </div>
          <Sprite name="pip" className="pre__pip" />
        </div>
        <div className="pre__count">
          <span className="js-count">000</span>
        </div>
        <div className="pre__label">menetas…</div>
      </div>
    </div>
  );
}
