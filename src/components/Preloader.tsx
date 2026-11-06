import { useRef } from "react";
import { gsap, useGSAP, reducedMotion } from "../lib/gsap";
import { Sprite } from "./Sprite";

interface Props {
  /** Fires as the curtain starts lifting, so the hero intro overlaps the reveal. */
  onReveal: () => void;
  /** Fires when the preloader is fully gone and can unmount. */
  onDone: () => void;
}

const COLS = 8;

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

      const tl = gsap.timeline({ defaults: { ease: "pip.out" } });

      tl.from(".preloader__egg", { yPercent: 60, scale: 0.4, autoAlpha: 0, duration: 0.8, ease: "pip.pop" })
        .from(".preloader__count, .preloader__label", { autoAlpha: 0, y: 12, stagger: 0.08, duration: 0.6 }, "<0.2")
        .to(
          counter,
          {
            v: 100,
            duration: 2,
            ease: "power2.inOut",
            onUpdate: () => {
              countEl.textContent = String(Math.round(counter.v)).padStart(3, "0");
            },
          },
          "<",
        )
        // nervous egg wobble while "hatching"
        .to(
          ".preloader__egg",
          { rotation: 8, duration: 0.09, repeat: 15, yoyo: true, ease: "sine.inOut", transformOrigin: "50% 90%" },
          "<0.6",
        )
        .set(".preloader__egg", { rotation: 0 })
        // crack: top shell flies, bottom shell drops
        .to(".preloader__shell--top", { y: -80, x: 30, rotation: 40, autoAlpha: 0, duration: 0.7 })
        .to(".preloader__shell--bot", { y: 40, autoAlpha: 0, duration: 0.5, ease: "power2.in" }, "<")
        .fromTo(
          ".preloader__pip",
          { scale: 0, yPercent: 40 },
          { scale: 1, yPercent: 0, duration: 0.7, ease: "pip.pop" },
          "<0.05",
        )
        .to(".preloader__pip", { y: -18, duration: 0.18, yoyo: true, repeat: 1, ease: "power1.out" })
        .to(".preloader__center", { autoAlpha: 0, y: -30, duration: 0.45, ease: "power2.in" }, "+=0.05")
        .add(onReveal, "-=0.1")
        .to(
          ".preloader__cols span",
          { yPercent: -100, duration: 0.9, ease: "pip.inOut", stagger: { each: 0.05, from: "center" } },
          "<",
        )
        .add(onDone);
    },
    { scope: root },
  );

  return (
    <div className="preloader" ref={root} aria-hidden="true">
      <div className="preloader__cols">
        {Array.from({ length: COLS }, (_, i) => (
          <span key={i} />
        ))}
      </div>
      <div className="preloader__center">
        <div className="preloader__stage">
          <div className="preloader__egg">
            <Sprite name="egg" className="preloader__shell preloader__shell--top" />
            <Sprite name="egg" className="preloader__shell preloader__shell--bot" />
          </div>
          <Sprite name="pip" className="preloader__pip" />
        </div>
        <div className="preloader__count">
          <span className="js-count">000</span>
          <i>%</i>
        </div>
        <div className="preloader__label pixel-tag">hatching pip</div>
      </div>
    </div>
  );
}
