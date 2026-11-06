import { useMemo, useRef } from "react";
import { gsap, useGSAP, ScrollTrigger, ScrollSmoother, reducedMotion, isTouch } from "../lib/gsap";
import { navigate } from "../lib/router";
import { GLYPHS } from "../lib/sprites";
import { Sprite } from "../components/Sprite";
import { Pixels, RAMP } from "../components/Pixels";
import { Arrow, scrollTo } from "./ui";
import { dayTag, split, useNow, type HomeData } from "./data";

const GROUND = [3, 2, 4, 3, 5, 2, 3, 6, 4, 3, 2, 4, 5, 3, 2, 3, 4, 2, 5, 3, 4, 2, 3, 5];

export function Footer({ data }: { data: HomeData | null | undefined }) {
  const root = useRef<HTMLElement>(null);
  const now = useNow(1000);
  const next = data?.schedule?.[0];
  const bday = data?.birthdays?.[0];
  const c = next ? split(new Date(next.date).getTime() - now) : null;
  const wib = new Date(now).toLocaleTimeString("id-ID", { timeZone: "Asia/Jakarta", hour: "2-digit", minute: "2-digit", second: "2-digit" });

  const word = useMemo(() => {
    const g = ["P", "I", "P"].map((ch) => GLYPHS[ch]);
    return g[0].map((_, y) => g.map((x) => x[y].replace(/1/g, "#").replace(/0/g, ".")).join("."));
  }, []);

  useGSAP(
    () => {
      const q = gsap.utils.selector(root);
      // back-to-top progress ring follows the whole page
      const ring = q(".ft-top circle")[0] as unknown as SVGCircleElement;
      const len = 2 * Math.PI * 21;
      gsap.set(ring, { strokeDasharray: len, strokeDashoffset: len });
      ScrollTrigger.create({ start: 0, end: "max", onUpdate: (s) => gsap.set(ring, { strokeDashoffset: len * (1 - s.progress) }) });

      if (reducedMotion) return;

      gsap.from(".ft-big__line", { yPercent: 100, duration: 1.1, ease: "expo.out", scrollTrigger: { trigger: ".ft-big", start: "top 88%" } });
      gsap.from(".ft-tile", { y: 40, autoAlpha: 0, duration: 0.9, stagger: 0.08, ease: "expo.out", scrollTrigger: { trigger: ".ft-tiles", start: "top 90%" } });
      gsap.from(".ft-col", { y: 30, autoAlpha: 0, duration: 0.8, stagger: 0.06, ease: "expo.out", scrollTrigger: { trigger: ".ft-cols", start: "top 92%" } });

      // ground rises block by block, then Pip strolls along it
      gsap.from(".ft-ground i", { scaleY: 0, transformOrigin: "50% 100%", duration: 0.6, ease: "back.out(2)", stagger: { each: 0.02, from: "random" }, scrollTrigger: { trigger: ".ft-ground", start: "top 95%" } });
      const walker = q(".ft-walker")[0] as HTMLElement;
      const ground = q(".ft-ground")[0] as HTMLElement;
      const walk = gsap.timeline({ repeat: -1, yoyo: true, paused: true });
      walk.fromTo(walker, { x: 0 }, { x: () => ground.clientWidth - walker.offsetWidth, duration: 14, ease: "none" });
      const onRefresh = () => void walk.invalidate();
      ScrollTrigger.addEventListener("refreshInit", onRefresh);
      walk.eventCallback("onRepeat", () => {
        gsap.set(".ft-walker .sprite", { scaleX: walk.iteration() % 2 ? -1 : 1 });
      });
      // bounce while walking
      gsap.to(".ft-walker .sprite", { y: -4, duration: 0.18, repeat: -1, yoyo: true, ease: "sine.inOut" });
      ScrollTrigger.create({ trigger: ground, start: "top bottom", onEnter: () => walk.play(), onLeaveBack: () => walk.pause() });
      // keep Pip standing on the column under it
      const cols = q(".ft-ground > span") as HTMLElement[];
      const setBottom = gsap.quickTo(walker, "bottom", { duration: 0.18, ease: "power2.out" });
      const follow = () => {
        if (walk.paused()) return;
        const x = (gsap.getProperty(walker, "x") as number) + walker.offsetWidth / 2;
        const col = cols[Math.min(cols.length - 1, Math.max(0, Math.floor((x / ground.clientWidth) * cols.length)))];
        if (col) setBottom(col.offsetHeight);
      };
      gsap.ticker.add(follow);

      // the wordmark assembles, and its pixels lift towards the cursor
      gsap.from(".ft-word .px-on", {
        y: () => gsap.utils.random(-160, -40),
        autoAlpha: 0,
        ease: "expo.out",
        stagger: { amount: 0.5, from: "random" },
        scrollTrigger: { trigger: ".ft-word", start: "top bottom", end: "bottom bottom", scrub: 0.8 },
      });
      if (!isTouch) {
        const px = q(".ft-word .px-on") as HTMLElement[];
        const wordEl = q(".ft-word")[0] as HTMLElement;
        const move = (e: PointerEvent) => {
          px.forEach((p) => {
            const r = p.getBoundingClientRect();
            const d = Math.hypot(e.clientX - (r.left + r.width / 2), e.clientY - (r.top + r.height / 2));
            const k = Math.max(0, 1 - d / 180);
            gsap.to(p, { y: -k * 18, backgroundColor: k > 0.25 ? "#FF7A1A" : "", duration: 0.35, overwrite: "auto" });
          });
        };
        const leave = () => gsap.to(px, { y: 0, backgroundColor: "", duration: 0.5 });
        wordEl.addEventListener("pointermove", move);
        wordEl.addEventListener("pointerleave", leave);
      }
      return () => {
        gsap.ticker.remove(follow);
        ScrollTrigger.removeEventListener("refreshInit", onRefresh);
      };
    },
    { scope: root },
  );

  const hopBlock = (e: React.PointerEvent<HTMLElement>) => {
    if (reducedMotion) return;
    gsap.fromTo(e.currentTarget, { y: 0 }, { y: -10, duration: 0.18, yoyo: true, repeat: 1, ease: "power2.out", overwrite: true });
  };

  return (
    <footer className="ft" ref={root}>
      <a className="ft-big" href="/chat" onClick={(e) => (e.preventDefault(), navigate("/chat"))}>
        <span className="ft-big__mask">
          <span className="ft-big__line">
            <span className="ft-big__roll" data-text="Ngobrol sama Pip">
              Ngobrol sama Pip
            </span>
          </span>
        </span>
        <span className="ft-big__arrow">
          <Arrow />
        </span>
      </a>

      <div className="ft-tiles">
        <div className="ft-tile">
          <small>Show berikutnya</small>
          <b>{next?.title ?? "—"}</b>
          <span className="ft-tile__mono">{c ? `${c.d}h ${String(c.h).padStart(2, "0")}:${String(c.m).padStart(2, "0")}:${String(c.s).padStart(2, "0")}` : "memuat…"}</span>
        </div>
        <div className="ft-tile">
          <small>Ulang tahun berikutnya</small>
          <b>{bday?.name ?? "—"}</b>
          <span>{bday ? `${dayTag(bday.next)} · ${bday.turns} tahun` : ""}</span>
        </div>
        <div className="ft-tile">
          <small>Jakarta</small>
          <b className="ft-tile__mono">{wib}</b>
          <span>WIB</span>
        </div>
        <div className="ft-tile ft-tile--status">
          <small>Status</small>
          <b>
            <i className="ft-dot" /> Pip online
          </b>
          <span>{data?.live?.length ? `${data.live.length} member sedang live` : "Tiga mode siap"}</span>
        </div>
      </div>

      <div className="ft-cols">
        <div className="ft-col ft-col--brand">
          <span className="ft-brand">
            <Sprite name="pipHead" /> Pip
          </span>
          <p>Asisten AI dari JKT48Connect. Data asli, kartu interaktif, mini app.</p>
        </div>
        <div className="ft-col">
          <small>Produk</small>
          <a href="/chat" onClick={(e) => (e.preventDefault(), navigate("/chat"))}>
            Pip Chat
          </a>
          <a href="/chat?p=pip-code" onClick={(e) => (e.preventDefault(), navigate("/chat?p=pip-code"))}>
            Pip Code
          </a>
          <a href="/chat?p=pip-docs" onClick={(e) => (e.preventDefault(), navigate("/chat?p=pip-docs"))}>
            Pip Docs
          </a>
        </div>
        <div className="ft-col">
          <small>Jelajahi</small>
          {[
            ["hari-ini", "Hari ini"],
            ["mode", "Mode"],
            ["lampiran", "Lampiran"],
            ["member", "Member"],
          ].map(([id, label]) => (
            <a key={id} href={`#${id}`} onClick={(e) => (e.preventDefault(), scrollTo(`#${id}`))}>
              {label}
            </a>
          ))}
        </div>
        <div className="ft-col">
          <small>Developer</small>
          <a href="#developer" onClick={(e) => (e.preventDefault(), scrollTo("#developer"))}>
            API Pip
          </a>
          <a href="https://api.jkt48connect.app/docs/guide.md" target="_blank" rel="noreferrer">
            Dokumentasi JKT48Connect
          </a>
        </div>
      </div>

      <div className="ft-ground" aria-hidden="true">
        {GROUND.map((h, i) => (
          <span key={i} onPointerEnter={hopBlock} style={{ height: `calc(var(--g) * ${h})` }}>
            {Array.from({ length: h }, (_, r) => (
              <i key={r} style={{ background: RAMP[(i + r) % RAMP.length] }} />
            ))}
          </span>
        ))}
        <div className="ft-walker">
          <Sprite name="pip" />
        </div>
      </div>

      <Pixels rows={word} className="ft-word" />

      <div className="ft-bottom">
        <span>© 2026 Pip · JKT48Connect</span>
        <span className="ft-bottom__mid">Fan project — tidak berafiliasi dengan manajemen JKT48</span>
        <button
          className="ft-top"
          aria-label="Kembali ke atas"
          onClick={() => {
            const s = ScrollSmoother.get();
            if (s) s.scrollTo(0, true);
            else window.scrollTo({ top: 0, behavior: "smooth" });
          }}
        >
          <svg viewBox="0 0 48 48">
            <circle cx="24" cy="24" r="21" />
          </svg>
          <span>↑</span>
        </button>
      </div>
    </footer>
  );
}
