import { useRef, useState } from "react";
import { gsap, useGSAP, ScrollTrigger, scrollToTarget, reducedMotion } from "../lib/gsap";
import { Sprite } from "./Sprite";

const LINKS = [
  { href: "#features", label: "Capabilities" },
  { href: "#demo", label: "Try Pip" },
  { href: "#models", label: "Models" },
  { href: "#numbers", label: "Numbers" },
  { href: "#cta", label: "Contact" },
];

// 3×3 grid → "X" : which dots stay visible, and where they go.
const X_DOTS = [0, 2, 4, 6, 8];

export function Nav({ ready }: { ready: boolean }) {
  const root = useRef<HTMLDivElement>(null);
  const [open, setOpen] = useState(false);
  const menuTl = useRef<gsap.core.Timeline>();

  const { contextSafe } = useGSAP(
    () => {
      const dots = gsap.utils.toArray<HTMLElement>(".nav__menu span");

      // Menu open/close timeline (played forward / reversed)
      menuTl.current = gsap
        .timeline({ paused: true, defaults: { ease: "pip.inOut" } })
        .set(".menu", { visibility: "visible" })
        .fromTo(
          ".menu__bg span",
          { scaleY: 0 },
          { scaleY: 1, duration: 0.7, stagger: { each: 0.06, from: "start" }, transformOrigin: "50% 0%" },
        )
        .fromTo(
          ".menu__list a span",
          { yPercent: 115, rotate: 4 },
          { yPercent: 0, rotate: 0, duration: 0.8, ease: "pip.out", stagger: 0.06 },
          "-=0.35",
        )
        .fromTo(".menu__list em", { autoAlpha: 0, x: -10 }, { autoAlpha: 1, x: 0, stagger: 0.06, duration: 0.5 }, "<0.1")
        .fromTo(".menu__foot", { autoAlpha: 0, y: 20 }, { autoAlpha: 1, y: 0, duration: 0.6, ease: "pip.out" }, "<0.2")
        .fromTo(".menu__pip", { yPercent: 120 }, { yPercent: 0, duration: 0.7, ease: "pip.pop" }, "<")
        .to(dots.filter((_, i) => !X_DOTS.includes(i)), { scale: 0, duration: 0.3 }, 0)
        .to(dots, { backgroundColor: "#C6F432", duration: 0.3 }, 0);

      // Hide header on scroll down, show on scroll up
      if (!reducedMotion) {
        const show = gsap.quickTo(".nav", "yPercent", { duration: 0.45, ease: "power3" });
        ScrollTrigger.create({
          start: 0,
          end: "max",
          onUpdate: (self) => {
            if (document.body.classList.contains("menu-open")) return;
            show(self.direction === 1 && self.scroll() > 200 ? -110 : 0);
          },
        });
      }
    },
    { scope: root },
  );

  useGSAP(
    () => {
      if (!ready || reducedMotion) return;
      gsap.from(".nav > *", { yPercent: -100, autoAlpha: 0, duration: 0.9, stagger: 0.08, delay: 0.35 });
    },
    { scope: root, dependencies: [ready] },
  );

  const toggle = contextSafe((next = !open) => {
    setOpen(next);
    document.body.classList.toggle("menu-open", next);
    if (next) menuTl.current?.timeScale(1).play();
    else menuTl.current?.timeScale(1.6).reverse();
  });

  const go = (href: string) => (e: React.MouseEvent) => {
    e.preventDefault();
    const wasOpen = open;
    toggle(false);
    window.setTimeout(() => scrollToTarget(href), wasOpen ? 500 : 0);
  };

  return (
    <div ref={root}>
      <header className="nav">
        <a className="nav__logo" href="#top" aria-label="Pip-AI home" onClick={go("#top")}>
          <Sprite name="pipHead" />
          <span className="nav__word">pip</span>
        </a>
        <a className="nav__cta" href="#cta" onClick={go("#cta")}>
          <span className="roll" data-text="Get in touch">
            <span>Get in touch</span>
          </span>
          <Sprite name="chev" className="nav__chev" />
        </a>
        <button
          className="nav__menu"
          aria-label={open ? "Close menu" : "Open menu"}
          aria-expanded={open}
          onClick={() => toggle()}
        >
          {Array.from({ length: 9 }, (_, i) => (
            <span key={i} />
          ))}
        </button>
      </header>

      <nav className="menu" aria-hidden={!open}>
        <div className="menu__bg">
          {Array.from({ length: 6 }, (_, i) => (
            <span key={i} />
          ))}
        </div>
        <div className="menu__inner">
          <ul className="menu__list">
            {LINKS.map((l, i) => (
              <li key={l.href}>
                <a href={l.href} onClick={go(l.href)} tabIndex={open ? 0 : -1}>
                  <em>{String(i + 1).padStart(2, "0")}</em>
                  <span>{l.label}</span>
                </a>
              </li>
            ))}
          </ul>
          <div className="menu__foot">
            <span className="pixel-tag">pip · by jkt48connect</span>
            <Sprite name="pipCool" className="menu__pip" />
          </div>
        </div>
      </nav>
    </div>
  );
}
