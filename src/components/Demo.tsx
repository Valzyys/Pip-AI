import { Fragment, useEffect, useLayoutEffect, useRef, useState, type ReactNode } from "react";
import { gsap, useGSAP, ScrollTrigger, reducedMotion } from "../lib/gsap";
import { PipError, streamReply, type ChatMessage, type ModelKey } from "../lib/chat";
import { Sprite } from "./Sprite";

const MODELS: { key: ModelKey; label: string }[] = [
  { key: "pip", label: "pip" },
  { key: "pip-code", label: "code" },
  { key: "pip-docs", label: "docs" },
];

const SUGGESTIONS = [
  "Explain black holes like I'm 5",
  "Write a haiku about Jakarta rain",
  "Fix: undefined is not a function",
];

interface UiMessage extends ChatMessage {
  id: number;
  pending?: boolean;
  offline?: boolean;
  error?: boolean;
}

let uid = 0;

export function Demo() {
  const root = useRef<HTMLElement>(null);
  const logRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const [model, setModel] = useState<ModelKey>("pip");
  const [messages, setMessages] = useState<UiMessage[]>([
    { id: uid++, role: "assistant", content: "Hi, I'm **Pip** 🐤 Pick a profile — `pip` for anything, `code` for code, `docs` for JKT48Connect docs — and ask away." },
  ]);
  const [busy, setBusy] = useState(false);
  const abortRef = useRef<AbortController | null>(null);
  const autoPlayed = useRef(false);

  // --- Entrance + auto-demo when the chat scrolls into view ---
  const { contextSafe } = useGSAP(
    () => {
      if (!reducedMotion) {
        gsap.from(".chat", {
          y: 120,
          rotateX: 18,
          scale: 0.92,
          autoAlpha: 0,
          duration: 1.3,
          transformPerspective: 1200,
          scrollTrigger: { trigger: ".chat", start: "top 85%" },
        });
        gsap.from(".chat__suggest button", {
          y: 20,
          autoAlpha: 0,
          stagger: 0.08,
          duration: 0.7,
          ease: "pip.pop",
          scrollTrigger: { trigger: ".chat", start: "top 60%" },
        });
      }
      // Anchor to the section (not .chat, whose entrance transform shifts its measured position)
      ScrollTrigger.create({
        trigger: root.current,
        start: "top 30%",
        once: true,
        onEnter: () => {
          if (autoPlayed.current) return;
          autoPlayed.current = true;
          typeInto("Halo Pip! Siapa kamu?", true);
        },
      });
    },
    { scope: root },
  );

  // --- Sliding pill behind the active model ---
  useLayoutEffect(() => {
    const btn = root.current?.querySelector<HTMLElement>(`[data-model="${model}"]`);
    const pill = root.current?.querySelector<HTMLElement>(".chat__pill");
    if (!btn || !pill) return;
    gsap.to(pill, {
      x: btn.offsetLeft,
      width: btn.offsetWidth,
      duration: reducedMotion ? 0 : 0.55,
      ease: "pip.pop",
    });
  }, [model]);

  // --- Animate each new message in, keep log scrolled to bottom ---
  const lastCount = useRef(messages.length);
  useEffect(() => {
    const log = logRef.current!;
    if (messages.length > lastCount.current && !reducedMotion) {
      const el = log.lastElementChild;
      if (el) gsap.from(el, { y: 24, scale: 0.94, autoAlpha: 0, duration: 0.6, ease: "pip.pop", transformOrigin: "0% 100%" });
    }
    lastCount.current = messages.length;
    gsap.to(log, { scrollTop: log.scrollHeight, duration: 0.4, ease: "power2.out", overwrite: true });
  }, [messages]);

  const send = async (text: string) => {
    const content = text.trim();
    if (!content || busy) return;
    const user: UiMessage = { id: uid++, role: "user", content };
    const bot: UiMessage = { id: uid++, role: "assistant", content: "", pending: true };
    const history = [...messages.filter((m) => !m.pending && !m.error && m.content), user].map(({ role, content }) => ({
      role,
      content,
    }));
    setMessages((m) => [...m, user, bot]);
    setBusy(true);

    abortRef.current?.abort();
    const ac = new AbortController();
    abortRef.current = ac;

    try {
      const { source } = await streamReply(
        model,
        history.slice(1), // drop the canned greeting
        (chunk) =>
          setMessages((ms) =>
            ms.map((m) => (m.id === bot.id ? { ...m, pending: false, content: m.content + chunk } : m)),
          ),
        ac.signal,
      );
      setMessages((ms) => ms.map((m) => (m.id === bot.id ? { ...m, pending: false, offline: source === "offline" } : m)));
    } catch (err) {
      const msg = err instanceof PipError ? err.message : "…pip got interrupted.";
      setMessages((ms) =>
        ms.map((m) =>
          m.id === bot.id ? { ...m, pending: false, error: !m.content, content: m.content || msg } : m,
        ),
      );
    } finally {
      setBusy(false);
    }
  };

  /** Types a prompt into the input like a person would, then sends it. */
  const typeInto = contextSafe((text: string, autoSend = false) => {
    const input = inputRef.current!;
    if (reducedMotion) {
      if (autoSend) void send(text);
      return;
    }
    const o = { n: 0 };
    gsap.to(o, {
      n: text.length,
      duration: text.length * 0.035,
      ease: "none",
      onUpdate: () => {
        input.value = text.slice(0, Math.round(o.n));
      },
      onComplete: () => {
        if (!autoSend) return;
        gsap.delayedCall(0.25, () => {
          gsap.fromTo(".chat__send", { scale: 0.8 }, { scale: 1, duration: 0.4, ease: "pip.pop" });
          input.value = "";
          void send(text);
        });
      },
    });
  });

  return (
    <section className="demo" id="demo" ref={root}>
      <div className="demo__head">
        <p className="pixel-tag section-tag">[ 02 ] try pip</p>
        <h2 className="h2 js-split">Say hi. Pip chirps back.</h2>
      </div>

      <div className="chat">
        <div className="chat__bar">
          <span className="chat__dots">
            <i />
            <i />
            <i />
          </span>
          <div className="chat__models" role="radiogroup" aria-label="Model">
            <span className="chat__pill" />
            {MODELS.map((m) => (
              <button
                key={m.key}
                role="radio"
                aria-checked={model === m.key}
                data-model={m.key}
                className={model === m.key ? "is-active" : ""}
                onClick={() => setModel(m.key)}
              >
                {m.label}
              </button>
            ))}
          </div>
          <span className="pixel-tag chat__status">
            <span className="blink-sq" /> {busy ? "thinking" : "online"}
          </span>
        </div>

        <div className="chat__log" ref={logRef} aria-live="polite">
          {messages.map((m) => (
            <div key={m.id} className={`msg msg--${m.role}${m.error ? " msg--error" : ""}`}>
              {m.role === "assistant" && (
                <span className="msg__avatar">
                  <Sprite name="pipHead" />
                </span>
              )}
              <div className="msg__bubble">
                {m.pending ? (
                  <span className="typing" aria-label="Pip is typing">
                    <i />
                    <i />
                    <i />
                  </span>
                ) : (
                  <RichText text={m.content} />
                )}
                {m.offline && <span className="msg__badge pixel-tag">offline mode</span>}
              </div>
            </div>
          ))}
        </div>

        <form
          className="chat__form"
          autoComplete="off"
          onSubmit={(e) => {
            e.preventDefault();
            const v = inputRef.current!.value;
            inputRef.current!.value = "";
            void send(v);
          }}
        >
          <input ref={inputRef} className="chat__input" type="text" placeholder="Ask Pip anything…" aria-label="Message Pip" maxLength={2000} />
          <button className="chat__send" type="submit" aria-label="Send" disabled={busy}>
            <Sprite name="chev" />
          </button>
        </form>

        <div className="chat__suggest">
          {SUGGESTIONS.map((s) => (
            <button key={s} type="button" disabled={busy} onClick={() => typeInto(s, true)}>
              {s}
            </button>
          ))}
        </div>
      </div>
    </section>
  );
}

/** Tiny, safe markdown: ```code```, `inline`, **bold**, line breaks. No HTML injection. */
function RichText({ text }: { text: string }) {
  const parts = text.split(/```(?:\w+)?\n?([\s\S]*?)(?:```|$)/g);
  return (
    <>
      {parts.map((part, i) =>
        i % 2 === 1 ? (
          <pre key={i} className="msg__code">
            <code>{part.replace(/\n$/, "")}</code>
          </pre>
        ) : (
          <Fragment key={i}>{inline(part)}</Fragment>
        ),
      )}
    </>
  );
}

function inline(s: string): ReactNode[] {
  const out: ReactNode[] = [];
  s.split("\n").forEach((line, li, arr) => {
    line.split(/(\*\*[^*]+\*\*|`[^`]+`)/g).forEach((tok, ti) => {
      const k = `${li}-${ti}`;
      if (tok.startsWith("**") && tok.endsWith("**") && tok.length > 4) out.push(<strong key={k}>{tok.slice(2, -2)}</strong>);
      else if (tok.startsWith("`") && tok.endsWith("`") && tok.length > 2) out.push(<code key={k}>{tok.slice(1, -1)}</code>);
      else if (tok) out.push(tok);
    });
    if (li < arr.length - 1) out.push(<br key={`br${li}`} />);
  });
  return out;
}
