import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { ScrollSmoother } from "gsap/ScrollSmoother";
import { SplitText } from "gsap/SplitText";
import { CustomEase } from "gsap/CustomEase";
import { MotionPathPlugin } from "gsap/MotionPathPlugin";
import { useGSAP } from "@gsap/react";

gsap.registerPlugin(ScrollTrigger, ScrollSmoother, SplitText, CustomEase, MotionPathPlugin, useGSAP);

// House eases. Smooth ones for camera/scroll, stepped ones for anything "pixel" so it
// moves like a sprite on an 8-bit screen instead of a generic web fade.
CustomEase.create("pip.out", "0.16, 1, 0.3, 1");
CustomEase.create("pip.inOut", "0.76, 0, 0.24, 1");
CustomEase.create("pip.pop", "0.34, 1.56, 0.64, 1");

gsap.defaults({ ease: "pip.out", duration: 1 });

export const reducedMotion =
  typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches;

export const isTouch =
  typeof window !== "undefined" && window.matchMedia("(hover: none), (pointer: coarse)").matches;

export { gsap, ScrollTrigger, ScrollSmoother, SplitText, useGSAP };

if (import.meta.env.DEV && typeof window !== "undefined") {
  Object.assign(window, { __gsap: gsap, __ST: ScrollTrigger });
}
