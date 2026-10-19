"use client";

import Image from "next/image";
import {
  useEffect,
  useState,
  type AnimationEvent,
  type CSSProperties,
} from "react";

/*
 * Scene artwork. When an image changes, update its `src` and re-fit `look`:
 * Tailwind classes that grade the backdrop images, and place and grade the
 * camp layers. The grading only darkens the current generated art; polished
 * assets may need none.
 *
 * Camp layers sit on a 640×340 artboard (x from its left edge, y up from the
 * ground line). --fire-x, set on the artboard below, is the centre of the
 * fire: the logs, flame, light and embers centre on it, and the artboard is
 * placed so the fire sits at the centre of the screen.
 */
const art = {
  sky: {
    src: "/images/night-sky.png",
    sizes: "100vw",
    look: "object-cover object-top opacity-80",
  },
  forest: {
    src: "/images/forest.png",
    sizes: "100vw",
    look: "object-fill brightness-70",
  },
  character: {
    src: "/images/character.png",
    sizes: "360px",
    look: "bottom-0 left-4 h-75 w-90 brightness-85 saturate-80",
  },
  logs: {
    src: "/images/logs.png",
    sizes: "180px",
    look: "bottom-[-5px] left-(--fire-x) h-30 w-45 -translate-x-1/2 brightness-85",
  },
  flame: {
    src: "/images/flame.png",
    sizes: "100px",
    // Pivots where the flame meets the logs.
    look: "bottom-11 left-(--fire-x) h-31.25 w-22 -translate-x-1/2 origin-[50%_95%]",
  },
  foreground: {
    src: "/images/foreground.png",
    sizes: "100vw",
    look: "object-fill brightness-65",
  },
};
type ArtId = keyof typeof art;
const artCount = Object.keys(art).length;

// The intro waits for the art, but not forever if a request stalls.
const assetTimeout = 4000;
const visitKey = "fireside-visited";

export function CampfireScene({ lit = false }: { lit?: boolean }) {
  const [loaded, setLoaded] = useState<ReadonlySet<ArtId>>(() => new Set());
  const [timedOut, setTimedOut] = useState(false);
  const [introDone, setIntroDone] = useState(lit);
  const assetsReady = timedOut || loaded.size === artCount;

  // Once lit, the camp stays lit: returning home must not replay the intro.
  if (lit && !introDone) setIntroDone(true);

  useEffect(() => {
    let seen = false;
    try {
      seen = sessionStorage.getItem(visitKey) === "yes";
    } catch {
      /* Visit memory is optional. */
    }
    const frame = requestAnimationFrame(() => {
      if (seen) setIntroDone(true);
    });
    const timer = window.setTimeout(() => setTimedOut(true), assetTimeout);
    return () => {
      cancelAnimationFrame(frame);
      clearTimeout(timer);
    };
  }, []);

  function markLoaded(id: ArtId) {
    setLoaded((previous) =>
      previous.has(id) ? previous : new Set(previous).add(id),
    );
  }

  function finishIntro(event: AnimationEvent<HTMLDivElement>) {
    // The intro is over once no finite animation is left in the scene.
    const playing = event.currentTarget
      .getAnimations({ subtree: true })
      .some(
        (animation) =>
          animation instanceof CSSAnimation &&
          animation.playState !== "finished" &&
          animation.effect?.getTiming().iterations !== Infinity,
      );
    if (playing) return;
    setIntroDone(true);
    try {
      sessionStorage.setItem(visitKey, "yes");
    } catch {
      /* Visit memory is optional. */
    }
  }

  // Intro reveals hold while the art loads and are dropped once done; each
  // animates from darkness to the layer's own resting style.
  function intro(animation: string) {
    if (introDone) return "";
    return assetsReady
      ? animation
      : `${animation} [animation-play-state:paused]`;
  }

  const image = (id: ArtId, className: string) => (
    <Image
      src={art[id].src}
      alt=""
      fill
      preload
      sizes={art[id].sizes}
      className={className}
      onLoad={() => markLoaded(id)}
      onError={() => markLoaded(id)}
    />
  );

  return (
    <div
      className="pointer-events-none absolute inset-0 -z-1 overflow-hidden"
      aria-hidden="true"
      onAnimationEnd={introDone ? undefined : finishIntro}
    >
      <div className="absolute inset-0">{image("sky", art.sky.look)}</div>
      <div className="absolute inset-0">
        {Array.from({ length: 24 }, (_, i) => (
          <i
            key={i}
            className="absolute top-(--y) left-(--x) size-0.5 animate-twinkle rounded-full bg-[#d3dbd7] opacity-35"
            style={
              {
                "--x": `${(i * 37 + 13) % 97}%`,
                "--y": `${(i * 19 + 4) % 27}%`,
                "--delay": `${(i % 7) * -0.7}s`,
              } as CSSProperties
            }
          />
        ))}
      </div>
      <div className="absolute inset-[0_-2%_-2%] transition-[inset] duration-1350 ease-morph max-md:inset-x-[-45%] phone:inset-[0_-45%_-2%]">
        {image("forest", art.forest.look)}
      </div>
      <div className="absolute inset-[30%_0_0] bg-[linear-gradient(transparent,rgba(4,9,12,0.15)_50%,#080e12_100%)]" />
      <div
        className={`absolute bottom-[8%] left-1/2 h-40 w-175 -translate-x-1/2 bg-[radial-gradient(ellipse,#ab713521_0%,#ad713013_25%,transparent_70%)] transition-[width,bottom] duration-1350 ease-morph max-md:bottom-[10%] max-md:w-120 phone:bottom-[12%] phone:w-82.5 ${intro("animate-ground-reveal")}`}
      />
      <div className="absolute bottom-[10%] left-1/2 h-85 w-160 origin-[var(--fire-x)_100%] -translate-x-(--fire-x) transition-[bottom,scale] duration-1350 ease-morph [--fire-x:425px] max-md:bottom-[calc(7%+41px)] max-md:scale-75 max-xs:bottom-[calc(7%+58px)] max-xs:scale-65 3xl:bottom-[calc(11%-20px)] 3xl:scale-112 short:bottom-[calc(-12%+85px)] short:scale-50 phone:bottom-[calc(13%+78px)] phone:scale-54">
        <div
          className={`absolute ${art.character.look} ${intro("animate-character-reveal")}`}
        >
          {image("character", "object-contain")}
        </div>
        <div
          className={`absolute bottom-[-33px] left-(--fire-x) h-60 w-87.5 -translate-x-1/2 bg-[radial-gradient(ellipse,#ff952a25_0%,#fa882310_36%,transparent_70%)] mix-blend-screen ${intro("animate-firelight-reveal")}`}
        />
        <div
          className={`absolute ${art.logs.look} ${intro("animate-logs-reveal")}`}
        >
          {image("logs", "object-contain")}
        </div>
        <div
          className={`absolute ${art.flame.look} ${intro("animate-ignite")}`}
        >
          <div className="absolute inset-0 origin-[inherit] animate-flame-dance drop-shadow-[0_0_14px_#ff961b69]">
            {image("flame", "object-contain")}
          </div>
        </div>
        <div
          className={`absolute bottom-16.25 left-(--fire-x) size-px -translate-x-1/2 ${intro("animate-embers-reveal")}`}
        >
          {Array.from({ length: 12 }, (_, i) => (
            <i
              key={i}
              className="absolute h-0.75 w-0.5 animate-ember-rise rounded-full bg-[#ffc88d] opacity-0 shadow-[0_0_6px_#eb8d49]"
              style={
                {
                  "--drift": `${(i % 2 ? 1 : -1) * (15 + i * 4)}px`,
                  "--delay": `${i * 0.47}s`,
                  "--duration": `${2.8 + (i % 4) * 0.5}s`,
                } as CSSProperties
              }
            />
          ))}
        </div>
      </div>
      <div className="absolute inset-[-2%_-2%_-5%] transition-[inset] duration-1350 ease-morph max-md:inset-x-[-32%] phone:inset-[-2%_-30%_-5%]">
        {image("foreground", art.foreground.look)}
      </div>
      <div className="absolute inset-0 bg-[linear-gradient(#03080d26,transparent_25%,transparent_84%,#090f12),radial-gradient(ellipse_at_50%_30%,transparent_20%,#0002_70%,#0005)]" />
    </div>
  );
}
