import { useRef, useState } from "react";
import { gsap, useGSAP, SplitText, ScrollSmoother, reducedMotion } from "../lib/gsap";
import { navigate } from "../lib/router";
import { Sprite } from "../components/Sprite";
import { PixelIcon, RAMP, type IconName } from "../components/Pixels";

const LINKS = [
  { href: "#produk", label: "Produk" },
  { href: "#kemampuan", label: "Kemampuan" },
  { href: "#profil", label: "Profil" },
  { href: "#developer", label: "Developer" },
];

export function scrollTo(hash: string) {
  const s = ScrollSmoother.get();
  if (s) s.scrollTo(hash, true, "top 64px");
  else document.querySelector(hash)?.scrollIntoView({ behavior: "smooth" });
}

export function Arrow() {
  return (
    <svg className="arrow" viewBox="0 0 10 10" aria-hidden="true">
      <path d="M1 5h7M5 1.5 8.5 5 5 8.5" fill="none" stroke="currentColor" strokeWidth="1.4" />
    </svg>
  );
}

/* ------------------------------------------------------------------ */
/* Nav                                                                 */
/* ------------------------------------------------------------------ */

export function Nav() {
  const root = useRef<HTMLElement>(null);
  const [open, setOpen] = useState(false);

  useGSAP(
    () => {
      if (reducedMotion) return;
      gsap.from(".nav > *", { y: -20, autoAlpha: 0, duration: 0.8, stagger: 0.08, delay: 0.1 });
      gsap.from(".nav__links a", { y: -10, autoAlpha: 0, duration: 0.6, stagger: 0.05, delay: 0.3 });
    },
    { scope: root },
  );

  const go = (href: string) => (e: React.MouseEvent) => {
    e.preventDefault();
    setOpen(false);
    scrollTo(href);
  };

  return (
    <header className={`nav${open ? " is-open" : ""}`} ref={root}>
      <a className="nav__logo" href="/" onClick={go("#top")} aria-label="Pip — beranda">
        <Sprite name="pipHead" />
        <span>Pip</span>
      </a>
      <nav className="nav__links" aria-label="Navigasi">
        {LINKS.map((l) => (
          <a key={l.href} href={l.href} onClick={go(l.href)}>
            {l.label}
          </a>
        ))}
      </nav>
      <a
        className="nav__cta"
        href="/chat"
        onClick={(e) => {
          e.preventDefault();
          navigate("/chat");
        }}
      >
        Coba Pip <Arrow />
      </a>
      <button className="nav__menu" aria-label="Menu" aria-expanded={open} onClick={() => setOpen((o) => !o)}>
        {Array.from({ length: 9 }, (_, i) => (
          <i key={i} />
        ))}
      </button>
    </header>
  );
}

/* ------------------------------------------------------------------ */
/* Hero                                                                */
/* ------------------------------------------------------------------ */

// block columns from left to right (heights in blocks); Pip sits on the tallest
const STAIRS = [1, 1, 2, 2, 3, 4];
const DROPS: IconName[] = ["image", "doc", "code", "image", "doc"];

export function Hero() {
  const root = useRef<HTMLElement>(null);

  useGSAP(
    () => {
      if (reducedMotion) return;
      const q = gsap.utils.selector(root);
      SplitText.create(".hero__title", {
        type: "lines",
        mask: "lines",
        linesClass: "ln",
        autoSplit: true, // waits for webfonts and re-splits on resize
        onSplit: (self) => gsap.from(self.lines, { yPercent: 105, duration: 1.2, stagger: 0.1, delay: 0.45 }),
      });

      const tl = gsap.timeline({ delay: 0.2 });
      tl.from(".hero__grid i", { scaleY: 0, transformOrigin: "50% 0%", duration: 1.6, stagger: 0.06, ease: "pip.inOut" }, 0)
        .fromTo(".hero__arc path", { strokeDashoffset: 1 }, { strokeDashoffset: 0, duration: 2.2, ease: "pip.inOut" }, 0.2)
        .from(".hero__sub, .hero__cta", { y: 24, autoAlpha: 0, duration: 1, stagger: 0.1 }, 0.6)
        .from(".stair i", { y: () => -window.innerHeight, duration: 0.9, ease: "bounce.out", stagger: { each: 0.06, from: "start" } }, 0.4)
        .from(".hero__single i", { y: () => -window.innerHeight, duration: 0.9, ease: "bounce.out", stagger: 0.1 }, 0.5)
        .from(".hero__pip", { y: () => -window.innerHeight, duration: 0.6, ease: "power3.in" }, 1.2)
        .to(".hero__pip-body", { scaleY: 0.7, scaleX: 1.2, duration: 0.08, transformOrigin: "50% 100%" }, ">")
        .to(".hero__pip-body", { scaleY: 1, scaleX: 1, duration: 0.6, ease: "elastic.out(1, 0.4)" }, ">");

      // files keep dropping into Pip: that's the product in one loop
      const drops = q(".drop") as HTMLElement[];
      const pip = q(".hero__pip")[0] as HTMLElement;
      const chute = q(".hero__chute")[0] as HTMLElement;
      const loop = gsap.timeline({ repeat: -1, delay: 2.2 });
      drops.forEach((d) => {
        loop
          .fromTo(
            d,
            { x: 0, y: 0, scale: 1, autoAlpha: 0, rotation: () => gsap.utils.random(-20, 20) },
            {
              keyframes: [
                { autoAlpha: 1, duration: 0.15 },
                {
                  x: () => pip.offsetLeft + pip.offsetWidth / 2 - chute.offsetLeft - d.offsetWidth / 2,
                  y: () => pip.offsetTop + pip.offsetHeight * 0.35 - chute.offsetTop,
                  rotation: 0,
                  scale: 0.35,
                  duration: 0.9,
                  ease: "power2.in",
                },
                { autoAlpha: 0, duration: 0.05 },
              ],
            },
          )
          .to(".hero__pip-body", { scaleY: 0.86, scaleX: 1.08, duration: 0.08, yoyo: true, repeat: 1, transformOrigin: "50% 100%" })
          .fromTo(".hero__spark", { scale: 0, autoAlpha: 1 }, { scale: 1.4, autoAlpha: 0, duration: 0.5, ease: "power2.out" }, "<")
          .to({}, { duration: 0.6 });
      });

      // blink
      const blink = () =>
        gsap
          .timeline({ onComplete: () => void gsap.delayedCall(gsap.utils.random(2, 4.5), blink) })
          .set(".hero__pip .pip-open", { autoAlpha: 0 })
          .set(".hero__pip .pip-blink", { autoAlpha: 1 })
          .set(".hero__pip .pip-open", { autoAlpha: 1 }, 0.12)
          .set(".hero__pip .pip-blink", { autoAlpha: 0 }, 0.12);
      gsap.delayedCall(3, blink);

      // scroll away: copy rises, stairs sink at different speeds
      const st = { trigger: root.current, start: "top top", end: "bottom top", scrub: true };
      gsap.to(".hero__copy", { yPercent: -30, autoAlpha: 0, ease: "none", scrollTrigger: st });
      gsap.utils.toArray<HTMLElement>(".stair", root.current).forEach((s, i) =>
        gsap.to(s, { yPercent: 20 + i * 14, ease: "none", scrollTrigger: st }),
      );
      gsap.to(".hero__pip", { yPercent: -90, ease: "none", scrollTrigger: st }); // yPercent: the intro owns `y`
    },
    { scope: root },
  );

  return (
    <section className="hero" id="top" ref={root}>
      <div className="hero__grid" aria-hidden="true">
        {[0, 1, 2, 3, 4].map((i) => (
          <i key={i} />
        ))}
        <svg className="hero__arc" viewBox="0 0 1000 1000" preserveAspectRatio="none">
          <path d="M0 980 C 300 960, 700 700, 1000 80" pathLength={1} />
        </svg>
      </div>

      <div className="hero__copy">
        <h1 className="hero__title">
          Tanya apa saja.
          <br />
          Lampirkan apa saja.
        </h1>
        <p className="hero__sub">
          Pip membaca foto, PDF, dan dokumenmu, lalu menjawab dalam hitungan detik, dalam Bahasa Indonesia atau English.
          Asisten AI dari JKT48Connect.
        </p>
        <div className="hero__cta">
          <button className="btn btn--solid" onClick={() => navigate("/chat")}>
            Mulai ngobrol <Arrow />
          </button>
          <button className="btn btn--ghost" onClick={() => scrollTo("#developer")}>
            Lihat API
          </button>
        </div>
      </div>

      <div className="hero__scene" aria-hidden="true">
        <div className="hero__single">
          <i style={{ background: RAMP[1] }} />
        </div>
        <div className="hero__stairs">
          {STAIRS.map((h, c) => (
            <div className="stair" key={c}>
              {Array.from({ length: h }, (_, r) => (
                <i key={r} style={{ background: RAMP[Math.min(4, (c + r) % 5)] }} />
              ))}
            </div>
          ))}
        </div>
        <div className="hero__pip">
          <div className="hero__pip-body">
            <Sprite name="pip" className="pip-open" />
            <Sprite name="pipBlink" className="pip-blink" />
          </div>
          <span className="hero__spark" />
        </div>
        <div className="hero__chute">
          {DROPS.map((d, i) => (
            <span className="drop" key={i}>
              <PixelIcon name={d} />
            </span>
          ))}
        </div>
      </div>
    </section>
  );
}

/** Mistral-style announcement row under the hero. */
export function Announce() {
  return (
    <a
      className="announce"
      href="/chat"
      onClick={(e) => {
        e.preventDefault();
        navigate("/chat");
      }}
    >
      <span className="announce__thumb">
        <PixelIcon name="image" />
      </span>
      <span className="announce__text">
        <b>Baru</b> Pip sekarang bisa membaca gambar dan dokumen. Lampirkan, lalu tanya.
      </span>
      <span className="announce__go">
        <Arrow />
      </span>
    </a>
  );
}
