/**
 * Pip-AI Worker
 *  - The React build is served by the assets layer (see wrangler.jsonc).
 *  - This Worker only handles /api/*.
 *
 *  POST /api/chat   { model: "pip" | "pip-code" | "pip-docs", messages: [{ role, content }] }
 *    → application/x-ndjson event stream. Runs an agent loop against the JKT48Connect
 *      Pip AI API (OpenAI Chat Completions + function calling); tools (worker/tools.ts)
 *      run here and their UI payloads are streamed to the chat as interactive cards.
 *      Events: {t:"text",d} {t:"tool",id,name,args} {t:"tool_done",id,name,ok,ui?,error?} {t:"done"} {t:"error",message}
 *
 *  GET  /api/jkt48/home → schedule, birthdays, news, members, live (for the landing page)
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

import { TOOLS_OPENAI, homeFeed, runTool } from "./tools";

interface Env {
  ASSETS: Fetcher;
  AI?: Ai;
  PIP_API_KEY?: string;
  PIP_API_BASE?: string;
  JKT48_API_BASE?: string;
}

type Role = "user" | "assistant";
interface ChatMessage {
  role: Role;
  content: string;
}

const MODELS = new Set(["pip", "pip-code", "pip-docs"]);
const VISION_MODEL = "@cf/meta/llama-4-scout-17b-16e-instruct";

const MODE_PROMPT: Record<string, string> = {
  pip: `MODE: Pip — a friendly companion and JKT48 expert. Warm, playful, concise. Lean on the jkt48_* tools,
show_ui (kartu, kuis, polling, countdown) and photos/attachments. Emoji sparingly.`,
  "pip-code": `MODE: Pip Code — a senior software engineer. Be exact and terse. Diagnose root causes, then give runnable,
minimal code in fenced blocks with the language tag; mention edge cases and complexity when relevant. For any
request for a tool, demo, game or UI, prefer build_app with clean, production-quality HTML/CSS/JS.
Use calculator for math and show_ui (table/chart) for comparisons. Avoid small talk.`,
  "pip-docs": `MODE: Pip Docs — the librarian of the JKT48Connect API (base https://api.jkt48connect.app).
Answer like documentation: name the REST endpoint (METHOD /path), list parameters in a table, show the auth header,
give copy-ready curl and JavaScript examples, and explain errors and quotas when relevant.

REFERENCE (public REST endpoints — these are what developers call):
- Auth: header "X-API-Key: jkc_…" (key = "jkc_" + 40 hex chars), or query ?apikey=… when headers aren't possible. Keys from the dashboard (/dashboard/keys). Keep keys server-side; frontend → your backend → API.
- Quota per key per month (resets on the 1st, 00:00 WIB): Free 1.000, Starter 25.000, Fanbase 50.000, Pro 150.000. Response headers: X-RateLimit-Limit, X-RateLimit-Remaining, X-RateLimit-Reset, X-Quota-Period. Errors: 401 = key missing/invalid/revoked, 429 = monthly quota used up (see Retry-After).
- News: GET /api/news?page=1&perpage=10 (→ news[], page, perpage, total_count), GET /api/news/:id
- Members: GET /api/member, GET /api/member/:url (url slug e.g. freya-jayawardana), GET /api/birthday, GET /api/next_birthday
- Theater & events: GET /api/next_schedule, GET /api/theater?page=1&perpage=10, GET /api/theater/:id, GET /api/event, GET /api/jkt48event, GET /api/jkt48event/:id, GET /api/setlist. Shows include schedule_designs (images: photobook/jkt48connect, portrait 1800×2400 or banner 2400×1350).
- Live: GET /api/now_live?group=jkt48 (empty list = nobody live), GET /api/idn_lives, GET /api/recent?page=1&perpage=10, GET /api/recent/:data_id (live_info, playback, leaderboard_designs, youtube_replay)
- Realtime comments: wss://api.jkt48connect.app/api/showroom-comments/:room_id/stream and /api/idn-comments/:data_id/stream (X-API-Key header); snapshots at the same path without /stream.
- Social archives: GET /api/x/tweets, /api/x/members/:member/tweets, /api/tiktok/posts, /api/instagram/... ; YouTube: GET /api/jkt48_youtube, /api/jkt48_youtube/:id, /api/jkt48_youtube/:id/comments
- Pip AI API (same key): POST /v1/chat/completions, POST /v1/responses, POST /v1/messages, GET /v1/models; profiles pip, pip-code, pip-docs.

Your jkt48_* tools are INTERNAL helpers that call these endpoints (jkt48_schedule → /api/next_schedule, jkt48_theater → /api/theater/:id,
jkt48_members → /api/member, jkt48_member → /api/member/:url, jkt48_birthdays → /api/next_birthday, jkt48_news → /api/news,
jkt48_live → /api/now_live, jkt48_recent_lives → /api/recent, jkt48_setlists → /api/setlist). NEVER present a tool name as an
endpoint. You may call a tool to show a real live example, then explain it in terms of the REST endpoint.
Never invent endpoints or fields; if unsure, say so.`,
};

const SYSTEM_PROMPT = (now: string, model = "pip") => `${MODE_PROMPT[model] ?? MODE_PROMPT.pip}

You are Pip, the AI assistant from JKT48Connect. Current time: ${now} (WIB, Asia/Jakarta).
Be warm, clear and precise. Reply in the user's language (Bahasa Indonesia if they write in Indonesian).

TOOLS
- For anything about JKT48 (jadwal theater, show, member, profil, ulang tahun, berita, live, rekap live, setlist) ALWAYS call the jkt48_* tools; never guess JKT48 facts.
- The chat renders every tool result as a rich card (photos, schedules, profiles…). After a tool, DON'T repeat the data as a long list — write 1–3 sentences that highlight what matters and offer a next step.
- Don't call show_ui just to repeat data a jkt48_* card already shows.
- Use show_ui when a visual answer helps: comparisons (table), numbers (stats/chart), steps (timeline/checklist), quizzes, polls, or choices (buttons whose prompt continues the chat). You may combine it with jkt48_* data.
- Use build_app when the user asks for an interactive tool, game, kalkulator, timer, kuis, or "bikin aplikasi/UI". Write a complete, polished, self-contained HTML document (inline CSS+JS, no external resources), mobile-first, with a modern look (rounded corners, soft shadows, system font, accent #FF7A1A).
- Use calculator for non-trivial arithmetic and weather for cuaca.
- You may call several tools in a row. Keep tool arguments minimal and valid JSON.

FILES
Users can attach files. Their contents appear inside blocks that start with "[Lampiran". Treat a block as the content of that file. Images were transcribed by a vision model.

STYLE
Short paragraphs, lists when useful, fenced code blocks for code. No HTML in normal replies.`;

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

interface ToolCall {
  id: string;
  name: string;
  args: string;
}

/** Read one streamed completion: forward text deltas, collect tool calls. */
async function readRound(
  body: ReadableStream<Uint8Array>,
  onText: (d: string) => void,
): Promise<{ text: string; calls: ToolCall[]; finish: string | null }> {
  const reader = body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";
  let text = "";
  let finish: string | null = null;
  const calls: ToolCall[] = [];
  const handle = (line: string) => {
    const t = line.trim();
    if (!t.startsWith("data:")) return;
    const payload = t.slice(5).trim();
    if (!payload || payload === "[DONE]") return;
    let evt: any;
    try {
      evt = JSON.parse(payload);
    } catch {
      return;
    }
    const choice = evt.choices?.[0];
    if (!choice) return;
    const d = choice.delta ?? {};
    if (typeof d.content === "string" && d.content) {
      text += d.content;
      onText(d.content);
    }
    for (const tc of d.tool_calls ?? []) {
      const i = tc.index ?? calls.length;
      calls[i] ??= { id: "", name: "", args: "" };
      if (tc.id) calls[i].id = tc.id;
      if (tc.function?.name) calls[i].name += tc.function.name;
      if (tc.function?.arguments) calls[i].args += tc.function.arguments;
    }
    if (choice.finish_reason) finish = choice.finish_reason;
  };
  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });
    const lines = buffer.split("\n");
    buffer = lines.pop() ?? "";
    lines.forEach(handle);
  }
  if (buffer) handle(buffer);
  return { text, calls: calls.filter((c) => c && c.name), finish };
}

const MAX_ROUNDS = 6;
const MAX_TOOL_CHARS = 7_000;

async function handleChat(request: Request, env: Env, ctx: ExecutionContext): Promise<Response> {
  if (!env.PIP_API_KEY) return json({ error: "Pip API key is not configured", code: "not_configured" }, 503);

  let body: { model?: unknown; messages?: unknown; tools?: unknown };
  try {
    body = await request.json();
  } catch {
    return json({ error: "Invalid JSON body" }, 400);
  }
  const history = sanitize(body.messages);
  if (!history) return json({ error: "messages must end with a user message" }, 400);
  const model = typeof body.model === "string" && MODELS.has(body.model) ? body.model : "pip";
  const useTools = body.tools !== false;
  const base = (env.PIP_API_BASE || "https://api.jkt48connect.app/v1").replace(/\/+$/, "");
  const now = new Date().toLocaleString("id-ID", { timeZone: "Asia/Jakarta", dateStyle: "full", timeStyle: "short" });

  const { readable, writable } = new TransformStream<Uint8Array, Uint8Array>();
  const writer = writable.getWriter();
  const enc = new TextEncoder();
  const emit = (e: Record<string, unknown>) => writer.write(enc.encode(JSON.stringify(e) + "\n"));

  const messages: any[] = [{ role: "system", content: SYSTEM_PROMPT(now, model) }, ...history];

  const run = async () => {
    try {
      for (let round = 0; round < MAX_ROUNDS; round++) {
        const last = round === MAX_ROUNDS - 1;
        const payload = JSON.stringify({
          model,
          stream: true,
          max_tokens: 12_000, // build_app documents are long; the gateway allows up to 16384
          messages,
          ...(useTools && !last ? { tools: TOOLS_OPENAI, tool_choice: "auto" } : {}),
        });
        let upstream: Response | null = null;
        // the gateway rate-limits bursts (each tool round is a request): back off and retry
        for (let attempt = 0; attempt < 4; attempt++) {
          try {
            upstream = await fetch(`${base}/chat/completions`, {
              method: "POST",
              headers: { authorization: `Bearer ${env.PIP_API_KEY}`, "content-type": "application/json", accept: "text/event-stream" },
              body: payload,
            });
          } catch (err) {
            console.error("Pip upstream unreachable", err);
            upstream = null;
          }
          if (upstream && upstream.status !== 429 && upstream.status < 500) break;
          if (attempt === 3) break;
          const wait = Number(upstream?.headers.get("retry-after")) * 1000 || 2500 * 2 ** attempt;
          await upstream?.body?.cancel().catch(() => {});
          await emit({ t: "status", message: "Pip lagi antre sebentar…" });
          await new Promise((r) => setTimeout(r, Math.min(wait, 12_000)));
        }
        if (!upstream) {
          await emit({ t: "error", message: UPSTREAM_ERRORS[502] });
          return;
        }
        if (!upstream.ok || !upstream.body) {
          const detail = await upstream.text().catch(() => "");
          console.error("Pip upstream error", upstream.status, detail.slice(0, 500));
          await emit({ t: "error", message: UPSTREAM_ERRORS[upstream.status] ?? UPSTREAM_ERRORS[502] });
          return;
        }

        const { text, calls } = await readRound(upstream.body, (d) => void emit({ t: "text", d }));
        if (!calls.length) break;

        messages.push({
          role: "assistant",
          content: text || null,
          tool_calls: calls.map((c, i) => ({ id: c.id || `call_${round}_${i}`, type: "function", function: { name: c.name, arguments: c.args || "{}" } })),
        });
        const results = await Promise.all(
          calls.map(async (c, i) => {
            const id = c.id || `call_${round}_${i}`;
            let args: unknown = {};
            try {
              args = c.args ? JSON.parse(c.args) : {};
            } catch {
              /* shown raw below */
            }
            // never stream a whole build_app document as "args"; the UI gets it in tool_done
            await emit({ t: "tool", id, name: c.name, args: c.name === "build_app" ? { title: (args as any)?.title } : args });
            try {
              const r = await runTool(env, c.name, c.args);
              await emit({ t: "tool_done", id, name: c.name, ok: true, ui: r.ui });
              const content = typeof r.data === "string" ? r.data : JSON.stringify(r.data);
              return { id, name: c.name, content: content.length > MAX_TOOL_CHARS ? content.slice(0, MAX_TOOL_CHARS) + "…" : content };
            } catch (err) {
              const message = err instanceof Error ? err.message : String(err);
              await emit({ t: "tool_done", id, name: c.name, ok: false, error: message });
              return { id, name: c.name, content: JSON.stringify({ error: message }) };
            }
          }),
        );
        for (const r of results) messages.push({ role: "tool", tool_call_id: r.id, name: r.name, content: r.content });
        await emit({ t: "round" });
      }
      await emit({ t: "done" });
    } catch (err) {
      console.error("agent loop failed", err);
      await emit({ t: "error", message: UPSTREAM_ERRORS[502] }).catch(() => {});
    } finally {
      await writer.close().catch(() => {});
    }
  };
  ctx.waitUntil(run());

  return new Response(readable, {
    headers: { "content-type": "application/x-ndjson; charset=utf-8", "cache-control": "no-store", "x-pip-model": model },
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
  async fetch(request, env, ctx): Promise<Response> {
    const url = new URL(request.url);

    if (url.pathname === "/api/health") {
      return json({ ok: true, chat: Boolean(env.PIP_API_KEY), read: Boolean(env.AI) });
    }
    if (url.pathname === "/api/jkt48/home") {
      if (!env.PIP_API_KEY) return json({ error: "not configured" }, 503);
      try {
        return new Response(JSON.stringify(await homeFeed(env)), {
          headers: { "content-type": "application/json; charset=utf-8", "cache-control": "public, max-age=60" },
        });
      } catch {
        return json({ error: "JKT48Connect tidak bisa dihubungi." }, 502);
      }
    }
    if (url.pathname === "/api/chat" || url.pathname === "/api/read") {
      if (request.method !== "POST") return json({ error: "Method not allowed" }, 405);
      if (!sameOrigin(request, url)) return json({ error: "Forbidden" }, 403);
      return url.pathname === "/api/chat" ? handleChat(request, env, ctx) : handleRead(request, env);
    }
    if (url.pathname.startsWith("/api/")) return json({ error: "Not found" }, 404);

    return env.ASSETS.fetch(request);
  },
} satisfies ExportedHandler<Env>;
