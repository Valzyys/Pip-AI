import { useEffect, useMemo, useRef, useState } from "react";
import { gsap, reducedMotion } from "../../lib/gsap";
import { Markdown } from "../../lib/markdown";
import { useNow } from "./Widgets";

/* eslint-disable @typescript-eslint/no-explicit-any */
type Any = any;
type Prompt = (text: string) => void;

const COLORS = ["#FF7A1A", "#5856D6", "#34C759", "#FF2D55", "#0A84FF", "#FFCC00", "#AF52DE", "#5AC8FA"];
const str = (v: unknown) => (v == null ? "" : typeof v === "string" ? v : typeof v === "number" ? String(v) : JSON.stringify(v));
const arr = (v: unknown): Any[] => (Array.isArray(v) ? v : []);

/** Renders the declarative UI that Pip builds with the show_ui tool. Unknown blocks are skipped. */
export function UiBlocks({ title, blocks, onPrompt }: { title?: string | null; blocks: Any[]; onPrompt: Prompt }) {
  return (
    <div className="w w--ui">
      {title && <div className="ub-title">{title}</div>}
      <div className="ub">
        {blocks.map((b, i) => (
          <Block key={i} b={b ?? {}} onPrompt={onPrompt} />
        ))}
      </div>
    </div>
  );
}

function Block({ b, onPrompt }: { b: Any; onPrompt: Prompt }) {
  const text = str(b.text ?? b.content ?? b.body);
  switch (b.type) {
    case "heading":
      return <h4 className="ub-h">{text || str(b.title)}</h4>;
    case "text":
      return (
        <div className="ub-text">
          <Markdown text={text} />
        </div>
      );
    case "divider":
      return <hr className="ub-hr" />;
    case "card":
      return (
        <div className="ub-card">
          {b.image && <img src={str(b.image)} alt="" loading="lazy" />}
          <div>
            {b.title && <b>{str(b.title)}</b>}
            {b.subtitle && <small>{str(b.subtitle)}</small>}
            {text && <p>{text}</p>}
          </div>
        </div>
      );
    case "stats":
      return (
        <div className="ub-stats">
          {arr(b.items).map((s, i) => (
            <div key={i}>
              <small>{str(s.label)}</small>
              <b>{str(s.value)}</b>
              {s.hint && <span>{str(s.hint)}</span>}
            </div>
          ))}
        </div>
      );
    case "table": {
      const cols = arr(b.columns ?? b.headers);
      const rows = arr(b.rows);
      return (
        <div className="ub-table">
          <table>
            {cols.length > 0 && (
              <thead>
                <tr>
                  {cols.map((c, i) => (
                    <th key={i}>{str(c)}</th>
                  ))}
                </tr>
              </thead>
            )}
            <tbody>
              {rows.map((r, i) => (
                <tr key={i}>
                  {(Array.isArray(r) ? r : cols.map((c) => r?.[str(c)])).map((c: unknown, j: number) => (
                    <td key={j}>{str(c)}</td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      );
    }
    case "list":
      return (
        <ul className="ub-list">
          {arr(b.items).map((it, i) => (
            <li key={i}>{typeof it === "object" ? str(it.text ?? it.title ?? it.label) : str(it)}</li>
          ))}
        </ul>
      );
    case "checklist":
      return <Checklist items={arr(b.items).map((it) => (typeof it === "object" ? str(it.text ?? it.label) : str(it)))} />;
    case "progress":
      return <Progress label={str(b.label ?? b.title)} value={Number(b.value) || 0} max={Number(b.max) || 100} />;
    case "chart":
      return <Chart b={b} />;
    case "quiz":
      return <Quiz q={str(b.question)} options={arr(b.options).map(str)} answer={Number(b.answer)} explain={str(b.explain ?? b.explanation)} />;
    case "poll":
      return <Poll q={str(b.question)} options={arr(b.options).map(str)} onPrompt={onPrompt} />;
    case "countdown":
      return <Countdown label={str(b.label ?? b.title)} to={str(b.to ?? b.date)} />;
    case "timeline":
      return (
        <ol className="ub-timeline">
          {arr(b.items).map((it, i) => (
            <li key={i}>
              <span className="ub-timeline__dot" />
              <div>
                {it.time && <small>{str(it.time)}</small>}
                <b>{str(it.title ?? it.label)}</b>
                {it.text && <p>{str(it.text)}</p>}
              </div>
            </li>
          ))}
        </ol>
      );
    case "buttons":
      return (
        <div className="ub-buttons">
          {arr(b.items ?? b.buttons).map((it, i) => (
            <button key={i} onClick={() => onPrompt(str(it.prompt ?? it.label))}>
              {str(it.label ?? it.prompt)}
            </button>
          ))}
        </div>
      );
    default:
      return text ? <p className="ub-text">{text}</p> : null;
  }
}

function Checklist({ items }: { items: string[] }) {
  const [done, setDone] = useState<boolean[]>(() => items.map(() => false));
  const count = done.filter(Boolean).length;
  return (
    <div className="ub-check">
      <div className="ub-check__bar">
        <i style={{ width: `${items.length ? (count / items.length) * 100 : 0}%` }} />
      </div>
      {items.map((t, i) => (
        <label key={i} className={done[i] ? "is-done" : ""}>
          <input type="checkbox" checked={done[i]} onChange={() => setDone((d) => d.map((v, j) => (j === i ? !v : v)))} />
          <span className="ub-check__box" />
          <span>{t}</span>
        </label>
      ))}
      <small>
        {count}/{items.length} selesai
      </small>
    </div>
  );
}

function Progress({ label, value, max }: { label: string; value: number; max: number }) {
  const bar = useRef<HTMLElement>(null);
  const pct = Math.max(0, Math.min(100, (value / max) * 100));
  useEffect(() => {
    if (bar.current && !reducedMotion) gsap.fromTo(bar.current, { width: 0 }, { width: `${pct}%`, duration: 1.1, ease: "power3.out", delay: 0.2 });
  }, [pct]);
  return (
    <div className="ub-progress">
      <div>
        <span>{label}</span>
        <b>
          {value.toLocaleString("id-ID")} / {max.toLocaleString("id-ID")}
        </b>
      </div>
      <div className="ub-progress__track">
        <i ref={bar} style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
}

function Quiz({ q, options, answer, explain }: { q: string; options: string[]; answer: number; explain: string }) {
  const [pick, setPick] = useState<number | null>(null);
  const ref = useRef<HTMLDivElement>(null);
  const choose = (i: number) => {
    if (pick !== null) return;
    setPick(i);
    if (reducedMotion || !ref.current) return;
    const btn = ref.current.querySelectorAll("button")[i];
    if (i === answer) gsap.fromTo(btn, { scale: 0.95 }, { scale: 1, duration: 0.5, ease: "back.out(3)" });
    else gsap.fromTo(btn, { x: -6 }, { x: 0, duration: 0.5, ease: "elastic.out(1.2, 0.3)" });
  };
  return (
    <div className="ub-quiz" ref={ref}>
      <b>{q}</b>
      {options.map((o, i) => (
        <button
          key={i}
          className={pick === null ? "" : i === answer ? "is-right" : i === pick ? "is-wrong" : "is-dim"}
          onClick={() => choose(i)}
          disabled={pick !== null}
        >
          <span>{String.fromCharCode(65 + i)}</span>
          {o}
        </button>
      ))}
      {pick !== null && (
        <p className={pick === answer ? "ub-quiz__ok" : "ub-quiz__no"}>
          {pick === answer ? "Benar! 🎉 " : `Kurang tepat — jawabannya ${String.fromCharCode(65 + answer)}. `}
          {explain}
        </p>
      )}
    </div>
  );
}

function Poll({ q, options, onPrompt }: { q: string; options: string[]; onPrompt: Prompt }) {
  const [pick, setPick] = useState<number | null>(null);
  return (
    <div className="ub-quiz ub-poll">
      <b>{q}</b>
      {options.map((o, i) => (
        <button
          key={i}
          className={pick === i ? "is-right" : pick !== null ? "is-dim" : ""}
          disabled={pick !== null}
          onClick={() => {
            setPick(i);
            onPrompt(`${q} — pilihanku: ${o}`);
          }}
        >
          <span>{pick === i ? "✓" : "○"}</span>
          {o}
        </button>
      ))}
    </div>
  );
}

function Countdown({ label, to }: { label: string; to: string }) {
  const now = useNow(1000);
  const t = new Date(to).getTime();
  if (!Number.isFinite(t)) return null;
  let s = Math.max(0, Math.floor((t - now) / 1000));
  const parts = [86400, 3600, 60, 1].map((u) => {
    const v = Math.floor(s / u);
    s -= v * u;
    return v;
  });
  return (
    <div className="ub-count">
      <small>{label}</small>
      <div>
        {parts.map((v, i) => (
          <span key={i}>
            <b>{String(v).padStart(2, "0")}</b>
            <small>{["hari", "jam", "menit", "detik"][i]}</small>
          </span>
        ))}
      </div>
    </div>
  );
}

/* ---------------- charts (hand-rolled SVG, animated in) ---------------- */

function Chart({ b }: { b: Any }) {
  const kind: "bar" | "line" | "pie" = ["bar", "line", "pie"].includes(b.chart ?? b.kind) ? b.chart ?? b.kind : "bar";
  const labels = arr(b.labels).map(str);
  const series = useMemo(() => {
    const s = arr(b.series);
    if (s.length) return s.map((x, i) => ({ name: str(x.name ?? `Seri ${i + 1}`), data: arr(x.data ?? x.values).map(Number) }));
    const d = arr(b.data ?? b.values).map(Number);
    return d.length ? [{ name: str(b.title ?? ""), data: d }] : [];
  }, [b]);
  const ref = useRef<SVGSVGElement>(null);

  useEffect(() => {
    if (!ref.current || reducedMotion) return;
    const q = gsap.utils.selector(ref.current);
    gsap.from(q(".bar"), { scaleY: 0, transformOrigin: "50% 100%", duration: 0.8, stagger: 0.04, ease: "power3.out" });
    q(".line").forEach((p) => {
      const len = (p as unknown as SVGPathElement).getTotalLength?.() ?? 0;
      gsap.fromTo(p, { strokeDasharray: len, strokeDashoffset: len }, { strokeDashoffset: 0, duration: 1.2, ease: "power2.out" });
    });
    gsap.from(q(".dot, .slice"), { scale: 0, transformOrigin: "50% 50%", duration: 0.5, stagger: 0.04, delay: 0.3, ease: "back.out(2)" });
  }, [kind, series]);

  if (!series.length) return null;
  const W = 320;
  const H = 180;
  const pad = { l: 34, r: 8, t: 10, b: 28 };
  const all = series.flatMap((s) => s.data).filter(Number.isFinite);
  const max = Math.max(1, ...all);
  const n = Math.max(labels.length, ...series.map((s) => s.data.length));

  if (kind === "pie") {
    const data = series[0].data;
    const total = data.reduce((a, v) => a + (v > 0 ? v : 0), 0) || 1;
    let a0 = -Math.PI / 2;
    const R = 70;
    const r = 42;
    return (
      <div className="ub-chart ub-chart--pie">
        {b.title && <b className="ub-chart__title">{str(b.title)}</b>}
        <div className="ub-pie">
          <svg ref={ref} viewBox="0 0 180 180" width="160" height="160">
            {data.map((v, i) => {
              const a1 = a0 + (Math.max(0, v) / total) * Math.PI * 2;
              const large = a1 - a0 > Math.PI ? 1 : 0;
              const p = (ang: number, rad: number) => `${90 + rad * Math.cos(ang)} ${90 + rad * Math.sin(ang)}`;
              const d = `M ${p(a0, R)} A ${R} ${R} 0 ${large} 1 ${p(a1, R)} L ${p(a1, r)} A ${r} ${r} 0 ${large} 0 ${p(a0, r)} Z`;
              a0 = a1;
              return <path key={i} className="slice" d={d} fill={COLORS[i % COLORS.length]} />;
            })}
          </svg>
          <ul className="ub-legend">
            {data.map((v, i) => (
              <li key={i}>
                <i style={{ background: COLORS[i % COLORS.length] }} />
                {labels[i] ?? `#${i + 1}`} <b>{Math.round((v / total) * 100)}%</b>
              </li>
            ))}
          </ul>
        </div>
      </div>
    );
  }

  const iw = W - pad.l - pad.r;
  const ih = H - pad.t - pad.b;
  const x = (i: number) => pad.l + (n <= 1 ? iw / 2 : (i / (n - 1)) * iw);
  const y = (v: number) => pad.t + ih - (v / max) * ih;
  const ticks = [0, 0.5, 1].map((t) => Math.round(max * t));
  const fmt = (v: number) => (v >= 1000 ? `${Math.round(v / 100) / 10}k` : String(v));

  return (
    <div className="ub-chart">
      {b.title && <b className="ub-chart__title">{str(b.title)}</b>}
      <svg ref={ref} viewBox={`0 0 ${W} ${H}`} className="ub-svg">
        {ticks.map((t) => (
          <g key={t}>
            <line x1={pad.l} x2={W - pad.r} y1={y(t)} y2={y(t)} className="grid" />
            <text x={pad.l - 6} y={y(t) + 4} textAnchor="end" className="tick">
              {fmt(t)}
            </text>
          </g>
        ))}
        {kind === "bar"
          ? series.map((s, si) => {
              const slot = iw / Math.max(1, n);
              const bw = Math.min(28, (slot * 0.7) / series.length);
              return s.data.map((v, i) => (
                <rect
                  key={`${si}-${i}`}
                  className="bar"
                  x={pad.l + slot * i + (slot - bw * series.length) / 2 + bw * si}
                  y={y(Math.max(0, v))}
                  width={bw}
                  height={Math.max(0, pad.t + ih - y(Math.max(0, v)))}
                  rx={4}
                  fill={COLORS[si % COLORS.length]}
                />
              ));
            })
          : series.map((s, si) => (
              <g key={si}>
                <path className="line" d={s.data.map((v, i) => `${i ? "L" : "M"} ${x(i)} ${y(v)}`).join(" ")} fill="none" stroke={COLORS[si % COLORS.length]} strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round" />
                {s.data.map((v, i) => (
                  <circle key={i} className="dot" cx={x(i)} cy={y(v)} r={3.5} fill={COLORS[si % COLORS.length]} />
                ))}
              </g>
            ))}
        {labels.map((l, i) => (
          <text key={i} x={kind === "bar" ? pad.l + (iw / Math.max(1, n)) * (i + 0.5) : x(i)} y={H - 8} textAnchor="middle" className="tick">
            {l.length > 8 ? l.slice(0, 7) + "…" : l}
          </text>
        ))}
      </svg>
      {series.length > 1 && (
        <ul className="ub-legend ub-legend--row">
          {series.map((s, i) => (
            <li key={i}>
              <i style={{ background: COLORS[i % COLORS.length] }} />
              {s.name}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
