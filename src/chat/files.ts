/**
 * Attachments: classify, preview, and turn into text Pip can read.
 *  - text / code files are read right here in the browser
 *  - images are downscaled + re-encoded to JPEG, then described by a vision model (Worker /api/read)
 *  - documents (PDF, DOCX, XLSX, …) are converted to Markdown by the Worker (/api/read)
 */

export type AttachmentKind = "image" | "document" | "text";
export type AttachmentStatus = "reading" | "ready" | "error";

export interface Attachment {
  id: string;
  name: string;
  size: number;
  mime: string;
  kind: AttachmentKind;
  status: AttachmentStatus;
  /** small data-URL preview for images (persisted with the chat) */
  thumb?: string;
  /** extracted text sent to Pip as context */
  text?: string;
  error?: string;
  truncated?: boolean;
}

export const MAX_FILES = 6;
export const MAX_BYTES = 10 * 1024 * 1024;
const MAX_TEXT_CHARS = 20_000;

const TEXT_EXT =
  /\.(txt|md|markdown|csv|tsv|json|jsonl|xml|ya?ml|toml|ini|cfg|conf|log|html?|css|scss|less|jsx?|tsx?|mjs|cjs|py|rb|go|rs|java|kts?|swift|c|h|cc|cpp|hpp|cs|php|sh|bash|zsh|ps1|sql|vue|svelte|astro|env|gitignore|dockerfile|lua|dart|r|m|pl|ex|exs|erl|hs|clj|scala|graphql|proto)$/i;
const DOC_EXT = /\.(pdf|docx|xlsx|xlsm|xlsb|xls|et|ods|odt|numbers)$/i;

export const ACCEPT =
  "image/*,.pdf,.docx,.xlsx,.xlsm,.xls,.ods,.odt,.numbers,text/*,.md,.csv,.json,.xml,.yaml,.yml,.toml,.log,.js,.jsx,.ts,.tsx,.py,.go,.rs,.java,.kt,.swift,.c,.cpp,.h,.cs,.php,.rb,.sh,.sql,.html,.css,.vue,.svelte";

export function classify(file: File): AttachmentKind | null {
  if (file.type.startsWith("image/") && file.type !== "image/svg+xml") return "image";
  if (DOC_EXT.test(file.name) || file.type === "application/pdf") return "document";
  if (
    file.type.startsWith("text/") ||
    /json|xml|javascript|typescript|x-sh|x-python|sql|yaml|toml/.test(file.type) ||
    TEXT_EXT.test(file.name) ||
    file.type === "image/svg+xml"
  )
    return "text";
  return null;
}

export function formatSize(bytes: number) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`;
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
}

export const uid = () => Math.random().toString(36).slice(2, 10);

function loadImage(file: File): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      URL.revokeObjectURL(url);
      resolve(img);
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error("Gambar tidak bisa dibuka."));
    };
    img.src = url;
  });
}

function draw(img: HTMLImageElement, max: number) {
  const scale = Math.min(1, max / Math.max(img.naturalWidth, img.naturalHeight));
  const w = Math.max(1, Math.round(img.naturalWidth * scale));
  const h = Math.max(1, Math.round(img.naturalHeight * scale));
  const canvas = document.createElement("canvas");
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext("2d")!;
  ctx.fillStyle = "#fff"; // flatten transparency for JPEG
  ctx.fillRect(0, 0, w, h);
  ctx.drawImage(img, 0, 0, w, h);
  return canvas;
}

/** Thumbnail (data URL) + an upload-friendly JPEG (≤1600px) in one decode. */
export async function prepareImage(file: File): Promise<{ thumb: string; upload: Blob }> {
  const img = await loadImage(file);
  const thumb = draw(img, 220).toDataURL("image/jpeg", 0.78);
  const upload = await new Promise<Blob>((resolve, reject) =>
    draw(img, 1600).toBlob((b) => (b ? resolve(b) : reject(new Error("Gagal memproses gambar."))), "image/jpeg", 0.86),
  );
  return { thumb, upload };
}

export class ReadError extends Error {}

/** Turn one file into text for Pip. */
export async function readFile(
  file: File,
  kind: AttachmentKind,
  upload?: Blob,
  signal?: AbortSignal,
): Promise<{ text: string; truncated: boolean }> {
  if (kind === "text") {
    const raw = await file.text();
    const truncated = raw.length > MAX_TEXT_CHARS;
    return { text: truncated ? raw.slice(0, MAX_TEXT_CHARS) + "\n…[dipotong]" : raw, truncated };
  }

  const form = new FormData();
  const name = kind === "image" ? file.name.replace(/\.[^.]+$/, "") + ".jpg" : file.name;
  form.append("file", upload ?? file, name);

  let res: Response;
  try {
    res = await fetch("/api/read", { method: "POST", body: form, signal });
  } catch {
    throw new ReadError("Tidak bisa terhubung ke server.");
  }
  const data = (await res.json().catch(() => null)) as { text?: string; truncated?: boolean; error?: string; code?: string } | null;
  if (!res.ok || !data?.text) {
    if (data?.code === "no_ai" || res.status === 404 || !data)
      throw new ReadError("Membaca gambar & dokumen butuh Workers AI — aktif setelah deploy ke Cloudflare.");
    throw new ReadError(data.error ?? "File ini belum bisa dibaca.");
  }
  return { text: data.text, truncated: Boolean(data.truncated) };
}

const KIND_LABEL: Record<AttachmentKind, string> = {
  image: "gambar, ditranskripsi otomatis",
  document: "dokumen, diubah ke teks",
  text: "file teks",
};

/** What Pip actually receives for a user turn with attachments. */
export function composeForPip(content: string, attachments: Attachment[] | undefined): string {
  const ready = (attachments ?? []).filter((a) => a.status === "ready" && a.text);
  if (!ready.length) return content;
  const blocks = ready.map(
    (a, i) => `[Lampiran ${i + 1}: ${a.name} (${KIND_LABEL[a.kind]})]\n${a.text}\n[/Lampiran ${i + 1}]`,
  );
  const ask = content.trim() || (ready.length > 1 ? "Tolong jelaskan isi lampiran-lampiran ini." : "Tolong jelaskan isi lampiran ini.");
  return `${blocks.join("\n\n")}\n\n${ask}`;
}
