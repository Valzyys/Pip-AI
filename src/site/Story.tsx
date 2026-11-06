import { useMemo, useRef } from "react";
import { gsap, useGSAP, ScrollTrigger, reducedMotion } from "../lib/gsap";
import { navigate } from "../lib/router";
import { Sprite } from "../components/Sprite";
import { Arrow } from "./ui";
import { dayTag, fDay, fTime, split, useNow, type HomeData } from "./data";

type Data = HomeData | null | undefined;
const ask = (q: string, p?: string) => navigate(`/chat?${p ? `p=${p}&` : ""}q=${encodeURIComponent(q)}`);

/* ------------------------------------------------------------------ */
/* Crossing marquee bands — speed & direction follow scroll velocity   */
/* ------------------------------------------------------------------ */

const BAND_A = ["Jadwal theater", "Profil member", "Ulang tahun", "Siapa yang live", "Rekap live", "Setlist", "Berita"];
const BAND_B = ["Baca foto", "Baca PDF", "Kuis interaktif", "Grafik", "Mini app", "Debug kode", "Docs API"];

export function Bands() {
  const root = useRef<HTMLElement>(null);
  useGSAP(
    () => {
      if (reducedMotion) return;
      const rows = gsap.utils.toArray<HTMLElement>(".band__track", root.current).map((el, i) => ({
        el,
        x: 0,
        dir: i === 0 ? -1 : 1,
        half: el.scrollWidth / 2,
        set: gsap.quickSetter(el, "x", "px") as (v: number) => void,
      }));
      let boost = 0;
      let sign = 1;
      ScrollTrigger.create({
        trigger: root.current,
        start: "top bottom",
        end: "bottom top",
        onUpdate: (s) => {
          boost = Math.min(Math.abs(s.getVelocity()) / 140, 14);
          sign = s.direction;
        },
      });
      const resize = () => rows.forEach((r) => (r.half = r.el.scrollWidth / 2));
      window.addEventListener("resize", resize);
      const tick = (_t: number, dt: number) => {
        boost *= 0.93;
        rows.forEach((r) => {
          r.x = gsap.utils.wrap(-r.half, 0, r.x + r.dir * sign * (1 + boost) * (dt / 16.67));
          r.set(r.x);
        });
      };
      gsap.ticker.add(tick);
      return () => {
        gsap.ticker.remove(tick);
        window.removeEventListener("resize", resize);
      };
    },
    { scope: root },
  );
  const row = (items: string[], k: string) =>
    [0, 1].map((n) =>
      items.map((t, i) => (
        <span className="band__item" key={`${k}${n}${i}`}>
          {t}
          <Sprite name="spark" />
        </span>
      )),
    );
  return (
    <section className="bands" ref={root} aria-label="Yang bisa dilakukan Pip">
      <div className="band band--a">
        <div className="band__track">{row(BAND_A, "a")}</div>
      </div>
      <div className="band band--b">
        <div className="band__track">{row(BAND_B, "b")}</div>
      </div>
    </section>
  );
}

/* ------------------------------------------------------------------ */
/* Statement: words light up as you scroll, member photos pop inline   */
/* ------------------------------------------------------------------ */

export function Statement({ data }: { data: Data }) {
  const root = useRef<HTMLElement>(null);
  const faces = useMemo(() => {
    const m = data?.members ?? [];
    return [m[3], m[11], m[19], m[27]].filter(Boolean);
  }, [data]);

  const words = "Pip tahu siapa yang tampil malam ini, kapan member favoritmu ulang tahun, dan siapa yang sedang live — lalu menyusunnya jadi kartu yang bisa kamu ketuk.".split(" ");
  const faceAt: Record<number, number> = { 2: 0, 9: 1, 13: 2, 17: 3 };

  useGSAP(
    () => {
      if (reducedMotion) return;
      const q = gsap.utils.selector(root);
      gsap
        .timeline({ scrollTrigger: { trigger: ".stm__text", start: "top 78%", end: "bottom 40%", scrub: 0.5 } })
        .fromTo(q(".stm__w"), { opacity: 0.14 }, { opacity: 1, stagger: 0.12, ease: "none" }, 0)
        .fromTo(q(".stm__face"), { scale: 0, rotation: -25 }, { scale: 1, rotation: 0, stagger: 0.9, ease: "back.out(2)" }, 0.2);
    },
    { scope: root, dependencies: [faces.length], revertOnUpdate: true },
  );

  return (
    <section className="stm" ref={root}>
      <p className="label">Kenapa Pip</p>
      <p className="stm__text">
        {words.map((w, i) => (
          <span key={i}>
            <span className="stm__w">{w}</span>
            {faceAt[i] !== undefined && (
              <span className="stm__face">{faces[faceAt[i]] ? <img src={faces[faceAt[i]].img} alt={faces[faceAt[i]].nickname} /> : <i />}</span>
            )}{" "}
          </span>
        ))}
      </p>
    </section>
  );
}

/* ------------------------------------------------------------------ */
/* Hari ini: pinned horizontal rail of real JKT48 data                 */
/* ------------------------------------------------------------------ */

export function Today({ data }: { data: Data }) {
  const root = useRef<HTMLElement>(null);
  const now = useNow(1000);
  const next = data?.schedule?.[0];
  const c = next ? split(new Date(next.date).getTime() - now) : null;

  useGSAP(
    () => {
      if (reducedMotion) return;
      const sec = root.current!;
      const track = sec.querySelector<HTMLElement>(".td__track")!;
      const dist = () => Math.max(0, track.scrollWidth - sec.clientWidth);
      const tween = gsap.to(track, {
        x: () => -dist(),
        ease: "none",
        scrollTrigger: { trigger: sec, start: "top top", end: () => `+=${dist()}`, pin: true, scrub: 0.8, invalidateOnRefresh: true, anticipatePin: 1 },
      });
      gsap.to(".td__bar i", { scaleX: 1, ease: "none", scrollTrigger: { trigger: sec, start: "top top", end: () => `+=${dist()}`, scrub: true } });
      gsap.utils.toArray<HTMLElement>(".td-card", sec).forEach((card) => {
        const img = card.querySelector("img");
        if (img)
          gsap.fromTo(img, { xPercent: -8 }, { xPercent: 8, ease: "none", scrollTrigger: { trigger: card, containerAnimation: tween, start: "left right", end: "right left", scrub: true } });
        gsap.fromTo(card, { rotation: 3, y: 30 }, { rotation: -1, y: 0, ease: "none", scrollTrigger: { trigger: card, containerAnimation: tween, start: "left right", end: "center center", scrub: true } });
      });
    },
    { scope: root, dependencies: [Boolean(data)], revertOnUpdate: true },
  );

  return (
    <section className="td" id="hari-ini" ref={root}>
      <div className="td__track">
        <div className="td__intro">
          <p className="label">
            <span className="dot" /> Hari ini · data langsung dari JKT48Connect
          </p>
          <h2 className="h2">Data asli. Bukan tebakan.</h2>
          {next && c ? (
            <div className="td__count">
              <small>Show berikutnya · {next.title}</small>
              <div>
                {[
                  [c.d, "hari"],
                  [c.h, "jam"],
                  [c.m, "menit"],
                  [c.s, "detik"],
                ].map(([v, l]) => (
                  <span key={l as string}>
                    <b>{String(v).padStart(2, "0")}</b>
                    <small>{l}</small>
                  </span>
                ))}
              </div>
            </div>
          ) : (
            <p className="lead">{data === null ? "Data JKT48 belum bisa dimuat saat ini." : "Memuat data JKT48…"}</p>
          )}
          <p className="td__hint">Geser terus ke bawah →</p>
        </div>

        {(data?.schedule ?? []).slice(0, 5).map((s) => (
          <button className="td-card td-card--show" key={s.id} onClick={() => ask(`Detail show ${s.id} (${s.title})`)}>
            <span className="td-card__media">
              {s.banner ? (
                <img src={s.banner} alt={s.title} loading="lazy" />
              ) : (
                <span className="td-card__ph">
                  <Sprite name="pip" />
                  <em>{s.category === "show" ? "Show" : "Event"}</em>
                </span>
              )}
            </span>
            <span className="td-card__tag">{dayTag(s.date, now)}</span>
            <span className="td-card__meta">
              <small>Jadwal theater</small>
              <b>{s.title}</b>
              <span>
                {fDay(s.date)} · {fTime(s.date)} WIB
              </span>
            </span>
          </button>
        ))}

        {(data?.birthdays ?? []).slice(0, 2).map((b) => (
          <button className="td-card td-card--bday" key={b.name} onClick={() => ask(`Profil ${b.name} JKT48`)}>
            <span className="td-card__media">
              <img src={b.img} alt={b.name} loading="lazy" />
            </span>
            <span className="td-card__tag td-card__tag--pink">🎂 {dayTag(b.next, now)}</span>
            <span className="td-card__meta">
              <small>Ulang tahun · {b.turns} tahun</small>
              <b>{b.name}</b>
              <span>{new Date(b.next).toLocaleDateString("id-ID", { day: "numeric", month: "long" })}</span>
            </span>
          </button>
        ))}

        {(data?.news ?? []).slice(0, 3).map((n) => (
          <a className="td-card td-card--news" key={n.id} href={n.url} target="_blank" rel="noreferrer">
            <span className="td-card__media">{n.image ? <img src={n.image} alt={n.title} loading="lazy" /> : <i />}</span>
            <span className="td-card__meta">
              <small>{n.category}</small>
              <b className="clamp3">{n.title}</b>
              <span>{new Date(n.date).toLocaleDateString("id-ID", { day: "numeric", month: "short", year: "numeric" })}</span>
            </span>
          </a>
        ))}

        <button className="td-end" onClick={() => ask("Jadwal theater JKT48 terdekat apa saja?")}>
          <Sprite name="pip" />
          <b>Tanya Pip soal semua ini</b>
          <span>
            Buka chat <Arrow />
          </span>
        </button>
      </div>
      <div className="td__bar">
        <i />
      </div>
    </section>
  );
}

/* ------------------------------------------------------------------ */
/* Modes: three sticky cards that stack, each in its own theme         */
/* ------------------------------------------------------------------ */

const MODES = [
  {
    key: "pip",
    name: "Pip",
    line: "Teman ngobrol & ahli JKT48",
    skills: ["Jadwal & detail show", "Profil member", "Ulang tahun & live", "Kuis, polling, kartu"],
    ask: "Siapa member JKT48 yang ulang tahun dalam waktu dekat?",
  },
  {
    key: "pip-code",
    name: "Pip Code",
    line: "Engineer yang nggak pernah tidur",
    skills: ["Debug dari screenshot error", "Refactor & review", "Mini app yang langsung jalan", "Penjelasan ringkas"],
    ask: "Bikinin mini app timer pomodoro yang cantik",
  },
  {
    key: "pip-docs",
    name: "Pip Docs",
    line: "Pustakawan API JKT48Connect",
    skills: ["Endpoint & parameter", "Contoh curl & JavaScript", "Kuota & error", "Contoh respons asli"],
    ask: "Endpoint apa untuk jadwal theater? Tunjukkan contoh respons asli",
  },
];

function ModeDemo({ k, data }: { k: string; data: Data }) {
  if (k === "pip") {
    const b = data?.birthdays?.[0];
    return (
      <div className="md-pip">
        <p className="md-pip__me">Siapa yang ulang tahun minggu ini?</p>
        <div className="md-pip__card">
          {b ? <img src={b.img} alt={b.name} /> : <i />}
          <span>
            <small>Berikutnya</small>
            <b>{b?.name ?? "—"}</b>
            <em>{b ? `${dayTag(b.next)} · ${b.turns} tahun` : ""}</em>
          </span>
        </div>
        <p className="md-pip__bot">Tinggal sebentar lagi! Mau aku buatkan kartu ucapan? 🎉</p>
      </div>
    );
  }
  if (k === "pip-code")
    return (
      <pre className="md-code">
        <code>
          <span className="c">{"// debounce yang benar"}</span>
          {"\n"}
          <span className="k">function</span> <span className="f">debounce</span>(fn, ms) {"{"}
          {"\n  "}
          <span className="k">let</span> t;
          {"\n  "}
          <span className="k">return</span> (...a) =&gt; {"{"}
          {"\n    "}clearTimeout(t);
          {"\n    "}t = setTimeout(() =&gt; fn(...a), ms);
          {"\n  "}
          {"};"}
          {"\n}"}
          <span className="cur" />
        </code>
      </pre>
    );
  return (
    <div className="md-docs">
      <p className="md-docs__ep">
        <b>GET</b> /api/next_schedule
      </p>
      <table>
        <tbody>
          <tr>
            <td>X-API-Key</td>
            <td>header</td>
            <td>wajib</td>
          </tr>
          <tr>
            <td>id</td>
            <td>string</td>
            <td>kode show</td>
          </tr>
          <tr>
            <td>date</td>
            <td>ISO 8601</td>
            <td>waktu WIB</td>
          </tr>
        </tbody>
      </table>
    </div>
  );
}

export function Modes({ data }: { data: Data }) {
  const root = useRef<HTMLElement>(null);
  useGSAP(
    () => {
      if (reducedMotion) return;
      const cards = gsap.utils.toArray<HTMLElement>(".mc", root.current);
      cards.forEach((card, i) => {
        const nextCard = cards[i + 1];
        if (nextCard)
          gsap.to(card.querySelector(".mc__in"), {
            scale: 0.93,
            filter: "brightness(0.72)",
            ease: "none",
            // only recede once the next card actually starts covering this one
            scrollTrigger: { trigger: nextCard, start: "top 60%", end: "top 15%", scrub: true },
          });
        gsap.fromTo(
          card.querySelectorAll(".mc__skills li"),
          { x: -20, autoAlpha: 0 },
          { x: 0, autoAlpha: 1, stagger: 0.07, duration: 0.6, ease: "expo.out", scrollTrigger: { trigger: card, start: "top 70%" } },
        );
      });
      gsap.to(".md-code .cur", { autoAlpha: 0, repeat: -1, yoyo: true, duration: 0.5, ease: "steps(1)" });
    },
    { scope: root },
  );

  return (
    <section className="modes" id="mode" ref={root}>
      <div className="sec-head">
        <p className="label">Tiga mode</p>
        <h2 className="h2 js-lines">Satu Pip, tiga keahlian.</h2>
      </div>
      {MODES.map((m, i) => (
        <article className="mc" key={m.key} data-m={m.key} style={{ top: `calc(84px + ${i * 22}px)` }}>
          <div className="mc__in">
            <div className="mc__copy">
              <span className="mc__num">0{i + 1}</span>
              <h3>{m.name}</h3>
              <p>{m.line}</p>
              <ul className="mc__skills">
                {m.skills.map((s) => (
                  <li key={s}>{s}</li>
                ))}
              </ul>
              <button className="mc__try" onClick={() => ask(m.ask, m.key)}>
                Coba {m.name} <Arrow />
              </button>
            </div>
            <div className="mc__demo">
              <ModeDemo k={m.key} data={data} />
            </div>
          </div>
        </article>
      ))}
    </section>
  );
}

/* ------------------------------------------------------------------ */
/* Member wall: columns of real photos drifting in opposite directions */
/* ------------------------------------------------------------------ */

export function MemberWall({ data }: { data: Data }) {
  const root = useRef<HTMLElement>(null);
  const members = data?.members ?? [];
  const cols = useMemo(() => {
    const n = 5;
    const out: HomeData["members"][] = Array.from({ length: n }, () => []);
    members.forEach((m, i) => out[i % n].push(m));
    return out.map((c) => c.slice(0, 9));
  }, [members]);

  useGSAP(
    () => {
      if (reducedMotion || !members.length) return;
      gsap.utils.toArray<HTMLElement>(".mw__col", root.current).forEach((col, i) => {
        gsap.fromTo(col, { yPercent: i % 2 ? -18 : 6 }, { yPercent: i % 2 ? 6 : -22, ease: "none", scrollTrigger: { trigger: root.current, start: "top bottom", end: "bottom top", scrub: 0.6 } });
      });
      gsap.from(".mw__panel", { y: 60, autoAlpha: 0, duration: 1, ease: "expo.out", scrollTrigger: { trigger: ".mw__panel", start: "top 85%" } });
    },
    { scope: root, dependencies: [members.length], revertOnUpdate: true },
  );

  return (
    <section className="mw" id="member" ref={root}>
      <div className="mw__cols" aria-hidden="true">
        {cols.map((c, i) => (
          <div className="mw__col" key={i}>
            {c.map((m) => (
              <button tabIndex={-1} className="mw__tile" key={m.url} onClick={() => ask(`Profil ${m.nickname} JKT48`)}>
                <img src={m.img} alt="" loading="lazy" />
                <span>{m.nickname}</span>
              </button>
            ))}
          </div>
        ))}
      </div>
      <div className="mw__panel">
        <p className="label">Member</p>
        <h2 className="h2">{members.length ? `${members.length} member.` : "Semua member."} Tanya apa saja.</h2>
        <p className="lead">Profil, umur, tinggi, jadwal theater berikutnya, sampai rekap live terakhirnya — Pip ambil datanya untukmu.</p>
        <button className="btn btn--solid" onClick={() => ask("Tampilkan member JKT48 yang aktif")}>
          Lihat semua member <Arrow />
        </button>
      </div>
    </section>
  );
}
