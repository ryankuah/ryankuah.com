"use client";

import { useEffect, useRef, useState } from "react";
import styles from "./visionverse-story.module.css";

const EDITOR_WIDTH = 1120;
const EDITOR_HEIGHT = 820;

export default function HistoricalExample({
  revision,
}: {
  revision: "html" | "fabric";
}) {
  const frame = useRef<HTMLDivElement>(null);
  const [width, setWidth] = useState(EDITOR_WIDTH);
  const [visible, setVisible] = useState(false);
  useEffect(() => {
    const element = frame.current;
    if (!element) return;
    const resize = new ResizeObserver(([entry]) => {
      if (entry) setWidth(entry.contentRect.width);
    });
    const visibility = new IntersectionObserver(
      ([entry]) => {
        if (entry?.isIntersecting) {
          setVisible(true);
          visibility.disconnect();
        }
      },
      { rootMargin: "300px" },
    );
    resize.observe(element);
    visibility.observe(element);
    return () => {
      resize.disconnect();
      visibility.disconnect();
    };
  }, []);
  const url = `/visionverse-history/${revision}/index.html`;
  const scale = Math.min(1, width / EDITOR_WIDTH);
  const name = revision === "html" ? "HTML editor" : "Fabric.js editor";
  return (
    <div className={styles.historicalExample}>
      <p className={styles.exampleDate}>
        {revision === "html" ? "June 2025" : "September 2026"}
      </p>
      <div
        ref={frame}
        className={styles.historicalFrame}
        style={{ aspectRatio: `${EDITOR_WIDTH} / ${EDITOR_HEIGHT}` }}
      >
        {visible && (
          <iframe
            title={`VisionVerse historical ${name}`}
            src={url}
            width={EDITOR_WIDTH}
            height={EDITOR_HEIGHT}
            style={{ transform: `scale(${scale})` }}
            sandbox="allow-scripts allow-same-origin"
          />
        )}
      </div>
    </div>
  );
}
