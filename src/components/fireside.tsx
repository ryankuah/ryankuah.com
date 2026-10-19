"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  useEffect,
  useRef,
  useState,
  type AnimationEvent,
  type MouseEvent,
} from "react";
import {
  getPlatformProjects,
  platforms,
  type PlatformId,
} from "@/data/platforms";
import { CampfireScene } from "./campfire-scene";
import { Icon } from "./portfolio-icons";
import { PlatformSurface } from "./platform-surfaces";
import { isPlainClick } from "@/lib/navigation";

// Each entrance plays out in CSS; navigation waits for its final animation.
const finales: Record<PlatformId, string> = {
  web: "address-veil",
  mobile: "phone-interface-arrive",
  desktop: "unlock-veil",
};

const platformLink =
  "whitespace-nowrap underline decoration-current/40 decoration-1 underline-offset-5 transition-[text-decoration-color,filter] duration-200 hover:decoration-current hover:brightness-120";
const platformIcon =
  "mr-[0.28em] inline-block size-[0.9em] stroke-[1.6] align-[-0.14em]";

export function Fireside() {
  const pathname = usePathname();
  const router = useRouter();
  const slug = pathname.slice(1);
  const platform = slug in platforms ? (slug as PlatformId) : undefined;
  const [transition, setTransition] = useState<PlatformId | null>(null);
  const origin = useRef<HTMLAnchorElement | null>(null);
  const root = useRef<HTMLDivElement>(null);
  const mode = transition === "mobile" ? "mobile" : (platform ?? "home");
  const visiblePlatform =
    platform ?? (transition === "mobile" ? "mobile" : undefined);

  // The welcome stays inert until the cancelled transition re-renders, so
  // focus returns to the link a frame later.
  function cancelTransition() {
    setTransition(null);
    requestAnimationFrame(() => origin.current?.focus({ preventScroll: true }));
  }

  useEffect(() => {
    const frame = requestAnimationFrame(() => {
      setTransition(null);
      root.current
        ?.querySelector<HTMLElement>("[data-view-heading]")
        ?.focus({ preventScroll: true });
    });
    return () => cancelAnimationFrame(frame);
  }, [pathname]);

  useEffect(() => {
    if (!transition) return;
    function escape(event: KeyboardEvent) {
      if (event.key !== "Escape") return;
      setTransition(null);
      requestAnimationFrame(() =>
        origin.current?.focus({ preventScroll: true }),
      );
    }
    window.addEventListener("keydown", escape);
    return () => window.removeEventListener("keydown", escape);
  }, [transition]);

  function enter(event: MouseEvent<HTMLAnchorElement>, target: PlatformId) {
    if (!isPlainClick(event)) return;
    event.preventDefault();
    if (transition) return;
    origin.current = event.currentTarget;
    router.prefetch(`/${target}`);
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      router.push(`/${target}`);
      return;
    }
    setTransition(target);
  }

  function finishEntrance(event: AnimationEvent) {
    if (transition && event.animationName === finales[transition]) {
      router.push(`/${transition}`);
    }
  }

  function goHome() {
    cancelTransition();
    router.push("/");
  }

  return (
    <div
      className="relative isolate h-svh w-full overflow-hidden bg-[#050b10]"
      data-mode={mode}
      data-transition={transition ?? undefined}
      ref={root}
      onAnimationEnd={finishEntrance}
    >
      {/* The scene's frame; in phone mode it shrinks into the handset. */}
      <div className="absolute top-1/2 left-1/2 isolate size-full -translate-1/2 overflow-hidden bg-[#071014] transition-[width,height,border-radius,box-shadow] duration-1350 ease-morph phone:h-phone-height phone:w-phone-width phone:rounded-[48px] phone:shadow-[0_0_0_3px_#647075,0_0_0_6px_#1c2228,0_24px_100px_#000b] phone:after:pointer-events-none phone:after:absolute phone:after:inset-0 phone:after:z-2 phone:after:rounded-[48px] phone:after:border-10 phone:after:border-[#0a0c10]">
        <CampfireScene lit={Boolean(platform || transition)} />
      </div>
      {mode !== "desktop" && mode !== "web" && (
        <header className="absolute inset-x-0 top-0 z-10 flex h-25 items-center justify-between px-[5%] transition-opacity duration-400 in-data-[transition]:opacity-35 max-md:h-20 max-md:px-[6%] short:h-15.5 md:short:in-data-[mode=web]:hidden phone:max-md:h-12 phone:max-md:items-start phone:max-md:pt-1 phone:max-md:text-[10px]">
          <Link
            className="flex items-center gap-3 py-2.5 text-[15px] font-medium tracking-[-0.4px] max-md:gap-2 max-md:text-[12px] max-xs:text-[11px] phone:max-md:py-1 phone:max-md:text-[10px]"
            href="/"
            aria-label="Ryan Kuah, home"
            onClick={(event) => {
              if (!isPlainClick(event)) return;
              event.preventDefault();
              goHome();
            }}
          >
            <Icon
              name="fire"
              className="h-6.75 w-6.25 text-amber phone:max-md:h-5 phone:max-md:w-4.5"
            />
            <span>
              Ryan Kuah<span className="text-amber">.</span>
            </span>
          </Link>
        </header>
      )}
      <main>
        {!platform && (
          <section
            className="absolute inset-x-0 top-[24%] z-2 text-center transition-[opacity,translate,filter] duration-[300ms,500ms,500ms] in-data-[transition]:pointer-events-none in-data-[transition]:-translate-y-3 in-data-[transition]:opacity-0 in-data-[transition]:blur-xs max-md:top-[23%] short:top-[19%] laptop:top-[21%]"
            aria-label="Campfire"
            inert={Boolean(transition)}
          >
            <h1
              className="text-[clamp(80px,8.5vw,120px)] tracking-[-0.055em] text-shadow-[0_2px_30px_#03080d] max-md:text-[clamp(64px,19vw,105px)] short:text-[58px] laptop:text-[100px]"
              tabIndex={-1}
              data-view-heading
            >
              Ryan Kuah<span className="text-amber">.</span>
            </h1>
            <p className="mx-auto mt-5.5 w-[86%] max-w-[650px] text-[19px]/[1.9] text-pretty text-[#c0cac7] text-shadow-[0_2px_18px_#03080d] max-md:mt-4.5 max-md:w-[88%] max-md:max-w-[480px] max-md:text-[15px]/[1.95] short:mt-3.5 short:max-w-[550px] md:short:text-[14px]/[1.8] laptop:mt-5 laptop:text-[17px]/[1.85]">
              Software engineering is my outlet for creation. Through{" "}
              <Link
                className={`${platformLink} text-[#93cbb7]`}
                href="/web"
                onClick={(event) => enter(event, "web")}
              >
                <Icon name="web" className={platformIcon} />
                web development
              </Link>
              ,{" "}
              <Link
                className={`${platformLink} text-[#b6a7df]`}
                href="/mobile"
                onClick={(event) => enter(event, "mobile")}
              >
                <Icon name="mobile" className={platformIcon} />
                mobile development
              </Link>
              , and{" "}
              <Link
                className={`${platformLink} text-amber`}
                href="/desktop"
                onClick={(event) => enter(event, "desktop")}
              >
                <Icon name="desktop" className={platformIcon} />
                desktop apps
              </Link>
              , building my ideas for tools, wikis, and games.
            </p>
          </section>
        )}
        {visiblePlatform && (
          <PlatformSurface
            key={visiblePlatform}
            platform={visiblePlatform}
            projects={getPlatformProjects(visiblePlatform)}
            goHome={goHome}
            entering={Boolean(transition)}
          />
        )}
      </main>
      {transition === "web" && (
        // Aria's floating prompt: a glass input with a thin ring and soft shadow.
        <div
          className="absolute inset-0 z-20 animate-address-veil bg-[#182f3229]"
          aria-hidden="true"
        >
          <div className="absolute top-[42%] left-1/2 flex h-14.5 w-[clamp(300px,50vw,760px)] transform-[translate(-50%,-50%)] animate-address-appear items-center gap-3.5 overflow-hidden rounded-[11px] border border-[#ffffff47] bg-[#7d999824] px-4.75 shadow-[0_7px_28px_#0006,inset_0_1px_0_#ffffff12] backdrop-blur-[30px] backdrop-saturate-150 max-md:h-13.5 max-md:w-[calc(100vw-40px)] max-md:gap-3 max-md:px-3.5">
            <Icon name="search" className="h-5 w-4.25 text-[#d7e7e0]" />
            <div className="flex-1 text-[18px] font-medium tracking-[-0.035em] max-md:text-[16px]">
              <span className="block w-0 max-w-max animate-address-type overflow-hidden border-r border-[#eef5ed] whitespace-nowrap">
                ryankuah.com/web
              </span>
            </div>
            <span className="animate-address-return text-[22px] opacity-60">
              ↵
            </span>
            <i className="absolute bottom-0 left-0 h-0.5 w-0 animate-address-load bg-[#93cbb7] shadow-[0_0_8px_#93cbb7]" />
          </div>
        </div>
      )}
      {transition === "desktop" && (
        // A decorative unlock sequence, with no credential field.
        <div
          className="absolute inset-0 z-20 grid animate-unlock-veil place-items-center bg-[#0712174d] backdrop-blur-[18px]"
          aria-hidden="true"
        >
          <div className="flex animate-unlock-profile flex-col items-center">
            <span className="grid size-23.5 place-items-center rounded-full border border-[#d8e6df38] bg-[#748f8926] shadow-[0_10px_45px_#0003]">
              <Icon name="fire" className="size-10.5 text-[#e0b48b]" />
            </span>
            <strong className="mt-4.5 text-[19px] font-medium">
              Ryan Kuah
            </strong>
            <div className="mt-6.25 flex h-9.5 w-52.5 items-center justify-between rounded-[20px] border border-[#ffffff24] bg-[#d3dfdd1c] pr-2.25 pl-4.5">
              <span className="flex gap-1.5">
                {Array.from({ length: 8 }, (_, index) => (
                  <i
                    key={index}
                    className="size-1.25 animate-password-dot rounded-full bg-[#f1f0e9] opacity-0"
                    style={{ animationDelay: `${450 + index * 110}ms` }}
                  />
                ))}
              </span>
              <span className="grid size-5.75 animate-unlock-submit place-items-center rounded-full border border-[#ffffff50]">
                <Icon name="arrow" className="size-3.25" />
              </span>
            </div>
            <Icon name="lock" className="mt-4.25 size-3.25 text-[#c5d5cd]" />
          </div>
        </div>
      )}
      <span className="sr-only" role="status">
        {transition === "web"
          ? "Opening ryankuah.com/web"
          : transition === "mobile"
            ? "Opening mobile apps"
            : transition === "desktop"
              ? "Unlocking desktop"
              : ""}
      </span>
    </div>
  );
}
