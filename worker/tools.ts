/**
 * Tools Pip can call. Each tool returns:
 *  - `data`: compact JSON the model reads to write its answer
 *  - `ui`:   a payload the chat renders as an interactive card
 */

export interface ToolEnv {
  PIP_API_KEY?: string;
  JKT48_API_BASE?: string;
}

export interface ToolResult {
  data: unknown;
  ui?: Record<string, unknown>;
}

type Args = Record<string, unknown>;

const WIB = "Asia/Jakarta";

/* ------------------------------------------------------------------ */
/* JKT48Connect client with a small in-isolate cache                  */
/* ------------------------------------------------------------------ */

const cache = new Map<string, { at: number; value: unknown }>();

export async function jkt(env: ToolEnv, path: string, ttlMs = 60_000): Promise<any> {
  const hit = cache.get(path);
  if (hit && Date.now() - hit.at < ttlMs) return hit.value;
  const base = (env.JKT48_API_BASE || "https://api.jkt48connect.app").replace(/\/+$/, "");
  const res = await fetch(`${base}${path}`, { headers: { "X-API-Key": env.PIP_API_KEY ?? "", accept: "application/json" } });
  if (!res.ok) throw new Error(`JKT48Connect ${res.status} untuk ${path}`);
  const value = await res.json();
  cache.set(path, { at: Date.now(), value });
  if (cache.size > 200) cache.delete(cache.keys().next().value!);
  return value;
}

const norm = (s: unknown) =>
  String(s ?? "")
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[^a-z0-9]/g, "");

const banner = (designs: any) =>
  designs?.jkt48connect?.banner?.url ?? designs?.photobook?.banner?.url ?? designs?.jkt48connect?.portrait?.url ?? null;

const fmtDate = (iso: string) =>
  new Date(iso).toLocaleString("id-ID", { timeZone: WIB, weekday: "long", day: "numeric", month: "long", hour: "2-digit", minute: "2-digit" });

const num = (v: unknown, d: number, min: number, max: number) => {
  const n = Number(v);
  return Number.isFinite(n) ? Math.max(min, Math.min(max, Math.round(n))) : d;
};

interface Member {
  name: string;
  nicknames?: string[];
  img: string;
  url: string;
  is_graduate?: boolean;
  jkt48_id?: string;
  group?: string;
}

async function members(env: ToolEnv): Promise<Member[]> {
  const all = (await jkt(env, "/api/member", 3_600_000)) as Member[];
  return all.filter((m) => !m.group || m.group === "jkt48");
}

function scoreMember(m: Member, q: string) {
  const n = norm(q);
  if (!n) return 0;
  const nicks = (m.nicknames ?? []).map(norm);
  if (nicks.includes(n)) return 100;
  if (norm(m.url) === n) return 95;
  if (norm(m.name) === n) return 90;
  if (nicks.some((x) => x.startsWith(n))) return 70;
  if (m.name.toLowerCase().split(/\s+/).some((w) => norm(w) === n)) return 65;
  if (norm(m.name).includes(n)) return 50;
  if (nicks.some((x) => x.includes(n))) return 40;
  return 0;
}

async function resolveMember(env: ToolEnv, q: string): Promise<Member | null> {
  const list = await members(env);
  let best: Member | null = null;
  let bestScore = 0;
  for (const m of list) {
    const s = scoreMember(m, q) - (m.is_graduate ? 5 : 0);
    if (s > bestScore) {
      best = m;
      bestScore = s;
    }
  }
  return best;
}

const ageOn = (birth: string) => {
  const b = new Date(birth);
  const now = new Date();
  let age = now.getUTCFullYear() - b.getUTCFullYear();
  const m = now.getUTCMonth() - b.getUTCMonth();
  if (m < 0 || (m === 0 && now.getUTCDate() < b.getUTCDate() + 1)) age--;
  return age;
};

/* ------------------------------------------------------------------ */
/* JKT48 tools                                                         */
/* ------------------------------------------------------------------ */

async function jkt48Schedule(env: ToolEnv, a: Args): Promise<ToolResult> {
  const limit = num(a.limit, 6, 1, 10);
  const list = ((await jkt(env, "/api/next_schedule", 300_000)) as any[]).slice(0, limit);
  const items = list.map((s) => ({
    id: s.code ?? s.id,
    title: s.title,
    date: s.date,
    category: s.category,
    banner: banner(s.schedule_designs),
  }));
  return {
    data: items.map((i) => ({ id: i.id, title: i.title, waktu_wib: fmtDate(i.date), kategori: i.category })),
    ui: { type: "schedule", items },
  };
}

async function jkt48Theater(env: ToolEnv, a: Args): Promise<ToolResult> {
  const id = String(a.id ?? "").trim();
  if (!id) throw new Error("id show wajib diisi (ambil dari jkt48_schedule).");
  const d = await jkt(env, `/api/theater/${encodeURIComponent(id)}`, 300_000);
  const s = d?.shows?.[0];
  if (!s) throw new Error(`Show ${id} tidak ditemukan.`);
  const show = {
    id: s.id,
    title: s.title,
    date: s.date,
    team: s.team,
    url: s.url,
    banner: banner(s.schedule_designs),
    members: (s.members ?? []).map((m: any) => ({ name: m.name, img: m.img, url: m.url_key })),
    seitansai: (s.seitansai ?? []).map((m: any) => ({ name: m.name, img: m.img, url: m.url_key })),
    graduation: (s.graduation ?? []).map((m: any) => ({ name: m.name, img: m.img, url: m.url_key })),
    songs: (s.setlist?.songs ?? []).map((x: any) => (typeof x === "string" ? x : x.title ?? x.name)).filter(Boolean),
  };
  return {
    data: {
      id: show.id,
      judul: show.title,
      waktu_wib: fmtDate(show.date),
      tim: show.team,
      member: show.members.map((m: any) => m.name),
      seitansai: show.seitansai.map((m: any) => m.name),
      graduation: show.graduation.map((m: any) => m.name),
      lagu: show.songs.slice(0, 20),
      link_tiket: show.url,
    },
    ui: { type: "theater", show },
  };
}

async function jkt48Members(env: ToolEnv, a: Args): Promise<ToolResult> {
  const q = String(a.query ?? "").trim();
  const grads = a.include_graduated === true;
  const limit = num(a.limit, 12, 1, 60);
  let list = await members(env);
  if (!grads) list = list.filter((m) => !m.is_graduate);
  if (q) list = list.map((m) => [m, scoreMember(m, q)] as const).filter(([, s]) => s > 0).sort((x, y) => y[1] - x[1]).map(([m]) => m);
  const total = list.length;
  const items = list.slice(0, limit).map((m) => ({
    name: m.name,
    nickname: m.nicknames?.[0] ?? m.name.split(" ")[0],
    img: m.img,
    url: m.url,
    graduate: Boolean(m.is_graduate),
  }));
  return {
    data: { total_cocok: total, ditampilkan: items.map((m) => `${m.nickname} (${m.name})`) },
    ui: { type: "members", query: q, total, items },
  };
}

async function jkt48Member(env: ToolEnv, a: Args): Promise<ToolResult> {
  const q = String(a.member ?? a.name ?? "").trim();
  if (!q) throw new Error("Nama member wajib diisi.");
  const m = await resolveMember(env, q);
  if (!m) throw new Error(`Member "${q}" tidak ditemukan.`);
  const d = await jkt(env, `/api/member/${encodeURIComponent(m.url)}`, 1_800_000);
  const profile = {
    name: d.fullname ?? d.name ?? m.name,
    nickname: d.nickname ?? m.nicknames?.[0],
    img: d.img_alt ?? m.img,
    url: m.url,
    birthdate: d.birthdate ?? null,
    age: d.birthdate ? ageOn(d.birthdate) : null,
    height: d.height || null,
    bloodType: d.bloodType || null,
    graduate: Boolean(d.is_graduate),
    jikosokai: d.jikosokai || null,
    description: d.description || null,
    socials: (d.socials ?? []).map((s: any) => ({ title: s.title ?? s.name, url: s.url })).filter((s: any) => s.url),
    stats: d.stats?.total_live ?? null,
    upcoming: (d.upcomingTheater ?? []).slice(0, 4).map((t: any) => ({ id: t.id ?? t.url, title: t.title ?? t.name, date: t.date })),
    recent: (d.recentTheater ?? []).slice(0, 4).map((t: any) => ({ id: t.id ?? t.url, title: t.title ?? t.name, date: t.date })),
  };
  return {
    data: {
      ...profile,
      img: undefined,
      tanggal_lahir: profile.birthdate ? new Date(profile.birthdate).toLocaleDateString("id-ID", { timeZone: WIB, day: "numeric", month: "long", year: "numeric" }) : null,
    },
    ui: { type: "member", profile },
  };
}

async function jkt48Birthdays(env: ToolEnv): Promise<ToolResult> {
  const list = (await jkt(env, "/api/next_birthday", 3_600_000)) as any[];
  const now = new Date();
  const items = list.slice(0, 8).map((b) => {
    const bd = new Date(b.birthdate);
    // next occurrence of the birthday in WIB (stored as 17:00Z the day before)
    let next = new Date(Date.UTC(now.getUTCFullYear(), bd.getUTCMonth(), bd.getUTCDate(), 17));
    if (next.getTime() < now.getTime() - 86_400_000) next = new Date(Date.UTC(now.getUTCFullYear() + 1, bd.getUTCMonth(), bd.getUTCDate(), 17));
    return { name: b.name, img: b.img, url: b.url_key, birthdate: b.birthdate, next: next.toISOString(), turns: next.getUTCFullYear() - bd.getUTCFullYear() };
  });
  return {
    data: items.map((i) => ({
      nama: i.name,
      ulang_tahun: new Date(i.next).toLocaleDateString("id-ID", { timeZone: WIB, day: "numeric", month: "long" }),
      umur_baru: i.turns,
    })),
    ui: { type: "birthdays", items },
  };
}

async function jkt48News(env: ToolEnv, a: Args): Promise<ToolResult> {
  const limit = num(a.limit, 5, 1, 10);
  const q = norm(a.query);
  const d = await jkt(env, "/api/news?page=1&perpage=20", 600_000);
  let list = (d?.news ?? []) as any[];
  if (q) list = list.filter((n) => norm(n.title).includes(q) || norm(n.category).includes(q));
  const items = list.slice(0, limit).map((n) => ({
    id: n.id,
    title: n.title,
    date: n.date,
    category: n.category,
    image: n.news_image?.url ?? null,
    url: n.url,
  }));
  return {
    data: items.map((n) => ({ judul: n.title, kategori: n.category, tanggal: new Date(n.date).toLocaleDateString("id-ID", { timeZone: WIB }) })),
    ui: { type: "news", items },
  };
}

async function jkt48Live(env: ToolEnv): Promise<ToolResult> {
  const list = (await jkt(env, "/api/now_live?group=jkt48", 30_000)) as any[];
  const items = (Array.isArray(list) ? list : []).map((l) => ({
    name: l.member?.nickname ?? l.name ?? l.member?.name ?? l.idn?.username ?? "Member",
    img: l.member?.img_alt ?? l.member?.img ?? l.img ?? l.image ?? null,
    type: l.type ?? (l.idn ? "idn" : "showroom"),
    title: l.title ?? l.idn?.title ?? l.live_info?.title ?? null,
    started: l.started_at ?? l.live_info?.date?.start ?? l.date ?? null,
    viewers: l.live_info?.viewers?.num ?? l.viewers ?? null,
    url: l.url ?? (l.idn?.username && l.idn?.slug ? `https://www.idn.app/${l.idn.username}/live/${l.idn.slug}` : null),
    thumb: l.idn?.image ?? l.image ?? null,
  }));
  return {
    data: items.length ? items.map((i) => ({ member: i.name, platform: i.type, judul: i.title, penonton: i.viewers })) : "Tidak ada member yang sedang live saat ini.",
    ui: { type: "live", items },
  };
}

async function jkt48Recent(env: ToolEnv, a: Args): Promise<ToolResult> {
  const limit = num(a.limit, 5, 1, 10);
  const q = String(a.member ?? "").trim();
  const d = await jkt(env, "/api/recent?page=1&perpage=30", 120_000);
  let list = (d?.recents ?? []) as any[];
  if (q) {
    const n = norm(q);
    list = list.filter((r) => [r.member?.nickname, r.member?.name, r.member?.url].some((v) => norm(v).includes(n)));
  }
  const items = list.slice(0, limit).map((r) => ({
    id: r.data_id,
    name: r.member?.nickname ?? r.member?.name,
    fullname: r.member?.name,
    img: r.member?.img_alt ?? r.member?.img,
    type: r.type,
    title: r.idn?.title ?? r.showroom?.title ?? null,
    start: r.live_info?.date?.start,
    end: r.live_info?.date?.end,
    duration: r.live_info?.duration,
    viewers: r.live_info?.viewers?.num ?? null,
    points: r.points ?? null,
    unit: r.point_unit ?? null,
    replay: r.youtube_replay?.videos?.[0]?.url ?? null,
    leaderboard: r.leaderboard_designs?.jkt48connect?.banner?.url ?? r.leaderboard_designs?.photobook?.banner?.url ?? null,
  }));
  return {
    data: items.map((i) => ({
      member: i.name,
      platform: i.type,
      judul: i.title,
      mulai_wib: i.start ? fmtDate(i.start) : null,
      durasi_menit: i.duration ? Math.round(i.duration / 60000) : null,
      penonton: i.viewers,
      poin: i.points,
    })),
    ui: { type: "recent", items },
  };
}

async function jkt48Setlists(env: ToolEnv): Promise<ToolResult> {
  const list = (await jkt(env, "/api/setlist", 21_600_000)) as any[];
  return { data: list.map((s) => s.title), ui: { type: "setlists", items: list } };
}

/* ------------------------------------------------------------------ */
/* General tools                                                       */
/* ------------------------------------------------------------------ */

const WEATHER: Record<number, string> = {
  0: "Cerah", 1: "Cerah berawan", 2: "Berawan sebagian", 3: "Berawan", 45: "Berkabut", 48: "Berkabut",
  51: "Gerimis", 53: "Gerimis", 55: "Gerimis lebat", 61: "Hujan ringan", 63: "Hujan", 65: "Hujan lebat",
  71: "Salju", 80: "Hujan lokal", 81: "Hujan lokal", 82: "Hujan deras", 95: "Badai petir", 96: "Badai petir", 99: "Badai petir",
};

async function weather(a: Args): Promise<ToolResult> {
  const city = String(a.city ?? "Jakarta").trim() || "Jakarta";
  const geo = (await (await fetch(`https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(city)}&count=1&language=id`)).json()) as any;
  const place = geo?.results?.[0];
  if (!place) throw new Error(`Kota "${city}" tidak ditemukan.`);
  const f = (await (
    await fetch(
      `https://api.open-meteo.com/v1/forecast?latitude=${place.latitude}&longitude=${place.longitude}&current=temperature_2m,apparent_temperature,relative_humidity_2m,wind_speed_10m,weather_code&daily=temperature_2m_max,temperature_2m_min,precipitation_probability_max,weather_code&timezone=auto&forecast_days=5`,
    )
  ).json()) as any;
  const ui = {
    type: "weather",
    city: place.name,
    region: [place.admin1, place.country].filter(Boolean).join(", "),
    current: {
      temp: f.current?.temperature_2m,
      feels: f.current?.apparent_temperature,
      humidity: f.current?.relative_humidity_2m,
      wind: f.current?.wind_speed_10m,
      code: f.current?.weather_code,
      label: WEATHER[f.current?.weather_code] ?? "—",
    },
    daily: (f.daily?.time ?? []).map((t: string, i: number) => ({
      date: t,
      max: f.daily.temperature_2m_max[i],
      min: f.daily.temperature_2m_min[i],
      rain: f.daily.precipitation_probability_max?.[i] ?? null,
      code: f.daily.weather_code[i],
      label: WEATHER[f.daily.weather_code[i]] ?? "—",
    })),
  };
  return { data: { ...ui, type: undefined }, ui };
}

/** Safe arithmetic: numbers, + - * / % ^, parentheses, and a few functions. No eval. */
function calculate(a: Args): ToolResult {
  const expr = String(a.expression ?? "").replace(/,/g, ".").replace(/×/g, "*").replace(/÷/g, "/");
  const tokens = expr.match(/\d+(\.\d+)?|[a-z]+|[-+*/%^()]/gi);
  if (!tokens || tokens.join("").length < expr.replace(/\s/g, "").length) throw new Error("Ekspresi tidak valid.");
  const FN: Record<string, (x: number) => number> = { sqrt: Math.sqrt, abs: Math.abs, round: Math.round, floor: Math.floor, ceil: Math.ceil, log: Math.log10, ln: Math.log, sin: Math.sin, cos: Math.cos, tan: Math.tan };
  const CONST: Record<string, number> = { pi: Math.PI, e: Math.E };
  let i = 0;
  const peek = () => tokens[i];
  const next = () => tokens[i++];
  const parseExpr = (): number => {
    let v = parseTerm();
    while (peek() === "+" || peek() === "-") v = next() === "+" ? v + parseTerm() : v - parseTerm();
    return v;
  };
  const parseTerm = (): number => {
    let v = parsePow();
    while (peek() === "*" || peek() === "/" || peek() === "%") {
      const op = next();
      const r = parsePow();
      v = op === "*" ? v * r : op === "/" ? v / r : v % r;
    }
    return v;
  };
  const parsePow = (): number => {
    const b = parseUnary();
    return peek() === "^" ? (next(), Math.pow(b, parsePow())) : b;
  };
  const parseUnary = (): number => (peek() === "-" ? (next(), -parseUnary()) : peek() === "+" ? (next(), parseUnary()) : parseAtom());
  const parseAtom = (): number => {
    const t = next();
    if (t === undefined) throw new Error("Ekspresi terpotong.");
    if (t === "(") {
      const v = parseExpr();
      if (next() !== ")") throw new Error("Kurung tidak seimbang.");
      return v;
    }
    if (/^\d/.test(t)) return parseFloat(t);
    const k = t.toLowerCase();
    if (k in CONST) return CONST[k];
    if (k in FN) {
      if (next() !== "(") throw new Error(`${k} butuh tanda kurung.`);
      const v = parseExpr();
      if (next() !== ")") throw new Error("Kurung tidak seimbang.");
      return FN[k](v);
    }
    throw new Error(`Simbol tidak dikenal: ${t}`);
  };
  const result = parseExpr();
  if (i < tokens.length) throw new Error("Ekspresi tidak valid.");
  if (!Number.isFinite(result)) throw new Error("Hasilnya tidak terdefinisi.");
  const rounded = Math.round(result * 1e10) / 1e10;
  return { data: { hasil: rounded }, ui: { type: "calc", expression: String(a.expression), result: rounded } };
}

/* ------------------------------------------------------------------ */
/* UI tools                                                            */
/* ------------------------------------------------------------------ */

function showUi(a: Args): ToolResult {
  const blocks = Array.isArray(a.blocks) ? a.blocks.slice(0, 24) : [];
  if (!blocks.length) throw new Error("blocks wajib berisi minimal satu komponen.");
  return { data: "UI sudah ditampilkan ke pengguna. Jangan ulangi isinya; cukup beri pengantar singkat.", ui: { type: "ui", title: a.title ?? null, blocks } };
}

function buildApp(a: Args): ToolResult {
  const html = String(a.html ?? "");
  if (html.length < 40) throw new Error("html terlalu pendek.");
  if (html.length > 60_000) throw new Error("html terlalu panjang (maks 60.000 karakter).");
  return {
    data: "Mini app sudah ditampilkan dan bisa langsung dipakai pengguna. Jelaskan singkat cara pakainya.",
    ui: { type: "app", title: String(a.title ?? "Mini app"), html },
  };
}

/* ------------------------------------------------------------------ */
/* registry                                                            */
/* ------------------------------------------------------------------ */

const obj = (properties: Record<string, unknown>, required: string[] = []) => ({ type: "object", properties, required });

export const TOOL_DEFS = [
  {
    name: "jkt48_schedule",
    description: "Jadwal show theater JKT48 yang akan datang (judul setlist, tanggal & jam WIB, id show).",
    parameters: obj({ limit: { type: "integer", description: "Jumlah show, 1-10" } }),
  },
  {
    name: "jkt48_theater",
    description: "Detail satu show theater JKT48: member yang tampil, seitansai, lagu, link tiket. Pakai id dari jkt48_schedule.",
    parameters: obj({ id: { type: "string", description: "id show, contoh SHC218" } }, ["id"]),
  },
  {
    name: "jkt48_members",
    description: "Cari/daftar member JKT48 (nama, nickname, foto). Kosongkan query untuk semua member aktif.",
    parameters: obj({
      query: { type: "string", description: "nama atau nickname, opsional" },
      include_graduated: { type: "boolean" },
      limit: { type: "integer" },
    }),
  },
  {
    name: "jkt48_member",
    description: "Profil lengkap satu member JKT48: tanggal lahir, umur, tinggi, golongan darah, sosial media, jadwal theater.",
    parameters: obj({ member: { type: "string", description: "nama atau nickname, contoh: Freya" } }, ["member"]),
  },
  {
    name: "jkt48_birthdays",
    description: "Member JKT48 yang akan berulang tahun dalam waktu dekat.",
    parameters: obj({}),
  },
  {
    name: "jkt48_news",
    description: "Berita/pengumuman resmi JKT48 terbaru.",
    parameters: obj({ query: { type: "string", description: "kata kunci opsional" }, limit: { type: "integer" } }),
  },
  {
    name: "jkt48_live",
    description: "Member JKT48 yang sedang live sekarang (IDN/Showroom).",
    parameters: obj({}),
  },
  {
    name: "jkt48_recent_lives",
    description: "Rekap live terakhir member JKT48: durasi, penonton, poin gift, replay.",
    parameters: obj({ member: { type: "string", description: "filter nama member, opsional" }, limit: { type: "integer" } }),
  },
  {
    name: "jkt48_setlists",
    description: "Daftar setlist theater JKT48.",
    parameters: obj({}),
  },
  {
    name: "weather",
    description: "Cuaca sekarang dan prakiraan 5 hari untuk sebuah kota.",
    parameters: obj({ city: { type: "string" } }, ["city"]),
  },
  {
    name: "calculator",
    description: "Hitung ekspresi matematika secara akurat (+ - * / % ^, sqrt, round, dll).",
    parameters: obj({ expression: { type: "string" } }, ["expression"]),
  },
  {
    name: "show_ui",
    description:
      "Tampilkan UI interaktif native di chat. Pakai untuk ringkasan visual, perbandingan, grafik, kuis, polling, checklist, langkah-langkah, atau tombol pilihan. Setiap block punya 'type'. Tipe: " +
      "heading{text}, text{text}, card{title,subtitle,text,image}, stats{items:[{label,value,hint}]}, table{columns:[..],rows:[[..]]}, " +
      "chart{chart:'bar'|'line'|'pie',labels:[..],series:[{name,data:[numbers]}]}, list{items:[..]}, checklist{items:[..]}, " +
      "progress{label,value,max}, quiz{question,options:[..],answer:index,explain}, poll{question,options:[..]}, countdown{label,to:ISO date}, " +
      "timeline{items:[{time,title,text}]}, buttons{items:[{label,prompt}]} (tombol mengirim prompt ke Pip), divider{}.",
    parameters: obj(
      {
        title: { type: "string" },
        blocks: {
          type: "array",
          items: {
            type: "object",
            properties: {
              type: {
                type: "string",
                enum: ["heading", "text", "card", "stats", "table", "chart", "list", "checklist", "progress", "quiz", "poll", "countdown", "timeline", "buttons", "divider"],
              },
            },
            required: ["type"],
          },
        },
      },
      ["blocks"],
    ),
  },
  {
    name: "build_app",
    description:
      "Buat mini app interaktif (kalkulator, game, kuis, timer, generator, visualisasi) sebagai SATU dokumen HTML lengkap dengan CSS & JavaScript inline. " +
      "Tidak boleh memuat resource eksternal (script/css/font/fetch akan diblokir); gambar hanya data: atau https. Desain modern, responsif mobile, ramah layar sentuh. " +
      "Tulis ringkas: idealnya di bawah 9.000 karakter, tanpa komentar panjang.",
    parameters: obj({ title: { type: "string" }, html: { type: "string", description: "dokumen HTML lengkap" } }, ["title", "html"]),
  },
];

export const TOOLS_OPENAI = TOOL_DEFS.map((t) => ({ type: "function", function: t }));

const RUNNERS: Record<string, (env: ToolEnv, a: Args) => Promise<ToolResult> | ToolResult> = {
  jkt48_schedule: jkt48Schedule,
  jkt48_theater: jkt48Theater,
  jkt48_members: jkt48Members,
  jkt48_member: jkt48Member,
  jkt48_birthdays: (env) => jkt48Birthdays(env),
  jkt48_news: jkt48News,
  jkt48_live: (env) => jkt48Live(env),
  jkt48_recent_lives: jkt48Recent,
  jkt48_setlists: (env) => jkt48Setlists(env),
  weather: (_e, a) => weather(a),
  calculator: (_e, a) => calculate(a),
  show_ui: (_e, a) => showUi(a),
  build_app: (_e, a) => buildApp(a),
};

export async function runTool(env: ToolEnv, name: string, rawArgs: string): Promise<ToolResult> {
  const fn = RUNNERS[name];
  if (!fn) throw new Error(`Tool ${name} tidak dikenal.`);
  return fn(env, parseArgs(rawArgs));
}

/** Parse tool arguments; repair the common case of a long string cut off at the end. */
export function parseArgs(raw: string): Args {
  const s = raw.trim();
  if (!s) return {};
  try {
    return JSON.parse(s) as Args;
  } catch {
    for (const tail of ['"}', '"}]}', "}", '"]}', "]}"]) {
      try {
        return JSON.parse(s + tail) as Args;
      } catch {
        /* try next */
      }
    }
    throw new Error("Argumen tool tidak lengkap (kemungkinan terpotong). Coba buat versi yang lebih ringkas.");
  }
}

/* ------------------------------------------------------------------ */
/* landing page feed                                                   */
/* ------------------------------------------------------------------ */

export async function homeFeed(env: ToolEnv) {
  const [schedule, birthdays, news, all, live] = await Promise.allSettled([
    jkt48Schedule(env, { limit: 8 }),
    jkt48Birthdays(env),
    jkt48News(env, { limit: 6 }),
    members(env),
    jkt48Live(env),
  ]);
  const pick = <T>(r: PromiseSettledResult<T>) => (r.status === "fulfilled" ? r.value : null);
  const mem = pick(all) ?? [];
  return {
    schedule: (pick(schedule)?.ui as any)?.items ?? [],
    birthdays: (pick(birthdays)?.ui as any)?.items ?? [],
    news: (pick(news)?.ui as any)?.items ?? [],
    live: (pick(live)?.ui as any)?.items ?? [],
    members: mem
      .filter((m) => !m.is_graduate)
      .map((m) => ({ name: m.name, nickname: m.nicknames?.[0] ?? m.name.split(" ")[0], img: m.img, url: m.url })),
    at: new Date().toISOString(),
  };
}
