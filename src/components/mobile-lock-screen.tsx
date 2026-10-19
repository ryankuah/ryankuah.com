"use client";

import { Icon } from "./portfolio-icons";

export function MobileLockScreen({
  goHome,
  entering,
}: {
  goHome: () => void;
  entering: boolean;
}) {
  return (
    <div className="absolute inset-0 z-3" inert={entering}>
      <section
        className={`@container absolute top-1/2 left-1/2 h-phone-height w-phone-width -translate-1/2 overflow-hidden rounded-[48px] border-10 border-transparent text-[#eee9df] ${entering ? "animate-phone-arrive" : ""}`}
        aria-label="Locked iPhone"
      >
        <div
          className="absolute inset-0 bg-black/80 backdrop-blur-xl"
          aria-hidden="true"
        />
        <div
          className="absolute top-1.75 left-1/2 h-6.25 w-22 -translate-x-1/2 rounded-full bg-[#050607] @max-[280px]:w-17.5 @max-[200px]:h-5 @max-[200px]:w-12"
          aria-hidden="true"
        />
        <div
          className="absolute top-2.75 right-5 flex gap-1.25 @max-[200px]:right-3"
          aria-hidden="true"
        >
          <Icon name="wifi" className="size-4 @max-[200px]:size-3" />
          <Icon name="battery" className="size-4 @max-[200px]:size-3" />
        </div>
        <div className="absolute inset-x-5 top-1/2 flex -translate-y-1/2 flex-col items-center text-center font-sans @max-[200px]:inset-x-3">
          <Icon
            name="lock"
            className="mb-5 size-8 @max-[200px]:mb-3 @max-[200px]:size-6"
          />
          <h1
            tabIndex={-1}
            data-view-heading
            className="font-sans text-[26px]/[1.2] font-semibold tracking-[-0.7px] @max-[280px]:text-[23px] @max-[200px]:text-[18px]"
          >
            iPhone is locked
          </h1>
          <p className="mt-4 max-w-60 text-[14px]/[1.6] text-white/65 @max-[280px]:text-[12px] @max-[200px]:mt-3 @max-[200px]:text-[10px]">
            I seem to have lost my password,
            <br />
            I’ll find it soon.
          </p>
        </div>
        <button
          className="absolute bottom-0.75 left-1/2 grid h-11 w-1/2 -translate-x-1/2 place-items-center"
          onClick={goHome}
          aria-label="Return to campfire"
        >
          <span className="h-1 w-25 max-w-full rounded-full bg-[#f0f1eae8]" />
        </button>
      </section>
    </div>
  );
}
