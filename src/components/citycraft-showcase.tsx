"use client";

import { useEffect, useRef, useState } from "react";
import type { Project } from "@/data/projects";
import styles from "./citycraft-showcase.module.css";

const scenes = [
  {
    id: "plaza",
    label: "Center square",
    description: "A pan across Exchange Plaza and its surrounding towers.",
  },
  {
    id: "monorail",
    label: "Monorail",
    description:
      "The suspended Circle line monorail at Tithe Street West station.",
  },
  {
    id: "map",
    label: "City planner",
    description: "CityCraft interactive city planner",
  },
] as const;

function WorldLoop({ id, description }: { id: string; description: string }) {
  const video = useRef<HTMLVideoElement>(null);
  const manuallyPaused = useRef(false);
  const [playing, setPlaying] = useState(false);

  useEffect(() => {
    const element = video.current;
    if (!element) return;
    const motion = window.matchMedia("(prefers-reduced-motion: reduce)");
    let visible = false;
    const sync = () => {
      if (
        visible &&
        !motion.matches &&
        !document.hidden &&
        !manuallyPaused.current
      ) {
        void element.play().catch(() => {});
      } else element.pause();
    };
    const observer = new IntersectionObserver(
      ([entry]) => {
        visible = entry.isIntersecting;
        sync();
      },
      { threshold: 0.25 },
    );
    observer.observe(element);
    motion.addEventListener("change", sync);
    document.addEventListener("visibilitychange", sync);
    return () => {
      observer.disconnect();
      motion.removeEventListener("change", sync);
      document.removeEventListener("visibilitychange", sync);
      element.pause();
    };
  }, []);

  return (
    <div className={styles.loop}>
      <video
        ref={video}
        muted
        loop
        playsInline
        preload="none"
        poster={`/minecraft/citycraft/${id}.jpg`}
        aria-label={description}
        onPlay={() => setPlaying(true)}
        onPause={() => setPlaying(false)}
      >
        <source src={`/minecraft/citycraft/${id}.mp4`} type="video/mp4" />
      </video>
      <button
        className={styles.playback}
        onClick={() => {
          if (video.current?.paused) {
            manuallyPaused.current = false;
            void video.current.play().catch(() => {});
          } else {
            manuallyPaused.current = true;
            video.current?.pause();
          }
        }}
        aria-label={`${playing ? "Pause" : "Play"} ${id === "plaza" ? "center square" : "monorail"} loop`}
      >
        {playing ? "Pause" : "Play"}
      </button>
    </div>
  );
}

export function CityCraftShowcase({ project }: { project: Project }) {
  const [index, setIndex] = useState(0);
  const scene = scenes[index];
  const changeScene = (direction: number) =>
    setIndex(
      (current) => (current + direction + scenes.length) % scenes.length,
    );

  return (
    <article className={styles.showcase} aria-labelledby="title-citycraft">
      <header className={styles.header}>
        <h2 id="title-citycraft" tabIndex={-1} data-project-heading>
          {project.name}
        </h2>
      </header>
      <div className={`${styles.about} ${styles.intro}`}>
        {project.about?.map((paragraph) => (
          <p key={paragraph}>{paragraph}</p>
        ))}
      </div>
      <section
        aria-label="CityCraft gallery"
        aria-roledescription="carousel"
        className={styles.gallery}
      >
        <div
          className={styles.slide}
          role="group"
          aria-roledescription="slide"
          aria-label={`${scene.label}, ${index + 1} of ${scenes.length}`}
        >
          {scene.id === "map" ? (
            <iframe
              src="/minecraft/citycraft/planner/index.html"
              title={scene.description}
              className={styles.map}
            />
          ) : (
            <WorldLoop
              key={scene.id}
              id={scene.id}
              description={scene.description}
            />
          )}
        </div>
        <button
          type="button"
          className={`${styles.galleryArrow} ${styles.previous}`}
          aria-label="Previous gallery item"
          onClick={() => changeScene(-1)}
        >
          <svg viewBox="0 0 24 24" aria-hidden="true">
            <path d="m14 6-6 6 6 6" />
          </svg>
        </button>
        <button
          type="button"
          className={`${styles.galleryArrow} ${styles.next}`}
          aria-label="Next gallery item"
          onClick={() => changeScene(1)}
        >
          <svg viewBox="0 0 24 24" aria-hidden="true">
            <path d="m10 6 6 6-6 6" />
          </svg>
        </button>
        <div className={styles.caption} aria-live="polite" aria-atomic="true">
          {scene.label} · {index + 1} / {scenes.length}
        </div>
      </section>
    </article>
  );
}
