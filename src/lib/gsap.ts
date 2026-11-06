import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { ScrollSmoother } from "gsap/ScrollSmoother";
import { SplitText } from "gsap/SplitText";
import { CustomEase } from "gsap/CustomEase";
import { MotionPathPlugin } from "gsap/MotionPathPlugin";
import { Flip } from "gsap/Flip";
import { useGSAP } from "@gsap/react";

gsap.registerPlugin(ScrollTrigger, ScrollSmoother, SplitText, CustomEase, MotionPathPlugin, Flip, useGSAP);

// House eases — used everywhere so motion feels like one system.
CustomEase.create("pip.out", "0.16, 1, 0.3, 1");
CustomEase.create("pip.inOut", "0.76, 0, 0.24, 1");
CustomEase.create("pip.pop", "0.34, 1.56, 0.64, 1");

gsap.defaults({ ease: "pip.out", duration: 1 });

// Motion is part of the product, so it always runs — even when the OS asks for reduced motion
// (Windows "Animation effects" off, macOS "Reduce motion", battery saver). Kept as a flag so the
// guards stay in place if this is ever made opt-out.
export const reducedMotion = false as boolean;

export const isTouch =
  typeof window !== "undefined" && window.matchMedia("(hover: none) and (pointer: coarse)").matches;

export { gsap, ScrollTrigger, ScrollSmoother, SplitText, Flip, useGSAP };

if (import.meta.env.DEV && typeof window !== "undefined") {
  Object.assign(window, { __gsap: gsap, __ST: ScrollTrigger });
}
