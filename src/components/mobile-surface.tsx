"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import type { Project } from "@/data/projects";
import { Icon, ProjectIcon } from "./portfolio-icons";
import { PhoneProject } from "./phone-project";
import phoneStyles from "./phone-project.module.css";
import { LiveDateTime } from "./live-date-time";

export function MobileSurface({
  projects,
  goHome,
  entering,
}: {
  projects: Project[];
  goHome: () => void;
  entering: boolean;
}) {
  const [selected, setSelected] = useState<Project | null>(null);
  const opener = useRef<{ id: string; button: HTMLButtonElement } | null>(null);
  const surface = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!selected) return;
    const frame = requestAnimationFrame(() =>
      surface.current
        ?.querySelector<HTMLElement>("[data-project-heading]")
        ?.focus({ preventScroll: true }),
    );
    return () => cancelAnimationFrame(frame);
  }, [selected]);

  function open(project: Project, button: HTMLButtonElement) {
    opener.current = { id: project.id, button };
    setSelected(project);
  }
  function close() {
    setSelected(null);
    requestAnimationFrame(() => {
      const previous = opener.current;
      if (!previous) return;
      const button = previous.button.isConnected
        ? previous.button
        : surface.current?.querySelector<HTMLButtonElement>(
            `[data-project-id="${previous.id}"]`,
          );
      button?.focus({ preventScroll: true });
    });
  }
  const appButton = (project: Project) => (
    <button
      className="group/app flex min-w-0 flex-col items-center gap-2.25 rounded-[10px]"
      data-project-id={project.id}
      key={project.id}
      onClick={(event) => open(project, event.currentTarget)}
      aria-label={`Open ${project.name}`}
    >
      <ProjectIcon id={project.id} size="phone" />
      <span className="w-full text-center text-[10px] leading-[1.4] text-shadow-[0_1px_7px_#000c] md:short:text-[7px]">
        {project.name}
      </span>
    </button>
  );

  return (
    <div
      ref={surface}
      className="absolute inset-0 z-3"
      inert={entering}
      onKeyDown={(event) => {
        if (event.key === "Escape" && selected) {
          event.stopPropagation();
          close();
        }
      }}
    >
      <section
        data-app={selected?.id}
        className={`${phoneStyles.phone} @container absolute top-1/2 left-1/2 h-phone-height w-phone-width transform-[translate(-50%,-50%)] overflow-hidden rounded-[48px] border-10 border-transparent ${entering ? "animate-phone-arrive" : ""}`}
        aria-label="Mobile development phone"
      >
        <div
          className="absolute top-1.75 left-1/2 z-8 h-6.25 w-22 -translate-x-1/2 rounded-[30px] bg-[#050607] @max-[280px]:h-5.5 @max-[280px]:w-17.5"
          aria-hidden="true"
        >
          <i className="absolute top-2 right-3 size-2 rounded-full bg-[#0d1723] shadow-[inset_0_0_2px_#6b7c8c55]" />
        </div>
        <div
          className={`${phoneStyles.status} absolute top-2.75 right-5.5 left-5.75 z-7 flex justify-between text-[11px] font-semibold @max-[280px]:inset-x-3.75 @max-[280px]:text-[9px]`}
          aria-hidden="true"
        >
          <span>
            <LiveDateTime />
          </span>
          <div className="flex gap-1.25">
            <Icon name="wifi" className="h-4 w-3.75 @max-[280px]:w-3" />
            <Icon name="battery" className="h-4 w-3.75 @max-[280px]:w-3" />
          </div>
        </div>
        <h1 className="sr-only" tabIndex={-1} data-view-heading>
          Mobile development
        </h1>
        {!selected && (
          <>
            <div
              className="absolute inset-x-0 top-[12%] text-center text-shadow-[0_2px_10px_#0008] @max-[280px]:top-[10%] md:short:hidden"
              aria-hidden="true"
            >
              <span className="text-[12px] text-[#d3dfda] @max-[280px]:text-[10px]">
                <LiveDateTime format="date" />
              </span>
              <strong className="block text-[64px]/[1.1] font-normal tracking-[-4px] @max-[280px]:text-[42px]">
                <LiveDateTime />
              </strong>
            </div>
            <div className="absolute inset-x-5 top-[33%] grid grid-cols-4 gap-3 @max-[280px]:inset-x-8.75 @max-[280px]:top-[29%] @max-[280px]:grid-cols-2 @max-[280px]:gap-x-6.25 @max-[280px]:gap-y-4.25 md:short:inset-x-4.5 md:short:top-[34%] md:short:gap-2.5">
              {projects.map(appButton)}
            </div>
            <nav
              className="absolute inset-x-6.25 bottom-8.75 flex h-18.75 items-center justify-center gap-3 rounded-[25px] border border-[#dceae21a] bg-[#c5d4cf15] backdrop-blur-[18px] md:short:inset-x-4.5 md:short:bottom-6.25 md:short:h-10 md:short:gap-2 md:short:rounded-[15px]"
              aria-label="Phone dock"
            >
              <button
                className="grid size-13.5 place-items-center rounded-2xl bg-[#253b3a] md:short:size-7.5 md:short:rounded-[9px]"
                onClick={goHome}
                aria-label="Return to campfire"
              >
                <Icon
                  name="fire"
                  className="size-7.5 text-amber md:short:size-5"
                />
              </button>
              <Link
                className="grid size-13.5 place-items-center rounded-2xl bg-[#426c63] md:short:size-7.5 md:short:rounded-[9px]"
                href="/web"
                aria-label="Browser"
                title="Browser"
              >
                <Icon
                  name="web"
                  className="size-7.5 text-[#d5eee4] md:short:size-5"
                />
              </Link>
              <Link
                className="grid size-13.5 place-items-center rounded-2xl bg-[#63567f] md:short:size-7.5 md:short:rounded-[9px]"
                href="/desktop"
                aria-label="Desktop apps"
                title="Desktop apps"
              >
                <Icon
                  name="desktop"
                  className="size-7.5 text-[#e8dff8] md:short:size-5"
                />
              </Link>
            </nav>
          </>
        )}
        {selected && (
          <PhoneProject project={selected} close={close} key={selected.id} />
        )}
        <button
          className="absolute bottom-0.75 left-1/2 z-10 grid h-6 w-1/2 -translate-x-1/2 place-items-center"
          onClick={selected ? close : goHome}
          aria-label={
            selected ? "Return to phone home screen" : "Return to campfire"
          }
        >
          <span
            className={`${phoneStyles.homeIndicator} h-1 w-25 max-w-full rounded-[10px]`}
          />
        </button>
      </section>
    </div>
  );
}
