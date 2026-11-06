import { useEffect, useRef, useState } from "react";
import { gsap, useGSAP, ScrollTrigger, reducedMotion } from "../lib/gsap";
import { navigate } from "../lib/router";
import { Sprite } from "../components/Sprite";
import { Arrow, scrollTo } from "./ui";
import { dayTag, fTime, type HomeData } from "./data";

const LINKS = [
  { id: "hari-ini", label: "Hari ini" },
  { id: "mode", label: "Mode" },
  { id: "lampiran", label: "Lampiran" },
  { id: "member", label: "Member" },
  { id: "developer", label: "Developer" },
];

/**
 * Floating pill header.
 * - an indicator glides under the hovered / active link (scroll-spy)
 * - it tightens after the hero and tucks away while scrolling down fast
 * - on phones a full-screen menu unfolds with live JKT48 info
 */
export function Header({ data }: { data: HomeData | null | undefined }) {
  const root = useRef<HTMLElement>(null);
  const [active, setActive] = useState<string | null>(null);
  const [open, setOpen] = useState(false);

  const { contextSafe } = useGSAP(
    () => {
      if (reducedMotion) return;
      gsap.from(".hd", { y: -80, autoAlpha: 0, duration: 1, ease: "expo.out", delay: 0.2 });
      gsap.from(".hd__links a", { y: -12, autoAlpha: 0, duration: 0.6, stagger: 0.05, delay: 0.5 });

      // compact after the hero, hide while scrolling down quickly, return on scroll up
      ScrollTrigger.create({
        start: 120,
        end: "max",
        onUpdate: (self) => {
          root.current?.classList.toggle("is-compact", self.scroll() > 120);
          const hide = self.direction === 1 && self.getVelocity() > 900 && self.scroll() > 600;
          gsap.to(".hd", { yPercent: hide ? -140 : 0, duration: 0.45, ease: "power3.out", overwrite: "auto" });
        },
      });

      // scroll-spy
      // sections live outside this component's scope, so pass the elements themselves
      LINKS.forEach((l) => {
        const el = document.getElementById(l.id);
        if (!el) return;
        ScrollTrigger.create({
          trigger: el,
          start: "top 55%",
          end: "bottom 55%",
          onToggle: (self) => self.isActive && setActive(l.id),
          onLeaveBack: () => l.id === LINKS[0].id && setActive(null),
        });
      });
    },
    { scope: root },
  );

  // glide the indicator to a link
  const moveInk = contextSafe((el: HTMLElement | null) => {
    const ink = root.current?.querySelector<HTMLElement>(".hd__ink");
    if (!ink) return;
    if (!el) return void gsap.to(ink, { autoAlpha: 0, duration: 0.25 });
    gsap.to(ink, { x: el.offsetLeft, width: el.offsetWidth, autoAlpha: 1, duration: 0.45, ease: "expo.out" });
  });
  useEffect(() => {
    moveInk(active ? root.current?.querySelector<HTMLElement>(`[data-id="${active}"]`) ?? null : null);
  }, [active, moveInk]);

  // full-screen menu
  useGSAP(
    () => {
      if (reducedMotion) return;
      if (open) {
        gsap
          .timeline()
          .set(".hm", { display: "flex" })
          .fromTo(".hm", { clipPath: "inset(0 0 100% 0)" }, { clipPath: "inset(0 0 0% 0)", duration: 0.6, ease: "expo.inOut" })
          .from(".hm__links a", { yPercent: 110, duration: 0.7, stagger: 0.05, ease: "expo.out" }, 0.25)
          .from(".hm__live > *", { y: 16, autoAlpha: 0, duration: 0.5, stagger: 0.06 }, 0.45);
      } else if (root.current?.querySelector<HTMLElement>(".hm")?.style.display === "flex") {
        gsap.to(".hm", { clipPath: "inset(0 0 100% 0)", duration: 0.45, ease: "expo.inOut", onComplete: () => void gsap.set(".hm", { display: "none" }) });
      }
    },
    { scope: root, dependencies: [open] },
  );
  useEffect(() => {
    document.documentElement.style.overflow = open ? "hidden" : "";
  }, [open]);

  const go = (id: string) => (e: React.MouseEvent) => {
    e.preventDefault();
    setOpen(false);
    setTimeout(() => scrollTo(`#${id}`), open ? 350 : 0);
  };

  const next = data?.schedule?.[0];
  const bday = data?.birthdays?.[0];

  return (
    <header className="hd-wrap" ref={root}>
      <div className="hd">
        <a className="hd__logo" href="/" onClick={(e) => (e.preventDefault(), window.scrollTo({ top: 0, behavior: "smooth" }))}>
          <span className="hd__mark">
            <Sprite name="pipHead" />
          </span>
          <b>Pip</b>
        </a>
        <nav className="hd__links" onMouseLeave={() => moveInk(active ? root.current?.querySelector<HTMLElement>(`[data-id="${active}"]`) ?? null : null)}>
          <span className="hd__ink" />
          {LINKS.map((l) => (
            <a key={l.id} data-id={l.id} href={`#${l.id}`} className={active === l.id ? "is-on" : ""} onClick={go(l.id)} onMouseEnter={(e) => moveInk(e.currentTarget)}>
              {l.label}
            </a>
          ))}
        </nav>
        <a className="hd__cta" href="/chat" onClick={(e) => (e.preventDefault(), navigate("/chat"))}>
          <span>Buka Pip</span>
          <Arrow />
        </a>
        <button className={`hd__burger${open ? " is-open" : ""}`} aria-label={open ? "Tutup menu" : "Buka menu"} aria-expanded={open} onClick={() => setOpen((o) => !o)}>
          <i />
          <i />
        </button>
      </div>

      <div className="hm" style={{ display: "none" }}>
        <nav className="hm__links">
          {LINKS.map((l, i) => (
            <span key={l.id} className="hm__mask">
              <a href={`#${l.id}`} onClick={go(l.id)}>
                <em>0{i + 1}</em>
                {l.label}
              </a>
            </span>
          ))}
        </nav>
        <div className="hm__live">
          {next && (
            <div className="hm__tile">
              <small>Show berikutnya · {dayTag(next.date)}</small>
              <b>{next.title}</b>
              <span>{fTime(next.date)} WIB</span>
            </div>
          )}
          {bday && (
            <div className="hm__tile">
              <small>Ulang tahun berikutnya</small>
              <b>{bday.name}</b>
              <span>{dayTag(bday.next)}</span>
            </div>
          )}
          <a className="hm__cta" href="/chat" onClick={(e) => (e.preventDefault(), navigate("/chat"))}>
            Buka Pip <Arrow />
          </a>
        </div>
      </div>
    </header>
  );
}
