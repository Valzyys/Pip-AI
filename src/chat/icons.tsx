/** Minimal line icons in an iOS (SF Symbols-like) style. 24×24, stroke = currentColor. */
const P = {
  back: "M15 5l-7 7 7 7",
  compose: "M4 20h4L19 9l-4-4L4 16v4zM14 6l4 4",
  more: "M5 12h.01M12 12h.01M19 12h.01",
  plus: "M12 5v14M5 12h14",
  up: "M12 19V5M6 11l6-6 6 6",
  stop: "",
  home: "M4 11l8-7 8 7v9h-5v-6H9v6H4z",
  search: "M11 18a7 7 0 1 1 0-14 7 7 0 0 1 0 14zM20 20l-4-4",
  chevron: "M9 5l7 7-7 7",
  photo: "M4 6h16v12H4zM4 15l4-4 4 4 3-3 5 5M15 9.5h.01",
  camera: "M4 8h3l2-2h6l2 2h3v11H4zM12 17a3.5 3.5 0 1 0 0-7 3.5 3.5 0 0 0 0 7z",
  file: "M7 3h7l4 4v14H7zM14 3v4h4",
  calendar: "M5 6h14v14H5zM5 10h14M9 3v4M15 3v4",
  person: "M12 12a4 4 0 1 0 0-8 4 4 0 0 0 0 8zM4 21a8 8 0 0 1 16 0",
  people: "M9 11a3.5 3.5 0 1 0 0-7 3.5 3.5 0 0 0 0 7zM2.5 20a6.5 6.5 0 0 1 13 0M16 4.5a3.5 3.5 0 0 1 0 6.5M18 14a6 6 0 0 1 3.5 6",
  gift: "M4 10h16v4H4zM6 14v7h12v-7M12 10v11M12 10c-2-5-6-4-6-2s3 2 6 2zm0 0c2-5 6-4 6-2s-3 2-6 2z",
  news: "M5 4h11v16H6a1 1 0 0 1-1-1zM16 8h3v11a1 1 0 0 1-2 0V8M8 8h5M8 12h5M8 16h3",
  live: "M12 14a2 2 0 1 0 0-4 2 2 0 0 0 0 4zM8.5 15.5a5 5 0 0 1 0-7M15.5 8.5a5 5 0 0 1 0 7M5.6 18.4a9 9 0 0 1 0-12.8M18.4 5.6a9 9 0 0 1 0 12.8",
  music: "M9 18V6l11-2v12M9 18a3 3 0 1 1-6 0 3 3 0 0 1 6 0zM20 16a3 3 0 1 1-6 0 3 3 0 0 1 6 0z",
  sparkles: "M12 3l1.8 4.7L18.5 9.5l-4.7 1.8L12 16l-1.8-4.7L5.5 9.5l4.7-1.8zM19 15l.8 2.2L22 18l-2.2.8L19 21l-.8-2.2L16 18l2.2-.8z",
  app: "M4 4h7v7H4zM13 4h7v7h-7zM4 13h7v7H4zM13 13h7v7h-7z",
  sun: "M12 16a4 4 0 1 0 0-8 4 4 0 0 0 0 8zM12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4",
  copy: "M8 8h11v12H8zM5 16V4h11",
  retry: "M4 12a8 8 0 1 0 2.3-5.7M4 4v5h5",
  trash: "M5 7h14M10 11v6M14 11v6M6 7l1 13h10l1-13M9 7V4h6v3",
  check: "M5 12.5l4.5 4.5L19 7",
  close: "M6 6l12 12M18 6L6 18",
  expand: "M14 4h6v6M10 20H4v-6M20 4l-7 7M4 20l7-7",
  link: "M10 14a4 4 0 0 0 5.7 0l3-3a4 4 0 0 0-5.7-5.7l-1 1M14 10a4 4 0 0 0-5.7 0l-3 3a4 4 0 0 0 5.7 5.7l1-1",
  ticket: "M3 8a2 2 0 0 0 0 4v4h18v-4a2 2 0 0 1 0-4V4H3zM14 4v16",
  play: "M8 5l11 7-11 7z",
  clock: "M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18zM12 7v5l3 2",
  eye: "M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7S2 12 2 12zM12 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6z",
  calc: "M6 3h12v18H6zM9 7h6M9 12h.01M12 12h.01M15 12h.01M9 16h.01M12 16h.01M15 16h.01",
  docs: "M4 5a2 2 0 0 1 2-2h12v16H6a2 2 0 0 0-2 2zM4 19a2 2 0 0 1 2-2h12",
  code: "M9 8l-5 4 5 4M15 8l5 4-5 4",
} as const;

export type IconName = keyof typeof P;

export function Icon({ name, size = 22, className, stroke = 1.8 }: { name: IconName; size?: number; className?: string; stroke?: number }) {
  if (name === "stop")
    return (
      <svg width={size} height={size} viewBox="0 0 24 24" className={className} aria-hidden="true">
        <rect x="7" y="7" width="10" height="10" rx="2" fill="currentColor" />
      </svg>
    );
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      className={className}
      fill="none"
      stroke="currentColor"
      strokeWidth={name === "more" ? 3.2 : stroke}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d={P[name]} />
    </svg>
  );
}
