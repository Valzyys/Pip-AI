import { useState } from "react";
import { useGSAP, ScrollSmoother, ScrollTrigger, reducedMotion } from "../lib/gsap";
import { Preloader } from "../components/Preloader";
import { TopBar, Altimeter } from "./Chrome";
import { Sky } from "./Sky";
import { Fall } from "./Fall";
import { City } from "./City";
import { Under } from "./Under";
import { Nest } from "./Nest";
import "../styles/landing.css";

let seenIntro = false;

/** The landing page is one continuous fall: sky → clouds → city → underground → nest. */
export function Landing() {
  const [ready, setReady] = useState(seenIntro);
  const [loaderGone, setLoaderGone] = useState(seenIntro);

  useGSAP(() => {
    if (reducedMotion) return;
    const smoother = ScrollSmoother.create({
      wrapper: "#smooth-wrapper",
      content: "#smooth-content",
      smooth: 1.1,
      smoothTouch: 0.1,
      effects: true,
    });
    smoother.paused(!seenIntro);
    return () => smoother.kill();
  });

  useGSAP(() => {
    if (!ready) return;
    seenIntro = true;
    ScrollSmoother.get()?.paused(false);
    document.fonts?.ready.then(() => ScrollTrigger.refresh());
  }, [ready]);

  return (
    <>
      {!loaderGone && <Preloader onReveal={() => setReady(true)} onDone={() => setLoaderGone(true)} />}
      <TopBar ready={ready} />
      <Altimeter />
      <div id="smooth-wrapper">
        <div id="smooth-content">
          <main className="land">
            <Sky ready={ready} />
            <Fall />
            <City />
            <Under />
            <Nest />
          </main>
        </div>
      </div>
    </>
  );
}
