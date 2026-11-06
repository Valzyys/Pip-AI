import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { gsap, useGSAP, SplitText, reducedMotion } from "../lib/gsap";
import { PipError, streamChat, type ChatEvent, type ModelKey } from "../lib/chat";
import { Markdown } from "../lib/markdown";
import { load, save } from "../lib/store";
import { navigate } from "../lib/router";
import { Sprite } from "../components/Sprite";
import { Icon } from "./icons";
import { Composer, type ComposerHandle } from "./Composer";
import { ContextMenu, Sheet, type MenuItem } from "./Sheet";
import { ToolPart } from "./widgets/Widgets";
import { MAX_BYTES, MAX_FILES, classify, composeForPip, formatSize, prepareImage, readFile, uid, type Attachment } from "./files";
import { preview, textOf, type Convo, type Msg, type Part } from "./types";
import { MODES, modeOf, type Mode, type Suggestion } from "./modes";
import "../styles/widgets.css";
import "../styles/chat.css";

const KEY = "pip.chat.v3";
const MAX_CONVOS = 40;
const isDesktop = () => window.matchMedia("(min-width: 960px)").matches;

/** Pip's face for a mode (base sprite + accessory). */
export function PipAva({ mode, className }: { mode: Mode; className?: string }) {
  return (
    <span className={`pava pava--${mode.key}${className ? ` ${className}` : ""}`} aria-hidden="true">
      <Sprite name="pip" />
      {mode.hat === "headphones" && <Sprite name="hatHeadphones" className="pava__hat" />}
      {mode.hat === "glasses" && <Sprite name="hatGlasses" className="pava__hat" />}
    </span>
  );
}

function group(t: number) {
  const d = (Date.now() - t) / 86_400_000;
  if (new Date(t).toDateString() === new Date().toDateString()) return "Hari ini";
  if (d < 7) return "7 hari terakhir";
  return "Lebih lama";
}

/* ================================================================== */

export function ChatApp() {
  const [convos, setConvos] = useState<Convo[]>(() =>
    load<Convo[]>(KEY, []).map((c) => ({
      ...c,
      messages: c.messages.filter((m) => m.status !== "pending").map((m) => (m.status === "streaming" ? { ...m, status: "stopped" as const } : m)),
    })),
  );
  const [activeId, setActiveId] = useState<string | null>(null);
  const [draftMode, setDraftMode] = useState<ModelKey>(() => load<ModelKey>("pip.mode", "pip"));
  const [attachments, setAttachments] = useState<Attachment[]>([]);
  const [busy, setBusy] = useState(false);
  const [desktop, setDesktop] = useState(isDesktop);
  const [drawer, setDrawer] = useState(false);
  const [picker, setPicker] = useState(false);
  const [sheet, setSheet] = useState(false);
  const [toast, setToast] = useState<string | null>(null);
  const [dragging, setDragging] = useState(false);

  const root = useRef<HTMLDivElement>(null);
  const mainRef = useRef<HTMLDivElement>(null);
  const scroller = useRef<HTMLDivElement>(null);
  const composer = useRef<ComposerHandle>(null);
  const wipeRef = useRef<HTMLDivElement>(null);
  const abort = useRef<AbortController | null>(null);
  const files = useRef(new Map<string, File>());

  const active = convos.find((c) => c.id === activeId) ?? null;
  const modeKey = active?.profile ?? draftMode;
  const mode = modeOf(modeKey);
  const messages = active?.messages ?? [];
  const empty = messages.length === 0;

  useEffect(() => save(KEY, convos.slice(0, MAX_CONVOS)), [convos]);
  useEffect(() => save("pip.mode", draftMode), [draftMode]);
  // portals (sheets, menus) pick the theme up from <html>
  useEffect(() => {
    document.documentElement.dataset.pipMode = modeKey;
    return () => void delete document.documentElement.dataset.pipMode;
  }, [modeKey]);
  useEffect(() => {
    const mq = window.matchMedia("(min-width: 960px)");
    const on = () => setDesktop(mq.matches);
    mq.addEventListener("change", on);
    return () => mq.removeEventListener("change", on);
  }, []);

  const flash = useCallback((m: string) => {
    setToast(m);
    window.setTimeout(() => setToast((t) => (t === m ? null : t)), 3000);
  }, []);

  /* ---------------- drawer: pushes the page aside (iOS), edge-swipe to open ---------------- */
  const DW = () => Math.min(320, window.innerWidth * 0.82);
  useEffect(() => {
    if (desktop || !mainRef.current) return;
    const main = mainRef.current;
    const panel = root.current?.querySelector<HTMLElement>(".dr");
    if (!panel) return;
    if (reducedMotion) {
      gsap.set(main, { x: drawer ? DW() : 0 });
      return;
    }
    gsap.to(main, { x: drawer ? DW() : 0, scale: drawer ? 0.92 : 1, borderRadius: drawer ? 28 : 0, duration: 0.5, ease: "expo.out" });
    gsap.to(panel, { xPercent: drawer ? 0 : -25, duration: 0.5, ease: "expo.out" });
    gsap.to(".dr-scrim", { autoAlpha: drawer ? 1 : 0, duration: 0.35 });
    if (drawer) gsap.fromTo(".dr-item", { x: -16, autoAlpha: 0 }, { x: 0, autoAlpha: 1, duration: 0.45, stagger: 0.025, ease: "power3.out", delay: 0.08, overwrite: true });
  }, [drawer, desktop]);

  useEffect(() => {
    if (desktop || !mainRef.current) return;
    const main = mainRef.current;
    let x0 = 0;
    let on = false;
    const down = (e: PointerEvent) => {
      if (drawer || e.pointerType === "mouse" || e.clientX > 22) return;
      on = true;
      x0 = e.clientX;
    };
    const move = (e: PointerEvent) => {
      if (!on) return;
      const p = Math.max(0, Math.min(1, (e.clientX - x0) / DW()));
      gsap.set(main, { x: p * DW(), scale: 1 - p * 0.08, borderRadius: p * 28 });
      gsap.set(".dr", { xPercent: -25 + p * 25 });
    };
    const up = (e: PointerEvent) => {
      if (!on) return;
      on = false;
      const open = e.clientX - x0 > DW() * 0.3;
      setDrawer(open);
      if (!open) {
        gsap.to(main, { x: 0, scale: 1, borderRadius: 0, duration: 0.35, ease: "power3.out" });
        gsap.to(".dr", { xPercent: -25, duration: 0.35 });
      }
    };
    main.addEventListener("pointerdown", down);
    window.addEventListener("pointermove", move);
    window.addEventListener("pointerup", up);
    return () => {
      main.removeEventListener("pointerdown", down);
      window.removeEventListener("pointermove", move);
      window.removeEventListener("pointerup", up);
    };
  }, [drawer, desktop]);

  /* ---------------- switching modes: circular theme wipe from the picker ---------------- */
  const switchMode = useCallback(
    (key: ModelKey, origin?: { x: number; y: number }) => {
      setPicker(false);
      if (key === modeKey) return;
      const apply = () => {
        setDraftMode(key); // new chats keep the mode you picked
        if (active) setConvos((cs) => cs.map((c) => (c.id === active.id ? { ...c, profile: key } : c)));
      };
      const el = wipeRef.current;
      if (!el || reducedMotion) return apply();
      const x = origin?.x ?? window.innerWidth / 2;
      const y = origin?.y ?? 60;
      const R = Math.hypot(Math.max(x, window.innerWidth - x), Math.max(y, window.innerHeight - y));
      el.style.background = modeOf(key).wipe;
      navigator.vibrate?.(10);
      gsap
        .timeline()
        .set(el, { display: "block", opacity: 1, clipPath: `circle(0px at ${x}px ${y}px)` })
        .to(el, { clipPath: `circle(${R}px at ${x}px ${y}px)`, duration: 0.6, ease: "power3.inOut" })
        .add(apply)
        .to(el, { opacity: 0, duration: 0.45, ease: "power2.out", delay: 0.05 })
        .set(el, { display: "none" });
    },
    [active, modeKey],
  );

  /* ---------------- attachments ---------------- */
  const addFiles = useCallback(
    (list: File[]) => {
      const room = MAX_FILES - attachments.length;
      if (room <= 0) return flash(`Maksimal ${MAX_FILES} lampiran.`);
      const accepted: Attachment[] = [];
      for (const file of list.slice(0, room)) {
        const kind = classify(file);
        if (!kind) {
          flash(`${file.name}: format belum didukung.`);
          continue;
        }
        if (file.size > MAX_BYTES) {
          flash(`${file.name}: maks ${formatSize(MAX_BYTES)}.`);
          continue;
        }
        const att: Attachment = { id: uid(), name: file.name || "tempelan.png", size: file.size, mime: file.type, kind, status: "reading" };
        files.current.set(att.id, file);
        accepted.push(att);
      }
      if (!accepted.length) return;
      setAttachments((a) => [...a, ...accepted]);
      accepted.forEach(async (att) => {
        const patch = (p: Partial<Attachment>) => setAttachments((all) => all.map((a) => (a.id === att.id ? { ...a, ...p } : a)));
        const file = files.current.get(att.id)!;
        try {
          let upload: Blob | undefined;
          if (att.kind === "image") {
            const prepared = await prepareImage(file);
            upload = prepared.upload;
            patch({ thumb: prepared.thumb });
          }
          const { text, truncated } = await readFile(file, att.kind, upload);
          patch({ status: "ready", text, truncated });
        } catch (err) {
          const m = err instanceof Error ? err.message : "Gagal membaca file.";
          patch({ status: "error", error: m });
          flash(m);
        }
      });
    },
    [attachments.length, flash],
  );

  useEffect(() => {
    let depth = 0;
    const has = (e: DragEvent) => Array.from(e.dataTransfer?.types ?? []).includes("Files");
    const enter = (e: DragEvent) => has(e) && (depth++, setDragging(true));
    const leave = () => {
      depth = Math.max(0, depth - 1);
      if (!depth) setDragging(false);
    };
    const over = (e: DragEvent) => has(e) && e.preventDefault();
    const drop = (e: DragEvent) => {
      if (!has(e)) return;
      e.preventDefault();
      depth = 0;
      setDragging(false);
      addFiles(Array.from(e.dataTransfer?.files ?? []));
    };
    window.addEventListener("dragenter", enter);
    window.addEventListener("dragleave", leave);
    window.addEventListener("dragover", over);
    window.addEventListener("drop", drop);
    return () => {
      window.removeEventListener("dragenter", enter);
      window.removeEventListener("dragleave", leave);
      window.removeEventListener("dragover", over);
      window.removeEventListener("drop", drop);
    };
  }, [addFiles]);

  /* ---------------- agent streaming ---------------- */
  const update = (id: string, fn: (c: Convo) => Convo) => setConvos((cs) => cs.map((c) => (c.id === id ? fn(c) : c)));

  const run = useCallback(async (convoId: string, prof: ModelKey, history: Msg[]) => {
    const bot: Msg = { id: uid(), role: "assistant", at: Date.now(), parts: [], status: "pending" };
    update(convoId, (c) => ({ ...c, messages: [...history, bot], updated: Date.now() }));
    setBusy(true);
    const payload = history
      .filter((m) => m.status !== "error")
      .map((m) => {
        if (m.role === "user") return { role: "user" as const, content: composeForPip(m.content ?? "", m.attachments) };
        const tools = (m.parts ?? []).filter((p) => p.kind === "tool" && p.status === "done").map((p) => (p as { name: string }).name);
        return { role: "assistant" as const, content: textOf(m) + (tools.length ? `\n\n[kartu yang sudah ditampilkan: ${tools.join(", ")}]` : "") };
      })
      .filter((m) => m.content.trim());

    const ac = new AbortController();
    abort.current = ac;
    const patch = (fn: (m: Msg) => Partial<Msg>) =>
      update(convoId, (c) => ({ ...c, messages: c.messages.map((m) => (m.id === bot.id ? { ...m, ...fn(m) } : m)) }));
    const onEvent = (e: ChatEvent) => {
      if (e.t === "text")
        patch((m) => {
          const parts = [...(m.parts ?? [])];
          const last = parts[parts.length - 1];
          if (last?.kind === "text") parts[parts.length - 1] = { kind: "text", text: last.text + e.d };
          else parts.push({ kind: "text", text: e.d });
          return { parts, status: "streaming", note: undefined };
        });
      else if (e.t === "tool") patch((m) => ({ parts: [...(m.parts ?? []), { kind: "tool", id: e.id, name: e.name, status: "running" }], status: "streaming", note: undefined }));
      else if (e.t === "tool_done")
        patch((m) => ({
          parts: (m.parts ?? []).map((p) => (p.kind === "tool" && p.id === e.id ? { ...p, status: e.ok ? "done" : "error", ui: e.ui, error: e.error } : p)) as Part[],
        }));
      else if (e.t === "status") patch(() => ({ note: e.message }));
    };
    try {
      const { source } = await streamChat(prof, payload.slice(-16), onEvent, ac.signal);
      patch(() => ({ status: "done", offline: source === "offline", note: undefined }));
    } catch (err) {
      if (ac.signal.aborted) patch(() => ({ status: "stopped", note: undefined }));
      else {
        const message = err instanceof PipError ? err.message : "Koneksi ke Pip terputus. Coba lagi ya.";
        patch((m) => ({ status: "error", note: message, parts: m.parts?.length ? m.parts : [{ kind: "text", text: message }] }));
      }
    } finally {
      setBusy(false);
      abort.current = null;
    }
  }, []);

  const send = useCallback(
    (raw: string) => {
      const text = raw.trim();
      const ready = attachments.filter((a) => a.status === "ready");
      if (busy || (!text && !ready.length)) return;
      const user: Msg = { id: uid(), role: "user", at: Date.now(), content: text, attachments: ready.length ? ready : undefined };
      setAttachments([]);
      files.current.clear();
      stick.current = true;
      let id = active?.id;
      let history = active?.messages ?? [];
      if (!id) {
        id = uid();
        setConvos((cs) => [{ id: id!, title: (text || ready[0]?.name || "Obrolan baru").slice(0, 60), profile: modeKey, messages: [], updated: Date.now() }, ...cs].slice(0, MAX_CONVOS));
        setActiveId(id);
        history = [];
      }
      void run(id, modeKey, [...history, user]);
    },
    [active, attachments, busy, modeKey, run],
  );
  const sendRef = useRef(send);
  sendRef.current = send;

  const prompt = useCallback(
    (p: string) => {
      if (busy) return flash("Tunggu Pip selesai dulu ya.");
      send(p);
    },
    [busy, flash, send],
  );
  const regenerate = () => {
    if (!active || busy) return;
    const idx = active.messages.map((m) => m.role).lastIndexOf("user");
    if (idx >= 0) void run(active.id, modeKey, active.messages.slice(0, idx + 1));
  };
  const newChat = () => {
    if (busy) abort.current?.abort();
    setDraftMode(modeKey);
    setActiveId(null);
    setAttachments([]);
    setDrawer(false);
    requestAnimationFrame(() => composer.current?.focus());
  };
  const deleteConvo = (id: string) => {
    setConvos((cs) => cs.filter((c) => c.id !== id));
    if (activeId === id) setActiveId(null);
  };

  // deep link: /chat?p=pip-code&q=...
  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const p = params.get("p") as ModelKey | null;
    const q = params.get("q");
    if (p && MODES.some((m) => m.key === p)) setDraftMode(p);
    if (params.toString()) history.replaceState(null, "", "/chat");
    if (q) setTimeout(() => sendRef.current(q), 300);
  }, []);

  /* ---------------- scrolling ---------------- */
  const stick = useRef(true);
  const [scrolled, setScrolled] = useState(false);
  useLayoutEffect(() => {
    const el = scroller.current;
    if (!el) return;
    if (empty) el.scrollTop = 0;
    else if (stick.current) el.scrollTop = el.scrollHeight;
  }, [messages, empty]);

  // per-mode message entrances
  const seen = useRef(new Set<string>());
  const [ready, setReady] = useState(false);
  useEffect(() => {
    seen.current = new Set(messages.map((m) => m.id));
    setReady(false);
    const t = setTimeout(() => setReady(true), 50);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeId]);
  useEffect(() => {
    if (!ready) return;
    const fresh = messages.filter((m) => !seen.current.has(m.id));
    fresh.forEach((m) => seen.current.add(m.id));
    if (reducedMotion) return;
    fresh.forEach((m) => {
      const el = scroller.current?.querySelector<HTMLElement>(`[data-msg="${m.id}"]`);
      if (!el) return;
      if (modeKey === "pip-code")
        gsap.fromTo(el, { clipPath: "inset(0 100% 0 0)", x: -6 }, { clipPath: "inset(0 0% 0 0)", x: 0, duration: 0.45, ease: "steps(8)" });
      else if (modeKey === "pip-docs")
        gsap.fromTo(el, { y: 18, autoAlpha: 0, filter: "blur(6px)" }, { y: 0, autoAlpha: 1, filter: "blur(0px)", duration: 0.7, ease: "power3.out" });
      else if (m.role === "user")
        gsap.fromTo(el, { y: 26, scale: 0.8, transformOrigin: "100% 100%", autoAlpha: 0 }, { y: 0, scale: 1, autoAlpha: 1, duration: 0.55, ease: "back.out(1.8)" });
      else gsap.fromTo(el, { y: 14, autoAlpha: 0 }, { y: 0, autoAlpha: 1, duration: 0.5, ease: "back.out(1.4)" });
    });
  }, [messages, ready, modeKey]);

  /* ---------------- context menu ---------------- */
  const [menu, setMenu] = useState<{ rect: DOMRect; items: MenuItem[]; preview?: ReactNode; align?: "left" | "right" } | null>(null);
  const lastBot = useMemo(() => [...messages].reverse().find((m) => m.role === "assistant")?.id, [messages]);
  const press = useRef<number>();
  const openMsgMenu = (m: Msg, el: HTMLElement) => {
    const text = textOf(m);
    const items: MenuItem[] = [{ label: "Salin", icon: <Icon name="copy" size={18} />, onSelect: () => void navigator.clipboard?.writeText(text).then(() => flash("Disalin")) }];
    if (m.role === "assistant" && m.id === lastBot) items.push({ label: "Jawab ulang", icon: <Icon name="retry" size={18} />, onSelect: regenerate });
    if (m.role === "user" && m.content) items.push({ label: "Kirim lagi", icon: <Icon name="up" size={18} />, onSelect: () => prompt(m.content!) });
    items.push({ label: "Hapus", danger: true, icon: <Icon name="trash" size={18} />, onSelect: () => active && update(active.id, (c) => ({ ...c, messages: c.messages.filter((x) => x.id !== m.id) })) });
    navigator.vibrate?.(12);
    setMenu({ rect: el.getBoundingClientRect(), items, align: m.role === "user" ? "right" : "left", preview: <div className="pc-preview">{text.slice(0, 400) || "Kartu dari Pip"}</div> });
  };
  const pressProps = (m: Msg) => ({
    onContextMenu: (e: React.MouseEvent<HTMLElement>) => (e.preventDefault(), openMsgMenu(m, e.currentTarget)),
    onPointerDown: (e: React.PointerEvent<HTMLElement>) => {
      if (e.pointerType === "mouse") return;
      const el = e.currentTarget;
      press.current = window.setTimeout(() => openMsgMenu(m, el), 480);
    },
    onPointerUp: () => window.clearTimeout(press.current),
    onPointerMove: () => window.clearTimeout(press.current),
  });

  /* ---------------- render ---------------- */
  const groups = useMemo(() => {
    const out: { label: string; items: Convo[] }[] = [];
    for (const c of convos) {
      const g = group(c.updated);
      const last = out[out.length - 1];
      if (last?.label === g) last.items.push(c);
      else out.push({ label: g, items: [c] });
    }
    return out;
  }, [convos]);

  return (
    <div className={`ios pc${desktop ? " is-desk" : ""}`} data-mode={modeKey} ref={root}>

      {/* ---------------- drawer ---------------- */}
      <aside className="dr" aria-label="Riwayat obrolan">
        <div className="dr-top">
          <span className="dr-logo">
            <PipAva mode={mode} />
            <b>Pip</b>
          </span>
          <button className="pc-icon" onClick={newChat} aria-label="Obrolan baru">
            <Icon name="compose" size={21} />
          </button>
        </div>
        <div className="dr-modes">
          {MODES.map((m) => (
            <button key={m.key} className={`dr-mode dr-item${m.key === modeKey ? " is-on" : ""}`} data-m={m.key} onClick={(e) => switchMode(m.key, { x: e.clientX, y: e.clientY })}>
              <PipAva mode={m} />
              <span>
                <b>{m.name}</b>
                <small>{m.tagline}</small>
              </span>
            </button>
          ))}
        </div>
        <div className="dr-list">
          {groups.map((g) => (
            <div key={g.label}>
              <p className="dr-label dr-item">{g.label}</p>
              {g.items.map((c) => (
                <div key={c.id} className={`dr-conv dr-item${c.id === activeId ? " is-on" : ""}`}>
                  <button
                    onClick={() => {
                      if (busy) abort.current?.abort();
                      setActiveId(c.id);
                      setAttachments([]);
                      setDrawer(false);
                    }}
                  >
                    <i className="dr-dot" data-m={c.profile} />
                    <span>
                      <b>{c.title}</b>
                      <small>{preview(c)}</small>
                    </span>
                  </button>
                  <button className="dr-del" aria-label="Hapus" onClick={() => deleteConvo(c.id)}>
                    <Icon name="trash" size={16} />
                  </button>
                </div>
              ))}
            </div>
          ))}
          {!convos.length && <p className="dr-empty dr-item">Obrolanmu akan muncul di sini.</p>}
        </div>
        <button className="dr-home dr-item" onClick={() => navigate("/")}>
          <Icon name="home" size={18} /> Kembali ke beranda
        </button>
      </aside>
      {!desktop && <div className="dr-scrim" onClick={() => setDrawer(false)} />}

      {/* ---------------- main ---------------- */}
      <div className="pc-main" ref={mainRef}>
        <header className={`pc-head${scrolled ? " is-scrolled" : ""}`}>
          {!desktop ? (
            <button className="pc-icon" onClick={() => setDrawer(true)} aria-label="Menu">
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                <path d="M4 8h16M4 15h10" />
              </svg>
            </button>
          ) : (
            <span />
          )}
          <button className="pc-pill" onClick={() => setPicker((v) => !v)} aria-haspopup="listbox" aria-expanded={picker}>
            <PipAva mode={mode} />
            <span className="pc-pill__name" key={mode.key}>
              {mode.name}
            </span>
            <Icon name="chevron" size={14} className={`pc-pill__chev${picker ? " is-open" : ""}`} />
          </button>
          <button className="pc-icon" onClick={newChat} aria-label="Obrolan baru">
            <Icon name="compose" size={21} />
          </button>
        </header>

        {picker && <ModelPicker current={modeKey} onPick={switchMode} onClose={() => setPicker(false)} />}

        <div
          className="pc-scroll"
          ref={scroller}
          onScroll={(e) => {
            const el = e.currentTarget;
            stick.current = el.scrollHeight - el.scrollTop - el.clientHeight < 120;
            setScrolled(el.scrollTop > 4);
          }}
        >
          {empty ? (
            <Welcome key={mode.key} mode={mode} onSwitch={switchMode} />
          ) : (
            <div className="pc-msgs">
              {messages.map((m) =>
                m.role === "user" ? (
                  <div className="pc-row pc-row--me" key={m.id} data-msg={m.id}>
                    {m.attachments && (
                      <div className="pc-att">
                        {m.attachments.map((a) =>
                          a.thumb ? (
                            <img key={a.id} src={a.thumb} alt={a.name} />
                          ) : (
                            <span key={a.id} className="pc-att__file">
                              <Icon name="file" size={16} />
                              {a.name}
                            </span>
                          ),
                        )}
                      </div>
                    )}
                    {m.content && (
                      <div className="pc-me" {...pressProps(m)}>
                        {m.content}
                      </div>
                    )}
                  </div>
                ) : (
                  <div className={`pc-row pc-row--pip${m.status === "error" ? " is-error" : ""}`} key={m.id} data-msg={m.id}>
                    <div className="pc-who">
                      <PipAva mode={mode} />
                      <b>{mode.name}</b>
                    </div>
                    <div className="pc-body">
                      {m.status === "pending" && !(m.parts ?? []).length && <Thinking mode={mode} />}
                      {(m.parts ?? []).map((part, j, all) =>
                        part.kind === "text" ? (
                          part.text.trim() ? (
                            <div className="pc-text md" key={j} {...pressProps(m)}>
                              <Markdown text={part.text} />
                              {m.status === "streaming" && j === all.length - 1 && <span className="caret" />}
                            </div>
                          ) : null
                        ) : (
                          <ToolPart key={part.id} part={part} onPrompt={prompt} animate={ready} />
                        ),
                      )}
                      {m.status === "streaming" && (m.parts ?? []).at(-1)?.kind === "tool" && (m.parts!.at(-1) as { status: string }).status === "done" && <Thinking mode={mode} small />}
                      {m.note && <p className="pc-note">{m.note}</p>}
                      {m.status === "stopped" && <p className="pc-note">Dihentikan</p>}
                      {m.offline && <p className="pc-note">Mode offline · PIP_API_KEY belum diset</p>}
                      {m.status === "error" && m.id === lastBot && (
                        <button className="pc-retry" onClick={regenerate}>
                          <Icon name="retry" size={15} /> Coba lagi
                        </button>
                      )}
                    </div>
                  </div>
                ),
              )}
            </div>
          )}
        </div>

        {/* ---------------- floating dock ---------------- */}
        <div className="pc-dock">
          {empty && <Chips mode={mode} onPick={(s) => (s.action ? composer.current?.pick(s.action) : s.prompt && prompt(s.prompt))} />}
          <Composer
            ref={composer}
            attachments={attachments}
            busy={busy}
            placeholder={mode.placeholder}
            onFiles={addFiles}
            onRemove={(id) => {
              files.current.delete(id);
              setAttachments((a) => a.filter((x) => x.id !== id));
            }}
            onSend={send}
            onStop={() => abort.current?.abort()}
            onPlus={() => setSheet(true)}
          />
        </div>
      </div>

      <div className="pc-wipe" ref={wipeRef} />

      <Sheet open={sheet} onClose={() => setSheet(false)} title="Tambahkan">
        <div className="sh-attach">
          {(
            [
              ["image", "photo", "Foto"],
              ["camera", "camera", "Kamera"],
              ["file", "file", "File"],
            ] as const
          ).map(([kind, icon, label]) => (
            <button key={kind} onClick={() => (setSheet(false), composer.current?.pick(kind))}>
              <span>
                <Icon name={icon} size={24} />
              </span>
              {label}
            </button>
          ))}
        </div>
        <p className="sh-label">Keahlian {mode.name}</p>
        <div className="sh-tools">
          {mode.tools.map((t) => (
            <button key={t.label} onClick={() => (setSheet(false), setTimeout(() => prompt(t.prompt), 220))}>
              <span>
                <Icon name={t.icon} size={22} />
              </span>
              {t.label}
            </button>
          ))}
        </div>
        <p className="sh-label">Ganti mode</p>
        <div className="sh-modes">
          {MODES.map((m) => (
            <button key={m.key} className={m.key === modeKey ? "is-on" : ""} data-m={m.key} onClick={(e) => (setSheet(false), switchMode(m.key, { x: e.clientX, y: e.clientY }))}>
              <PipAva mode={m} />
              {m.name}
            </button>
          ))}
        </div>
      </Sheet>

      <ContextMenu anchor={menu?.rect ?? null} items={menu?.items ?? []} preview={menu?.preview} align={menu?.align} onClose={() => setMenu(null)} />
      {toast && <div className="ios-toast">{toast}</div>}
      {dragging && (
        <div className="ios-drop">
          <div>
            <Icon name="photo" size={34} />
            <b>Lepas untuk melampirkan</b>
            <span>Gambar, PDF, Word, Excel, teks, kode</span>
          </div>
        </div>
      )}
    </div>
  );
}

/* ================================================================== */
/* pieces                                                              */
/* ================================================================== */

function ModelPicker({ current, onPick, onClose }: { current: ModelKey; onPick: (k: ModelKey, o: { x: number; y: number }) => void; onClose: () => void }) {
  const ref = useRef<HTMLDivElement>(null);
  useGSAP(
    () => {
      if (reducedMotion) return;
      gsap.fromTo(".mp-card", { y: -10, scale: 0.94, autoAlpha: 0, transformOrigin: "50% 0%" }, { y: 0, scale: 1, autoAlpha: 1, duration: 0.45, ease: "back.out(1.6)" });
      gsap.from(".mp-opt", { y: -8, autoAlpha: 0, duration: 0.35, stagger: 0.05, delay: 0.06 });
    },
    { scope: ref },
  );
  return (
    <div className="mp" ref={ref}>
      <div className="mp-scrim" onClick={onClose} />
      <div className="mp-card" role="listbox" aria-label="Pilih mode">
        {MODES.map((m) => (
          <button key={m.key} role="option" aria-selected={m.key === current} className={`mp-opt${m.key === current ? " is-on" : ""}`} data-m={m.key} onClick={(e) => onPick(m.key, { x: e.clientX, y: e.clientY })}>
            <span className="mp-tile" data-m={m.key}>
              <PipAva mode={m} />
            </span>
            <span className="mp-txt">
              <b>{m.name}</b>
              <small>{m.tagline}</small>
              <span className="mp-skills">
                {m.skills.slice(0, 3).map((s) => (
                  <i key={s}>{s}</i>
                ))}
              </span>
            </span>
            {m.key === current && <Icon name="check" size={18} className="mp-check" />}
          </button>
        ))}
      </div>
    </div>
  );
}

/** Mode-specific "thinking" indicator. */
function Thinking({ mode, small }: { mode: Mode; small?: boolean }) {
  if (mode.key === "pip-code")
    return (
      <p className={`th th--code${small ? " th--sm" : ""}`}>
        <span className="th__cursor" />
        {mode.thinking}
        <span className="th__dots">...</span>
      </p>
    );
  if (mode.key === "pip-docs")
    return (
      <p className={`th th--docs${small ? " th--sm" : ""}`}>
        <span className="th__book">
          <i />
          <i />
        </span>
        <span className="th__shimmer">{mode.thinking}…</span>
      </p>
    );
  return (
    <p className={`th th--pip${small ? " th--sm" : ""}`}>
      <span className="th__hop">
        <i />
        <i />
        <i />
      </span>
      {!small && mode.thinking}
    </p>
  );
}

function Chips({ mode, onPick }: { mode: Mode; onPick: (s: Suggestion) => void }) {
  const ref = useRef<HTMLDivElement>(null);
  useGSAP(
    () => {
      if (!reducedMotion) gsap.from(".chip2", { y: 14, autoAlpha: 0, duration: 0.5, stagger: 0.04, ease: "back.out(1.6)", delay: 0.25 });
    },
    { scope: ref, dependencies: [mode.key], revertOnUpdate: true },
  );
  return (
    <div className="chips2" ref={ref}>
      {mode.suggestions.map((s) => (
        <button key={s.label} className="chip2" onClick={() => onPick(s)}>
          <Icon name={s.icon} size={15} />
          {s.label}
        </button>
      ))}
    </div>
  );
}

/** Each mode has its own hero + entrance choreography. Swipe sideways to change mode. */
function Welcome({ mode, onSwitch }: { mode: Mode; onSwitch: (k: ModelKey, o?: { x: number; y: number }) => void }) {
  const ref = useRef<HTMLDivElement>(null);

  useGSAP(
    () => {
      if (reducedMotion) return;
      const q = gsap.utils.selector(ref);
      if (mode.key === "pip") {
        const split = SplitText.create(q(".wl2-title"), { type: "chars" });
        gsap
          .timeline()
          .from(q(".wl2-ava"), { scale: 0, rotation: -30, duration: 0.8, ease: "back.out(2)" })
          .from(split.chars, { y: 40, autoAlpha: 0, rotation: () => gsap.utils.random(-25, 25), duration: 0.6, stagger: 0.03, ease: "back.out(2.2)" }, 0.2)
          .from(q(".wl2-sub, .wl2-skills i"), { y: 12, autoAlpha: 0, duration: 0.5, stagger: 0.05 }, 0.45);
        gsap.to(q(".wl2-ava .pava"), { y: -10, duration: 0.9, ease: "sine.inOut", yoyo: true, repeat: -1 });
        gsap.to(q(".wl2-orbit"), { rotation: 360, duration: 14, ease: "none", repeat: -1 });
      } else if (mode.key === "pip-code") {
        const lines = q(".term2 .ln") as HTMLElement[];
        const texts = lines.map((l) => l.dataset.t ?? "");
        lines.forEach((l) => (l.textContent = ""));
        const tl = gsap.timeline({ delay: 0.15 });
        tl.from(q(".term2"), { y: 20, autoAlpha: 0, duration: 0.4, ease: "power3.out" });
        lines.forEach((l, i) => {
          const o = { n: 0 };
          tl.to(o, { n: texts[i].length, duration: texts[i].length * 0.025, ease: "none", onUpdate: () => void (l.textContent = texts[i].slice(0, Math.round(o.n))) }, i === 0 ? ">" : ">+0.12");
        });
        tl.from(q(".wl2-sub, .wl2-skills i"), { autoAlpha: 0, x: -10, duration: 0.3, stagger: 0.05, ease: "steps(4)" }, ">-0.2");
        // occasional glitch on the title
        gsap.to(q(".wl2-title"), { keyframes: [{ x: 3, skewX: 8, duration: 0.05 }, { x: -2, skewX: -6, duration: 0.05 }, { x: 0, skewX: 0, duration: 0.05 }], repeat: -1, repeatDelay: 3.2, delay: 2 });
      } else {
        gsap
          .timeline()
          .from(q(".paper"), { rotationX: -70, y: 30, autoAlpha: 0, transformPerspective: 900, transformOrigin: "50% 0%", duration: 1, ease: "power3.out" })
          .from(q(".wl2-title"), { y: 16, autoAlpha: 0, filter: "blur(8px)", duration: 0.8, ease: "power3.out" }, 0.3)
          .fromTo(q(".paper__rule"), { scaleX: 0 }, { scaleX: 1, transformOrigin: "0% 50%", duration: 0.9, ease: "power2.inOut" }, 0.5)
          .from(q(".wl2-sub, .idx li"), { y: 8, autoAlpha: 0, filter: "blur(4px)", duration: 0.6, stagger: 0.06 }, 0.6);
      }
    },
    { scope: ref },
  );

  // swipe between modes
  const sx = useRef<number | null>(null);
  const idx = MODES.findIndex((m) => m.key === mode.key);
  return (
    <div
      className={`wl2 wl2--${mode.key}`}
      ref={ref}
      onPointerDown={(e) => (sx.current = e.pointerType === "mouse" ? null : e.clientX)}
      onPointerUp={(e) => {
        if (sx.current === null) return;
        const dx = e.clientX - sx.current;
        sx.current = null;
        if (Math.abs(dx) < 70) return;
        const next = MODES[(idx + (dx < 0 ? 1 : MODES.length - 1)) % MODES.length];
        onSwitch(next.key, { x: e.clientX, y: e.clientY });
      }}
    >
      {mode.key === "pip" && (
        <div className="wl2-hero">
          <div className="wl2-ava">
            <span className="wl2-orbit">
              {["✦", "★", "✧", "♥", "✦", "♪"].map((c, i) => (
                <i key={i} style={{ transform: `rotate(${i * 60}deg) translateY(-78px)` }}>
                  {c}
                </i>
              ))}
            </span>
            <PipAva mode={mode} />
          </div>
          <h1 className="wl2-title">{mode.greeting}</h1>
        </div>
      )}
      {mode.key === "pip-code" && (
        <div className="term2">
          <div className="term2__bar">
            <i />
            <i />
            <i />
            <span>pip-code — zsh</span>
          </div>
          <div className="term2__body">
            <p className="ln" data-t="$ pip --mode code" />
            <p className="ln ln--ok" data-t="✓ debugger dimuat" />
            <p className="ln ln--ok" data-t="✓ build_app siap · sandbox aktif" />
            <p className="ln ln--ok" data-t="✓ membaca screenshot & file kode" />
            <h1 className="wl2-title">
              <span className="ln" data-t={`> ${mode.greeting}`} />
              <span className="term2__cursor" />
            </h1>
          </div>
        </div>
      )}
      {mode.key === "pip-docs" && (
        <div className="paper">
          <div className="paper__head">
            <PipAva mode={mode} />
            <span>
              <small>JKT48Connect</small>
              <b>Pustaka API</b>
            </span>
            <em>No. 001</em>
          </div>
          <h1 className="wl2-title">{mode.greeting}</h1>
          <i className="paper__rule" />
        </div>
      )}

      <p className="wl2-sub">{mode.sub}</p>
      {mode.key === "pip-docs" ? (
        <ol className="idx">
          {mode.skills.map((s, i) => (
            <li key={s}>
              <span>{s}</span>
              <i />
              <em>{String(i + 1).padStart(2, "0")}</em>
            </li>
          ))}
        </ol>
      ) : (
        <div className="wl2-skills">
          {mode.skills.map((s) => (
            <i key={s}>{mode.key === "pip-code" ? `[${s.toLowerCase()}]` : s}</i>
          ))}
        </div>
      )}

      <div className="wl2-dots" role="tablist" aria-label="Mode">
        {MODES.map((m) => (
          <button key={m.key} role="tab" aria-selected={m.key === mode.key} aria-label={m.name} className={m.key === mode.key ? "is-on" : ""} onClick={(e) => onSwitch(m.key, { x: e.clientX, y: e.clientY })} />
        ))}
      </div>
    </div>
  );
}
