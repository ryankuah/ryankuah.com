"use client";

import Image from "next/image";
import { useRef, useState, type KeyboardEvent, type ReactNode } from "react";
import { ariaChapters } from "@/data/aria-story";
import type { Project } from "@/data/projects";
import styles from "./aria-window.module.css";
import {
  AriaDiaStory,
  type DiaProgress,
  type DiaStage,
} from "./aria-dia-story";

export function AriaWindow({
  project,
  chrome,
}: {
  project: Project;
  chrome: ReactNode;
}) {
  const [index, setIndex] = useState(0);
  const [openedCount, setOpenedCount] = useState(1);
  const [sidebar, setSidebar] = useState(false);
  const [diaStage, setDiaStage] = useState<DiaStage>("typing");
  const [diaProgress, setDiaProgress] = useState<DiaProgress>({
    browsers: 0,
    building: 0,
  });
  const heading = useRef<HTMLHeadingElement>(null);
  const article = useRef<HTMLDivElement>(null);
  const tabs = useRef<(HTMLButtonElement | null)[]>([]);
  const chapter = ariaChapters[index];
  const isChrome = chapter.theme === "chrome";
  const isSafari = chapter.theme === "safari";
  const hasTopTabs = isChrome || isSafari;
  const isAbout = chapter.id === "about";

  function select(next: number) {
    setOpenedCount((count) => Math.max(count, next + 1));
    setIndex(next);
    setSidebar(false);
    requestAnimationFrame(() => {
      if (article.current) article.current.scrollTop = 0;
      heading.current?.focus({ preventScroll: true });
      if (["chrome", "safari"].includes(ariaChapters[next].theme))
        tabs.current[next]?.scrollIntoView({
          block: "nearest",
          inline: "nearest",
        });
    });
  }

  function navigateTabs(event: KeyboardEvent, current: number) {
    const previous = hasTopTabs ? "ArrowLeft" : "ArrowUp";
    const next = hasTopTabs ? "ArrowRight" : "ArrowDown";
    let target: number;
    if (event.key === previous)
      target = (current + openedCount - 1) % openedCount;
    else if (event.key === next) target = (current + 1) % openedCount;
    else if (event.key === "Home") target = 0;
    else if (event.key === "End") target = openedCount - 1;
    else return;
    event.preventDefault();
    tabs.current[target]?.focus();
    tabs.current[target]?.scrollIntoView({
      block: "nearest",
      inline: "nearest",
    });
  }

  const chapterTabs = (
    <div
      className={styles.tabs}
      role="tablist"
      aria-label="Aria story chapters"
      aria-orientation={hasTopTabs ? "horizontal" : "vertical"}
    >
      {ariaChapters.slice(0, openedCount).map((item, i) => (
        <button
          key={item.id}
          ref={(node) => {
            tabs.current[i] = node;
          }}
          id={`aria-tab-${item.id}`}
          role="tab"
          aria-selected={index === i}
          aria-controls="aria-story-panel"
          tabIndex={index === i ? 0 : -1}
          onClick={() => select(i)}
          onKeyDown={(event) => navigateTabs(event, i)}
        >
          <span className={styles.tabMark} aria-hidden="true">
            {String(i + 1).padStart(2, "0")}
          </span>
          {item.title}
        </button>
      ))}
    </div>
  );

  return (
    <div
      className={styles.browser}
      data-browser-theme={chapter.theme}
      onKeyDown={(event) => {
        if (event.key === "Escape" && sidebar) {
          event.preventDefault();
          event.stopPropagation();
          setSidebar(false);
          heading.current?.focus({ preventScroll: true });
        }
      }}
    >
      {isChrome ? (
        <header className={styles.chromeHeader}>
          <div className={styles.chromeTop}>
            <div className={styles.chromeControls}>{chrome}</div>
            {chapterTabs}
          </div>
          <div className={styles.addressRow}>
            <div className={styles.address} aria-label="Chapter address">
              <span aria-hidden="true">≡</span> ryankuah.com/aria / {chapter.id}
            </div>
          </div>
        </header>
      ) : isSafari ? (
        <header className={styles.safariHeader}>
          <div className={styles.safariToolbar}>
            <div className={styles.chromeControls}>{chrome}</div>
            <div className={styles.safariAddress} aria-label="Chapter address">
              <svg
                width="12"
                height="12"
                viewBox="0 0 20 20"
                fill="none"
                aria-hidden="true"
              >
                <rect
                  x="4"
                  y="8"
                  width="12"
                  height="9"
                  rx="2"
                  stroke="currentColor"
                />
                <path d="M6 8V6a4 4 0 0 1 8 0v2" stroke="currentColor" />
              </svg>
              <span>ryankuah.com/aria / safari</span>
            </div>
            <svg
              className={styles.compass}
              width="22"
              height="22"
              viewBox="0 0 24 24"
              fill="none"
              aria-hidden="true"
            >
              <circle cx="12" cy="12" r="9" stroke="currentColor" />
              <path d="m16 7-2 7-6 3 2-7 6-3Z" fill="#628fb9" />
              <path d="m16 7-4 5-2-2 6-3Z" fill="#d8847c" />
            </svg>
          </div>
          {chapterTabs}
        </header>
      ) : (
        <div
          className={styles.sidebarReveal}
          onPointerEnter={(event) => {
            if (event.pointerType === "mouse") setSidebar(true);
          }}
          onPointerLeave={(event) => {
            if (!event.currentTarget.contains(document.activeElement))
              setSidebar(false);
          }}
          onBlur={(event) => {
            if (!event.currentTarget.contains(event.relatedTarget))
              setSidebar(false);
          }}
        >
          <button
            className={styles.sidebarToggle}
            aria-label="Show Aria sidebar"
            aria-expanded={sidebar}
            aria-controls="aria-story-sidebar"
            onClick={() => setSidebar(true)}
          >
            <svg
              width="18"
              height="18"
              viewBox="0 0 20 20"
              fill="none"
              aria-hidden="true"
            >
              <rect
                x="2"
                y="3"
                width="16"
                height="14"
                rx="3"
                stroke="currentColor"
              />
              <path d="M7 3v14" stroke="currentColor" />
            </svg>
          </button>
          <aside
            id="aria-story-sidebar"
            className={styles.sidebar}
            data-open={sidebar}
            inert={!sidebar}
            aria-label="Aria sidebar"
            onFocus={() => setSidebar(true)}
          >
            {chrome}
            <span className={styles.sidebarLabel}>ARIA / THE STORY</span>
            {chapterTabs}
            <div className={styles.sidebarFoot}>
              Built for macOS
              <br />
              <span>SwiftUI · WebKit</span>
            </div>
          </aside>
        </div>
      )}
      <div className={styles.page} onPointerDown={() => setSidebar(false)}>
        {chapter.chat ? (
          <AriaDiaStory
            chapter={chapter}
            chat={chapter.chat}
            stage={diaStage}
            setStage={setDiaStage}
            progress={diaProgress}
            setProgress={setDiaProgress}
            headingRef={heading}
            onContinue={() => select(index + 1)}
          />
        ) : (
          <div className={styles.readingPane} ref={article}>
            <article
              key={chapter.id}
              id="aria-story-panel"
              role="tabpanel"
              aria-labelledby={`aria-tab-${chapter.id}`}
              className={styles.article}
            >
              <header className={styles.intro}>
                {isAbout && (
                  <Image
                    src="/images/aria.png"
                    alt=""
                    width={52}
                    height={52}
                    className={styles.icon}
                  />
                )}
                <span className={styles.eyebrow}>
                  {isAbout
                    ? "A BROWSER FOR MACOS"
                    : `WHY I BUILT ARIA / ${String(index).padStart(2, "0")}`}
                </span>
                <h2 ref={heading} tabIndex={-1} data-project-heading>
                  {isAbout ? "Aria" : chapter.title}
                </h2>
                {isAbout && (
                  <p className={styles.lead}>
                    A native macOS browser built around how I browse.
                  </p>
                )}
              </header>
              <div className={styles.prose}>
                {chapter.paragraphs.map((paragraph) => (
                  <p key={paragraph}>{paragraph}</p>
                ))}
              </div>
              {chapter.continuation ? (
                <button
                  className={styles.begin}
                  onClick={() => select(index + 1)}
                >
                  {chapter.continuation}
                  <span aria-hidden="true">↗</span>
                </button>
              ) : project.link ? (
                <a
                  className={styles.begin}
                  href={project.link}
                  target="_blank"
                  rel="noreferrer"
                >
                  Explore Aria’s releases.
                  <span aria-hidden="true">↗</span>
                </a>
              ) : null}
            </article>
          </div>
        )}
      </div>
    </div>
  );
}
