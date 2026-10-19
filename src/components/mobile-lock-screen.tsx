"use client";

import { Icon } from "./portfolio-icons";
import { LiveDateTime } from "./live-date-time";

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
        aria-label="Mobile development lock screen"
      >
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
        <div className="absolute inset-x-0 top-[13%] flex flex-col items-center text-shadow-[0_2px_10px_#0008]">
          <Icon name="lock" className="mb-4 size-5" />
          <span className="text-[12px] @max-[280px]:text-[10px]">
            <LiveDateTime format="date" />
          </span>
          <strong className="text-[64px]/[1.1] font-normal tracking-[-4px] @max-[280px]:text-[48px] @max-[200px]:text-[38px]">
            <LiveDateTime />
          </strong>
        </div>
        <h1
          tabIndex={-1}
          data-view-heading
          className="absolute inset-x-0 top-[48%] text-center font-sans text-[24px] font-medium tracking-[-0.5px] text-shadow-[0_2px_12px_#000] @max-[280px]:text-[21px] @max-[200px]:top-[56%] @max-[200px]:text-[16px]"
        >
          Coming soon
        </h1>
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
