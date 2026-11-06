import { useGSAP, ScrollSmoother, ScrollTrigger, SplitText, gsap, reducedMotion } from "../lib/gsap";
import { Nav, Hero, Announce } from "./Top";
import { Showcase } from "./Showcase";
import { Capabilities, Profiles, Developers, Wall, Footer } from "./Sections";
import "../styles/site.css";

export function Site() {
  useGSAP(() => {
    if (reducedMotion) return;
    const smoother = ScrollSmoother.create({
      wrapper: "#smooth-wrapper",
      content: "#smooth-content",
      smooth: 1.15,
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
            gsap.from(self.lines, {
              yPercent: 105,
              duration: 1.1,
              stagger: 0.08,
              scrollTrigger: { trigger: el, start: "top 88%" },
            }),
        });
      });
      gsap.utils.toArray<HTMLElement>(".sec-head .label, .showcase__copy .label, .devs__copy .label").forEach((el) =>
        gsap.from(el, { autoAlpha: 0, x: -12, duration: 0.8, scrollTrigger: { trigger: el, start: "top 90%" } }),
      );
      ScrollTrigger.refresh();
    });

    return () => smoother.kill();
  });

  return (
    <>
      <Nav />
      <div id="smooth-wrapper">
        <div id="smooth-content">
          <main className="site">
            <Hero />
            <Announce />
            <Showcase />
            <Capabilities />
            <Profiles />
            <Developers />
            <Wall />
            <Footer />
          </main>
        </div>
      </div>
    </>
  );
}
