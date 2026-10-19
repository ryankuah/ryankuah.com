"use client";

import { useRef, useState } from "react";
import { isProjectPublished, type Project } from "@/data/projects";
import { Icon } from "./portfolio-icons";
import { DesktopAppIcon } from "./desktop-app-icon";
import { TrashWindow } from "./desktop-trash";
import { DesktopDock } from "./desktop-dock";
import { ProjectContent } from "./project-content";
import { DesktopWindow } from "./desktop-window";
import { AriaWindow } from "./aria-window";
import { ShdWindow } from "./shd-window";
import { ForzaWindow, MinecraftWindow } from "./desktop-app-previews";
import { LiveDateTime } from "./live-date-time";
import styles from "./desktop-environment.module.css";

const minecraftIds = ["citycraft", "hearthwild"];
const trashIds = ["multidress", "game", "combat", "farm-agent", "kitty"];
const desktopOrder = new Map(
  ["aria", "trash", "shd-app", "forza", "minecraft"].map((id, index) => [
    id,
    index,
  ]),
);
type OpenWindow = { id: string; minimized: boolean; order: number };

export function DesktopEnvironment({
  projects,
  goHome,
}: {
  projects: Project[];
  goHome: () => void;
}) {
  const [windows, setWindows] = useState<OpenWindow[]>([]);
  const desktop = useRef<HTMLElement>(null);
  const apps = [
    ...projects.flatMap((project) =>
      project.id === minecraftIds[0]
        ? [{ id: "minecraft", name: "Minecraft" }]
        : minecraftIds.includes(project.id) || trashIds.includes(project.id)
          ? []
          : [{ id: project.id, name: project.name }],
    ),
    { id: "trash", name: "Trash" },
  ].sort(
    (a, b) =>
      (desktopOrder.get(a.id) ?? desktopOrder.size) -
      (desktopOrder.get(b.id) ?? desktopOrder.size),
  );
  const stack = windows.toSorted((a, b) => a.order - b.order);
  const activeId = stack.findLast((item) => !item.minimized)?.id;

  function launch(id: string) {
    if (!isProjectPublished(id)) return;
    if (!apps.some((app) => app.id === id)) return;
    setWindows((current) => {
      const order = Math.max(0, ...current.map((item) => item.order)) + 1;
      return current.some((item) => item.id === id)
        ? current.map((item) =>
            item.id === id ? { ...item, minimized: false, order } : item,
          )
        : [...current, { id, minimized: false, order }];
    });
  }
  function activate(id: string) {
    setWindows((current) => {
      const order = Math.max(0, ...current.map((item) => item.order));
      const target = current.find((item) => item.id === id);
      if (!target || target.order === order) return current;
      // Keep DOM order stable so raising a window preserves pointer capture and focus.
      return current.map((item) =>
        item.id === id ? { ...item, order: order + 1 } : item,
      );
    });
  }
  function returnFocus(id: string) {
    requestAnimationFrame(() =>
      desktop.current
        ?.querySelector<HTMLButtonElement>(`[data-app-id="${id}"]`)
        ?.focus({ preventScroll: true }),
    );
  }
  function close(id: string) {
    setWindows((current) => current.filter((item) => item.id !== id));
    returnFocus(id);
  }
  function minimize(id: string) {
    setWindows((current) =>
      current.map((item) =>
        item.id === id ? { ...item, minimized: true } : item,
      ),
    );
    returnFocus(id);
  }

  return (
    <section
      ref={desktop}
      className="absolute inset-0 animate-desktop-arrive"
      aria-label="Desktop apps"
    >
      <header className={styles.menuBar}>
        <button onClick={goHome} aria-label="Return to campfire">
          <Icon name="fire" className="size-4.25" />
        </button>
        <strong>Ryan Kuah</strong>
        <h1 tabIndex={-1} data-view-heading>
          Desktop apps
        </h1>
        <span className={styles.menuStatus}>
          <Icon name="wifi" className="size-4" />
          <Icon name="battery" className="size-4" />
          <LiveDateTime />
        </span>
      </header>
      <div
        className={`${styles.desktopIcons} absolute top-19.25 right-9 grid grid-cols-[repeat(2,94px)] gap-x-5 gap-y-7 max-md:inset-x-5 max-md:top-20 max-md:grid-cols-2 max-md:gap-x-3 max-md:gap-y-6.25 md:short:top-16.25 md:short:right-6.25 md:short:grid-cols-[repeat(3,90px)] md:short:gap-4.5`}
      >
        {apps.map((app) => (
          <DesktopAppIcon
            key={app.id}
            id={app.id}
            name={app.name}
            comingSoon={!isProjectPublished(app.id)}
            desktop={desktop}
            running={windows.some((item) => item.id === app.id)}
            onOpen={() => launch(app.id)}
          />
        ))}
      </div>
      <DesktopDock />
      {windows.map((window) => {
        const project = projects.find((item) => item.id === window.id);
        const title =
          window.id === "trash"
            ? "Trash"
            : window.id === "minecraft"
              ? "Minecraft"
              : project!.name;
        return (
          <DesktopWindow
            key={window.id}
            id={window.id}
            title={title}
            index={stack.findIndex((item) => item.id === window.id)}
            active={activeId === window.id}
            minimized={window.minimized}
            onActivate={() => activate(window.id)}
            onClose={() => close(window.id)}
            onMinimize={() => minimize(window.id)}
          >
            {window.id === "aria" ? (
              (chrome) => <AriaWindow project={project!} chrome={chrome} />
            ) : window.id === "shd-app" ? (
              <ShdWindow />
            ) : window.id === "forza" ? (
              <ForzaWindow project={project!} />
            ) : window.id === "trash" ? (
              <TrashWindow
                projects={projects.filter((item) => trashIds.includes(item.id))}
              />
            ) : window.id === "minecraft" ? (
              <MinecraftWindow
                projects={projects.filter((item) =>
                  minecraftIds.includes(item.id),
                )}
              />
            ) : (
              <div className={styles.projectScroll}>
                <ProjectContent project={project!} />
              </div>
            )}
          </DesktopWindow>
        );
      })}
    </section>
  );
}
