import { useRef } from "react";
import { gsap, useGSAP, SplitText, reducedMotion } from "../lib/gsap";
import { Sprite } from "./Sprite";

/** Words light up one by one as you scroll — tied 1:1 to the scrollbar. */
export function Manifesto() {
  const root = useRef<HTMLElement>(null);

  useGSAP(
    () => {
      if (reducedMotion) return;
      // autoSplit re-splits once webfonts load / on resize; onSplit returns the animation so it's rebuilt too.
      SplitText.create(".manifesto__text", {
        type: "words",
        wordsClass: "w",
        autoSplit: true,
        onSplit: (self) =>
          gsap
            .timeline({
              scrollTrigger: { trigger: ".manifesto__text", start: "top 80%", end: "bottom 45%", scrub: 0.5 },
            })
            .fromTo(self.words, { opacity: 0.12 }, { opacity: 1, stagger: 0.1, ease: "none" })
            .fromTo(
              ".manifesto__hl",
              { backgroundSize: "0% 0.82em" },
              { backgroundSize: "100% 0.82em", stagger: 0.4, ease: "none" },
              0.3,
            ),
      });

      gsap.fromTo(
        ".manifesto__pip",
        { x: "-20vw", rotate: -20 },
        {
          x: "110vw",
          rotate: 20,
          ease: "none",
          scrollTrigger: { trigger: root.current, start: "top bottom", end: "bottom top", scrub: 1 },
        },
      );
      gsap.to(".manifesto__pip .sprite", { y: -14, duration: 0.25, repeat: -1, yoyo: true, ease: "power1.out" });
    },
    { scope: root },
  );

  return (
    <section className="manifesto" ref={root}>
      <p className="pixel-tag section-tag">[ 00 ] why pip</p>
      <p className="manifesto__text">
        We think an assistant should <span className="manifesto__hl">speak the APIs you already use</span>, answer
        the moment you ask, and <span className="manifesto__hl">know your docs by heart</span>. So we built a small bird
        that lands in any stack — and still out-thinks the flock.
      </p>
      <div className="manifesto__pip" aria-hidden="true">
        <Sprite name="pip" />
      </div>
    </section>
  );
}
