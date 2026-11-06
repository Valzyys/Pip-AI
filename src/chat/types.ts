import type { ModelKey } from "../lib/chat";
import type { Attachment } from "./files";

export type Status = "pending" | "streaming" | "done" | "error" | "stopped";

/** An assistant turn is an ordered list of parts: text runs and tool cards. */
export type Part =
  | { kind: "text"; text: string }
  | { kind: "tool"; id: string; name: string; status: "running" | "done" | "error"; ui?: Record<string, unknown>; error?: string };

export interface Msg {
  id: string;
  role: "user" | "assistant";
  at: number;
  /** user text */
  content?: string;
  attachments?: Attachment[];
  /** assistant parts */
  parts?: Part[];
  status?: Status;
  note?: string;
  offline?: boolean;
}

export interface Convo {
  id: string;
  title: string;
  profile: ModelKey;
  messages: Msg[];
  updated: number;
}

export const PROFILES: { key: ModelKey; name: string; short: string; desc: string }[] = [
  { key: "pip", name: "Pip", short: "Pip", desc: "Ngobrol, JKT48, membaca lampiran" },
  { key: "pip-code", name: "Pip Code", short: "Code", desc: "Debug, refactor, review kode" },
  { key: "pip-docs", name: "Pip Docs", short: "Docs", desc: "Dokumentasi JKT48Connect" },
];

/** Friendly "in progress" labels for tool chips. */
export const TOOL_LABEL: Record<string, string> = {
  jkt48_schedule: "Mengecek jadwal theater",
  jkt48_theater: "Membuka detail show",
  jkt48_members: "Mencari member",
  jkt48_member: "Membuka profil member",
  jkt48_birthdays: "Mengecek ulang tahun member",
  jkt48_news: "Membaca berita JKT48",
  jkt48_live: "Mengecek siapa yang live",
  jkt48_recent_lives: "Membuka rekap live",
  jkt48_setlists: "Mengambil daftar setlist",
  weather: "Mengecek cuaca",
  calculator: "Menghitung",
  show_ui: "Menyusun tampilan",
  build_app: "Membangun mini app",
};

export const textOf = (m: Msg) =>
  m.role === "user" ? m.content ?? "" : (m.parts ?? []).filter((p) => p.kind === "text").map((p) => (p as { text: string }).text).join("");

export function preview(c: Convo) {
  const last = [...c.messages].reverse().find((m) => textOf(m) || m.attachments?.length);
  if (!last) return "Obrolan baru";
  const t = textOf(last).replace(/[#*`>|_-]+/g, " ").replace(/\s+/g, " ").trim();
  if (t) return (last.role === "user" ? "Kamu: " : "") + t;
  return last.attachments?.length ? "📎 Lampiran" : "Kartu dari Pip";
}
