import { useRef } from "react";
import { gsap, useGSAP, isTouch, reducedMotion } from "../lib/gsap";

/** Square pixel cursor that lags behind the pointer and morphs over interactive elements. */
export function Cursor() {
  const root = useRef<HTMLDivElement>(null);

  useGSAP(() => {
    if (isTouch || reducedMotion) return;
    const el = root.current!;
    const label = el.querySelector<HTMLElement>(".cursor__label")!;
    document.documentElement.classList.add("has-cursor");

    gsap.set(el, { xPercent: -50, yPercent: -50 });
    const xTo = gsap.quickTo(el, "x", { duration: 0.45, ease: "power3" });
    const yTo = gsap.quickTo(el, "y", { duration: 0.45, ease: "power3" });

    let mode = "";
    const setMode = (next: string) => {
      if (next === mode) return;
      mode = next;
      el.dataset.mode = next;
      label.textContent = next === "pet" ? "pet me" : next === "drag" ? "drag" : "";
      gsap.to(el.querySelector(".cursor__dot"), {
        scale: next === "hover" ? 3.2 : next === "pet" ? 4.2 : next === "none" ? 0 : 1,
        rotation: next === "hover" ? 45 : 0,
        duration: 0.5,
        ease: "pip.pop",
      });
      gsap.to(label, { autoAlpha: next === "pet" ? 1 : 0, duration: 0.25 });
    };

    let shown = false;
    const onMove = (e: PointerEvent) => {
      if (!shown) {
        shown = true;
        gsap.set(el, { x: e.clientX, y: e.clientY });
        gsap.to(el, { opacity: 1, duration: 0.3 });
      }
      xTo(e.clientX);
      yTo(e.clientY);
      const t = (e.target as HTMLElement | null)?.closest<HTMLElement>("[data-cursor], a, button, input");
      setMode(t?.dataset.cursor ?? (t ? (t.tagName === "INPUT" ? "none" : "hover") : ""));
    };
    const onDown = () => gsap.to(el, { scale: 0.7, duration: 0.15 });
    const onUp = () => gsap.to(el, { scale: 1, duration: 0.4, ease: "pip.pop" });
    const onLeave = () => gsap.to(el, { opacity: 0, duration: 0.2 });
    const onEnter = () => shown && gsap.to(el, { opacity: 1, duration: 0.2 });

    window.addEventListener("pointermove", onMove);
    window.addEventListener("pointerdown", onDown);
    window.addEventListener("pointerup", onUp);
    document.addEventListener("mouseleave", onLeave);
    document.addEventListener("mouseenter", onEnter);
    return () => {
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerdown", onDown);
      window.removeEventListener("pointerup", onUp);
      document.removeEventListener("mouseleave", onLeave);
      document.removeEventListener("mouseenter", onEnter);
      document.documentElement.classList.remove("has-cursor");
    };
  });

  return (
    <div className="cursor" ref={root} aria-hidden="true">
      <div className="cursor__dot" />
      <div className="cursor__label" />
    </div>
  );
}
