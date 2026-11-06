import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { gsap, useGSAP, Flip, reducedMotion } from "../lib/gsap";
import { PipError, streamReply, type ModelKey } from "../lib/chat";
import { Markdown } from "../lib/markdown";
import { load, save } from "../lib/store";
import { navigate } from "../lib/router";
import { Sprite } from "../components/Sprite";
import { PixelIcon } from "../components/Pixels";
import { Composer, PROFILES, type ComposerHandle } from "./Composer";
import {
  MAX_BYTES,
  MAX_FILES,
  ReadError,
  classify,
  composeForPip,
  formatSize,
  prepareImage,
  readFile,
  uid,
  type Attachment,
} from "./files";
import "../styles/chat.css";

/* ------------------------------------------------------------------ */
/* types & storage                                                     */
/* ------------------------------------------------------------------ */

type Status = "pending" | "streaming" | "done" | "error" | "stopped";

interface Msg {
  id: string;
  role: "user" | "assistant";
  content: string;
  at: number;
  attachments?: Attachment[];
  status?: Status;
  offline?: boolean;
}

interface Convo {
  id: string;
  title: string;
  profile: ModelKey;
  messages: Msg[];
  updated: number;
}

const KEY = "pip.chat.v2";
const MAX_CONVOS = 30;

const SUGGESTIONS: { icon: "image" | "doc" | "code" | "book"; text: string; attach?: boolean; profile?: ModelKey }[] = [
  { icon: "image", text: "Jelaskan isi gambar ini", attach: true },
  { icon: "doc", text: "Rangkum PDF ini jadi 5 poin", attach: true },
  { icon: "code", text: "Kenapa useEffect saya jalan dua kali?", profile: "pip-code" },
  { icon: "book", text: "Endpoint apa untuk jadwal theater JKT48?", profile: "pip-docs" },
];

function greeting() {
  const h = new Date().getHours();
  if (h < 11) return "Selamat pagi";
  if (h < 15) return "Selamat siang";
  if (h < 19) return "Selamat sore";
  return "Selamat malam";
}

function relTime(t: number) {
  const s = (Date.now() - t) / 1000;
  if (s < 60) return "baru saja";
  if (s < 3600) return `${Math.floor(s / 60)} mnt`;
  if (s < 86400) return `${Math.floor(s / 3600)} jam`;
  return new Date(t).toLocaleDateString("id-ID", { day: "numeric", month: "short" });
}

/* ------------------------------------------------------------------ */
/* app                                                                 */
/* ------------------------------------------------------------------ */

export function ChatApp() {
  const [convos, setConvos] = useState<Convo[]>(() =>
    load<Convo[]>(KEY, []).map((c) => ({
      ...c,
      messages: c.messages.filter((m) => m.status !== "pending").map((m) => (m.status === "streaming" ? { ...m, status: "stopped" } : m)),
    })),
  );
  const [activeId, setActiveId] = useState<string | null>(null);
  const [draftProfile, setDraftProfile] = useState<ModelKey>("pip");
  const [attachments, setAttachments] = useState<Attachment[]>([]);
  const [busy, setBusy] = useState(false);
  const [dragging, setDragging] = useState(false);
  const [sideOpen, setSideOpen] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);

  const root = useRef<HTMLDivElement>(null);
  const threadRef = useRef<HTMLDivElement>(null);
  const composer = useRef<ComposerHandle>(null);
  const abort = useRef<AbortController | null>(null);
  const files = useRef(new Map<string, { file: File; upload?: Blob }>());

  const active = convos.find((c) => c.id === activeId) ?? null;
  const profile = active?.profile ?? draftProfile;
  const messages = active?.messages ?? [];
  const empty = messages.length === 0;

  useEffect(() => save(KEY, convos.slice(0, MAX_CONVOS)), [convos]);

  const flash = useCallback((msg: string) => {
    setNotice(msg);
    window.setTimeout(() => setNotice((n) => (n === msg ? null : n)), 4000);
  }, []);

  /* ---------------- entrance ---------------- */
  useGSAP(
    () => {
      if (reducedMotion) return;
      gsap
        .timeline()
        // animate the drawer's contents, not .side itself: an inline transform would override the mobile drawer CSS
        .from(".side > *", { x: -16, autoAlpha: 0, duration: 0.6, stagger: 0.05, clearProps: "transform" })
        .from(".side__list li", { x: -12, autoAlpha: 0, duration: 0.5, stagger: 0.03 }, 0.2)
        .from(".welcome > *", { y: 18, autoAlpha: 0, duration: 0.8, stagger: 0.07 }, 0.1)
        .from(".composer", { y: 24, autoAlpha: 0, duration: 0.8 }, 0.25)
        .from(".sugg button", { y: 12, autoAlpha: 0, duration: 0.6, stagger: 0.05 }, 0.4);
    },
    { scope: root },
  );

  /* ---------------- composer moves from centre to bottom (Flip) ---------------- */
  const flipState = useRef<Flip.FlipState | null>(null);
  const captureFlip = () => {
    if (!reducedMotion && root.current) flipState.current = Flip.getState(root.current.querySelector(".composer"));
  };
  useLayoutEffect(() => {
    if (flipState.current) {
      Flip.from(flipState.current, { duration: 0.7, ease: "pip.inOut" });
      flipState.current = null;
    }
  }, [empty, activeId]);

  /* ---------------- scroll handling ---------------- */
  const stick = useRef(true);
  useLayoutEffect(() => {
    const el = threadRef.current;
    if (el && stick.current) el.scrollTop = el.scrollHeight;
  }, [messages]);

  const seen = useRef(new Set<string>());
  useEffect(() => {
    const fresh = messages.filter((m) => !seen.current.has(m.id));
    fresh.forEach((m) => seen.current.add(m.id));
    if (reducedMotion || fresh.length > 3) return; // don't animate a whole loaded convo
    fresh.forEach((m) => {
      const el = root.current?.querySelector(`[data-msg="${m.id}"]`);
      if (el) gsap.from(el, { y: 14, autoAlpha: 0, duration: 0.55 });
    });
  }, [messages]);

  /* ---------------- attachments ---------------- */
  const addFiles = useCallback(
    (list: File[]) => {
      const room = MAX_FILES - attachments.length;
      if (room <= 0) return flash(`Maksimal ${MAX_FILES} lampiran per pesan.`);
      const accepted: Attachment[] = [];
      for (const file of list.slice(0, room)) {
        const kind = classify(file);
        if (!kind) {
          flash(`${file.name}: format ini belum didukung.`);
          continue;
        }
        if (file.size > MAX_BYTES) {
          flash(`${file.name}: maksimal ${formatSize(MAX_BYTES)}.`);
          continue;
        }
        const att: Attachment = { id: uid(), name: file.name || "tempelan.png", size: file.size, mime: file.type, kind, status: "reading" };
        files.current.set(att.id, { file });
        accepted.push(att);
      }
      if (list.length > room) flash(`Maksimal ${MAX_FILES} lampiran per pesan.`);
      if (!accepted.length) return;
      setAttachments((a) => [...a, ...accepted]);

      // read each one right away so it's ready by the time you hit send
      accepted.forEach(async (att) => {
        const patch = (p: Partial<Attachment>) => setAttachments((all) => all.map((a) => (a.id === att.id ? { ...a, ...p } : a)));
        const entry = files.current.get(att.id)!;
        try {
          let upload: Blob | undefined;
          if (att.kind === "image") {
            const prepared = await prepareImage(entry.file);
            upload = prepared.upload;
            patch({ thumb: prepared.thumb });
          }
          const { text, truncated } = await readFile(entry.file, att.kind, upload);
          patch({ status: "ready", text, truncated });
        } catch (err) {
          patch({ status: "error", error: err instanceof ReadError || err instanceof Error ? err.message : "Gagal membaca file." });
        }
      });
    },
    [attachments.length, flash],
  );

  const removeAttachment = (id: string) => {
    files.current.delete(id);
    setAttachments((a) => a.filter((x) => x.id !== id));
  };

  // drag & drop anywhere on the chat
  useEffect(() => {
    let depth = 0;
    const hasFiles = (e: DragEvent) => Array.from(e.dataTransfer?.types ?? []).includes("Files");
    const enter = (e: DragEvent) => {
      if (!hasFiles(e)) return;
      depth++;
      setDragging(true);
    };
    const leave = () => {
      depth = Math.max(0, depth - 1);
      if (!depth) setDragging(false);
    };
    const over = (e: DragEvent) => {
      if (hasFiles(e)) e.preventDefault();
    };
    const drop = (e: DragEvent) => {
      if (!hasFiles(e)) return;
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

  useGSAP(
    () => {
      if (!dragging || reducedMotion) return;
      gsap.from(".dropzone", { autoAlpha: 0, duration: 0.25 });
      gsap.from(".dropzone__card", { scale: 0.94, y: 10, duration: 0.4, ease: "pip.pop" });
    },
    { scope: root, dependencies: [dragging] },
  );

  /* ---------------- sending ---------------- */
  const updateConvo = (id: string, fn: (c: Convo) => Convo) =>
    setConvos((cs) => cs.map((c) => (c.id === id ? fn(c) : c)));

  const run = useCallback(
    async (convoId: string, prof: ModelKey, history: Msg[]) => {
      const bot: Msg = { id: uid(), role: "assistant", content: "", at: Date.now(), status: "pending" };
      updateConvo(convoId, (c) => ({ ...c, messages: [...history, bot], updated: Date.now() }));
      setBusy(true);
      stick.current = true;

      const payload = history
        .filter((m) => m.status !== "error" && (m.content || m.attachments?.length))
        .map((m) => ({ role: m.role, content: m.role === "user" ? composeForPip(m.content, m.attachments) : m.content }));

      const ac = new AbortController();
      abort.current = ac;
      const patch = (fn: (m: Msg) => Partial<Msg>) =>
        updateConvo(convoId, (c) => ({ ...c, messages: c.messages.map((m) => (m.id === bot.id ? { ...m, ...fn(m) } : m)) }));

      try {
        const { source } = await streamReply(
          prof,
          payload.slice(-16),
          (chunk) => patch((m) => ({ status: "streaming", content: m.content + chunk })),
          ac.signal,
        );
        patch(() => ({ status: "done", offline: source === "offline" }));
      } catch (err) {
        if (ac.signal.aborted) patch(() => ({ status: "stopped" }));
        else {
          const msg = err instanceof PipError ? err.message : "Koneksi ke Pip terputus. Coba lagi ya.";
          patch((m) => ({ status: "error", content: m.content || msg }));
        }
      } finally {
        setBusy(false);
        abort.current = null;
      }
    },
    [],
  );

  const send = useCallback(
    (text: string) => {
      const ready = attachments.filter((a) => a.status === "ready");
      if (busy || (!text.trim() && !ready.length)) return;
      const user: Msg = {
        id: uid(),
        role: "user",
        content: text.trim(),
        at: Date.now(),
        attachments: ready.length ? ready : undefined,
      };
      if (empty) captureFlip();
      setAttachments([]);
      files.current.clear();

      let id = active?.id;
      if (!id) {
        id = uid();
        const title = (text.trim() || ready[0]?.name || "Obrolan baru").slice(0, 60);
        const convo: Convo = { id, title, profile, messages: [], updated: Date.now() };
        setConvos((cs) => [convo, ...cs].slice(0, MAX_CONVOS));
        setActiveId(id);
      }
      void run(id, profile, [...messages, user]);
    },
    [active, attachments, busy, empty, messages, profile, run],
  );

  const regenerate = () => {
    if (!active || busy) return;
    const idx = [...active.messages].map((m) => m.role).lastIndexOf("user");
    if (idx < 0) return;
    void run(active.id, profile, active.messages.slice(0, idx + 1));
  };

  const newChat = () => {
    if (busy) abort.current?.abort();
    if (!empty) captureFlip();
    setActiveId(null);
    setSideOpen(false);
    setAttachments([]);
    requestAnimationFrame(() => composer.current?.focus());
  };

  const openConvo = (id: string) => {
    if (busy) return;
    if (empty) captureFlip();
    setActiveId(id);
    setSideOpen(false);
  };

  const deleteConvo = (id: string) => {
    const el = root.current?.querySelector(`[data-convo="${id}"]`);
    const done = () => {
      setConvos((cs) => cs.filter((c) => c.id !== id));
      if (activeId === id) setActiveId(null);
    };
    if (el && !reducedMotion) gsap.to(el, { x: -20, autoAlpha: 0, height: 0, duration: 0.3, onComplete: done });
    else done();
  };

  const setProfile = (p: ModelKey) => {
    if (active) updateConvo(active.id, (c) => ({ ...c, profile: p }));
    else setDraftProfile(p);
  };

  // deep link from the landing page: /chat?p=pip-code&q=...
  const deepLinked = useRef(false);
  useEffect(() => {
    if (deepLinked.current) return;
    deepLinked.current = true;
    const params = new URLSearchParams(location.search);
    const p = params.get("p") as ModelKey | null;
    const q = params.get("q");
    if (p && PROFILES.some((x) => x.key === p)) setDraftProfile(p);
    if (q) composer.current?.setText(q);
    if (params.toString()) history.replaceState(null, "", "/chat");
    composer.current?.focus();
  }, []);

  const lastAssistant = useMemo(() => [...messages].reverse().find((m) => m.role === "assistant")?.id, [messages]);

  /* ---------------- render ---------------- */
  return (
    <div className={`chat${sideOpen ? " side-open" : ""}`} ref={root}>
      <aside className="side">
        <div className="side__top">
          <a
            className="side__logo"
            href="/"
            onClick={(e) => {
              e.preventDefault();
              navigate("/");
            }}
          >
            <Sprite name="pipHead" />
            <span>Pip</span>
          </a>
          <button className="icon-btn side__close" aria-label="Tutup menu" onClick={() => setSideOpen(false)}>
            ×
          </button>
        </div>
        <button className="side__new" onClick={newChat}>
          <span aria-hidden="true">+</span> Obrolan baru
        </button>
        <p className="side__label">Riwayat</p>
        {convos.length === 0 ? (
          <p className="side__empty">Belum ada obrolan.</p>
        ) : (
          <ul className="side__list">
            {convos.map((c) => (
              <li key={c.id} data-convo={c.id} className={c.id === activeId ? "is-on" : ""}>
                <button className="side__item" onClick={() => openConvo(c.id)}>
                  <span className="side__title">{c.title}</span>
                  <span className="side__time">{relTime(c.updated)}</span>
                </button>
                <button className="side__del" aria-label={`Hapus ${c.title}`} onClick={() => deleteConvo(c.id)}>
                  ×
                </button>
              </li>
            ))}
          </ul>
        )}
        <a
          className="side__home"
          href="/"
          onClick={(e) => {
            e.preventDefault();
            navigate("/");
          }}
        >
          ← Kembali ke beranda
        </a>
      </aside>
      <div className="side__scrim" onClick={() => setSideOpen(false)} />

      <main className={`main${empty ? " is-empty" : ""}`}>
        <header className="main__bar">
          <button className="icon-btn main__menu" aria-label="Buka riwayat" onClick={() => setSideOpen(true)}>
            <svg viewBox="0 0 16 16" aria-hidden="true">
              <path d="M2 4h12M2 8h12M2 12h8" stroke="currentColor" strokeWidth="1.4" fill="none" />
            </svg>
          </button>
          <span className="main__title">{active?.title ?? "Obrolan baru"}</span>
          <button className="icon-btn" aria-label="Obrolan baru" title="Obrolan baru" onClick={newChat}>
            <svg viewBox="0 0 16 16" aria-hidden="true">
              <path d="M8 3v10M3 8h10" stroke="currentColor" strokeWidth="1.4" fill="none" />
            </svg>
          </button>
        </header>

        <div
          className="thread"
          ref={threadRef}
          onScroll={(e) => {
            const el = e.currentTarget;
            stick.current = el.scrollHeight - el.scrollTop - el.clientHeight < 80;
          }}
        >
          {empty ? (
            <div className="welcome">
              <Sprite name="pip" className="welcome__pip" />
              <h1>
                {greeting()}. <span>Mau mulai dari mana?</span>
              </h1>
              <p>Tanya apa saja, atau lampirkan foto, PDF, dan dokumen untuk dibaca Pip.</p>
            </div>
          ) : (
            <div className="msgs">
              {messages.map((m) =>
                m.role === "user" ? (
                  <div className="msg msg--user" key={m.id} data-msg={m.id}>
                    {m.attachments && <AttachmentStrip items={m.attachments} />}
                    {m.content && <div className="msg__bubble">{m.content}</div>}
                  </div>
                ) : (
                  <div className={`msg msg--bot msg--${m.status}`} key={m.id} data-msg={m.id}>
                    <span className="msg__avatar">
                      <Sprite name="pipHead" />
                    </span>
                    <div className="msg__body">
                      {m.status === "pending" ? (
                        <p className="thinking">Pip sedang berpikir</p>
                      ) : (
                        <div className="md">
                          <Markdown text={m.content} />
                          {m.status === "streaming" && <span className="caret" />}
                        </div>
                      )}
                      {m.status === "stopped" && <p className="msg__note">Dihentikan.</p>}
                      {m.offline && <p className="msg__note">Mode offline: PIP_API_KEY belum diset di Worker.</p>}
                      {(m.status === "done" || m.status === "error" || m.status === "stopped") && (
                        <div className="msg__actions">
                          <CopyButton text={m.content} />
                          {m.id === lastAssistant && (
                            <button onClick={regenerate} disabled={busy}>
                              {m.status === "error" ? "Coba lagi" : "Ulangi"}
                            </button>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                ),
              )}
            </div>
          )}
        </div>

        <div className="dock">
          <Composer
            ref={composer}
            attachments={attachments}
            profile={profile}
            busy={busy}
            onProfile={setProfile}
            onFiles={addFiles}
            onRemove={removeAttachment}
            onSend={send}
            onStop={() => abort.current?.abort()}
          />
          {empty && (
            <div className="sugg">
              {SUGGESTIONS.map((s) => (
                <button
                  key={s.text}
                  onClick={() => {
                    if (s.profile) setProfile(s.profile);
                    composer.current?.setText(s.text);
                    if (s.attach) composer.current?.openPicker();
                    else composer.current?.focus();
                  }}
                >
                  <PixelIcon name={s.icon} className="sugg__icon" />
                  {s.text}
                </button>
              ))}
            </div>
          )}
          <p className="dock__fine">Pip bisa keliru. Periksa info penting. Lampiran dibaca oleh Workers AI.</p>
        </div>

        {notice && (
          <div className="toast" role="status">
            {notice}
          </div>
        )}
        {dragging && (
          <div className="dropzone">
            <div className="dropzone__card">
              <PixelIcon name="image" className="dropzone__icon" />
              <b>Lepas untuk melampirkan</b>
              <span>Gambar, PDF, Word, Excel, teks, atau kode. Maks 10 MB per file.</span>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}

function AttachmentStrip({ items }: { items: Attachment[] }) {
  return (
    <div className="strip">
      {items.map((a) =>
        a.thumb ? (
          <img key={a.id} className="strip__img" src={a.thumb} alt={a.name} title={a.name} />
        ) : (
          <span key={a.id} className="strip__file" title={a.name}>
            <PixelIcon name={a.kind === "text" ? "code" : "doc"} className="strip__icon" />
            <span>
              {a.name}
              <small>{formatSize(a.size)}</small>
            </span>
          </span>
        ),
      )}
    </div>
  );
}

function CopyButton({ text }: { text: string }) {
  const [ok, setOk] = useState(false);
  return (
    <button
      onClick={() =>
        void navigator.clipboard?.writeText(text).then(() => {
          setOk(true);
          setTimeout(() => setOk(false), 1400);
        })
      }
    >
      {ok ? "Tersalin" : "Salin"}
    </button>
  );
}
