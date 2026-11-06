import { useRef } from "react";
import { gsap, useGSAP, reducedMotion } from "../lib/gsap";
import { Sprite } from "../components/Sprite";
import { PipAvatar } from "../components/PipAvatar";
import { transitionTo } from "../components/PixelTransition";

export function Nest() {
  const root = useRef<HTMLElement>(null);

  useGSAP(
    () => {
      if (reducedMotion) return;
      const tl = gsap.timeline({
        defaults: { ease: "none" },
        scrollTrigger: { trigger: ".burrow", start: "top 75%", end: "center 45%", scrub: 0.6 },
      });
      tl.to(".door--l", { xPercent: -100, ease: "steps(8)" }, 0)
        .to(".door--r", { xPercent: 100, ease: "steps(8)" }, 0)
        .fromTo(".burrow__light", { opacity: 0 }, { opacity: 1 }, 0.2)
        .fromTo(".nest__title .ln", { yPercent: 105 }, { yPercent: 0, stagger: 0.15, ease: "steps(6)" }, 0.1);

      gsap.from(".nest__cta", {
        scale: 0,
        duration: 0.5,
        ease: "steps(5)",
        scrollTrigger: { trigger: ".nest__cta", start: "top 92%" },
      });
      // CRT screen lines scroll endlessly
      gsap.to(".mini__crt-lines", { yPercent: -50, duration: 3, ease: "steps(12)", repeat: -1 });
    },
    { scope: root },
  );

  return (
    <section className="nest" id="nest" ref={root}>
      <div className="nest__head">
        <p className="px-label">kedalaman −99m · sampai</p>
        <h2 className="nest__title">
          <span className="mask">
            <span className="ln">Masuk ke</span>
          </span>
          <span className="mask">
            <span className="ln">kamar Pip.</span>
          </span>
        </h2>
      </div>

      <div className="burrow">
        <div className="burrow__room mini">
          <div className="mini__window">
            <Sprite name="moon" className="mini__moon" />
          </div>
          <div className="mini__shelf">
            {["#FF5FA2", "#4AA8FF", "#FFC93C", "#C6F432", "#F6EEDC", "#FF7A1A"].map((c, i) => (
              <i key={i} style={{ background: c, height: `${60 + ((i * 23) % 40)}%` }} />
            ))}
          </div>
          <div className="mini__lamp" />
          <div className="mini__desk">
            <div className="mini__crt">
              <div className="mini__crt-screen">
                <div className="mini__crt-lines">
                  {Array.from({ length: 16 }, (_, i) => (
                    <i key={i} style={{ width: `${30 + ((i * 37) % 60)}%` }} />
                  ))}
                </div>
              </div>
            </div>
            <div className="mini__perch">
              <PipAvatar face="talk" hat="headphones" className="mini__pip" />
              <Sprite name="nest" className="mini__nest" />
            </div>
          </div>
          <Sprite name="plant" className="mini__plant" />
        </div>
        <div className="burrow__light" aria-hidden="true" />
        <div className="door door--l" aria-hidden="true">
          <i />
        </div>
        <div className="door door--r" aria-hidden="true">
          <i />
        </div>
        <span className="burrow__sign">BUKA</span>
      </div>

      <button className="btn-px btn-px--xl nest__cta" onClick={() => transitionTo("/room")}>
        ▶ Masuk sekarang
      </button>

      <footer className="foot">
        <div className="foot__rock" aria-hidden="true" />
        <div className="foot__row">
          <span>Pip · asisten dari JKT48Connect</span>
          <span className="px-label">backend Mistral · disajikan dari Cloudflare Workers</span>
          <span>© 2026</span>
        </div>
      </footer>
    </section>
  );
}
