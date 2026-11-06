/**
 * Pip-AI Worker
 *  - The React build is served by the assets layer (see wrangler.jsonc).
 *  - This Worker only handles /api/*.
 *
 *  POST /api/chat   { model: "pip" | "pip-code" | "pip-docs", messages: [{ role, content }] }
 *    → text/plain stream of the reply, proxied to the JKT48Connect Pip AI API
 *      (OpenAI Chat Completions format). The API key stays server-side.
 *
 *  POST /api/read   multipart/form-data { file }
 *    → { name, kind, text, via }
 *      The Pip API is text-only, so attachments are turned into text here with
 *      Cloudflare Workers AI: images go through a vision model (description + any
 *      visible text), documents (PDF, DOCX, XLSX, …) through `toMarkdown`.
 *
 *  GET  /api/health → { ok, chat, read }
 *
 *  Bindings / secrets:
 *    PIP_API_KEY   (secret)  developer key "jkc_…" — `wrangler secret put PIP_API_KEY`
 *    PIP_API_BASE  (var)     default https://api.jkt48connect.app/v1
 *    AI            (binding) Workers AI, used only by /api/read
 */

interface Env {
  ASSETS: Fetcher;
  AI?: Ai;
  PIP_API_KEY?: string;
  PIP_API_BASE?: string;
}

type Role = "user" | "assistant";
interface ChatMessage {
  role: Role;
  content: string;
}

const MODELS = new Set(["pip", "pip-code", "pip-docs"]);
const VISION_MODEL = "@cf/meta/llama-4-scout-17b-16e-instruct";

const SYSTEM_PROMPT = `You are Pip, the assistant from JKT48Connect.
Be warm, clear and precise. Keep answers focused (under ~250 words unless the user asks for more).
Use short paragraphs or lists, and fenced code blocks for code. Reply in the user's language
(Bahasa Indonesia if they write in Indonesian).
Users can attach files. Their contents appear inside blocks that start with "[Lampiran". Treat a block as
the content of that file. Images were transcribed by a vision model, so rely on that description and
say so if something isn't visible in it.`;

const MAX_MESSAGES = 16;
const MAX_MESSAGE_CHARS = 48_000; // room for attachment context
const MAX_TOTAL_CHARS = 180_000; // stays well under the gateway's 1 MiB body limit
const MAX_FILE_BYTES = 10 * 1024 * 1024;
const MAX_READ_CHARS = 20_000;

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

/* ------------------------------------------------------------------ */
/* helpers                                                             */
/* ------------------------------------------------------------------ */

function sanitize(input: unknown): ChatMessage[] | null {
  if (!Array.isArray(input)) return null;
  const out: ChatMessage[] = [];
  for (const m of input.slice(-MAX_MESSAGES)) {
    if (!m || typeof m !== "object") return null;
    const { role, content } = m as Record<string, unknown>;
    if ((role !== "user" && role !== "assistant") || typeof content !== "string") return null;
    const text = content.trim().slice(0, MAX_MESSAGE_CHARS);
    if (text) out.push({ role, content: text });
  }
  // drop the oldest turns until the whole conversation fits
  let total = out.reduce((n, m) => n + m.content.length, 0);
  while (out.length > 1 && total > MAX_TOTAL_CHARS) total -= out.shift()!.content.length;
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
      const evt = JSON.parse(payload) as { choices?: { delta?: { content?: string | null } }[] };
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

function toBase64(buf: ArrayBuffer): string {
  const bytes = new Uint8Array(buf);
  let bin = "";
  for (let i = 0; i < bytes.length; i += 0x8000) {
    bin += String.fromCharCode(...bytes.subarray(i, i + 0x8000));
  }
  return btoa(bin);
}

/* ------------------------------------------------------------------ */
/* /api/chat                                                           */
/* ------------------------------------------------------------------ */

async function handleChat(request: Request, env: Env): Promise<Response> {
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
    // Don't leak auth problems to visitors as 401: it's the site's key, not theirs.
    const status = upstream.status === 401 ? 502 : upstream.status >= 400 ? upstream.status : 502;
    return json({ error: UPSTREAM_ERRORS[upstream.status] ?? UPSTREAM_ERRORS[502] }, status);
  }

  return new Response(sseToText(upstream.body), {
    headers: { "content-type": "text/plain; charset=utf-8", "cache-control": "no-store", "x-pip-model": model },
  });
}

/* ------------------------------------------------------------------ */
/* /api/read                                                           */
/* ------------------------------------------------------------------ */

const VISION_PROMPT = `Describe this image for someone who cannot see it, in the language most of its visible text is in
(default to Bahasa Indonesia). Start with one sentence on what it is. Then transcribe ALL visible text exactly
(keep line breaks, numbers, code). Then list the important details: people, objects, layout, colours, charts
and their values, UI elements, errors. Be factual; don't guess beyond what is visible.`;

async function describeImage(env: Env, buf: ArrayBuffer, mime: string): Promise<string | null> {
  try {
    const out = (await env.AI!.run(VISION_MODEL, {
      messages: [
        {
          role: "user",
          content: [
            { type: "text", text: VISION_PROMPT },
            { type: "image_url", image_url: { url: `data:${mime};base64,${toBase64(buf)}` } },
          ],
        },
      ],
      max_tokens: 900,
    })) as { response?: unknown };
    return typeof out.response === "string" && out.response.trim() ? out.response.trim() : null;
  } catch (err) {
    console.error("vision model failed", err);
    return null;
  }
}

async function convert(
  env: Env,
  name: string,
  buf: ArrayBuffer,
  mime: string,
): Promise<string | { error: string; unreachable?: boolean }> {
  try {
    const res = await env.AI!.toMarkdown({ name, blob: new Blob([buf], { type: mime }) });
    if (res.format === "error") return { error: res.error };
    return res.data;
  } catch (err) {
    console.error("toMarkdown failed", err);
    return { error: String(err), unreachable: true };
  }
}

async function handleRead(request: Request, env: Env): Promise<Response> {
  if (!env.AI) return json({ error: "Membaca file butuh Workers AI (binding AI belum aktif).", code: "no_ai" }, 503);

  let form: FormData;
  try {
    form = await request.formData();
  } catch {
    return json({ error: "Kirim file sebagai multipart/form-data." }, 400);
  }
  const file = form.get("file");
  if (!file || typeof file === "string") return json({ error: "Tidak ada file." }, 400);
  if (file.size > MAX_FILE_BYTES) return json({ error: "File terlalu besar (maks 10 MB)." }, 413);

  const name = file.name || "lampiran";
  const mime = file.type || "application/octet-stream";
  const buf = await file.arrayBuffer();
  const isImage = mime.startsWith("image/") && mime !== "image/svg+xml";

  let text: string | null = null;
  let via = "";
  if (isImage) {
    text = await describeImage(env, buf, mime);
    via = "vision";
  }
  if (!text) {
    const out = await convert(env, name, buf, mime);
    if (typeof out !== "string") {
      if (out.unreachable)
        return json({ error: "Workers AI sedang tidak bisa dihubungi.", code: "no_ai" }, 503);
      return json({ error: `Pip belum bisa membaca file ini (${mime}).`, detail: out.error }, 415);
    }
    text = out;
    via = "markdown";
  }

  text = text.trim();
  if (!text) return json({ error: "File ini sepertinya kosong." }, 422);
  const truncated = text.length > MAX_READ_CHARS;
  return json({
    name,
    kind: isImage ? "image" : "document",
    via,
    truncated,
    text: truncated ? `${text.slice(0, MAX_READ_CHARS)}\n…[dipotong]` : text,
  });
}

/* ------------------------------------------------------------------ */

export default {
  async fetch(request, env): Promise<Response> {
    const url = new URL(request.url);

    if (url.pathname === "/api/health") {
      return json({ ok: true, chat: Boolean(env.PIP_API_KEY), read: Boolean(env.AI) });
    }
    if (url.pathname === "/api/chat" || url.pathname === "/api/read") {
      if (request.method !== "POST") return json({ error: "Method not allowed" }, 405);
      if (!sameOrigin(request, url)) return json({ error: "Forbidden" }, 403);
      return url.pathname === "/api/chat" ? handleChat(request, env) : handleRead(request, env);
    }
    if (url.pathname.startsWith("/api/")) return json({ error: "Not found" }, 404);

    return env.ASSETS.fetch(request);
  },
} satisfies ExportedHandler<Env>;
