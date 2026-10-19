"use client";

import Link from "next/link";
import { AppTile, Icon, tileSymbolClass } from "./portfolio-icons";
import styles from "./desktop-environment.module.css";

export function DesktopDock() {
  return (
    <div className={styles.dockRegion}>
      <nav className={styles.dock} aria-label="Dock">
        {(
          [
            {
              href: "/",
              label: "Campfire",
              icon: "fire",
              color: "#314944",
              text: "text-amber",
            },
            {
              href: "/web",
              label: "Browser",
              icon: "web",
              color: "#426c63",
              text: "text-[#d5eee4]",
            },
            {
              href: "/mobile",
              label: "Phone Simulator",
              icon: "mobile",
              color: "#63567f",
              text: "text-[#e8dff8]",
            },
          ] as const
        ).map((item) => (
          <Link
            className="group/app relative rounded-[13px]"
            key={item.href}
            href={item.href}
            aria-label={item.label}
          >
            <AppTile size="dock" color={item.color}>
              <Icon
                name={item.icon}
                className={`${item.text} ${tileSymbolClass("dock")}`}
              />
            </AppTile>
            <span className={styles.dockTooltip}>{item.label}</span>
          </Link>
        ))}
      </nav>
    </div>
  );
}
