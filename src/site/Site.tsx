import { useEffect } from "react";
import { useGSAP, ScrollSmoother, ScrollTrigger, SplitText, gsap, reducedMotion } from "../lib/gsap";
import { Header } from "./Header";
import { Hero } from "./Hero";
import { Bands, Statement, Today, Modes, MemberWall } from "./Story";
import { Showcase } from "./Showcase";
import { Developers } from "./Developers";
import { Footer } from "./Footer";
import { useHome } from "./data";
import "../styles/site.css";
import "../styles/landing.css";

export function Site() {
  const data = useHome();

  useGSAP(() => {
    if (reducedMotion) return;
    const smoother = ScrollSmoother.create({
      wrapper: "#smooth-wrapper",
      content: "#smooth-content",
      smooth: 1.2,
      smoothTouch: 0.1,
      effects: true,
    });

    // shared heading reveal: lines rise out of a mask
    document.fonts?.ready.then(() => {
      gsap.utils.toArray<HTMLElement>(".js-lines").forEach((el) => {
        SplitText.create(el, {
          type: "lines",
          mask: "lines",
          autoSplit: true,
          onSplit: (self) =>
            gsap.from(self.lines, { yPercent: 105, duration: 1.1, stagger: 0.08, ease: "expo.out", scrollTrigger: { trigger: el, start: "top 88%" } }),
        });
      });
      ScrollTrigger.refresh();
    });
    return () => smoother.kill();
  });

  // sections that depend on live data rebuild their triggers when it lands; re-sort so pins stack in page order
  useEffect(() => {
    if (data === undefined) return;
    const id = setTimeout(() => {
      ScrollTrigger.sort();
      ScrollTrigger.refresh();
    }, 80);
    return () => clearTimeout(id);
  }, [data]);

  return (
    <>
      <Header data={data} />
      <div id="smooth-wrapper">
        <div id="smooth-content">
          <main className="site">
            <Hero data={data} />
            <Bands />
            <Statement data={data} />
            <Today data={data} />
            <Modes data={data} />
            <Showcase />
            <MemberWall data={data} />
            <Developers />
            <Footer data={data} />
          </main>
        </div>
      </div>
    </>
  );
}
