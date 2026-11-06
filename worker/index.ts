/**
 * Pip-AI Worker
 *  - The React build is served by the assets layer (see wrangler.jsonc).
 *  - This Worker only handles /api/* and proxies chat to the JKT48Connect Pip AI API
 *    (OpenAI Chat Completions format). The API key stays server-side as a secret.
 *
 *  POST /api/chat   { model: "pip" | "pip-code" | "pip-docs", messages: [{ role, content }] }
 *    → text/plain stream of the assistant reply
 *  GET  /api/health → { ok, configured }
 *
 *  Secrets / vars:
 *    PIP_API_KEY   (secret)  developer key "jkc_…" — `wrangler secret put PIP_API_KEY`
 *    PIP_API_BASE  (var)     default https://api.jkt48connect.app/v1
 */

interface Env {
  ASSETS: Fetcher;
  PIP_API_KEY?: string;
  PIP_API_BASE?: string;
}

type Role = "user" | "assistant";
interface ChatMessage {
  role: Role;
  content: string;
}

const MODELS = new Set(["pip", "pip-code", "pip-docs"]);

const SYSTEM_PROMPT = `You are Pip, the assistant on the Pip-AI website — a tiny pixel bird with a big brain.
Personality: warm, playful, sharp. Keep answers focused (under ~250 words unless the user asks for more).
Use short paragraphs or simple lists, and code blocks for code. Reply in the user's language
(Bahasa Indonesia if they write in Indonesian).`;

const MAX_MESSAGES = 16;
const MAX_CHARS = 4000;

// Friendly messages for the gateway's documented status codes.
const UPSTREAM_ERRORS: Record<number, string> = {
  400: "Pip belum bisa memproses permintaan seperti itu.",
  401: "Kunci API Pip tidak valid.",
  413: "Obrolannya kepanjangan — mulai obrolan baru ya.",
  429: "Pip lagi kebanjiran pertanyaan. Coba lagi semenit lagi.",
  502: "Otak Pip lagi loading. Coba lagi sebentar lagi.",
  503: "Pip lagi istirahat (maintenance).",
};

const json = (data: unknown, status = 200) =>
  new Response(JSON.stringify(data), {
    status,
    headers: { "content-type": "application/json; charset=utf-8", "cache-control": "no-store" },
  });

function sanitize(input: unknown): ChatMessage[] | null {
  if (!Array.isArray(input)) return null;
  const out: ChatMessage[] = [];
  for (const m of input.slice(-MAX_MESSAGES)) {
    if (!m || typeof m !== "object") return null;
    const { role, content } = m as Record<string, unknown>;
    if ((role !== "user" && role !== "assistant") || typeof content !== "string") return null;
    const text = content.trim().slice(0, MAX_CHARS);
    if (text) out.push({ role, content: text });
  }
  return out.length && out[out.length - 1].role === "user" ? out : null;
}

/** OpenAI-style SSE (`data: {choices:[{delta:{content}}]}` … `data: [DONE]`) → plain text chunks. */
function sseToText(stream: ReadableStream<Uint8Array>): ReadableStream<Uint8Array> {
  const decoder = new TextDecoder();
  const encoder = new TextEncoder();
  let buffer = "";
  const handle = (line: string, controller: TransformStreamDefaultController<Uint8Array>) => {
    const trimmed = line.trim();
    if (!trimmed.startsWith("data:")) return;
    const payload = trimmed.slice(5).trim();
    if (!payload || payload === "[DONE]") return;
    try {
      const evt = JSON.parse(payload) as {
        choices?: { delta?: { content?: string | null } }[];
        error?: { message?: string };
      };
      const text = evt.choices?.[0]?.delta?.content;
      if (text) controller.enqueue(encoder.encode(text));
    } catch {
      /* ignore keep-alives / partial lines */
    }
  };
  return stream.pipeThrough(
    new TransformStream<Uint8Array, Uint8Array>({
      transform(chunk, controller) {
        buffer += decoder.decode(chunk, { stream: true });
        const lines = buffer.split("\n");
        buffer = lines.pop() ?? "";
        for (const line of lines) handle(line, controller);
      },
      flush(controller) {
        if (buffer) handle(buffer, controller);
      },
    }),
  );
}

/** Only accept calls from this site's own pages, so the shared key isn't usable as an open proxy. */
function sameOrigin(request: Request, url: URL): boolean {
  const origin = request.headers.get("origin");
  if (origin) return origin === url.origin;
  const site = request.headers.get("sec-fetch-site");
  return !site || site === "same-origin";
}

async function handleChat(request: Request, env: Env, url: URL): Promise<Response> {
  if (!sameOrigin(request, url)) return json({ error: "Forbidden" }, 403);
  if (!env.PIP_API_KEY) return json({ error: "Pip API key is not configured", code: "not_configured" }, 503);

  let body: { model?: unknown; messages?: unknown };
  try {
    body = await request.json();
  } catch {
    return json({ error: "Invalid JSON body" }, 400);
  }

  const messages = sanitize(body.messages);
  if (!messages) return json({ error: "messages must end with a user message" }, 400);
  const model = typeof body.model === "string" && MODELS.has(body.model) ? body.model : "pip";

  const base = (env.PIP_API_BASE || "https://api.jkt48connect.app/v1").replace(/\/+$/, "");
  let upstream: Response;
  try {
    upstream = await fetch(`${base}/chat/completions`, {
      method: "POST",
      headers: {
        authorization: `Bearer ${env.PIP_API_KEY}`,
        "content-type": "application/json",
        accept: "text/event-stream",
      },
      body: JSON.stringify({
        model,
        stream: true,
        max_tokens: 2048,
        messages: [{ role: "system", content: SYSTEM_PROMPT }, ...messages],
      }),
    });
  } catch (err) {
    console.error("Pip upstream unreachable", err);
    return json({ error: UPSTREAM_ERRORS[502] }, 502);
  }

  if (!upstream.ok || !upstream.body) {
    const detail = await upstream.text().catch(() => "");
    console.error("Pip upstream error", upstream.status, detail.slice(0, 500));
    // Don't leak auth problems to visitors as 401 — it's the site's key, not theirs.
    const status = upstream.status === 401 ? 502 : upstream.status >= 400 ? upstream.status : 502;
    return json({ error: UPSTREAM_ERRORS[upstream.status] ?? UPSTREAM_ERRORS[502] }, status);
  }

  return new Response(sseToText(upstream.body), {
    headers: {
      "content-type": "text/plain; charset=utf-8",
      "cache-control": "no-store",
      "x-pip-model": model,
    },
  });
}

export default {
  async fetch(request, env): Promise<Response> {
    const url = new URL(request.url);

    if (url.pathname === "/api/health") {
      return json({ ok: true, configured: Boolean(env.PIP_API_KEY) });
    }
    if (url.pathname === "/api/chat") {
      if (request.method !== "POST") return json({ error: "Method not allowed" }, 405);
      return handleChat(request, env, url);
    }
    if (url.pathname.startsWith("/api/")) return json({ error: "Not found" }, 404);

    return env.ASSETS.fetch(request);
  },
} satisfies ExportedHandler<Env>;
