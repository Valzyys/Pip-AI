import { useRef, useState } from "react";
import { gsap, useGSAP, ScrollSmoother, ScrollTrigger, SplitText, reducedMotion } from "./lib/gsap";
import { Preloader } from "./components/Preloader";
import { Cursor } from "./components/Cursor";
import { Nav } from "./components/Nav";
import { Hero } from "./components/Hero";
import { Announce, Marquee } from "./components/Marquee";
import { Manifesto } from "./components/Manifesto";
import { Features } from "./components/Features";
import { Demo } from "./components/Demo";
import { Numbers, Models, PixelWipe, Cta, Footer } from "./components/Sections";

export default function App() {
  const main = useRef<HTMLElement>(null);
  const [ready, setReady] = useState(false);
  const [loaderGone, setLoaderGone] = useState(false);

  // Buttery smooth scroll (GSAP ScrollSmoother). Paused while the preloader runs.
  useGSAP(() => {
    if (reducedMotion) return;
    const smoother = ScrollSmoother.create({
      wrapper: "#smooth-wrapper",
      content: "#smooth-content",
      smooth: 1.25,
      smoothTouch: 0.12,
      effects: true,
    });
    smoother.paused(true);
  });

  useGSAP(() => {
    if (!ready) return;
    ScrollSmoother.get()?.paused(false);
  }, [ready]);

  // Shared reveal choreography for every section heading + tag.
  useGSAP(
    () => {
      if (!ready || reducedMotion) return;
      document.fonts?.ready.then(() => {
        gsap.utils.toArray<HTMLElement>(".js-split").forEach((el) => {
          SplitText.create(el, {
            type: "lines,words",
            mask: "lines",
            autoSplit: true,
            onSplit: (self) =>
              gsap.from(self.words, {
                yPercent: 110,
                rotate: 3,
                duration: 1.1,
                stagger: 0.04,
                scrollTrigger: { trigger: el, start: "top 85%" },
              }),
          });
        });
        gsap.utils.toArray<HTMLElement>(".section-tag").forEach((el) => {
          gsap.from(el, {
            clipPath: "inset(0 100% 0 0)",
            duration: 0.9,
            ease: "steps(10)",
            scrollTrigger: { trigger: el, start: "top 90%" },
          });
        });
        ScrollTrigger.refresh();
      });
    },
    { scope: main, dependencies: [ready] },
  );

  return (
    <>
      {!loaderGone && <Preloader onReveal={() => setReady(true)} onDone={() => setLoaderGone(true)} />}
      <Cursor />
      <Nav ready={ready} />
      <div id="smooth-wrapper">
        <div id="smooth-content">
          <main id="top" ref={main}>
            <Hero ready={ready} />
            <Announce />
            <Marquee />
            <Manifesto />
            <Features />
            <Demo />
            <Numbers />
            <Models />
            <PixelWipe />
            <Cta />
            <Footer />
          </main>
        </div>
      </div>
    </>
  );
}
