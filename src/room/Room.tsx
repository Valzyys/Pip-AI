import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { gsap, useGSAP, reducedMotion } from "../lib/gsap";
import { PipError, streamReply, type ModelKey } from "../lib/chat";
import { Markdown } from "../lib/markdown";
import { load, save } from "../lib/store";
import { blip, sfx } from "../lib/sound";
import { Sprite } from "../components/Sprite";
import { PipAvatar, type Face, type Hat } from "../components/PipAvatar";
import { transitionTo } from "../components/PixelTransition";
import { RoomScene, type SceneHandle, type TimeOfDay } from "./RoomScene";
import "../styles/room.css";

/* ------------------------------------------------------------------ */
/* data                                                                */
/* ------------------------------------------------------------------ */

const PROFILES: { key: ModelKey; label: string; hat: Hat; color: string; pitch: number; hint: string }[] = [
  { key: "pip", label: "pip", hat: "none", color: "#FFC93C", pitch: 1, hint: "ngobrol & nulis" },
  { key: "pip-code", label: "code", hat: "headphones", color: "#4AA8FF", pitch: 0.82, hint: "mode ngoding" },
  { key: "pip-docs", label: "docs", hat: "glasses", color: "#C6F432", pitch: 1.18, hint: "baca dokumentasi" },
];

const CHOICES: Record<ModelKey, string[]> = {
  pip: ["Ceritain fakta unik soal burung", "Bantu bikin caption Instagram yang lucu", "Kasih ide nama buat kucing oren"],
  "pip-code": ["Jelasin async/await kayak ke anak SD", "Bikin fungsi debounce di TypeScript", "Kenapa useEffect saya jalan dua kali?"],
  "pip-docs": ["Gimana cara pakai API key JKT48Connect?", "Endpoint apa buat jadwal theater?", "Berapa batas request Pip per menit?"],
};

const GREETING: Record<ModelKey, string> = {
  pip: "Halo! Aku **Pip**. Mau ngobrol apa hari ini? Pilih salah satu, atau ketik sendiri di bawah.",
  "pip-code": "Mode **ngoding** aktif 🎧. Tempel error, potongan kode, atau ceritain apa yang mau dibikin.",
  "pip-docs": "Kacamata baca terpasang 👓. Tanya apa saja soal **dokumentasi JKT48Connect**.",
};

type Status = "pending" | "streaming" | "done" | "error" | "stopped";

interface Msg {
  id: string;
  role: "user" | "assistant";
  content: string;
  profile: ModelKey;
  at: number;
  status?: Status;
  offline?: boolean;
  tilt?: number;
}

interface Saved {
  profile: ModelKey;
  messages: Msg[];
  sound: boolean;
}

const KEY = "pip.room.v1";
const uid = () => Math.random().toString(36).slice(2, 10);
const clock = (t: number) => new Date(t).toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit" });

function timeOfDay(d = new Date()): TimeOfDay {
  const h = d.getHours();
  if (h >= 6 && h < 16) return "day";
  if (h >= 16 && h < 19) return "dusk";
  return "night";
}

/* ------------------------------------------------------------------ */
/* room                                                                */
/* ------------------------------------------------------------------ */

export function Room() {
  const saved = useMemo(() => load<Saved>(KEY, { profile: "pip", messages: [], sound: false }), []);
  const [profile, setProfile] = useState<ModelKey>(saved.profile);
  const [messages, setMessages] = useState<Msg[]>(() =>
    saved.messages.filter((m) => m.status !== "pending" && m.status !== "streaming"),
  );
  const [sound, setSound] = useState(saved.sound);
  const [busy, setBusy] = useState(false);
  const [face, setFace] = useState<Face>("idle");
  const [time, setTime] = useState<TimeOfDay>(timeOfDay);
  const [typing, setTyping] = useState(false);
  const [sleeping, setSleeping] = useState(false);
  const [choice, setChoice] = useState(0);

  const root = useRef<HTMLDivElement>(null);
  const logRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const scene = useRef<SceneHandle>(null);
  const abort = useRef<AbortController | null>(null);
  const soundRef = useRef(sound);
  soundRef.current = sound;

  const prof = PROFILES.find((p) => p.key === profile)!;

  // persist
  useEffect(() => {
    save(KEY, {
      profile,
      sound,
      messages: messages.filter((m) => m.status !== "pending").slice(-60),
    } satisfies Saved);
  }, [profile, messages, sound]);

  // Pip dozes off after a while with nothing happening
  useEffect(() => {
    setSleeping(false);
    if (busy) return;
    const t = setTimeout(() => setSleeping(true), 40000);
    return () => clearTimeout(t);
  }, [busy, messages, typing, profile]);

  /* ---------- entrance ---------- */
  useGSAP(
    () => {
      if (reducedMotion) return;
      gsap
        .timeline({ delay: 0.2 })
        .from(".rbar > *", { y: -30, autoAlpha: 0, duration: 0.4, ease: "steps(4)", stagger: 0.06 })
        .from(".log > *", { y: 30, autoAlpha: 0, duration: 0.45, ease: "steps(4)", stagger: 0.05 }, 0.2)
        .from(".composer", { y: 60, duration: 0.5, ease: "steps(5)" }, 0.3);
    },
    { scope: root },
  );

  /* ---------- keep log pinned to the bottom ---------- */
  const stickToBottom = useRef(true);
  useLayoutEffect(() => {
    const log = logRef.current;
    if (!log || !stickToBottom.current) return;
    log.scrollTop = log.scrollHeight;
  }, [messages]);

  const lastLen = useRef(messages.length);
  useEffect(() => {
    if (messages.length > lastLen.current && !reducedMotion) {
      const el = logRef.current?.lastElementChild as HTMLElement | null;
      if (el?.classList.contains("dlg"))
        gsap.from(el, { y: 26, scaleY: 0.4, transformOrigin: "50% 100%", duration: 0.35, ease: "steps(4)" });
      else if (el?.classList.contains("note"))
        gsap.from(el, { y: -40, rotation: -14, autoAlpha: 0, duration: 0.45, ease: "steps(5)" });
    }
    lastLen.current = messages.length;
  }, [messages.length]);

  /* ---------- sending ---------- */
  const flyPlane = useCallback(() => {
    if (reducedMotion) return;
    const from = inputRef.current?.getBoundingClientRect();
    const to = scene.current?.target()?.getBoundingClientRect();
    if (!from || !to) return;
    const plane = document.createElement("div");
    plane.className = "plane";
    document.body.appendChild(plane);
    const sx = from.left + from.width * 0.7;
    const sy = from.top;
    const ex = to.left + to.width / 2;
    const ey = to.top + to.height * 0.3;
    gsap.set(plane, { x: sx, y: sy });
    gsap.to(plane, {
      motionPath: {
        path: [
          { x: sx, y: sy },
          { x: (sx + ex) / 2 + 60, y: Math.min(sy, ey) - 120 },
          { x: ex, y: ey },
        ],
        curviness: 1.2,
        autoRotate: true,
      },
      duration: 0.9,
      ease: "power1.inOut",
      onComplete: () => {
        gsap.to(plane, { scale: 0, duration: 0.2, ease: "steps(3)", onComplete: () => plane.remove() });
      },
    });
  }, []);

  const send = useCallback(
    async (raw: string, history = messages) => {
      const text = raw.trim();
      if (!text || busy) return;
      const asOf = Date.now();
      const user: Msg = { id: uid(), role: "user", content: text, profile, at: asOf, tilt: gsap.utils.random(-1.6, 1.6) };
      const bot: Msg = { id: uid(), role: "assistant", content: "", profile, at: asOf, status: "pending" };
      const convo = [...history.filter((m) => m.status !== "error" && m.content), user].map(({ role, content }) => ({
        role,
        content,
      }));

      stickToBottom.current = true;
      setMessages([...history, user, bot]);
      setBusy(true);
      setFace("think");
      setTyping(false);
      flyPlane();
      if (soundRef.current) sfx.send();

      const ac = new AbortController();
      abort.current = ac;
      let started = false;
      const update = (patch: Partial<Msg> | ((m: Msg) => Partial<Msg>)) =>
        setMessages((ms) => ms.map((m) => (m.id === bot.id ? { ...m, ...(typeof patch === "function" ? patch(m) : patch) } : m)));

      try {
        const { source } = await streamReply(
          profile,
          convo.slice(-16),
          (chunk) => {
            if (!started) {
              started = true;
              setFace("talk");
            }
            if (soundRef.current) blip(prof.pitch);
            update((m) => ({ status: "streaming", content: m.content + chunk }));
          },
          ac.signal,
        );
        update({ status: "done", offline: source === "offline" });
        setFace("happy");
        scene.current?.burst(profile === "pip-code" ? "notes" : "hearts");
        if (soundRef.current) sfx.done();
      } catch (err) {
        if (ac.signal.aborted) {
          update((m) => ({ status: "stopped", content: m.content }));
          setFace("idle");
        } else {
          const msg = err instanceof PipError ? err.message : "Sinyal ke otak Pip putus. Coba lagi ya.";
          update((m) => ({ status: "error", content: m.content || msg }));
          setFace("dizzy");
          scene.current?.burst("stars");
          if (soundRef.current) sfx.error();
        }
      } finally {
        setBusy(false);
        abort.current = null;
        setTimeout(() => setFace((f) => (f === "happy" || f === "dizzy" ? "idle" : f)), 2600);
      }
    },
    [busy, messages, profile, prof.pitch, flyPlane],
  );

  // deep link from the landing page: /room?p=pip-code&q=...
  const deepLinked = useRef(false);
  useEffect(() => {
    if (deepLinked.current) return;
    deepLinked.current = true;
    const params = new URLSearchParams(location.search);
    const p = params.get("p") as ModelKey | null;
    const q = params.get("q");
    if (p && PROFILES.some((x) => x.key === p)) setProfile(p);
    if (params.toString()) history.replaceState(null, "", "/room");
    if (q) setTimeout(() => void sendRef.current(q), 900);
  }, []);
  const sendRef = useRef(send);
  sendRef.current = send;

  /* ---------- actions ---------- */
  const switchProfile = (key: ModelKey) => {
    if (key === profile) return;
    setProfile(key);
    setChoice(0);
    scene.current?.poof();
    if (soundRef.current) sfx.poof();
  };

  const sweep = () => {
    if (busy || !messages.length) return;
    const items = gsap.utils.toArray<HTMLElement>(".log > *", root.current);
    if (reducedMotion) return setMessages([]);
    gsap
      .timeline({ onComplete: () => setMessages([]) })
      .fromTo(".broom", { x: "-20%", autoAlpha: 1 }, { x: "120%", duration: 0.8, ease: "steps(10)" })
      .to(items, { x: "110%", rotation: 8, autoAlpha: 0, duration: 0.4, ease: "steps(4)", stagger: 0.03 }, 0.1)
      .set(".broom", { autoAlpha: 0 });
  };

  const retry = () => {
    const lastUser = [...messages].reverse().find((m) => m.role === "user");
    if (!lastUser) return;
    const idx = messages.lastIndexOf(lastUser);
    void send(lastUser.content, messages.slice(0, idx));
  };

  const onLogScroll = () => {
    const log = logRef.current!;
    stickToBottom.current = log.scrollHeight - log.scrollTop - log.clientHeight < 80;
  };

  /* ---------- composer ---------- */
  const autosize = () => {
    const el = inputRef.current!;
    el.style.height = "auto";
    el.style.height = Math.min(el.scrollHeight, 180) + "px";
  };

  const typingTimer = useRef<number>();
  const onInput = () => {
    autosize();
    setTyping(true);
    window.clearTimeout(typingTimer.current);
    typingTimer.current = window.setTimeout(() => setTyping(false), 1200);
    if (soundRef.current) sfx.key();
    if (!reducedMotion) {
      // a tiny pixel hops off the input with every keystroke
      const bar = root.current?.querySelector<HTMLElement>(".composer__field");
      if (bar) {
        const px = document.createElement("i");
        px.className = "keypx";
        px.style.left = `${gsap.utils.random(8, 92)}%`;
        bar.appendChild(px);
        gsap.fromTo(px, { y: 0, autoAlpha: 1 }, { y: -26, autoAlpha: 0, duration: 0.5, ease: "steps(4)", onComplete: () => px.remove() });
      }
    }
  };

  const submit = () => {
    const el = inputRef.current!;
    const v = el.value;
    if (!v.trim()) return;
    el.value = "";
    autosize();
    void send(v);
  };

  const choices = CHOICES[profile];
  const empty = messages.length === 0;

  const onKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (empty && !e.currentTarget.value) {
      if (e.key === "ArrowDown" || e.key === "ArrowUp") {
        e.preventDefault();
        setChoice((c) => (c + (e.key === "ArrowDown" ? 1 : choices.length - 1)) % choices.length);
        return;
      }
      if (e.key === "Enter" && !e.shiftKey) {
        e.preventDefault();
        void send(choices[choice]);
        return;
      }
    }
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      submit();
    }
  };

  const status = busy ? (face === "talk" ? "ngomong…" : "mikir…") : sleeping ? "tidur zzz" : typing ? "dengerin…" : "siap";

  return (
    <div className="room" ref={root} data-profile={profile} style={{ "--accent": prof.color } as React.CSSProperties}>
      {/* ---------------- top bar ---------------- */}
      <header className="rbar">
        <button className="rbar__back" onClick={() => transitionTo("/")} aria-label="Kembali ke halaman utama">
          <span aria-hidden="true">◀</span> <span className="rbar__back-txt">keluar</span>
        </button>
        <div className="rbar__title">
          <span className="px-label">kamar</span> <b>PIP</b>
          <span className="rbar__status">
            <i /> {status}
          </span>
        </div>
        <div className="hats" role="radiogroup" aria-label="Profil Pip">
          {PROFILES.map((p) => (
            <button
              key={p.key}
              role="radio"
              aria-checked={profile === p.key}
              className={profile === p.key ? "is-on" : ""}
              style={{ "--c": p.color } as React.CSSProperties}
              onClick={() => switchProfile(p.key)}
              title={`${p.key} — ${p.hint}`}
            >
              <PipAvatar hat={p.hat} className="hats__pip" />
              <span>{p.label}</span>
            </button>
          ))}
        </div>
        <div className="rbar__tools">
          <button onClick={() => setSound((s) => !s)} aria-label={sound ? "Matikan suara" : "Nyalakan suara"} title="suara">
            <Sprite name={sound ? "speaker" : "mute"} />
          </button>
          <button onClick={sweep} aria-label="Obrolan baru" title="obrolan baru" disabled={busy || empty}>
            <Sprite name="broom" />
          </button>
        </div>
      </header>

      <div className="room__body">
        {/* ---------------- scene ---------------- */}
        <RoomScene
          ref={scene}
          face={face}
          hat={prof.hat}
          time={time}
          thinking={busy && face === "think"}
          sleeping={sleeping && !busy}
          leaning={typing && !busy}
          onWindow={() => setTime((t) => (t === "day" ? "dusk" : t === "dusk" ? "night" : "day"))}
          onPet={() => {
            setSleeping(false);
            scene.current?.burst("hearts");
            setFace((f) => (busy ? f : "happy"));
            if (!busy) setTimeout(() => setFace((f) => (f === "happy" ? "idle" : f)), 1500);
          }}
        />

        {/* ---------------- log ---------------- */}
        <section className="logcol">
          <div className="log" ref={logRef} onScroll={onLogScroll} aria-live="polite">
            {empty ? (
              <div className="dlg dlg--intro">
                <DlgHead profile={profile} face="idle" hat={prof.hat} />
                <div className="dlg__body">
                  <Markdown text={GREETING[profile]} />
                  <ul className="choices" role="listbox" aria-label="Pilihan pertanyaan">
                    {choices.map((c, i) => (
                      <li key={c}>
                        <button
                          role="option"
                          aria-selected={choice === i}
                          className={choice === i ? "is-on" : ""}
                          onPointerEnter={() => setChoice(i)}
                          onClick={() => void send(c)}
                        >
                          <span className="choices__cur">▶</span>
                          {c}
                        </button>
                      </li>
                    ))}
                  </ul>
                  <p className="dlg__hint px-label">↑ ↓ pilih · enter kirim</p>
                </div>
              </div>
            ) : (
              messages.map((m) =>
                m.role === "user" ? (
                  <div className="note" key={m.id} style={{ "--tilt": `${m.tilt ?? 0}deg` } as React.CSSProperties}>
                    <span className="note__tape" />
                    <p>{m.content}</p>
                    <span className="note__time px-label">kamu · {clock(m.at)}</span>
                  </div>
                ) : (
                  <div className={`dlg dlg--${m.status ?? "done"}`} key={m.id}>
                    <DlgHead
                      profile={m.profile}
                      face={m.status === "pending" ? "think" : m.status === "streaming" ? "talk" : m.status === "error" ? "dizzy" : "idle"}
                      hat={PROFILES.find((p) => p.key === m.profile)!.hat}
                    />
                    <div className="dlg__body">
                      {m.status === "pending" ? (
                        <Thinking />
                      ) : (
                        <>
                          <Markdown text={m.content} />
                          {m.status === "streaming" && <span className="caret" aria-hidden="true" />}
                        </>
                      )}
                      {m.status === "stopped" && <p className="dlg__note px-label">— dipotong</p>}
                      {m.status === "error" && (
                        <button className="btn-px btn-px--sm dlg__retry" onClick={retry} disabled={busy}>
                          ↻ coba lagi
                        </button>
                      )}
                      {m.offline && <p className="dlg__note px-label">mode offline · PIP_API_KEY belum diset</p>}
                    </div>
                    <div className="dlg__foot">
                      <span className="px-label">{clock(m.at)}</span>
                      {m.status === "done" && <span className="dlg__next">▼</span>}
                    </div>
                  </div>
                ),
              )
            )}
          </div>
          <div className="broom" aria-hidden="true">
            <Sprite name="broom" />
          </div>

          {/* ---------------- composer ---------------- */}
          <form
            className="composer"
            onSubmit={(e) => {
              e.preventDefault();
              submit();
            }}
          >
            <div className="composer__field">
              <span className="composer__prompt" aria-hidden="true">
                ›
              </span>
              <textarea
                ref={inputRef}
                rows={1}
                placeholder={`Tulis pesan buat Pip (${prof.hint})…`}
                aria-label="Pesan untuk Pip"
                onInput={onInput}
                onKeyDown={onKeyDown}
                maxLength={4000}
              />
            </div>
            {busy ? (
              <button type="button" className="btn-px composer__send composer__send--stop" onClick={() => abort.current?.abort()}>
                ■ stop
              </button>
            ) : (
              <button type="submit" className="btn-px composer__send">
                kirim <span aria-hidden="true">▶</span>
              </button>
            )}
          </form>
        </section>
      </div>
    </div>
  );
}

function DlgHead({ profile, face, hat }: { profile: ModelKey; face: Face; hat: Hat }) {
  const p = PROFILES.find((x) => x.key === profile)!;
  return (
    <div className="dlg__head">
      <span className="dlg__portrait" style={{ "--c": p.color } as React.CSSProperties}>
        <PipAvatar face={face} hat={hat} />
      </span>
      <span className="dlg__name">
        PIP <em style={{ color: p.color }}>· {p.key}</em>
      </span>
    </div>
  );
}

function Thinking() {
  const [s, setS] = useState(0);
  useEffect(() => {
    const t0 = Date.now();
    const id = setInterval(() => setS((Date.now() - t0) / 1000), 100);
    return () => clearInterval(id);
  }, []);
  return (
    <div className="thinking">
      <span className="thinking__dots">
        <i />
        <i />
        <i />
      </span>
      <span className="px-label">mikir {s.toFixed(1)}s</span>
    </div>
  );
}
