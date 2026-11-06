import { useRef } from "react";
import { gsap, useGSAP, reducedMotion } from "../lib/gsap";
import { Sprite } from "../components/Sprite";

const QUESTION = "Berapa total belanjaku di struk ini?";
const ANSWER: { t: string; b?: boolean }[] = [
  { t: "Total belanjamu " },
  { t: "Rp 79.200", b: true },
  { t: ". Rinciannya: kopi susu 2× Rp 36.000, roti bakar Rp 28.000, air mineral Rp 8.000, ditambah PPN 10% sebesar Rp 7.200. Mau aku bagi rata buat 3 orang?" },
];

const STEPS = [
  { n: "01", t: "Lampirkan", d: "Foto, screenshot, PDF, Word, Excel, atau file kode." },
  { n: "02", t: "Pip membaca", d: "Gambar ditranskripsi, dokumen diubah jadi teks, dalam hitungan detik." },
  { n: "03", t: "Dapat jawaban", d: "Tanya lanjutan kapan saja. Pip ingat isi file selama obrolan." },
];

/** Pinned: scrolling plays one complete chat turn inside a product mock. */
export function Showcase() {
  const root = useRef<HTMLElement>(null);

  useGSAP(
    () => {
      const q = gsap.utils.selector(root);
      const typed = q(".mock__typed")[0] as HTMLElement;
      const words = q(".mock__answer .w") as HTMLElement[];

      if (reducedMotion) {
        typed.textContent = "";
        return;
      }

      const step = (i: number) => (self?: unknown) => {
        void self;
        q(".steps li").forEach((li, j) => li.classList.toggle("is-on", j === i));
      };

      const typing = { n: 0 };
      const tl = gsap.timeline({
        defaults: { ease: "none" },
        scrollTrigger: {
          trigger: root.current,
          start: "top top",
          end: "+=240%",
          pin: true,
          scrub: 0.6,
          onUpdate: (self) => {
            const p = self.progress;
            step(p < 0.33 ? 0 : p < 0.58 ? 1 : 2)();
          },
        },
      });

      tl.fromTo(".mock__attach", { y: -70, autoAlpha: 0, rotation: -6 }, { y: 0, autoAlpha: 1, rotation: 0, duration: 0.08, ease: "power2.out" }, 0.02)
        .to(typing, {
          n: QUESTION.length,
          duration: 0.16,
          onUpdate: () => {
            typed.textContent = QUESTION.slice(0, Math.round(typing.n));
          },
        }, 0.1)
        .to(".mock__send", { scale: 0.86, duration: 0.02, yoyo: true, repeat: 1 }, 0.28)
        .to(".mock__attach, .mock__typed", { autoAlpha: 0, duration: 0.02 }, 0.3)
        .fromTo(".mock__user", { y: 30, autoAlpha: 0 }, { y: 0, autoAlpha: 1, duration: 0.05, ease: "power2.out" }, 0.31)
        .fromTo(".mock__reading", { y: 16, autoAlpha: 0 }, { y: 0, autoAlpha: 1, duration: 0.04 }, 0.37)
        .fromTo(".mock__bar i", { scaleX: 0 }, { scaleX: 1, duration: 0.17, ease: "steps(12)" }, 0.39)
        .set(".mock__reading", { className: "mock__reading is-done" }, 0.56)
        .fromTo(".mock__bot", { y: 16, autoAlpha: 0 }, { y: 0, autoAlpha: 1, duration: 0.04 }, 0.58)
        .fromTo(words, { autoAlpha: 0 }, { autoAlpha: 1, duration: 0.01, stagger: 0.3 / words.length }, 0.6)
        .to({}, { duration: 0.08 }, 0.92);

      gsap.from(".showcase__copy > *", {
        y: 30,
        autoAlpha: 0,
        stagger: 0.08,
        duration: 1,
        scrollTrigger: { trigger: root.current, start: "top 70%" },
      });
      gsap.from(".mock", {
        y: 80,
        rotateX: 12,
        autoAlpha: 0,
        transformPerspective: 1400,
        duration: 1.3,
        scrollTrigger: { trigger: root.current, start: "top 75%" },
      });
    },
    { scope: root },
  );

  return (
    <section className="showcase" id="lampiran" ref={root}>
      <div className="showcase__copy">
        <p className="label">Pip Chat</p>
        <h2 className="h2 js-lines">Kirim foto. Dapat jawaban.</h2>
        <p className="lead">
          Struk belanja, screenshot error, jadwal di poster, tabel di PDF. Pip membacanya untukmu, lalu menjawab persis yang
          kamu tanyakan.
        </p>
        <ol className="steps">
          {STEPS.map((s, i) => (
            <li key={s.n} className={i === 0 ? "is-on" : ""}>
              <span className="steps__n">{s.n}</span>
              <div>
                <b>{s.t}</b>
                <span>{s.d}</span>
              </div>
            </li>
          ))}
        </ol>
      </div>

      <div className="mock" aria-hidden="true">
        <div className="mock__bar">
          <span className="mock__dots">
            <i />
            <i />
            <i />
          </span>
          <span>Pip Chat</span>
          <span className="mock__model">pip ▾</span>
        </div>
        <div className="mock__thread">
          <div className="mock__user">
            <Receipt />
            <p>{QUESTION}</p>
          </div>
          <div className="mock__reading">
            <span className="mock__reading-label">
              <span className="when-busy">Membaca struk.jpg…</span>
              <span className="when-done">✓ struk.jpg dibaca</span>
            </span>
            <span className="mock__bar">
              <i />
            </span>
          </div>
          <div className="mock__bot">
            <span className="mock__avatar">
              <Sprite name="pipHead" />
            </span>
            <p className="mock__answer">
              {ANSWER.flatMap((part, i) =>
                part.t.split(/(\s+)/).map((w, j) =>
                  /^\s+$/.test(w) ? (
                    w
                  ) : (
                    <span key={`${i}-${j}`} className={`w${part.b ? " b" : ""}`}>
                      {w}
                    </span>
                  ),
                ),
              )}
            </p>
          </div>
        </div>
        <div className="mock__composer">
          <div className="mock__attach">
            <Receipt small />
            <span>
              struk.jpg
              <small>184 KB</small>
            </span>
          </div>
          <div className="mock__input">
            <span className="mock__clip">
              <Clip />
            </span>
            <span className="mock__typed">{QUESTION}</span>
            <span className="mock__caret" />
            <span className="mock__send">
              <svg viewBox="0 0 10 10">
                <path d="M5 8.5V1.5M1.8 4.7 5 1.5l3.2 3.2" fill="none" stroke="currentColor" strokeWidth="1.4" />
              </svg>
            </span>
          </div>
        </div>
      </div>
    </section>
  );
}

export function Clip() {
  return (
    <svg viewBox="0 0 16 16" aria-hidden="true">
      <path
        d="M10.5 4.5 5.6 9.4a1.4 1.4 0 0 0 2 2l5.2-5.2a2.8 2.8 0 0 0-4-4L3.6 7.4a4.2 4.2 0 0 0 6 6l4-4"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.3"
        strokeLinecap="round"
      />
    </svg>
  );
}

function Receipt({ small }: { small?: boolean }) {
  return (
    <span className={`receipt${small ? " receipt--sm" : ""}`}>
      <b>KOPI PAGI</b>
      <i />
      <i />
      <i />
      <i className="short" />
      <em>79.200</em>
    </span>
  );
}
