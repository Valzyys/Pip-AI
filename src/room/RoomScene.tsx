import { forwardRef, useImperativeHandle, useRef } from "react";
import { gsap, useGSAP, reducedMotion } from "../lib/gsap";
import { Sprite } from "../components/Sprite";
import { PipAvatar, type Face, type Hat } from "../components/PipAvatar";
import { PixelDisc } from "../landing/Sky";

export type TimeOfDay = "day" | "dusk" | "night";

export interface SceneHandle {
  /** element the paper plane flies to */
  target: () => HTMLElement | null;
  burst: (kind: "hearts" | "notes" | "stars") => void;
  poof: () => void;
}

interface Props {
  face: Face;
  hat: Hat;
  time: TimeOfDay;
  thinking: boolean;
  sleeping: boolean;
  leaning: boolean;
  onWindow: () => void;
  onPet: () => void;
}

const BOOKS = ["#FF5FA2", "#4AA8FF", "#FFC93C", "#C6F432", "#F6EEDC", "#FF7A1A", "#6B4FD8", "#3FE0A1"];

export const RoomScene = forwardRef<SceneHandle, Props>(function RoomScene(
  { face, hat, time, thinking, sleeping, leaning, onWindow, onPet },
  ref,
) {
  const root = useRef<HTMLDivElement>(null);

  const { contextSafe } = useGSAP(
    () => {
      if (reducedMotion) return;
      gsap.to(".sc__cloud", { x: "140%", duration: 40, ease: "none", repeat: -1, stagger: { each: 14, repeat: -1 } });
      gsap.to(".sc__crt-lines", { yPercent: -50, duration: 4, ease: "steps(16)", repeat: -1 });
      gsap.to(".sc__plant", { rotation: 2, duration: 2.4, ease: "sine.inOut", yoyo: true, repeat: -1, transformOrigin: "50% 100%" });
      // lights come on when you enter
      gsap.from(".sc__lamp-glow, .sc__crt-screen", { opacity: 0, duration: 0.6, ease: "steps(4)", delay: 0.5 });
      gsap.from(".sc__pip-wrap", { y: "-120%", duration: 0.7, ease: "bounce.out", delay: 0.3 });
    },
    { scope: root },
  );

  // body language
  useGSAP(
    () => {
      if (reducedMotion) return;
      gsap.to(".sc__pip-lean", { rotation: leaning ? 9 : 0, x: leaning ? 6 : 0, duration: 0.3, ease: "steps(3)" });
    },
    { scope: root, dependencies: [leaning] },
  );

  const spawn = contextSafe((kind: "hearts" | "notes" | "stars") => {
    const host = root.current?.querySelector<HTMLElement>(".sc__fx");
    if (!host || reducedMotion) return;
    const n = kind === "stars" ? 5 : 6;
    for (let i = 0; i < n; i++) {
      const el = document.createElement("div");
      el.className = `fx fx--${kind}`;
      host.appendChild(el);
      if (kind === "stars") {
        // orbit the head
        gsap.fromTo(
          el,
          { rotation: (360 / n) * i },
          { rotation: `+=${360 * 3}`, duration: 2.4, ease: "none", onComplete: () => el.remove() },
        );
      } else {
        gsap.fromTo(
          el,
          { x: 0, y: 0, scale: 0 },
          {
            x: gsap.utils.random(-90, 90),
            y: gsap.utils.random(-160, -80),
            scale: gsap.utils.random(0.8, 1.3),
            duration: 1.1,
            ease: "steps(8)",
            delay: i * 0.05,
            onComplete: () => {
              gsap.to(el, { autoAlpha: 0, duration: 0.2, ease: "steps(2)", onComplete: () => el.remove() });
            },
          },
        );
      }
    }
  });

  const poof = contextSafe(() => {
    if (reducedMotion) return;
    gsap.fromTo(".sc__poof i", { scale: 0, x: 0, y: 0, autoAlpha: 1 }, {
      scale: () => gsap.utils.random(0.8, 1.6),
      x: () => gsap.utils.random(-50, 50),
      y: () => gsap.utils.random(-50, 20),
      autoAlpha: 0,
      duration: 0.6,
      ease: "steps(5)",
      stagger: 0.02,
    });
    gsap.fromTo(".sc__pip-wrap", { scaleY: 0.7, scaleX: 1.2 }, { scaleY: 1, scaleX: 1, duration: 0.5, ease: "elastic.out(1, 0.4)" });
  });

  useImperativeHandle(ref, () => ({
    target: () => root.current?.querySelector<HTMLElement>(".sc__pip-wrap") ?? null,
    burst: spawn,
    poof,
  }));

  return (
    <div className="sc" ref={root} data-time={time} data-thinking={thinking || undefined} data-sleeping={sleeping || undefined}>
      <div className="sc__wall" />
      <button className="sc__window" onClick={onWindow} aria-label="Ganti waktu (siang / senja / malam)">
        <span className="sc__sky" />
        <span className="sc__stars">
          {Array.from({ length: 14 }, (_, i) => (
            <i key={i} style={{ left: `${(i * 29.7) % 100}%`, top: `${(i * 41.3) % 80}%`, animationDelay: `${i * 0.3}s` }} />
          ))}
        </span>
        <PixelDisc r={9} color="#FFD36B" className="sc__sun" />
        <Sprite name="moon" className="sc__moon" />
        <Sprite name="cloud" className="sc__cloud" />
        <Sprite name="cloud" className="sc__cloud sc__cloud--2" />
        <span className="sc__frame" />
      </button>

      <div className="sc__poster">
        <span>PIP</span>
        <Sprite name="pipHead" />
      </div>

      <div className="sc__shelf">
        {BOOKS.map((c, i) => (
          <i key={i} style={{ background: c, height: `${55 + ((i * 29) % 45)}%` }} />
        ))}
      </div>

      <div className="sc__lamp">
        <span className="sc__lamp-shade" />
        <span className="sc__lamp-glow" />
      </div>

      <div className="sc__floor" />
      <div className="sc__rug" />
      <Sprite name="plant" className="sc__plant" />

      <div className="sc__desk">
        <div className="sc__crt">
          <div className="sc__crt-screen">
            <div className="sc__crt-lines">
              {Array.from({ length: 20 }, (_, i) => (
                <i key={i} style={{ width: `${25 + ((i * 37) % 65)}%` }} />
              ))}
            </div>
          </div>
        </div>
        <div className="sc__perch">
          <div className="sc__pip-wrap">
            <div className="sc__pip-lean">
              <button className="sc__pip" onClick={onPet} aria-label="Elus Pip">
                <PipAvatar face={sleeping ? "think" : face} hat={hat} />
              </button>
            </div>
            <div className="sc__think" aria-hidden="true">
              <i />
              <i />
              <span>
                <b />
                <b />
                <b />
              </span>
            </div>
            <div className="sc__zzz" aria-hidden="true">
              <i>z</i>
              <i>z</i>
              <i>Z</i>
            </div>
            <div className="sc__poof" aria-hidden="true">
              {Array.from({ length: 8 }, (_, i) => (
                <i key={i} />
              ))}
            </div>
            <div className="sc__fx" aria-hidden="true" />
          </div>
          <Sprite name="nest" className="sc__nest" />
        </div>
        <div className="sc__desk-top" />
        <div className="sc__desk-legs">
          <i />
          <i />
        </div>
      </div>
    </div>
  );
});
