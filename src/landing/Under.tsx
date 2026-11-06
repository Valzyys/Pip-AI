import { useLayoutEffect, useRef, useState } from "react";
import { gsap, useGSAP, reducedMotion } from "../lib/gsap";
import { Sprite } from "../components/Sprite";
import { PipAvatar } from "../components/PipAvatar";

const PORTS = [
  { ep: "/v1/chat/completions", who: "OpenAI SDK · curl", c: "#C6F432" },
  { ep: "/v1/responses", who: "Codex", c: "#4AA8FF" },
  { ep: "/v1/messages", who: "Claude Code", c: "#FF5FA2" },
  { ep: "/v1/models", who: "katalog profil", c: "#FFC93C" },
];

const CURL = `curl https://api.jkt48connect.app/v1/chat/completions \\
  -H "Authorization: Bearer $API_KEY" \\
  -d '{"model":"pip","messages":[{"role":"user","content":"Halo Pip"}]}'`;

interface Geo {
  w: number;
  h: number;
  paths: string[];
}

/** Orthogonal "circuit" path from the surface down to a port. */
function circuit(sx: number, ex: number, ey: number, bend: number) {
  return `M ${sx} 0 V ${bend} H ${ex} V ${ey}`;
}

export function Under() {
  const root = useRef<HTMLElement>(null);
  const [geo, setGeo] = useState<Geo | null>(null);

  // Measure the real port positions so the cables always land on them, at any layout.
  useLayoutEffect(() => {
    const sec = root.current!;
    const measure = () => {
      const s = sec.getBoundingClientRect();
      const ports = Array.from(sec.querySelectorAll<HTMLElement>(".port"));
      const w = sec.clientWidth;
      const h = sec.clientHeight;
      const paths = ports.map((p, i) => {
        const r = p.getBoundingClientRect();
        const ex = Math.round(r.left - s.left + r.width / 2);
        const ey = Math.round(r.top - s.top);
        const sx = Math.round(w * (0.38 + i * 0.08));
        const bend = Math.round(ey * (0.42 + i * 0.09));
        return circuit(sx, ex, ey, bend);
      });
      setGeo((g) => (g && g.w === w && g.h === h && g.paths.join() === paths.join() ? g : { w, h, paths }));
    };
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(sec);
    return () => ro.disconnect();
  }, []);

  useGSAP(
    () => {
      if (!geo || reducedMotion) return;
      const q = gsap.utils.selector(root);
      const paths = q(".cable__line") as unknown as SVGPathElement[];

      // Packets stream down every cable forever
      q(".cable__packets").forEach((g, i) => {
        Array.from(g.children).forEach((pkt, j) => {
          gsap.to(pkt, {
            motionPath: { path: paths[i], align: paths[i], alignOrigin: [0.5, 0.5] },
            duration: 3.2 + i * 0.4,
            ease: "none",
            repeat: -1,
            delay: j * 1.1 + i * 0.3,
          });
        });
      });

      // Pip slides down cable #0, tied to scroll
      gsap.to(".under__pip", {
        motionPath: { path: paths[0], align: paths[0], alignOrigin: [0.5, 0.9] },
        ease: "none",
        scrollTrigger: { trigger: root.current, start: "top 60%", end: "bottom 85%", scrub: 0.8 },
      });

      // Terminal types as you scroll past it
      const code = q(".term code")[0] as HTMLElement;
      const typed = { n: 0 };
      gsap.to(typed, {
        n: CURL.length,
        ease: "none",
        onUpdate: () => {
          code.textContent = CURL.slice(0, Math.round(typed.n));
        },
        scrollTrigger: { trigger: ".term", start: "top 85%", end: "bottom 40%", scrub: true },
      });

      gsap.from(".under__title .ln", {
        yPercent: 100,
        duration: 0.6,
        ease: "steps(5)",
        stagger: 0.15,
        scrollTrigger: { trigger: ".under__title", start: "top 80%" },
      });
      gsap.from(".port", {
        y: 40,
        autoAlpha: 0,
        duration: 0.5,
        ease: "steps(4)",
        stagger: 0.08,
        scrollTrigger: { trigger: ".ports", start: "top 90%" },
      });
    },
    { scope: root, dependencies: [geo], revertOnUpdate: true },
  );

  const hover = (i: number | null) => {
    if (root.current) root.current.dataset.hot = i === null ? "" : String(i);
  };

  return (
    <section className="under" id="under" ref={root}>
      <div className="under__grass" aria-hidden="true" />
      <div className="under__soil" aria-hidden="true">
        <Sprite name="fossil" className="under__fossil" />
        {Array.from({ length: 18 }, (_, i) => (
          <i key={i} className="rock" style={{ left: `${(i * 41.3) % 96}%`, top: `${8 + ((i * 29.1) % 84)}%` }} />
        ))}
      </div>

      {geo && (
        <svg className="cables" viewBox={`0 0 ${geo.w} ${geo.h}`} width={geo.w} height={geo.h} aria-hidden="true">
          {geo.paths.map((d, i) => (
            <g key={i} className={`cable cable--${i}`} style={{ "--c": PORTS[i].c } as React.CSSProperties}>
              <path className="cable__glow" d={d} />
              <path className="cable__line" d={d} />
              <g className="cable__packets">
                {[0, 1, 2].map((j) => (
                  <rect key={j} width="10" height="10" x="-5" y="-5" />
                ))}
              </g>
            </g>
          ))}
        </svg>
      )}

      <div className="under__pip" aria-hidden="true">
        <PipAvatar face="happy" />
      </div>

      <div className="under__inner">
        <p className="px-label under__label">kedalaman −40m · satu key, empat pintu</p>
        <h2 className="under__title">
          <span className="mask">
            <span className="ln">Satu key.</span>
          </span>
          <span className="mask">
            <span className="ln">Semua pintu.</span>
          </span>
        </h2>
        <p className="under__sub">
          API Pip bicara dalam format yang sudah dipakai tool favoritmu. Pakai key developer <code>jkc_…</code> yang sama
          dengan API data JKT48Connect.
        </p>

        <div className="term">
          <div className="term__bar">
            <i />
            <i />
            <i />
            <span>terminal</span>
          </div>
          <pre>
            <code>{CURL}</code>
            <span className="term__caret" />
          </pre>
        </div>

        <div className="ports">
          {PORTS.map((p, i) => (
            <div
              className="port"
              key={p.ep}
              style={{ "--c": p.c } as React.CSSProperties}
              onPointerEnter={() => hover(i)}
              onPointerLeave={() => hover(null)}
            >
              <span className="port__plug" />
              <code>{p.ep}</code>
              <span className="px-label">{p.who}</span>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
