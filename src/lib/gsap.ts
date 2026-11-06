import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { ScrollSmoother } from "gsap/ScrollSmoother";
import { SplitText } from "gsap/SplitText";
import { CustomEase } from "gsap/CustomEase";
import { useGSAP } from "@gsap/react";

gsap.registerPlugin(ScrollTrigger, ScrollSmoother, SplitText, CustomEase, useGSAP);

// House eases — used everywhere so motion feels like one system.
CustomEase.create("pip.out", "0.16, 1, 0.3, 1"); // long, soft landing
CustomEase.create("pip.inOut", "0.76, 0, 0.24, 1"); // curtain / wipe
CustomEase.create("pip.pop", "0.34, 1.56, 0.64, 1"); // overshoot

gsap.defaults({ ease: "pip.out", duration: 1 });

export const reducedMotion =
  typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches;

export const isTouch =
  typeof window !== "undefined" && window.matchMedia("(hover: none), (pointer: coarse)").matches;

/** Scroll to an element, going through ScrollSmoother when it is active. */
export function scrollToTarget(selector: string) {
  const smoother = ScrollSmoother.get();
  if (smoother) smoother.scrollTo(selector, true, "top top");
  else document.querySelector(selector)?.scrollIntoView({ behavior: reducedMotion ? "auto" : "smooth" });
}

export { gsap, ScrollTrigger, ScrollSmoother, SplitText, useGSAP };

if (import.meta.env.DEV && typeof window !== "undefined") {
  Object.assign(window, { __gsap: gsap, __ST: ScrollTrigger });
}
