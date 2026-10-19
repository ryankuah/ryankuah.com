"use client";

import Image from "next/image";
import { useEffect, useRef, useState, type CSSProperties } from "react";
import type { Project } from "@/data/projects";
import { Icon } from "./portfolio-icons";
import { ProjectContent } from "./project-content";
import styles from "./phone-project.module.css";

export function PhoneProject({
  project,
  close,
}: {
  project: Project;
  close: () => void;
}) {
  const [showStory, setShowStory] = useState(project.id !== "suiyu");
  const story = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (showStory && project.id === "suiyu") {
      story.current
        ?.querySelector<HTMLElement>("[data-project-heading]")
        ?.focus({ preventScroll: true });
    }
  }, [showStory, project.id]);

  return (
    <div className={`${styles.app} animate-app-open`}>
      <div className={styles.toolbar}>
        <button onClick={close}>
          <Icon name="back" />
          Apps
        </button>
      </div>
      {!showStory ? (
        <SuiyuOpening onComplete={() => setShowStory(true)} />
      ) : (
        <div className={styles.scroll}>
          <div ref={story} className={styles.story}>
            <ProjectContent project={project} compact />
          </div>
        </div>
      )}
    </div>
  );
}

function SuiyuOpening({ onComplete }: { onComplete: () => void }) {
  const [phase, setPhase] = useState<"pounce" | "idle" | "feeding" | "eating">(
    "pounce",
  );
  const [offset, setOffset] = useState(0);
  const gesture = useRef<{
    start: number;
    distance: number;
    scale: number;
  } | null>(null);
  const dragged = useRef(false);

  useEffect(() => {
    const reduceMotion = window.matchMedia(
      "(prefers-reduced-motion: reduce)",
    ).matches;
    if (phase === "idle") return;
    const delay = phase === "pounce" ? 1640 : phase === "feeding" ? 270 : 860;
    const timer = window.setTimeout(
      () => {
        if (phase === "pounce") setPhase("idle");
        else if (phase === "feeding") setPhase("eating");
        else onComplete();
      },
      reduceMotion ? 0 : delay,
    );
    return () => window.clearTimeout(timer);
  }, [phase, onComplete]);

  function feed() {
    if (phase === "idle") setPhase("feeding");
  }

  return (
    <div className={styles.opening}>
      <div className={styles.dogStage} data-phase={phase}>
        <h2 tabIndex={-1} data-project-heading lang="zh">
          随遇
        </h2>
        <div className={styles.dog}>
          <picture>
            <source
              media="(prefers-reduced-motion: reduce)"
              srcSet="/images/phone/suiyu/idle.png"
            />
            <Image
              src={`/images/phone/suiyu/${phase === "pounce" ? "pounce" : phase === "eating" ? "eat" : "idle"}.gif`}
              width={168}
              height={168}
              unoptimized
              loading="eager"
              alt="Suiyu’s white dog mascot"
              draggable={false}
            />
          </picture>
        </div>
        <button
          className={styles.biscuit}
          style={{ "--drag-y": `${offset}px` } as CSSProperties}
          disabled={phase !== "idle"}
          aria-label="Feed the dog a biscuit"
          onClick={() => {
            if (!dragged.current) feed();
          }}
          onPointerDown={(event) => {
            if (phase !== "idle") return;
            dragged.current = false;
            gesture.current = {
              start: event.clientY,
              distance: 0,
              scale: event.currentTarget.getBoundingClientRect().height / 76,
            };
            event.currentTarget.setPointerCapture(event.pointerId);
          }}
          onPointerMove={(event) => {
            if (!gesture.current) return;
            const distance =
              (event.clientY - gesture.current.start) / gesture.current.scale;
            gesture.current.distance = distance;
            if (Math.abs(distance) > 8) dragged.current = true;
            setOffset(Math.max(-126, Math.min(0, distance)));
          }}
          onPointerUp={() => {
            if (gesture.current && gesture.current.distance <= -96) feed();
            gesture.current = null;
            setOffset(0);
          }}
          onPointerCancel={() => {
            gesture.current = null;
            setOffset(0);
          }}
          onKeyDown={() => {
            dragged.current = false;
          }}
        >
          <Image
            src="/images/phone/suiyu/biscuit.png"
            alt=""
            width={588}
            height={386}
            draggable={false}
          />
        </button>
        <p className={styles.feedHint} aria-live="polite">
          {phase === "feeding" || phase === "eating"
            ? "Yum!"
            : "Drag the biscuit up, or tap to feed."}
        </p>
      </div>
      <button className={styles.skip} onClick={onComplete}>
        Read about the app
      </button>
    </div>
  );
}
