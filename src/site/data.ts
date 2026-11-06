import { useEffect, useState } from "react";

export interface HomeData {
  schedule: { id: string; title: string; date: string; category?: string; banner?: string | null }[];
  birthdays: { name: string; img: string; url: string; next: string; turns: number }[];
  news: { id: string; title: string; date: string; category: string; image?: string | null; url: string }[];
  live: { name: string; img?: string | null; type: string; title?: string | null; viewers?: number | null; url?: string | null }[];
  members: { name: string; nickname: string; img: string; url: string }[];
  at: string;
}

let cached: Promise<HomeData | null> | null = null;

/** Live JKT48 data for the landing page (proxied + cached by the Worker). `null` = unavailable. */
export function useHome() {
  const [data, setData] = useState<HomeData | null | undefined>(undefined);
  useEffect(() => {
    cached ??= fetch("/api/jkt48/home")
      .then((r) => (r.ok ? (r.json() as Promise<HomeData>) : null))
      .catch(() => null);
    let alive = true;
    void cached.then((d) => alive && setData(d));
    return () => {
      alive = false;
    };
  }, []);
  return data;
}

export const TZ = "Asia/Jakarta";
export const fDay = (iso: string) => new Date(iso).toLocaleDateString("id-ID", { timeZone: TZ, weekday: "short", day: "numeric", month: "short" });
export const fTime = (iso: string) => new Date(iso).toLocaleTimeString("id-ID", { timeZone: TZ, hour: "2-digit", minute: "2-digit" });

export function dayTag(iso: string, now = Date.now()) {
  const d = (t: number) => Math.floor((t + 7 * 3600_000) / 86_400_000);
  const diff = d(new Date(iso).getTime()) - d(now);
  if (diff === 0) return "Hari ini";
  if (diff === 1) return "Besok";
  if (diff < 0) return "Selesai";
  return `H-${diff}`;
}

export function useNow(ms = 1000) {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), ms);
    return () => clearInterval(id);
  }, [ms]);
  return now;
}

export function split(ms: number) {
  let s = Math.max(0, Math.floor(ms / 1000));
  const d = Math.floor(s / 86400);
  s -= d * 86400;
  const h = Math.floor(s / 3600);
  s -= h * 3600;
  const m = Math.floor(s / 60);
  return { d, h, m, s: s - m * 60 };
}
