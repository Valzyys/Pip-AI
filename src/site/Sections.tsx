import { useMemo, useRef, useState } from "react";
import { gsap, useGSAP, reducedMotion, isTouch } from "../lib/gsap";
import { navigate } from "../lib/router";
import { GLYPHS } from "../lib/sprites";
import { PixelIcon, Pixels, RAMP, type IconName } from "../components/Pixels";
import { Arrow, scrollTo } from "./Top";

/* ------------------------------------------------------------------ */
/* Capabilities                                                        */
/* ------------------------------------------------------------------ */

const CAPS: { icon: IconName; title: string; text: string }[] = [
  { icon: "image", title: "Membaca gambar", text: "Foto, screenshot, struk, poster. Teks di dalam gambar ikut dibaca." },
  { icon: "doc", title: "Membaca dokumen", text: "PDF, Word, Excel, CSV, dan file teks atau kode hingga 10 MB." },
  { icon: "code", title: "Menulis & review kode", text: "Profil pip-code untuk debug, refactor, dan menjelaskan kode." },
  { icon: "book", title: "Paham dokumentasi", text: "Profil pip-docs menjawab dari dokumentasi publik JKT48Connect." },
  { icon: "bolt", title: "Jawaban streaming", text: "Jawaban muncul kata demi kata, dan bisa dihentikan kapan saja." },
  { icon: "plug", title: "Kompatibel OpenAI", text: "Dipakai dari OpenAI SDK, Codex, atau Claude Code dengan satu key." },
];

export function Capabilities() {
  const root = useRef<HTMLElement>(null);

  useGSAP(
    () => {
      if (reducedMotion) return;
      gsap.utils.toArray<HTMLElement>(".cap", root.current).forEach((cap, i) => {
        const px = cap.querySelectorAll(".px-on");
        gsap
          .timeline({ scrollTrigger: { trigger: cap, start: "top 85%" }, delay: (i % 3) * 0.08 })
          .from(px, { scale: 0, duration: 0.5, ease: "back.out(2)", stagger: { amount: 0.5, from: "random" } })
          .from(cap.querySelectorAll("h3, p"), { y: 16, autoAlpha: 0, duration: 0.8, stagger: 0.06 }, 0.15);

        if (!isTouch)
          cap.addEventListener("pointerenter", () =>
            gsap.fromTo(
              px,
              { y: 0 },
              { y: -6, duration: 0.18, ease: "power2.out", yoyo: true, repeat: 1, stagger: { amount: 0.25, from: "start", grid: "auto" } },
            ),
          );
      });
    },
    { scope: root },
  );

  return (
    <section className="caps" id="kemampuan" ref={root}>
      <div className="sec-head">
        <p className="label">Kemampuan</p>
        <h2 className="h2 js-lines">Satu asisten, banyak bentuk input.</h2>
      </div>
      <div className="caps__grid">
        {CAPS.map((c) => (
          <article className="cap" key={c.title}>
            <PixelIcon name={c.icon} className="cap__icon" ramp={RAMP} />
            <h3>{c.title}</h3>
            <p>{c.text}</p>
          </article>
        ))}
      </div>
    </section>
  );
}

/* ------------------------------------------------------------------ */
/* Profiles                                                            */
/* ------------------------------------------------------------------ */

const PROFILES: { id: string; heights: number[]; title: string; text: string; ask: string }[] = [
  {
    id: "pip",
    heights: [2, 3, 2, 4, 3],
    title: "Untuk sehari-hari",
    text: "Ngobrol, menulis, merangkum, menerjemahkan, dan membaca lampiran apa pun.",
    ask: "Rangkum artikel ini jadi 5 poin",
  },
  {
    id: "pip-code",
    heights: [1, 3, 5, 3, 1],
    title: "Untuk ngoding",
    text: "Kirim screenshot error atau file kode, dapatkan perbaikan yang bisa langsung dipakai.",
    ask: "Kenapa useEffect saya jalan dua kali?",
  },
  {
    id: "pip-docs",
    heights: [4, 4, 4, 4, 4],
    title: "Untuk dokumentasi",
    text: "Endpoint, parameter, dan contoh request dari dokumentasi publik JKT48Connect.",
    ask: "Endpoint apa untuk jadwal theater?",
  },
];

export function Profiles() {
  const root = useRef<HTMLElement>(null);

  useGSAP(
    () => {
      if (reducedMotion) return;
      gsap.utils.toArray<HTMLElement>(".prof", root.current).forEach((card, i) => {
        gsap
          .timeline({ scrollTrigger: { trigger: card, start: "top 80%" }, delay: i * 0.1 })
          .from(card.querySelectorAll(".prof__col i"), {
            yPercent: -600,
            autoAlpha: 0,
            duration: 0.7,
            ease: "bounce.out",
            stagger: { each: 0.03, from: "end" },
          })
          .from(card.querySelectorAll(".prof__body > *"), { y: 20, autoAlpha: 0, duration: 0.8, stagger: 0.06 }, 0.2);
      });
    },
    { scope: root },
  );

  return (
    <section className="profs" id="profil" ref={root}>
      <div className="sec-head">
        <p className="label">Profil</p>
        <h2 className="h2 js-lines">Pilih profil sesuai pekerjaanmu.</h2>
      </div>
      <div className="profs__grid">
        {PROFILES.map((p) => (
          <article className="prof" key={p.id}>
            <div className="prof__blocks" aria-hidden="true">
              {p.heights.map((h, c) => (
                <span className="prof__col" key={c}>
                  {Array.from({ length: h }, (_, r) => (
                    <i key={r} style={{ background: RAMP[Math.min(4, 4 - r)] }} />
                  ))}
                </span>
              ))}
            </div>
            <div className="prof__body">
              <code className="prof__id">{p.id}</code>
              <h3>{p.title}</h3>
              <p>{p.text}</p>
              <button className="prof__try" onClick={() => navigate(`/chat?p=${p.id}&q=${encodeURIComponent(p.ask)}`)}>
                Coba: “{p.ask}” <Arrow />
              </button>
            </div>
          </article>
        ))}
      </div>
    </section>
  );
}

/* ------------------------------------------------------------------ */
/* Developers                                                          */
/* ------------------------------------------------------------------ */

const SNIPPETS: { id: string; label: string; code: string }[] = [
  {
    id: "curl",
    label: "curl",
    code: `curl https://api.jkt48connect.app/v1/chat/completions \\
  -H "Authorization: Bearer $API_KEY" \\
  -H "Content-Type: application/json" \\
  -d '{"model":"pip","messages":[{"role":"user","content":"Halo Pip"}]}'`,
  },
  {
    id: "py",
    label: "Python",
    code: `import os
from openai import OpenAI

client = OpenAI(base_url="https://api.jkt48connect.app/v1",
                api_key=os.environ["API_KEY"])
r = client.responses.create(model="pip-code",
                            input="Jelaskan fungsi async di Python.")
print(r.output_text)`,
  },
  {
    id: "codex",
    label: "Codex",
    code: `model_provider = "pip"
model = "pip-code"

[model_providers.pip]
name = "Pip by JKT48Connect"
base_url = "https://api.jkt48connect.app/v1"
env_key = "API_KEY"
wire_api = "responses"`,
  },
  {
    id: "claude",
    label: "Claude Code",
    code: `export ANTHROPIC_BASE_URL="https://api.jkt48connect.app"
export ANTHROPIC_AUTH_TOKEN="$API_KEY"
export ANTHROPIC_MODEL="pip-code"
claude --model pip-code`,
  },
];

const ENDPOINTS = [
  ["POST", "/v1/chat/completions", "OpenAI Chat Completions"],
  ["POST", "/v1/responses", "OpenAI Responses (Codex)"],
  ["POST", "/v1/messages", "Anthropic Messages"],
  ["GET", "/v1/models", "Katalog profil"],
];

export function Developers() {
  const root = useRef<HTMLElement>(null);
  const [tab, setTab] = useState(0);
  const [copied, setCopied] = useState(false);

  const { contextSafe } = useGSAP(
    () => {
      if (reducedMotion) return;
      gsap.from(".ep", {
        x: -24,
        autoAlpha: 0,
        stagger: 0.06,
        duration: 0.8,
        scrollTrigger: { trigger: ".eps", start: "top 85%" },
      });
      gsap.from(".code-card", {
        y: 60,
        autoAlpha: 0,
        duration: 1.1,
        scrollTrigger: { trigger: ".code-card", start: "top 85%" },
      });
    },
    { scope: root },
  );

  const pick = contextSafe((i: number) => {
    if (i === tab) return;
    const lines = root.current!.querySelectorAll(".code-card pre .cl");
    const btn = root.current!.querySelectorAll<HTMLElement>(".tabs button")[i];
    gsap.to(".tabs__ink", { x: btn.offsetLeft, width: btn.offsetWidth, duration: 0.5, ease: "pip.out" });
    if (reducedMotion) return setTab(i);
    gsap.to(lines, {
      autoAlpha: 0,
      x: -8,
      duration: 0.15,
      stagger: 0.015,
      onComplete: () => {
        setTab(i);
        requestAnimationFrame(() =>
          gsap.fromTo(
            root.current!.querySelectorAll(".code-card pre .cl"),
            { autoAlpha: 0, x: 10 },
            { autoAlpha: 1, x: 0, duration: 0.4, stagger: 0.03, ease: "pip.out" },
          ),
        );
      },
    });
  });

  return (
    <section className="devs" id="developer" ref={root}>
      <div className="devs__copy">
        <p className="label">Developer</p>
        <h2 className="h2 js-lines">Satu key. API yang sudah kamu kenal.</h2>
        <p className="lead">
          Pakai key developer <code>jkc_…</code> yang sama dengan API data JKT48Connect. Format request mengikuti OpenAI
          dan Anthropic, jadi SDK dan tool yang sudah ada langsung jalan.
        </p>
        <ul className="eps">
          {ENDPOINTS.map(([m, p, d]) => (
            <li className="ep" key={p}>
              <span className={`ep__m ep__m--${m.toLowerCase()}`}>{m}</span>
              <code>{p}</code>
              <span>{d}</span>
            </li>
          ))}
        </ul>
      </div>

      <div className="code-card">
        <div className="tabs" role="tablist">
          {SNIPPETS.map((s, i) => (
            <button key={s.id} role="tab" aria-selected={tab === i} className={tab === i ? "is-on" : ""} onClick={() => pick(i)}>
              {s.label}
            </button>
          ))}
          <span className="tabs__ink" />
          <button
            className="code-card__copy"
            onClick={() =>
              void navigator.clipboard?.writeText(SNIPPETS[tab].code).then(() => {
                setCopied(true);
                setTimeout(() => setCopied(false), 1400);
              })
            }
          >
            {copied ? "Tersalin" : "Salin"}
          </button>
        </div>
        <pre>
          <code>
            {SNIPPETS[tab].code.split("\n").map((l, i) => (
              <span className="cl" key={`${tab}-${i}`}>
                <em>{String(i + 1).padStart(2, " ")}</em>
                {l || " "}
                {"\n"}
              </span>
            ))}
          </code>
        </pre>
      </div>
    </section>
  );
}

/* ------------------------------------------------------------------ */
/* Block wall CTA                                                      */
/* ------------------------------------------------------------------ */

const WALL_COLS = 20;
const WALL_ROWS = 7;

export function Wall() {
  const root = useRef<HTMLElement>(null);

  // a stepped skyline: each column has its own height, coloured bottom (deep) → top (light)
  const cells = useMemo(() => {
    const heights = Array.from({ length: WALL_COLS }, (_, c) => {
      const wave = Math.sin(c * 0.55) * 1.6 + Math.sin(c * 1.7) * 0.8;
      return Math.max(2, Math.min(WALL_ROWS, Math.round(4.5 + wave)));
    });
    const out: { on: boolean; color: string }[] = [];
    for (let r = 0; r < WALL_ROWS; r++)
      for (let c = 0; c < WALL_COLS; c++) {
        const fromBottom = WALL_ROWS - r;
        out.push({ on: fromBottom <= heights[c], color: RAMP[Math.max(0, Math.min(4, 5 - fromBottom))] });
      }
    return out;
  }, []);

  useGSAP(
    () => {
      if (reducedMotion) return;
      gsap.from(".wall__grid .on", {
        scale: 0,
        ease: "power2.out",
        stagger: { amount: 1, grid: [WALL_ROWS, WALL_COLS], from: "end", axis: "y" },
        scrollTrigger: { trigger: ".wall__grid", start: "top 95%", end: "bottom 70%", scrub: 0.5 },
      });
    },
    { scope: root },
  );

  return (
    <section className="wall" ref={root}>
      <div className="wall__copy">
        <h2 className="h2 js-lines">Pip siap membaca. Kamu siap bertanya?</h2>
        <div className="wall__cta">
          <button className="btn btn--solid" onClick={() => navigate("/chat")}>
            Mulai ngobrol <Arrow />
          </button>
          <button className="btn btn--ghost" onClick={() => scrollTo("#developer")}>
            Dokumentasi API
          </button>
        </div>
      </div>
      <div className="wall__grid" style={{ gridTemplateColumns: `repeat(${WALL_COLS}, 1fr)` }} aria-hidden="true">
        {cells.map((c, i) => (
          <i key={i} className={c.on ? "on" : ""} style={c.on ? { background: c.color } : undefined} />
        ))}
      </div>
    </section>
  );
}

/* ------------------------------------------------------------------ */
/* Footer                                                              */
/* ------------------------------------------------------------------ */

export function Footer() {
  const root = useRef<HTMLElement>(null);
  const rows = useMemo(() => {
    const word = ["P", "I", "P"].map((ch) => GLYPHS[ch]);
    return word[0].map((_, y) => word.map((g) => g[y].replace(/1/g, "#").replace(/0/g, ".")).join("."));
  }, []);

  useGSAP(
    () => {
      if (reducedMotion) return;
      gsap.from(".foot__word .px-on", {
        y: () => gsap.utils.random(-200, -40),
        autoAlpha: 0,
        ease: "power3.out",
        stagger: { amount: 0.6, from: "random" },
        scrollTrigger: { trigger: ".foot__word", start: "top bottom", end: "bottom bottom", scrub: 0.8 },
      });
    },
    { scope: root },
  );

  return (
    <footer className="foot" ref={root}>
      <div className="foot__cols">
        <div>
          <p className="label">Pip</p>
          <p className="foot__about">Asisten AI dari JKT48Connect. Backend Mistral, disajikan dari Cloudflare Workers.</p>
        </div>
        <div>
          <p className="label">Produk</p>
          <a href="/chat" onClick={(e) => (e.preventDefault(), navigate("/chat"))}>
            Pip Chat
          </a>
          <a href="#kemampuan" onClick={(e) => (e.preventDefault(), scrollTo("#kemampuan"))}>
            Kemampuan
          </a>
          <a href="#profil" onClick={(e) => (e.preventDefault(), scrollTo("#profil"))}>
            Profil
          </a>
        </div>
        <div>
          <p className="label">Developer</p>
          <a href="#developer" onClick={(e) => (e.preventDefault(), scrollTo("#developer"))}>
            API
          </a>
          <a href="https://api.jkt48connect.app" target="_blank" rel="noreferrer">
            api.jkt48connect.app
          </a>
        </div>
      </div>
      <Pixels rows={rows} className="foot__word" ramp={RAMP} />
      <div className="foot__row">
        <span>© 2026 Pip · JKT48Connect</span>
        <span className="label">Dibuat dengan GSAP + React</span>
      </div>
    </footer>
  );
}
