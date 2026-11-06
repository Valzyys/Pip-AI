import type { ModelKey } from "../lib/chat";
import type { IconName } from "./icons";

export interface Suggestion {
  icon: IconName;
  label: string;
  prompt?: string;
  action?: "image" | "file";
}

export interface Mode {
  key: ModelKey;
  name: string;
  tagline: string;
  /** what this mode is best at, shown in the picker and on the welcome screen */
  skills: string[];
  hat: "none" | "headphones" | "glasses";
  /** colour of the circular wipe when switching to this mode */
  wipe: string;
  greeting: string;
  sub: string;
  placeholder: string;
  thinking: string;
  suggestions: Suggestion[];
  tools: { icon: IconName; label: string; prompt: string }[];
}

export const MODES: Mode[] = [
  {
    key: "pip",
    name: "Pip",
    tagline: "Teman ngobrol & ahli JKT48",
    skills: ["Jadwal theater", "Profil member", "Ulang tahun", "Siapa live", "Kartu & kuis"],
    hat: "none",
    wipe: "#FFB23F",
    greeting: "Halo, aku Pip",
    sub: "Tanya jadwal theater, member, ulang tahun, siapa yang lagi live, atau kirim foto.",
    placeholder: "Tanya Pip…",
    thinking: "Pip lagi mikir",
    suggestions: [
      { icon: "calendar", label: "Jadwal theater terdekat", prompt: "Jadwal theater JKT48 terdekat apa saja?" },
      { icon: "gift", label: "Siapa yang ultah?", prompt: "Siapa member JKT48 yang ulang tahun dalam waktu dekat?" },
      { icon: "person", label: "Profil Freya", prompt: "Profil Freya JKT48" },
      { icon: "live", label: "Siapa yang live?", prompt: "Siapa member JKT48 yang lagi live sekarang?" },
      { icon: "sparkles", label: "Kuis tebak member", prompt: "Buat kuis interaktif 5 soal tentang member JKT48 yang aktif sekarang" },
      { icon: "photo", label: "Baca foto", action: "image" },
    ],
    tools: [
      { icon: "calendar", label: "Jadwal", prompt: "Jadwal theater JKT48 terdekat" },
      { icon: "gift", label: "Ulang tahun", prompt: "Siapa member JKT48 yang ulang tahun dalam waktu dekat?" },
      { icon: "live", label: "Lagi live", prompt: "Siapa member JKT48 yang lagi live sekarang?" },
      { icon: "news", label: "Berita", prompt: "Berita JKT48 terbaru" },
      { icon: "people", label: "Member", prompt: "Tampilkan member JKT48 yang aktif" },
      { icon: "eye", label: "Rekap live", prompt: "Rekap live terakhir member JKT48" },
      { icon: "music", label: "Setlist", prompt: "Daftar setlist theater JKT48" },
      { icon: "sun", label: "Cuaca", prompt: "Cuaca di Jakarta hari ini" },
    ],
  },
  {
    key: "pip-code",
    name: "Pip Code",
    tagline: "Engineer yang nggak pernah tidur",
    skills: ["Debug error", "Refactor", "Review kode", "Mini app", "Screenshot error"],
    hat: "headphones",
    wipe: "#0B0F0C",
    greeting: "pip-code siap.",
    sub: "Tempel error, kirim screenshot atau file kode, atau minta dibikinkan mini app yang langsung jalan.",
    placeholder: "Tempel kode atau jelaskan bug…",
    thinking: "menjalankan",
    suggestions: [
      { icon: "code", label: "useEffect jalan 2×", prompt: "Kenapa useEffect saya jalan dua kali di React 18? Jelaskan dan beri contoh perbaikan." },
      { icon: "app", label: "Mini app pomodoro", prompt: "Bikinin mini app timer pomodoro yang cantik" },
      { icon: "app", label: "Kalkulator patungan", prompt: "Bikinin mini app kalkulator patungan tiket theater JKT48, ringkas" },
      { icon: "code", label: "Debounce TypeScript", prompt: "Tulis fungsi debounce di TypeScript dengan tipe generik yang benar" },
      { icon: "photo", label: "Baca screenshot error", action: "image" },
      { icon: "file", label: "Review file kode", action: "file" },
    ],
    tools: [
      { icon: "app", label: "Mini app", prompt: "Bikinin mini app timer pomodoro yang cantik" },
      { icon: "code", label: "Regex", prompt: "Buatkan regex untuk validasi nomor HP Indonesia dan jelaskan" },
      { icon: "calc", label: "Hitung", prompt: "Hitung 15% dari 2.750.000 lalu kurangi biaya admin 6.500" },
      { icon: "sparkles", label: "Visualisasi", prompt: "Buat grafik perbandingan kompleksitas O(n), O(n log n), O(n²) untuk n = 10, 100, 1000 pakai UI" },
    ],
  },
  {
    key: "pip-docs",
    name: "Pip Docs",
    tagline: "Pustakawan API JKT48Connect",
    skills: ["Endpoint & parameter", "Contoh request", "API key & kuota", "Error & status", "Contoh respons live"],
    hat: "glasses",
    wipe: "#F5EFE2",
    greeting: "Cari apa di dokumentasi?",
    sub: "Endpoint, parameter, header, kuota, dan contoh request API JKT48Connect — lengkap dengan contoh data asli.",
    placeholder: "Tanya soal API JKT48Connect…",
    thinking: "membuka dokumentasi",
    suggestions: [
      { icon: "docs", label: "Cara pakai API key", prompt: "Bagaimana cara memakai API key JKT48Connect? Tunjukkan contoh curl dan JavaScript." },
      { icon: "calendar", label: "Endpoint jadwal theater", prompt: "Endpoint apa untuk jadwal theater? Jelaskan parameter dan tunjukkan contoh respons asli." },
      { icon: "live", label: "Notifikasi live", prompt: "Bagaimana cara bikin bot notifikasi member yang sedang live pakai API JKT48Connect?" },
      { icon: "news", label: "Kuota & error", prompt: "Jelaskan kuota bulanan dan arti status error 401, 429 di API JKT48Connect dalam tabel" },
      { icon: "people", label: "Data member", prompt: "Endpoint untuk daftar dan detail member, plus contoh field yang tersedia" },
    ],
    tools: [
      { icon: "docs", label: "Quick start", prompt: "Quick start API JKT48Connect dari nol" },
      { icon: "code", label: "Pakai Codex", prompt: "Bagaimana memakai Pip di Codex? Tunjukkan konfigurasi lengkapnya" },
      { icon: "news", label: "Endpoint berita", prompt: "Endpoint berita JKT48Connect dan contoh responsnya" },
      { icon: "live", label: "Endpoint live", prompt: "Endpoint now_live dan recent, apa bedanya?" },
    ],
  },
];

export const modeOf = (k: ModelKey) => MODES.find((m) => m.key === k) ?? MODES[0];
