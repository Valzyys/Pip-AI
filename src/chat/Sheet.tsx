import { useEffect, useRef, type ReactNode } from "react";
import { createPortal } from "react-dom";
import { gsap, reducedMotion } from "../lib/gsap";

/**
 * iOS-style bottom sheet: springs up, dims the page, drag the grabber (or the sheet) down to
 * dismiss — a fast flick or a long drag closes it, otherwise it springs back.
 */
export function Sheet({ open, onClose, title, children, tall }: { open: boolean; onClose: () => void; title?: string; children: ReactNode; tall?: boolean }) {
  const sheet = useRef<HTMLDivElement>(null);
  const scrim = useRef<HTMLDivElement>(null);
  const visible = useRef(false);

  useEffect(() => {
    const el = sheet.current;
    const bg = scrim.current;
    if (!el || !bg) return;
    if (open) {
      visible.current = true;
      gsap.set([el, bg], { display: "block" });
      gsap.fromTo(bg, { opacity: 0 }, { opacity: 1, duration: 0.3, ease: "power2.out" });
      gsap.fromTo(el, { yPercent: 100 }, { yPercent: 0, duration: reducedMotion ? 0 : 0.55, ease: "back.out(0.9)" });
    } else if (visible.current) {
      visible.current = false;
      gsap.to(bg, { opacity: 0, duration: 0.25 });
      gsap.to(el, {
        yPercent: 100,
        y: 0,
        duration: reducedMotion ? 0 : 0.35,
        ease: "power3.in",
        onComplete: () => void gsap.set([el, bg], { display: "none" }),
      });
    }
  }, [open]);

  // drag to dismiss
  useEffect(() => {
    const el = sheet.current;
    if (!el) return;
    let startY = 0;
    let lastY = 0;
    let lastT = 0;
    let vel = 0;
    let dragging = false;
    const down = (e: PointerEvent) => {
      const target = e.target as HTMLElement;
      const scroller = target.closest(".sheet__body") as HTMLElement | null;
      if (target.closest("button, input, textarea, a") && !target.closest(".sheet__grab")) return;
      if (scroller && scroller.scrollTop > 0) return;
      dragging = true;
      startY = lastY = e.clientY;
      lastT = performance.now();
      vel = 0;
      el.setPointerCapture(e.pointerId);
    };
    const move = (e: PointerEvent) => {
      if (!dragging) return;
      const dy = e.clientY - startY;
      const now = performance.now();
      vel = (e.clientY - lastY) / Math.max(1, now - lastT);
      lastY = e.clientY;
      lastT = now;
      // rubber-band when pulling up
      gsap.set(el, { y: dy > 0 ? dy : dy * 0.25 });
      if (scrim.current) gsap.set(scrim.current, { opacity: Math.max(0, 1 - dy / el.offsetHeight) });
    };
    const up = (e: PointerEvent) => {
      if (!dragging) return;
      dragging = false;
      const dy = e.clientY - startY;
      if (dy > el.offsetHeight * 0.3 || vel > 0.8) onClose();
      else {
        gsap.to(el, { y: 0, duration: 0.5, ease: "back.out(1.4)" });
        if (scrim.current) gsap.to(scrim.current, { opacity: 1, duration: 0.3 });
      }
    };
    el.addEventListener("pointerdown", down);
    el.addEventListener("pointermove", move);
    el.addEventListener("pointerup", up);
    el.addEventListener("pointercancel", up);
    return () => {
      el.removeEventListener("pointerdown", down);
      el.removeEventListener("pointermove", move);
      el.removeEventListener("pointerup", up);
      el.removeEventListener("pointercancel", up);
    };
  }, [onClose]);

  return createPortal(
    <div className="ios">
      <div className="sheet-scrim" ref={scrim} onClick={onClose} style={{ display: "none" }} />
      <div className={`sheet${tall ? " sheet--tall" : ""}`} ref={sheet} style={{ display: "none" }} role="dialog" aria-modal="true" aria-label={title}>
        <div className="sheet__grab">
          <i />
        </div>
        {title && (
          <div className="sheet__head">
            <b>{title}</b>
            <button className="sheet__done" onClick={onClose}>
              Selesai
            </button>
          </div>
        )}
        <div className="sheet__body">{children}</div>
      </div>
    </div>,
    document.body,
  );
}

export interface MenuItem {
  label: string;
  icon?: ReactNode;
  danger?: boolean;
  checked?: boolean;
  onSelect: () => void;
}

/**
 * iOS context menu: the page blurs, a preview lifts, and the menu pops out of it.
 * `anchor` is the rect of the element that was long-pressed / clicked.
 */
export function ContextMenu({
  anchor,
  preview,
  items,
  onClose,
  align = "left",
}: {
  anchor: DOMRect | null;
  preview?: ReactNode;
  items: MenuItem[];
  onClose: () => void;
  align?: "left" | "right";
}) {
  const root = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!anchor || !root.current || reducedMotion) return;
    const q = gsap.utils.selector(root);
    gsap.fromTo(q(".cmenu__scrim"), { opacity: 0 }, { opacity: 1, duration: 0.25 });
    gsap.fromTo(q(".cmenu__preview"), { scale: 0.92, opacity: 0.4 }, { scale: 1, opacity: 1, duration: 0.45, ease: "back.out(1.6)" });
    gsap.fromTo(
      q(".cmenu__list"),
      { scale: 0.6, opacity: 0, transformOrigin: align === "right" ? "100% 0%" : "0% 0%" },
      { scale: 1, opacity: 1, duration: 0.45, ease: "back.out(1.5)", delay: 0.04 },
    );
    const esc = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", esc);
    return () => window.removeEventListener("keydown", esc);
  }, [anchor, align, onClose]);

  if (!anchor) return null;
  const vw = window.innerWidth;
  const vh = window.innerHeight;
  const width = Math.min(260, vw - 24);
  const left = align === "right" ? Math.max(12, Math.min(anchor.right - width, vw - width - 12)) : Math.max(12, Math.min(anchor.left, vw - width - 12));
  const previewH = preview ? Math.min(anchor.height, 240) : 0;
  const menuH = items.length * 46 + 8;
  let top = anchor.top;
  if (top + previewH + menuH + 20 > vh - 12) top = Math.max(12, vh - 12 - previewH - menuH - 20);

  return createPortal(
    <div className="ios cmenu" ref={root}>
      <div className="cmenu__scrim" onClick={onClose} onContextMenu={(e) => (e.preventDefault(), onClose())} />
      <div className="cmenu__stack" style={{ top, left: align === "right" ? undefined : left, right: align === "right" ? vw - (left + width) : undefined, width: preview ? Math.max(width, Math.min(anchor.width, vw - 24)) : width }}>
        {preview && <div className="cmenu__preview">{preview}</div>}
        <ul className="cmenu__list" role="menu" style={{ width }}>
          {items.map((it) => (
            <li key={it.label}>
              <button
                role="menuitem"
                className={it.danger ? "is-danger" : ""}
                onClick={() => {
                  onClose();
                  it.onSelect();
                }}
              >
                <span className="cmenu__check">{it.checked ? "✓" : ""}</span>
                <span className="cmenu__label">{it.label}</span>
                {it.icon}
              </button>
            </li>
          ))}
        </ul>
      </div>
    </div>,
    document.body,
  );
}
