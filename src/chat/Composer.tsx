import { forwardRef, useEffect, useImperativeHandle, useRef, useState } from "react";
import { gsap, reducedMotion } from "../lib/gsap";
import { PixelIcon } from "../components/Pixels";
import { Icon } from "./icons";
import { ACCEPT, formatSize, type Attachment } from "./files";

export interface ComposerHandle {
  setText: (t: string) => void;
  focus: () => void;
  pick: (kind: "image" | "camera" | "file") => void;
}

interface Props {
  attachments: Attachment[];
  placeholder?: string;
  busy: boolean;
  onFiles: (files: File[]) => void;
  onRemove: (id: string) => void;
  onSend: (text: string) => void;
  onStop: () => void;
  onPlus: () => void;
}

export const Composer = forwardRef<ComposerHandle, Props>(function Composer({ attachments, placeholder, busy, onFiles, onRemove, onSend, onStop, onPlus }, ref) {
  const area = useRef<HTMLTextAreaElement>(null);
  const root = useRef<HTMLDivElement>(null);
  const inputs = { image: useRef<HTMLInputElement>(null), camera: useRef<HTMLInputElement>(null), file: useRef<HTMLInputElement>(null) };
  const [text, setText] = useState("");
  const reading = attachments.some((a) => a.status === "reading");
  const ready = attachments.some((a) => a.status === "ready");
  const canSend = !busy && !reading && (text.trim().length > 0 || ready);

  const autosize = () => {
    const el = area.current;
    if (!el) return;
    el.style.height = "auto";
    el.style.height = Math.min(el.scrollHeight, 160) + "px";
  };

  useImperativeHandle(ref, () => ({
    setText: (t) => {
      setText(t);
      requestAnimationFrame(autosize);
    },
    focus: () => area.current?.focus(),
    pick: (kind) => inputs[kind].current?.click(),
  }));

  const submit = () => {
    if (!canSend) return;
    onSend(text);
    setText("");
    requestAnimationFrame(autosize);
    navigator.vibrate?.(8);
  };

  // send button pops in/out like iMessage
  const showSend = canSend || busy;
  useEffect(() => {
    if (reducedMotion) return;
    const btn = root.current?.querySelector(".cbar__send");
    if (btn) gsap.fromTo(btn, { scale: 0.4, rotate: -40 }, { scale: 1, rotate: 0, duration: 0.45, ease: "back.out(2.2)" });
  }, [showSend, busy]);

  // new attachment thumbnails spring in
  const seen = useRef(new Set<string>());
  useEffect(() => {
    const fresh = attachments.filter((a) => !seen.current.has(a.id));
    fresh.forEach((a) => seen.current.add(a.id));
    if (!fresh.length || reducedMotion) return;
    const els = fresh.map((a) => root.current?.querySelector(`[data-att="${a.id}"]`)).filter(Boolean);
    gsap.from(els, { scale: 0.5, autoAlpha: 0, duration: 0.5, ease: "back.out(1.8)", stagger: 0.05 });
  }, [attachments]);

  return (
    <div className="cbar" ref={root}>
      {attachments.length > 0 && (
        <div className="ctray">
          {attachments.map((a) => (
            <div key={a.id} data-att={a.id} className={`cth cth--${a.status}`} title={a.error ?? a.name}>
              {a.thumb ? (
                <img src={a.thumb} alt="" />
              ) : (
                <span className="cth__doc">
                  <PixelIcon name={a.kind === "text" ? "code" : "doc"} className="cth__icon" />
                  <small>{a.name}</small>
                </span>
              )}
              {a.status === "reading" && (
                <span className="cth__busy">
                  <span className="spinner spinner--light" />
                </span>
              )}
              {a.status === "error" && <span className="cth__err">!</span>}
              <button className="cth__x" aria-label={`Hapus ${a.name}`} onClick={() => onRemove(a.id)}>
                <Icon name="close" size={11} stroke={3} />
              </button>
              <span className="cth__meta">{a.status === "error" ? "Gagal" : a.status === "reading" ? "Membaca…" : formatSize(a.size)}</span>
            </div>
          ))}
        </div>
      )}
      <div className="cbar__row">
        <button className="cbar__plus" aria-label="Lampiran & tools" onClick={onPlus}>
          <Icon name="plus" size={20} stroke={2.4} />
        </button>
        <div className="cbar__field">
          <textarea
            ref={area}
            rows={1}
            value={text}
            placeholder={reading ? "Membaca lampiran…" : placeholder ?? "Pesan untuk Pip"}
            aria-label="Pesan untuk Pip"
            maxLength={8000}
            onChange={(e) => {
              setText(e.target.value);
              autosize();
            }}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey && !e.nativeEvent.isComposing && window.matchMedia("(hover: hover)").matches) {
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
          {busy ? (
            <button className="cbar__send cbar__send--stop" aria-label="Hentikan" onClick={onStop}>
              <Icon name="stop" size={16} />
            </button>
          ) : (
            showSend && (
              <button className="cbar__send" aria-label="Kirim" onClick={submit}>
                <Icon name="up" size={18} stroke={2.6} />
              </button>
            )
          )}
        </div>
      </div>
      <input ref={inputs.image} type="file" accept="image/*" multiple hidden onChange={(e) => (onFiles(Array.from(e.target.files ?? [])), (e.target.value = ""))} />
      <input ref={inputs.camera} type="file" accept="image/*" capture="environment" hidden onChange={(e) => (onFiles(Array.from(e.target.files ?? [])), (e.target.value = ""))} />
      <input ref={inputs.file} type="file" accept={ACCEPT} multiple hidden onChange={(e) => (onFiles(Array.from(e.target.files ?? [])), (e.target.value = ""))} />
    </div>
  );
});
