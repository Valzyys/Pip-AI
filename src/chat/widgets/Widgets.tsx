import { useEffect, useRef, useState } from "react";
import { gsap, reducedMotion } from "../../lib/gsap";
import { Icon } from "../icons";
import { TOOL_LABEL, type Part } from "../types";
import { UiBlocks } from "./UiBlocks";
import { AppCard } from "./AppCard";

/* eslint-disable @typescript-eslint/no-explicit-any */
type Any = any;
type Prompt = (text: string) => void;

const TZ = "Asia/Jakarta";
const fDay = (iso: string) => new Date(iso).toLocaleDateString("id-ID", { timeZone: TZ, weekday: "short", day: "numeric", month: "short" });
const fTime = (iso: string) => new Date(iso).toLocaleTimeString("id-ID", { timeZone: TZ, hour: "2-digit", minute: "2-digit" });
const fLong = (iso: string) => new Date(iso).toLocaleDateString("id-ID", { timeZone: TZ, weekday: "long", day: "numeric", month: "long", year: "numeric" });

export function useNow(ms = 1000) {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), ms);
    return () => clearInterval(id);
  }, [ms]);
  return now;
}

/** "Hari ini" / "Besok" / "H-3" relative to WIB calendar days. */
export function dayTag(iso: string, now = Date.now()) {
  const d = (t: number) => Math.floor((t + 7 * 3600_000) / 86_400_000);
  const diff = d(new Date(iso).getTime()) - d(now);
  if (diff === 0) return "Hari ini";
  if (diff === 1) return "Besok";
  if (diff < 0) return `${-diff} hari lalu`;
  return `H-${diff}`;
}

function countdown(to: number, now: number) {
  let s = Math.max(0, Math.floor((to - now) / 1000));
  const d = Math.floor(s / 86400);
  s -= d * 86400;
  const h = Math.floor(s / 3600);
  s -= h * 3600;
  const m = Math.floor(s / 60);
  return { d, h, m, s: s - m * 60 };
}

function Img({ src, alt, className }: { src?: string | null; alt: string; className?: string }) {
  const [ok, setOk] = useState(Boolean(src));
  if (!src || !ok) return <span className={`img-fallback ${className ?? ""}`}>{alt.slice(0, 1)}</span>;
  return <img className={className} src={src} alt={alt} loading="lazy" onError={() => setOk(false)} />;
}

function CardHead({ icon, title, sub, tint }: { icon: Parameters<typeof Icon>[0]["name"]; title: string; sub?: string; tint: string }) {
  return (
    <div className="w-head">
      <span className="w-head__icon" style={{ background: tint }}>
        <Icon name={icon} size={16} stroke={2.2} />
      </span>
      <b>{title}</b>
      {sub && <span className="w-head__sub">{sub}</span>}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* JKT48 widgets                                                       */
/* ------------------------------------------------------------------ */

function Schedule({ ui, onPrompt }: { ui: Any; onPrompt: Prompt }) {
  const now = useNow(30_000);
  const items: Any[] = ui.items ?? [];
  if (!items.length) return <Empty icon="calendar" text="Belum ada jadwal show yang diumumkan." />;
  const [first, ...rest] = items;
  return (
    <div className="w w--schedule">
      <CardHead icon="calendar" title="Jadwal Theater" sub={`${items.length} show`} tint="#FF7A1A" />
      <button className="sch-hero" onClick={() => onPrompt(`Detail show ${first.id} (${first.title})`)}>
        <Img src={first.banner} alt={first.title} className="sch-hero__img" />
        <span className="sch-hero__shade" />
        <span className="sch-hero__tag">{dayTag(first.date, now)}</span>
        <span className="sch-hero__meta">
          <b>{first.title}</b>
          <span>
            {fDay(first.date)} · {fTime(first.date)} WIB
          </span>
        </span>
      </button>
      <ul className="w-list">
        {rest.map((s) => (
          <li key={s.id}>
            <button className="w-row" onClick={() => onPrompt(`Detail show ${s.id} (${s.title})`)}>
              <Img src={s.banner} alt={s.title} className="w-row__thumb w-row__thumb--wide" />
              <span className="w-row__main">
                <b>{s.title}</b>
                <span>
                  {fDay(s.date)} · {fTime(s.date)} WIB
                </span>
              </span>
              <span className="pill">{dayTag(s.date, now)}</span>
              <Icon name="chevron" size={16} className="w-row__chev" />
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}

function Theater({ ui, onPrompt }: { ui: Any; onPrompt: Prompt }) {
  const s = ui.show ?? {};
  const [songs, setSongs] = useState(false);
  return (
    <div className="w w--theater">
      <div className="th-banner">
        <Img src={s.banner} alt={s.title ?? "Show"} />
      </div>
      <div className="th-body">
        <div className="th-title">
          <b>{s.title}</b>
          {s.team && <span className="pill pill--soft">{s.team}</span>}
        </div>
        {s.date && (
          <p className="th-when">
            <Icon name="clock" size={15} /> {fLong(s.date)} · {fTime(s.date)} WIB
          </p>
        )}
        {(s.seitansai?.length > 0 || s.graduation?.length > 0) && (
          <div className="th-badges">
            {s.seitansai?.map((m: Any, i: number) => (
              <span className="badge badge--bday" key={`s${i}`}>
                🎂 Seitansai {m.name}
              </span>
            ))}
            {s.graduation?.map((m: Any, i: number) => (
              <span className="badge badge--grad" key={`g${i}`}>
                🎓 Graduation {m.name}
              </span>
            ))}
          </div>
        )}
        <p className="w-label">{s.members?.length ?? 0} member tampil</p>
        <div className="avatars">
          {(s.members ?? []).map((m: Any, i: number) => (
            <button key={`${m.name}-${i}`} className="avatar" onClick={() => onPrompt(`Profil ${m.name}`)}>
              <Img src={m.img} alt={m.name} />
              <span>{m.name}</span>
            </button>
          ))}
        </div>
        {s.songs?.length > 0 && (
          <>
            <button className="w-toggle" onClick={() => setSongs((v) => !v)}>
              <Icon name="music" size={15} /> {songs ? "Sembunyikan" : "Lihat"} {s.songs.length} lagu
            </button>
            {songs && (
              <ol className="songs">
                {s.songs.map((t: string, i: number) => (
                  <li key={i}>{t}</li>
                ))}
              </ol>
            )}
          </>
        )}
        {s.url && (
          <a className="w-btn" href={s.url} target="_blank" rel="noreferrer">
            <Icon name="ticket" size={17} /> Beli tiket di jkt48.com
          </a>
        )}
      </div>
    </div>
  );
}

function Members({ ui, onPrompt }: { ui: Any; onPrompt: Prompt }) {
  const items: Any[] = ui.items ?? [];
  if (!items.length) return <Empty icon="people" text={`Tidak ada member yang cocok dengan "${ui.query}".`} />;
  return (
    <div className="w w--members">
      <CardHead icon="people" title={ui.query ? `Hasil “${ui.query}”` : "Member JKT48"} sub={ui.total > items.length ? `${items.length} dari ${ui.total}` : `${items.length}`} tint="#AF52DE" />
      <div className="mgrid">
        {items.map((m) => (
          <button key={m.url} className="mtile" onClick={() => onPrompt(`Profil ${m.nickname}`)}>
            <Img src={m.img} alt={m.name} />
            <span className="mtile__shade" />
            <span className="mtile__name">
              <b>{m.nickname}</b>
              <small>{m.name}</small>
            </span>
            {m.graduate && <span className="mtile__grad">Lulus</span>}
          </button>
        ))}
      </div>
    </div>
  );
}

function Member({ ui, onPrompt }: { ui: Any; onPrompt: Prompt }) {
  const p = ui.profile ?? {};
  const bday = p.birthdate ? new Date(p.birthdate).toLocaleDateString("id-ID", { timeZone: TZ, day: "numeric", month: "long", year: "numeric" }) : "—";
  return (
    <div className="w w--member">
      <div className="mp-hero">
        <Img src={p.img} alt={p.name ?? "Member"} className="mp-bg" />
        <div className="mp-photo">
          <Img src={p.img} alt={p.name ?? "Member"} />
        </div>
        <div className="mp-name">
          <b>{p.nickname ?? p.name}</b>
          <span>{p.name}</span>
          <span className={`pill ${p.graduate ? "pill--gray" : "pill--ok"}`}>{p.graduate ? "Sudah lulus" : "Member aktif"}</span>
        </div>
      </div>
      <div className="mp-stats">
        <div>
          <small>Umur</small>
          <b>{p.age ?? "—"}</b>
        </div>
        <div>
          <small>Tinggi</small>
          <b>{p.height ?? "—"}</b>
        </div>
        <div>
          <small>Gol. darah</small>
          <b>{p.bloodType ?? "—"}</b>
        </div>
      </div>
      <div className="mp-body">
        <p className="mp-line">
          <Icon name="gift" size={15} /> Lahir {bday}
        </p>
        {p.jikosokai && <p className="mp-quote">“{p.jikosokai}”</p>}
        {p.socials?.length > 0 && (
          <div className="chips">
            {p.socials.map((s: Any) => (
              <a key={s.url} className="chip" href={s.url} target="_blank" rel="noreferrer">
                <Icon name="link" size={14} /> {s.title ?? "Sosmed"}
              </a>
            ))}
          </div>
        )}
        {p.upcoming?.length > 0 && (
          <>
            <p className="w-label">Jadwal theater berikutnya</p>
            <ul className="w-list w-list--flat">
              {p.upcoming.map((t: Any) => (
                <li key={t.id}>
                  <button className="w-row" onClick={() => onPrompt(`Detail show ${t.id}`)}>
                    <span className="w-row__main">
                      <b>{t.title}</b>
                      {t.date && <span>{fDay(t.date)}</span>}
                    </span>
                    <Icon name="chevron" size={16} className="w-row__chev" />
                  </button>
                </li>
              ))}
            </ul>
          </>
        )}
        <div className="w-actions">
          <button className="w-btn w-btn--soft" onClick={() => onPrompt(`Rekap live terakhir ${p.nickname ?? p.name}`)}>
            <Icon name="live" size={16} /> Rekap live
          </button>
          <button className="w-btn w-btn--soft" onClick={() => onPrompt(`Buat kartu fakta seru tentang ${p.nickname ?? p.name} pakai UI`)}>
            <Icon name="sparkles" size={16} /> Kartu fakta
          </button>
        </div>
      </div>
    </div>
  );
}

function Birthdays({ ui, onPrompt }: { ui: Any; onPrompt: Prompt }) {
  const now = useNow(1000);
  const items: Any[] = ui.items ?? [];
  if (!items.length) return <Empty icon="gift" text="Belum ada data ulang tahun." />;
  const [first, ...rest] = items;
  const c = countdown(new Date(first.next).getTime(), now);
  const today = dayTag(first.next, now) === "Hari ini";
  return (
    <div className="w w--bday">
      <CardHead icon="gift" title="Ulang Tahun Member" tint="#FF2D55" />
      <button className="bd-hero" onClick={() => onPrompt(`Profil ${first.name}`)}>
        <Img src={first.img} alt={first.name} className="bd-hero__img" />
        <span className="bd-hero__txt">
          <small>{today ? "Hari ini ulang tahun! 🎉" : "Berikutnya"}</small>
          <b>{first.name}</b>
          <span>
            {new Date(first.next).toLocaleDateString("id-ID", { timeZone: TZ, day: "numeric", month: "long" })} · {first.turns} tahun
          </span>
        </span>
        {!today && (
          <span className="bd-count">
            {[
              [c.d, "hari"],
              [c.h, "jam"],
              [c.m, "mnt"],
              [c.s, "dtk"],
            ].map(([v, l]) => (
              <span key={l as string}>
                <b>{String(v).padStart(2, "0")}</b>
                <small>{l}</small>
              </span>
            ))}
          </span>
        )}
      </button>
      <ul className="w-list">
        {rest.map((b) => (
          <li key={b.name}>
            <button className="w-row" onClick={() => onPrompt(`Profil ${b.name}`)}>
              <Img src={b.img} alt={b.name} className="w-row__thumb w-row__thumb--round" />
              <span className="w-row__main">
                <b>{b.name}</b>
                <span>
                  {new Date(b.next).toLocaleDateString("id-ID", { timeZone: TZ, day: "numeric", month: "long" })} · {b.turns} tahun
                </span>
              </span>
              <span className="pill pill--pink">{dayTag(b.next, now)}</span>
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}

function News({ ui }: { ui: Any }) {
  const items: Any[] = ui.items ?? [];
  if (!items.length) return <Empty icon="news" text="Tidak ada berita yang cocok." />;
  return (
    <div className="w w--news">
      <CardHead icon="news" title="Berita JKT48" tint="#34C759" />
      <ul className="w-list">
        {items.map((n) => (
          <li key={n.id}>
            <a className="w-row" href={n.url} target="_blank" rel="noreferrer">
              <Img src={n.image} alt={n.title} className="w-row__thumb w-row__thumb--news" />
              <span className="w-row__main">
                <span className="w-row__kicker">{n.category}</span>
                <b className="clamp2">{n.title}</b>
                <span>{new Date(n.date).toLocaleDateString("id-ID", { timeZone: TZ, day: "numeric", month: "short", year: "numeric" })}</span>
              </span>
              <Icon name="link" size={15} className="w-row__chev" />
            </a>
          </li>
        ))}
      </ul>
    </div>
  );
}

function Live({ ui, onPrompt }: { ui: Any; onPrompt: Prompt }) {
  const items: Any[] = ui.items ?? [];
  return (
    <div className="w w--live">
      <CardHead icon="live" title="Sedang Live" sub={items.length ? `${items.length} member` : undefined} tint="#FF3B30" />
      {!items.length ? (
        <div className="live-empty">
          <span className="live-dot live-dot--off" />
          <div>
            <b>Belum ada yang live</b>
            <span>Coba cek lagi nanti, atau lihat rekap live terakhir.</span>
          </div>
          <button className="w-btn w-btn--soft" onClick={() => onPrompt("Rekap live terakhir member JKT48")}>
            Rekap
          </button>
        </div>
      ) : (
        <ul className="w-list">
          {items.map((l, i) => (
            <li key={i}>
              <a className="w-row" href={l.url ?? undefined} target="_blank" rel="noreferrer">
                <span className="live-ava">
                  <Img src={l.img} alt={l.name} className="w-row__thumb w-row__thumb--round" />
                  <span className="live-badge">LIVE</span>
                </span>
                <span className="w-row__main">
                  <b>{l.name}</b>
                  <span>
                    {(l.type ?? "").toUpperCase()} {l.title ? `· ${l.title}` : ""}
                  </span>
                </span>
                {l.viewers != null && (
                  <span className="pill pill--soft">
                    <Icon name="eye" size={13} /> {Number(l.viewers).toLocaleString("id-ID")}
                  </span>
                )}
              </a>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function Recent({ ui }: { ui: Any }) {
  const items: Any[] = ui.items ?? [];
  if (!items.length) return <Empty icon="live" text="Belum ada rekap live yang cocok." />;
  return (
    <div className="w w--recent">
      <CardHead icon="live" title="Rekap Live" tint="#5856D6" />
      <div className="hscroll">
        {items.map((r) => (
          <article className="rc" key={r.id}>
            <div className="rc__top">
              <Img src={r.img} alt={r.name ?? ""} className="rc__ava" />
              <div>
                <b>{r.name}</b>
                <span className={`plat plat--${r.type}`}>{r.type === "showroom" ? "SHOWROOM" : (r.type ?? "").toUpperCase()}</span>
              </div>
            </div>
            {r.title && <p className="rc__title clamp2">{r.title}</p>}
            <div className="rc__stats">
              <span>
                <small>Durasi</small>
                <b>{r.duration ? `${Math.round(r.duration / 60000)}m` : "—"}</b>
              </span>
              <span>
                <small>Penonton</small>
                <b>{r.viewers != null ? Number(r.viewers).toLocaleString("id-ID") : "—"}</b>
              </span>
              <span>
                <small>Poin</small>
                <b>{r.points != null ? Number(r.points).toLocaleString("id-ID") : "—"}</b>
              </span>
            </div>
            <p className="rc__when">{r.start ? `${fDay(r.start)} · ${fTime(r.start)}` : ""}</p>
            {r.replay && (
              <a className="w-btn w-btn--soft" href={r.replay} target="_blank" rel="noreferrer">
                <Icon name="play" size={14} /> Replay
              </a>
            )}
          </article>
        ))}
      </div>
    </div>
  );
}

function Setlists({ ui, onPrompt }: { ui: Any; onPrompt: Prompt }) {
  const items: Any[] = ui.items ?? [];
  return (
    <div className="w w--setlist">
      <CardHead icon="music" title="Setlist Theater" sub={`${items.length}`} tint="#FF9500" />
      <div className="chips chips--pad">
        {items.map((s) => (
          <button key={s.id} className="chip chip--big" onClick={() => onPrompt(`Kapan show setlist ${s.title} berikutnya?`)}>
            {s.title}
          </button>
        ))}
      </div>
    </div>
  );
}

const W_ICON = (code: number) => (code === 0 || code === 1 ? "☀️" : code <= 3 ? "⛅" : code <= 48 ? "🌫️" : code <= 67 || (code >= 80 && code <= 82) ? "🌧️" : code >= 95 ? "⛈️" : "🌥️");
function Weather({ ui }: { ui: Any }) {
  const c = ui.current ?? {};
  const tone = c.code <= 1 ? "sun" : c.code <= 3 ? "cloud" : c.code >= 95 ? "storm" : "rain";
  return (
    <div className={`w w--weather wx--${tone}`}>
      <div className="wx-top">
        <div>
          <b>{ui.city}</b>
          <span>{ui.region}</span>
        </div>
        <span className="wx-emoji">{W_ICON(c.code)}</span>
      </div>
      <div className="wx-temp">{Math.round(c.temp)}°</div>
      <p className="wx-label">
        {c.label} · terasa {Math.round(c.feels)}° · lembap {c.humidity}%
      </p>
      <div className="wx-days">
        {(ui.daily ?? []).map((d: Any) => (
          <div key={d.date}>
            <small>{new Date(d.date).toLocaleDateString("id-ID", { weekday: "short" })}</small>
            <span>{W_ICON(d.code)}</span>
            <b>{Math.round(d.max)}°</b>
            <small>{Math.round(d.min)}°</small>
          </div>
        ))}
      </div>
    </div>
  );
}

function Calc({ ui }: { ui: Any }) {
  return (
    <div className="w w--calc">
      <span className="calc-expr">{ui.expression}</span>
      <span className="calc-res">= {Number(ui.result).toLocaleString("id-ID", { maximumFractionDigits: 6 })}</span>
    </div>
  );
}

function Empty({ icon, text }: { icon: Parameters<typeof Icon>[0]["name"]; text: string }) {
  return (
    <div className="w w--empty">
      <Icon name={icon} size={20} />
      <span>{text}</span>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* dispatcher                                                          */
/* ------------------------------------------------------------------ */

export function ToolPart({ part, onPrompt, animate }: { part: Extract<Part, { kind: "tool" }>; onPrompt: Prompt; animate: boolean }) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!animate || reducedMotion || part.status !== "done" || !ref.current) return;
    const el = ref.current;
    gsap.fromTo(el, { y: 16, scale: 0.96, autoAlpha: 0 }, { y: 0, scale: 1, autoAlpha: 1, duration: 0.6, ease: "back.out(1.4)" });
    const kids = el.querySelectorAll(".w-row, .mtile, .avatar, .rc, .chip, .ub > *, .wx-days > div, .bd-count > span");
    if (kids.length) gsap.from(kids, { y: 10, autoAlpha: 0, duration: 0.45, stagger: 0.035, delay: 0.12, ease: "power2.out" });
  }, [part.status, animate]);

  if (part.status === "running")
    return (
      <div className="tool-chip">
        <span className="spinner" />
        {TOOL_LABEL[part.name] ?? "Memakai tool"}…
      </div>
    );
  if (part.status === "error")
    return (
      <div className="tool-chip tool-chip--err">
        <Icon name="close" size={14} /> {TOOL_LABEL[part.name] ?? part.name} gagal: {part.error}
      </div>
    );

  const ui = (part.ui ?? {}) as Any;
  let body: React.ReactNode = null;
  switch (ui.type) {
    case "schedule":
      body = <Schedule ui={ui} onPrompt={onPrompt} />;
      break;
    case "theater":
      body = <Theater ui={ui} onPrompt={onPrompt} />;
      break;
    case "members":
      body = <Members ui={ui} onPrompt={onPrompt} />;
      break;
    case "member":
      body = <Member ui={ui} onPrompt={onPrompt} />;
      break;
    case "birthdays":
      body = <Birthdays ui={ui} onPrompt={onPrompt} />;
      break;
    case "news":
      body = <News ui={ui} />;
      break;
    case "live":
      body = <Live ui={ui} onPrompt={onPrompt} />;
      break;
    case "recent":
      body = <Recent ui={ui} />;
      break;
    case "setlists":
      body = <Setlists ui={ui} onPrompt={onPrompt} />;
      break;
    case "weather":
      body = <Weather ui={ui} />;
      break;
    case "calc":
      body = <Calc ui={ui} />;
      break;
    case "ui":
      body = <UiBlocks title={ui.title} blocks={ui.blocks ?? []} onPrompt={onPrompt} />;
      break;
    case "app":
      body = <AppCard title={ui.title} html={ui.html} />;
      break;
    default:
      return null;
  }
  return (
    <div className="tool-part" ref={ref}>
      {body}
    </div>
  );
}
