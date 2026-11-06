import { useRef } from "react";
import { gsap, useGSAP, reducedMotion } from "../lib/gsap";
import { PipAvatar } from "../components/PipAvatar";
import { transitionTo } from "../components/PixelTransition";

interface Bld {
  id: "pip" | "pip-code" | "pip-docs";
  sign: string;
  kind: "tower" | "works" | "library";
  w: number; // in pixel units (--u)
  h: number;
  cols: number;
  rows: number;
  body: string;
  shade: string;
  lit: string;
  title: string;
  text: string;
  ask: string;
}

const BUILDINGS: Bld[] = [
  {
    id: "pip",
    sign: "PIP HQ",
    kind: "tower",
    w: 30,
    h: 62,
    cols: 4,
    rows: 9,
    body: "#F2A33A",
    shade: "#C9771C",
    lit: "#FFF0B3",
    title: "pip",
    text: "Profil serba bisa. Teman ngobrol, nulis caption, ngerangkum artikel, atau sekadar nanya hal random jam 2 pagi.",
    ask: "Bikinin caption lucu buat foto sunset di pantai",
  },
  {
    id: "pip-code",
    sign: "CODE WORKS",
    kind: "works",
    w: 46,
    h: 36,
    cols: 7,
    rows: 3,
    body: "#3E7FD6",
    shade: "#2A5CA8",
    lit: "#BFE6FF",
    title: "pip-code",
    text: "Pabrik kode. Debug error, refactor, review — dan bisa dipasang ke Codex atau Claude Code pakai satu API key.",
    ask: "Kenapa fetch di useEffect saya jalan dua kali?",
  },
  {
    id: "pip-docs",
    sign: "DOCS",
    kind: "library",
    w: 40,
    h: 44,
    cols: 5,
    rows: 4,
    body: "#5E9A2A",
    shade: "#3F6E17",
    lit: "#E9FFB0",
    title: "pip-docs",
    text: "Perpustakaan. Jawaban yang dirujuk ke dokumentasi publik JKT48Connect: endpoint, parameter, contoh request.",
    ask: "Endpoint apa untuk ambil jadwal theater?",
  },
];

const SKYLINE = Array.from({ length: 22 }, (_, i) => ({ w: 8 + ((i * 7) % 14), h: 20 + ((i * 29) % 48) }));

function Building({ b }: { b: Bld }) {
  return (
    <div
      className={`bld bld--${b.kind}`}
      data-id={b.id}
      data-lit={b.lit}
      style={{ "--w": b.w, "--h": b.h, "--body": b.body, "--shade": b.shade, "--lit": b.lit } as React.CSSProperties}
    >
      {b.kind === "tower" && (
        <span className="bld__antenna">
          <i />
        </span>
      )}
      {b.kind === "works" && (
        <span className="bld__chimney">
          {[0, 1, 2, 3].map((i) => (
            <i key={i} style={{ animationDelay: `${i * 0.45}s` }} />
          ))}
        </span>
      )}
      {b.kind === "library" && <span className="bld__pediment" />}
      <div className="bld__body">
        <span className="bld__sign">{b.sign}</span>
        <div className="bld__wins" style={{ gridTemplateColumns: `repeat(${b.cols}, 1fr)` }}>
          {Array.from({ length: b.cols * b.rows }, (_, i) => (
            <i key={i} />
          ))}
        </div>
        <span className="bld__door" />
      </div>
    </div>
  );
}

export function City() {
  const root = useRef<HTMLElement>(null);

  useGSAP(
    () => {
      if (reducedMotion) return;
      const q = gsap.utils.selector(root);
      const stage = q(".city__stage")[0] as HTMLElement;
      const street = q(".city__street")[0] as HTMLElement;
      const pip = q(".city__pip")[0] as HTMLElement;
      const blds = q(".bld") as HTMLElement[];
      const face = pip.querySelector(".pipa")!;

      // geometry helpers (re-evaluated on refresh/resize)
      const roof = (i: number) => {
        const body = blds[i].querySelector<HTMLElement>(".bld__body")!;
        const s = street.getBoundingClientRect();
        const r = body.getBoundingClientRect();
        return {
          x: r.left - s.left + r.width / 2 - pip.offsetWidth / 2,
          y: r.top - s.top - pip.offsetHeight + 2,
        };
      };
      const pan = (i: number) => {
        const r = roof(i);
        const vw = stage.clientWidth;
        const min = Math.min(0, vw - street.scrollWidth);
        return gsap.utils.clamp(min, 0, vw / 2 - (r.x + pip.offsetWidth / 2));
      };

      const tl = gsap.timeline({
        defaults: { ease: "none" },
        scrollTrigger: {
          trigger: root.current,
          start: "top top",
          end: "+=320%",
          pin: true,
          scrub: 0.7,
          invalidateOnRefresh: true,
        },
      });

      const light = (i: number, at: number) =>
        tl.to(
          blds[i].querySelectorAll(".bld__wins i"),
          {
            backgroundColor: BUILDINGS[i].lit,
            boxShadow: `0 0 10px ${BUILDINGS[i].lit}`,
            duration: 0.08,
            ease: "steps(1)",
            stagger: { amount: 0.08, from: "random" },
          },
          at,
        );
      const panel = (i: number, at: number) => {
        const panels = q(".city__panel");
        if (i > 0) tl.to(panels[i - 1], { clipPath: "inset(0 0 100% 0)", duration: 0.04, ease: "steps(4)" }, at);
        tl.fromTo(panels[i], { clipPath: "inset(0 0 100% 0)" }, { clipPath: "inset(0 0 0% 0)", duration: 0.05, ease: "steps(5)" }, at + 0.03);
      };
      const hop = (from: number, to: number, at: number) => {
        tl.set(face, { attr: { "data-face": "fly" } }, at)
          .to(street, { x: () => pan(to), duration: 0.12, ease: "sine.inOut" }, at)
          .to(pip, { x: () => (roof(from).x + roof(to).x) / 2, duration: 0.06, ease: "none" }, at)
          .to(pip, { y: () => Math.min(roof(from).y, roof(to).y) - stage.clientHeight * 0.16, duration: 0.06, ease: "power2.out" }, at)
          .to(pip, { x: () => roof(to).x, duration: 0.06, ease: "none" }, at + 0.06)
          .to(pip, { y: () => roof(to).y, duration: 0.06, ease: "power2.in" }, at + 0.06)
          .set(face, { attr: { "data-face": "happy" } }, at + 0.12);
      };

      // Pip drops in from the sky onto the first roof
      tl.set(street, { x: () => pan(0) }, 0)
        .fromTo(pip, { x: () => roof(0).x, y: () => -stage.clientHeight * 0.3 }, { y: () => roof(0).y, duration: 0.08, ease: "power2.in" }, 0)
        .to(".city__night", { opacity: 1, duration: 1 }, 0)
        .to(".city__stars", { opacity: 1, duration: 0.6 }, 0.2);
      tl.set(face, { attr: { "data-face": "happy" } }, 0.08);
      light(0, 0.06);
      panel(0, 0);
      hop(0, 1, 0.3);
      light(1, 0.42);
      panel(1, 0.41);
      hop(1, 2, 0.64);
      light(2, 0.76);
      panel(2, 0.75);
      tl.to({}, { duration: 0.1 }, 0.9);
    },
    { scope: root },
  );

  return (
    <section className="city" id="city" ref={root}>
      <div className="city__stage">
        <div className="city__sky" />
        <div className="city__night" />
        <div className="city__stars" aria-hidden="true">
          {Array.from({ length: 30 }, (_, i) => (
            <i key={i} style={{ left: `${(i * 31.3) % 100}%`, top: `${(i * 17.9) % 45}%`, animationDelay: `${(i % 6) * 0.4}s` }} />
          ))}
        </div>

        <div className="city__head">
          <p className="px-label">ketinggian 0m · tiga gedung, tiga profil</p>
          <div className="city__panels">
            {BUILDINGS.map((b) => (
              <article className="city__panel" key={b.id} style={{ "--c": b.body } as React.CSSProperties}>
                <h2>{b.title}</h2>
                <p>{b.text}</p>
                <button className="city__ask" onClick={() => transitionTo(`/room?p=${b.id}&q=${encodeURIComponent(b.ask)}`)}>
                  <span className="px-label">coba tanya</span> “{b.ask}” <b>▶</b>
                </button>
              </article>
            ))}
          </div>
        </div>

        <div className="city__street">
          <div className="city__skyline" aria-hidden="true">
            {SKYLINE.map((s, i) => (
              <i key={i} style={{ width: `calc(var(--u) * ${s.w})`, height: `calc(var(--u) * ${s.h})` }} />
            ))}
          </div>
          <div className="city__row">
            {BUILDINGS.map((b) => (
              <Building b={b} key={b.id} />
            ))}
          </div>
          <div className="city__pip">
            <PipAvatar face="idle" />
          </div>
          <div className="city__road" aria-hidden="true">
            {Array.from({ length: 8 }, (_, i) => (
              <span className="lamp" key={i} />
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
