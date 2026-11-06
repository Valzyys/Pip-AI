import { useEffect, useRef, useState } from "react";
import { gsap, useGSAP, SplitText, reducedMotion, isTouch } from "../lib/gsap";
import { navigate } from "../lib/router";
import { Sprite } from "../components/Sprite";
import { RAMP } from "../components/Pixels";
import { Arrow, scrollTo } from "./ui";
import { dayTag, fTime, type HomeData } from "./data";

const STAIRS = [1, 2, 2, 3, 4];

/** A fanned deck of real member photos that keeps shuffling. Tap → ask Pip about her. */
function Deck({ members }: { members: HomeData["members"] }) {
  const ref = useRef<HTMLDivElement>(null);
  const pool = members.length ? members : [];
  const [order, setOrder] = useState(() => [0, 1, 2, 3]);

  useEffect(() => {
    if (pool.length < 4 || reducedMotion) return;
    let k = 4;
    const id = setInterval(() => {
      const top = ref.current?.querySelector<HTMLElement>(".deck__card:last-child");
      if (!top) return;
      gsap.to(top, {
        x: 160,
        y: -40,
        rotation: 24,
        autoAlpha: 0,
        duration: 0.55,
        ease: "power3.in",
        onComplete: () => setOrder((o) => [k++ % pool.length, ...o.slice(0, 3)]),
      });
    }, 2800);
    return () => clearInterval(id);
  }, [pool.length]);

  useEffect(() => {
    const cards = ref.current?.querySelectorAll<HTMLElement>(".deck__card");
    if (!cards || reducedMotion) return;
    cards.forEach((c, i) => {
      const fromBack = i === 0;
      gsap.fromTo(
        c,
        fromBack ? { autoAlpha: 0, scale: 0.9, x: 0, y: 0, rotation: 0 } : {},
        { autoAlpha: 1, scale: 1, x: (i - 1.5) * 14, y: (3 - i) * -6, rotation: (i - 1.5) * 6, duration: 0.6, ease: "back.out(1.6)", overwrite: true },
      );
    });
  }, [order]);

  if (!pool.length) return <div className="deck deck--empty" ref={ref} />;
  return (
    <div className="deck" ref={ref}>
      {order.map((idx, i) => {
        const m = pool[idx % pool.length];
        return (
          <button key={`${idx}-${m.url}`} className="deck__card" style={{ zIndex: i }} onClick={() => navigate(`/chat?q=${encodeURIComponent(`Profil ${m.nickname} JKT48`)}`)}>
            <img src={m.img} alt={m.name} loading="eager" />
            <span>
              <b>{m.nickname}</b>
              <small>Tanya Pip →</small>
            </span>
          </button>
        );
      })}
    </div>
  );
}

export function Hero({ data }: { data: HomeData | null | undefined }) {
  const root = useRef<HTMLElement>(null);

  useGSAP(
    () => {
      if (reducedMotion) return;
      const q = gsap.utils.selector(root);
      SplitText.create(".hx__title", {
        type: "lines,chars",
        mask: "lines",
        autoSplit: true,
        onSplit: (self) => gsap.from(self.chars, { yPercent: 110, duration: 1, stagger: 0.022, ease: "expo.out", delay: 0.35 }),
      });
      gsap
        .timeline({ delay: 0.3 })
        .from(".hx__kicker", { y: 16, autoAlpha: 0, duration: 0.7, ease: "expo.out" }, 0)
        .from(".hx__sub, .hx__cta > *", { y: 24, autoAlpha: 0, duration: 0.9, stagger: 0.08, ease: "expo.out" }, 0.55)
        .from(".hx__stairs i", { y: () => -window.innerHeight, duration: 1, ease: "bounce.out", stagger: { each: 0.05, from: "end" } }, 0.4)
        .from(".hx__pip", { y: () => -window.innerHeight, duration: 0.7, ease: "power3.in" }, 1.1)
        .to(".hx__pip-body", { scaleY: 0.72, scaleX: 1.18, duration: 0.08, transformOrigin: "50% 100%" }, ">")
        .to(".hx__pip-body", { scaleY: 1, scaleX: 1, duration: 0.7, ease: "elastic.out(1, 0.35)" }, ">")
        .from(".hx__deck", { y: 80, rotation: 8, autoAlpha: 0, duration: 1, ease: "expo.out" }, 0.7);

      // pointer parallax (desktop)
      if (!isTouch) {
        const layers = [
          [q(".hx__deck")[0], 26],
          [q(".hx__stairs")[0], 10],
          [q(".hx__copy")[0], -8],
        ] as const;
        const setters = layers.map(([el, d]) => ({ x: gsap.quickTo(el, "x", { duration: 1, ease: "power3" }), y: gsap.quickTo(el, "y", { duration: 1, ease: "power3" }), d }));
        const move = (e: PointerEvent) => {
          const px = e.clientX / window.innerWidth - 0.5;
          const py = e.clientY / window.innerHeight - 0.5;
          setters.forEach((s) => (s.x(px * s.d), s.y(py * s.d)));
        };
        window.addEventListener("pointermove", move);
        return () => window.removeEventListener("pointermove", move);
      }
    },
    { scope: root },
  );

  // scrubbed exit: copy lifts and fades, stairs sink, deck flies off
  useGSAP(
    () => {
      if (reducedMotion) return;
      const st = { trigger: root.current, start: "top top", end: "bottom top", scrub: 0.6 };
      gsap.to(".hx__copy-inner", { yPercent: -28, autoAlpha: 0.1, ease: "none", scrollTrigger: st });
      gsap.to(".hx__deck-wrap", { yPercent: -40, rotation: -10, ease: "none", scrollTrigger: st });
      gsap.utils.toArray<HTMLElement>(".hx__stairs > span", root.current).forEach((c, i) =>
        gsap.to(c, { yPercent: 40 + i * 22, ease: "none", scrollTrigger: st }),
      );
      gsap.to(".hx__pip-wrap", { yPercent: -160, rotation: -25, ease: "none", scrollTrigger: st });
    },
    { scope: root },
  );

  // live pills appear when data lands
  useEffect(() => {
    if (!data || reducedMotion || !root.current) return;
    gsap.from(root.current.querySelectorAll(".hx__live > *"), { y: 12, autoAlpha: 0, duration: 0.6, stagger: 0.08, ease: "expo.out", delay: 0.9 });
  }, [data]);

  const next = data?.schedule?.[0];
  const bday = data?.birthdays?.[0];
  const live = data?.live?.length ?? 0;

  return (
    <section className="hx" id="top" ref={root}>
      <div className="hx__copy">
        <div className="hx__copy-inner">
          <p className="hx__kicker">
            <span className="dot" /> Asisten AI dari JKT48Connect
          </p>
          <h1 className="hx__title">
            Semua soal JKT48,
            <br />
            <em>tinggal tanya Pip.</em>
          </h1>
          <p className="hx__sub">
            Jadwal theater, profil member, ulang tahun, siapa yang lagi live — dijawab dengan data asli, langsung jadi kartu yang bisa
            kamu ketuk. Pip juga bisa membaca foto & dokumen, dan bikin mini app.
          </p>
          <div className="hx__cta">
            <button className="btn btn--solid" onClick={() => navigate("/chat")}>
              Mulai ngobrol <Arrow />
            </button>
            <button className="btn btn--ghost" onClick={() => scrollTo("#hari-ini")}>
              Lihat data hari ini
            </button>
          </div>
          <div className="hx__live">
            {next && (
              <button className="pill-live" onClick={() => navigate(`/chat?q=${encodeURIComponent(`Detail show ${next.id} (${next.title})`)}`)}>
                <i className="pill-live__dot" />
                <span>
                  {dayTag(next.date)} · {fTime(next.date)}
                </span>
                <b>{next.title}</b>
              </button>
            )}
            {bday && (
              <button className="pill-live" onClick={() => navigate(`/chat?q=${encodeURIComponent(`Profil ${bday.name} JKT48`)}`)}>
                <span>🎂 {dayTag(bday.next)}</span>
                <b>{bday.name}</b>
              </button>
            )}
            {data && (
              <button className="pill-live" onClick={() => navigate(`/chat?q=${encodeURIComponent("Siapa member JKT48 yang lagi live sekarang?")}`)}>
                <i className={`pill-live__dot${live ? " is-live" : " is-off"}`} />
                <b>{live ? `${live} member sedang live` : "Belum ada yang live"}</b>
              </button>
            )}
          </div>
        </div>
      </div>

      <div className="hx__deck-wrap">
        <div className="hx__deck">
          <Deck members={data?.members ?? []} />
        </div>
      </div>

      <div className="hx__scene" aria-hidden="true">
        <div className="hx__stairs">
          {STAIRS.map((h, c) => (
            <span key={c}>
              {Array.from({ length: h }, (_, r) => (
                <i key={r} style={{ background: RAMP[(c + r) % RAMP.length] }} />
              ))}
            </span>
          ))}
        </div>
        <div className="hx__pip-wrap">
          <div className="hx__pip">
            <div className="hx__pip-body">
              <Sprite name="pip" />
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
