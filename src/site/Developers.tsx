import { useRef, useState } from "react";
import { gsap, useGSAP, reducedMotion } from "../lib/gsap";
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
