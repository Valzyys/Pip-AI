import { forwardRef, useEffect, useImperativeHandle, useRef, useState } from "react";
import { gsap, useGSAP, reducedMotion } from "../lib/gsap";
import type { ModelKey } from "../lib/chat";
import { PixelIcon } from "../components/Pixels";
import { ACCEPT, formatSize, type Attachment } from "./files";

export const PROFILES: { key: ModelKey; name: string; desc: string }[] = [
  { key: "pip", name: "Pip", desc: "Ngobrol, menulis, membaca lampiran" },
  { key: "pip-code", name: "Pip Code", desc: "Debug, refactor, review kode" },
  { key: "pip-docs", name: "Pip Docs", desc: "Dokumentasi JKT48Connect" },
];

export interface ComposerHandle {
  focus: () => void;
  setText: (t: string) => void;
  openPicker: () => void;
}

interface Props {
  attachments: Attachment[];
  profile: ModelKey;
  busy: boolean;
  onProfile: (p: ModelKey) => void;
  onFiles: (files: File[]) => void;
  onRemove: (id: string) => void;
  onSend: (text: string) => void;
  onStop: () => void;
}

export const Composer = forwardRef<ComposerHandle, Props>(function Composer(
  { attachments, profile, busy, onProfile, onFiles, onRemove, onSend, onStop },
  ref,
) {
  const root = useRef<HTMLFormElement>(null);
  const area = useRef<HTMLTextAreaElement>(null);
  const fileInput = useRef<HTMLInputElement>(null);
  const [text, setText] = useState("");
  const [menu, setMenu] = useState(false);

  const reading = attachments.some((a) => a.status === "reading");
  const ready = attachments.some((a) => a.status === "ready");
  const canSend = !busy && !reading && (text.trim().length > 0 || ready);

  useImperativeHandle(ref, () => ({
    focus: () => area.current?.focus(),
    setText: (t) => {
      setText(t);
      requestAnimationFrame(autosize);
    },
    openPicker: () => fileInput.current?.click(),
  }));

  const autosize = () => {
    const el = area.current;
    if (!el) return;
    el.style.height = "auto";
    el.style.height = Math.min(el.scrollHeight, 220) + "px";
  };

  const submit = () => {
    if (!canSend) return;
    onSend(text);
    setText("");
    requestAnimationFrame(autosize);
  };

  // animate new attachment chips in
  const seen = useRef(new Set<string>());
  useEffect(() => {
    const fresh = attachments.filter((a) => !seen.current.has(a.id));
    fresh.forEach((a) => seen.current.add(a.id));
    if (!fresh.length || reducedMotion) return;
    const els = fresh
      .map((a) => root.current?.querySelector(`[data-att="${a.id}"]`))
      .filter(Boolean) as HTMLElement[];
    gsap.from(els, { y: 10, scale: 0.9, autoAlpha: 0, duration: 0.45, stagger: 0.05, ease: "pip.pop" });
  }, [attachments]);

  // model menu
  useGSAP(
    () => {
      if (!menu || reducedMotion) return;
      gsap.from(".pmenu", { y: 8, scale: 0.97, autoAlpha: 0, duration: 0.3, transformOrigin: "0% 100%" });
      gsap.from(".pmenu button", { y: 6, autoAlpha: 0, duration: 0.3, stagger: 0.04, delay: 0.05 });
    },
    { scope: root, dependencies: [menu] },
  );
  useEffect(() => {
    if (!menu) return;
    const close = (e: MouseEvent) => {
      if (!(e.target as HTMLElement).closest(".pmenu, .composer__model")) setMenu(false);
    };
    window.addEventListener("mousedown", close);
    return () => window.removeEventListener("mousedown", close);
  }, [menu]);

  const current = PROFILES.find((p) => p.key === profile)!;

  return (
    <form
      className="composer"
      ref={root}
      onSubmit={(e) => {
        e.preventDefault();
        submit();
      }}
    >
      {attachments.length > 0 && (
        <ul className="atts">
          {attachments.map((a) => (
            <li key={a.id} data-att={a.id} className={`att att--${a.status}`} title={a.error ?? a.name}>
              <span className="att__thumb">
                {a.thumb ? (
                  <img src={a.thumb} alt="" />
                ) : (
                  <PixelIcon name={a.kind === "text" ? "code" : "doc"} className="att__icon" />
                )}
                {a.status === "reading" && <span className="att__spin" />}
              </span>
              <span className="att__meta">
                <span className="att__name">{a.name}</span>
                <span className="att__sub">
                  {a.status === "reading"
                    ? a.kind === "image"
                      ? "Membaca gambar…"
                      : "Membaca…"
                    : a.status === "error"
                      ? a.error
                      : `${formatSize(a.size)}${a.truncated ? " · dipotong" : ""} · siap`}
                </span>
              </span>
              <button type="button" className="att__x" aria-label={`Hapus ${a.name}`} onClick={() => onRemove(a.id)}>
                ×
              </button>
            </li>
          ))}
        </ul>
      )}

      <textarea
        ref={area}
        rows={1}
        value={text}
        placeholder="Tanya Pip, atau lampirkan foto & dokumen…"
        aria-label="Pesan untuk Pip"
        maxLength={8000}
        onChange={(e) => {
          setText(e.target.value);
          autosize();
        }}
        onKeyDown={(e) => {
          if (e.key === "Enter" && !e.shiftKey && !e.nativeEvent.isComposing) {
            e.preventDefault();
            submit();
          }
        }}
        onPaste={(e) => {
          const files = Array.from(e.clipboardData.files);
          if (files.length) {
            e.preventDefault();
            onFiles(files);
          }
        }}
      />

      <div className="composer__row">
        <button type="button" className="icon-btn" aria-label="Lampirkan file" title="Lampirkan file" onClick={() => fileInput.current?.click()}>
          <svg viewBox="0 0 16 16" aria-hidden="true">
            <path
              d="M10.5 4.5 5.6 9.4a1.4 1.4 0 0 0 2 2l5.2-5.2a2.8 2.8 0 0 0-4-4L3.6 7.4a4.2 4.2 0 0 0 6 6l4-4"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.3"
              strokeLinecap="round"
            />
          </svg>
        </button>
        <input
          ref={fileInput}
          type="file"
          multiple
          accept={ACCEPT}
          hidden
          onChange={(e) => {
            onFiles(Array.from(e.target.files ?? []));
            e.target.value = "";
          }}
        />

        <div className="composer__model-wrap">
          <button type="button" className="composer__model" aria-haspopup="listbox" aria-expanded={menu} onClick={() => setMenu((m) => !m)}>
            {current.name}
            <svg viewBox="0 0 10 10" aria-hidden="true">
              <path d="M2.5 4 5 6.5 7.5 4" fill="none" stroke="currentColor" strokeWidth="1.3" />
            </svg>
          </button>
          {menu && (
            <div className="pmenu" role="listbox" aria-label="Profil">
              {PROFILES.map((p) => (
                <button
                  type="button"
                  role="option"
                  aria-selected={p.key === profile}
                  key={p.key}
                  className={p.key === profile ? "is-on" : ""}
                  onClick={() => {
                    onProfile(p.key);
                    setMenu(false);
                  }}
                >
                  <span>
                    <b>{p.name}</b>
                    <small>{p.desc}</small>
                  </span>
                  {p.key === profile && <i aria-hidden="true">✓</i>}
                </button>
              ))}
            </div>
          )}
        </div>

        <span className="composer__hint">{reading ? "Menunggu lampiran selesai dibaca…" : "Enter untuk kirim · Shift+Enter baris baru"}</span>

        {busy ? (
          <button type="button" className="send send--stop" aria-label="Hentikan" onClick={onStop}>
            <span className="send__square" />
          </button>
        ) : (
          <button type="submit" className="send" aria-label="Kirim" disabled={!canSend}>
            <svg viewBox="0 0 10 10" aria-hidden="true">
              <path d="M5 8.5V1.5M1.8 4.7 5 1.5l3.2 3.2" fill="none" stroke="currentColor" strokeWidth="1.4" />
            </svg>
          </button>
        )}
      </div>
    </form>
  );
});
