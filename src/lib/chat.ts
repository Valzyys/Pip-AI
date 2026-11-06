export type ModelKey = "pip" | "pip-code" | "pip-docs";

export interface ChatMessage {
  role: "user" | "assistant";
  content: string;
}

export interface StreamResult {
  source: "live" | "offline";
}

export class PipError extends Error {}

/**
 * Streams Pip's reply through the Cloudflare Worker (/api/chat → JKT48Connect Pip AI API).
 * If the Worker has no API key configured (or isn't running, e.g. plain static hosting),
 * it falls back to a tiny offline brain so the demo still works. Real upstream errors
 * (rate limits, etc.) are surfaced as a PipError instead of a fake answer.
 */
export async function streamReply(
  model: ModelKey,
  messages: ChatMessage[],
  onChunk: (text: string) => void,
  signal?: AbortSignal,
): Promise<StreamResult> {
  let res: Response;
  try {
    res = await fetch("/api/chat", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ model, messages }),
      signal,
    });
  } catch (err) {
    if (signal?.aborted) throw err;
    return offline(messages, onChunk, signal);
  }

  const type = res.headers.get("content-type") ?? "";
  if (!res.ok || !res.body || !type.startsWith("text/plain")) {
    const data = (await res.json().catch(() => null)) as { error?: string; code?: string } | null;
    if (!data || data.code === "not_configured" || res.status === 404) return offline(messages, onChunk, signal);
    throw new PipError(data.error ?? "Pip couldn't answer right now.");
  }

  const reader = res.body.getReader();
  const decoder = new TextDecoder();
  let got = false;
  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    const text = decoder.decode(value, { stream: true });
    if (text) {
      got = true;
      onChunk(text);
    }
  }
  if (!got) throw new PipError("Pip went quiet. Try asking again.");
  return { source: "live" };
}

async function offline(messages: ChatMessage[], onChunk: (t: string) => void, signal?: AbortSignal): Promise<StreamResult> {
  await fakeStream(offlineReply(messages[messages.length - 1]?.content ?? ""), onChunk, signal);
  return { source: "offline" };
}

const wait = (ms: number) => new Promise((r) => setTimeout(r, ms));

async function fakeStream(text: string, onChunk: (t: string) => void, signal?: AbortSignal) {
  await wait(450);
  const tokens = text.match(/\S+\s*|\s+/g) ?? [text];
  for (const t of tokens) {
    if (signal?.aborted) return;
    onChunk(t);
    await wait(18 + Math.random() * 40);
  }
}

const isIndo = (s: string) =>
  /\b(apa|bagaimana|kenapa|siapa|tolong|buat|buatkan|aku|saya|kamu|halo|hai|gimana|bisa|dong|nih|yang)\b/i.test(s);

function offlineReply(q: string): string {
  const s = q.toLowerCase();
  const id = isIndo(s);

  if (/black ?hole|lubang hitam/.test(s))
    return id
      ? "Bayangkan selimut trampolin, lalu kamu taruh bola bowling super berat di tengahnya. Semua kelereng di sekitarnya menggelinding masuk. **Lubang hitam** itu seperti bola itu — tapi sangat berat sampai cahaya pun ikut menggelinding masuk dan tidak bisa keluar. Karena cahaya tidak keluar, kita melihatnya hitam. 🕳️"
      : "Imagine a trampoline with a super-heavy bowling ball in the middle. Every marble nearby rolls toward it. A **black hole** is like that ball — but so heavy that even light rolls in and can't climb back out. No light escapes, so it looks black. 🕳️";

  if (/haiku/.test(s))
    return "Rain on Jakarta —\nmotorbikes hum under bridges,\nwarm tea, wet sandals.";

  if (/undefined is not a function|is not a function/.test(s))
    return "That error means you're calling something that isn't a function yet. Usual suspects:\n\n1. A typo in the method name\n2. Calling before an async import resolved\n3. `this` lost its binding\n\n```js\n// ❌\nconst fn = obj.method;\nfn();\n// ✅\nconst fn = obj.method.bind(obj);\nfn();\n```\n\nPaste the line and I'll point at the exact culprit.";

  if (/^(hi|hello|hey|halo|hai|yo)\b/.test(s))
    return id
      ? "Halo! Aku **Pip** 🐤 — burung kecil dengan otak besar. Mau nulis, ngoding, atau mikir bareng?"
      : "Hey! I'm **Pip** 🐤 — a tiny bird with a big brain. Want to write, code or think something through?";

  if (/(who|what) are you|siapa kamu|kamu siapa/.test(s))
    return id
      ? "Aku **Pip**, asisten AI dari JKT48Connect — jago ngobrol, ngoding, dan baca dokumentasi. Di sini aku disajikan lewat Cloudflare Workers."
      : "I'm **Pip**, the assistant from JKT48Connect — good at chatting, coding and reading docs. Here I'm served from Cloudflare Workers.";

  return id
    ? "Pertanyaan bagus! Saat ini aku sedang di **mode offline** (API key Pip belum diset di Worker), jadi jawabanku terbatas. Set secret `PIP_API_KEY` di Cloudflare dan aku akan menjawab sungguhan. 🐤"
    : "Great question! I'm in **offline mode** right now (the Pip API key isn't set on the Worker), so my answers are limited. Set the `PIP_API_KEY` secret on Cloudflare and I'll answer for real. 🐤";
}
