import { ScrollSmoother } from "../lib/gsap";

export function scrollTo(hash: string) {
  const s = ScrollSmoother.get();
  if (s) s.scrollTo(hash, true, "top 80px");
  else document.querySelector(hash)?.scrollIntoView({ behavior: "smooth" });
}

export function Arrow({ className }: { className?: string }) {
  return (
    <svg className={`arrow${className ? ` ${className}` : ""}`} viewBox="0 0 10 10" aria-hidden="true">
      <path d="M1 5h7M5 1.5 8.5 5 5 8.5" fill="none" stroke="currentColor" strokeWidth="1.4" />
    </svg>
  );
}
