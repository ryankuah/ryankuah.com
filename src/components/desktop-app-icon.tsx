"use client";

import {
  useEffectEvent,
  useEffect,
  useRef,
  useState,
  type RefObject,
} from "react";
import { ProjectIcon } from "./portfolio-icons";
import styles from "./desktop-environment.module.css";

import { keyboardStep, type Point } from "./desktop-window-geometry";

export function DesktopAppIcon({
  id,
  name,
  running,
  comingSoon = false,
  desktop,
  onOpen,
}: {
  id: string;
  name: string;
  running: boolean;
  comingSoon?: boolean;
  desktop: RefObject<HTMLElement | null>;
  onOpen: () => void;
}) {
  const icon = useRef<HTMLButtonElement>(null);
  const offsetRef = useRef<Point>({ x: 0, y: 0 });
  const [offset, setOffset] = useState<Point>({ x: 0, y: 0 });
  const [dragging, setDragging] = useState(false);
  const suppressClick = useRef(false);
  const drag = useRef<{
    pointer: number;
    start: Point;
    offset: Point;
    moved: boolean;
  } | null>(null);

  function move(next: Point) {
    if (!icon.current || !desktop.current) return;
    const rect = icon.current.getBoundingClientRect();
    const bounds = desktop.current.getBoundingClientRect();
    if (!rect.width || !bounds.width || !bounds.height) return;
    const anchor = {
      x: rect.left - bounds.left - offsetRef.current.x,
      y: rect.top - bounds.top - offsetRef.current.y,
    };
    const x = Math.max(
      12,
      Math.min(anchor.x + next.x, bounds.width - rect.width - 12),
    );
    const y = Math.max(
      48,
      Math.min(anchor.y + next.y, bounds.height - rect.height - 100),
    );
    offsetRef.current = { x: x - anchor.x, y: y - anchor.y };
    setOffset(offsetRef.current);
  }

  const keepOnDesktop = useEffectEvent(() => {
    if (offsetRef.current.x || offsetRef.current.y) move(offsetRef.current);
  });

  useEffect(() => {
    if (!desktop.current) return;
    const observer = new ResizeObserver(() => {
      // Responsive grid changes must not leave rearranged icons off-screen.
      keepOnDesktop();
    });
    observer.observe(desktop.current);
    return () => observer.disconnect();
  }, [desktop]);

  function endDrag() {
    drag.current = null;
    setDragging(false);
  }

  return (
    <button
      ref={icon}
      className={`group/app ${styles.appIcon}`}
      data-app-id={id}
      data-dragging={dragging}
      data-moved={offset.x !== 0 || offset.y !== 0}
      style={{ transform: `translate(${offset.x}px, ${offset.y}px)` }}
      aria-label={comingSoon ? `${name} — Coming soon` : `Open ${name}`}
      aria-disabled={comingSoon || undefined}
      aria-haspopup={comingSoon ? undefined : "dialog"}
      title={
        comingSoon
          ? "Coming soon"
          : "Drag to move · click to open · Alt + arrow keys to move"
      }
      onDragStart={(event) => event.preventDefault()}
      onPointerDown={(event) => {
        if (event.button !== 0 || !event.isPrimary) return;
        event.preventDefault();
        event.currentTarget.focus({ preventScroll: true });
        event.currentTarget.setPointerCapture(event.pointerId);
        suppressClick.current = false;
        drag.current = {
          pointer: event.pointerId,
          start: { x: event.clientX, y: event.clientY },
          offset: offsetRef.current,
          moved: false,
        };
      }}
      onPointerMove={(event) => {
        const current = drag.current;
        if (!current || current.pointer !== event.pointerId) return;
        const delta = {
          x: event.clientX - current.start.x,
          y: event.clientY - current.start.y,
        };
        if (!current.moved && Math.hypot(delta.x, delta.y) < 6) return;
        current.moved = true;
        suppressClick.current = true;
        setDragging(true);
        move({ x: current.offset.x + delta.x, y: current.offset.y + delta.y });
      }}
      onPointerUp={(event) => {
        if (event.currentTarget.hasPointerCapture(event.pointerId)) {
          event.currentTarget.releasePointerCapture(event.pointerId);
        }
        endDrag();
      }}
      onPointerCancel={endDrag}
      onLostPointerCapture={endDrag}
      onClick={(event) => {
        if (suppressClick.current && event.detail !== 0) {
          suppressClick.current = false;
          event.preventDefault();
          return;
        }
        if (!comingSoon) onOpen();
      }}
      onKeyDown={(event) => {
        if (!event.altKey) return;
        const delta = keyboardStep[event.key];
        if (!delta) return;
        event.preventDefault();
        move({
          x: offsetRef.current.x + delta.x,
          y: offsetRef.current.y + delta.y,
        });
      }}
    >
      <span
        className={styles.appArtwork}
        data-coming-soon={comingSoon || undefined}
      >
        <span className={styles.appImage}>
          <ProjectIcon id={id} size="desktop" />
        </span>
        {comingSoon && (
          <span className={styles.comingSoonBanner} aria-hidden="true">
            Coming soon
          </span>
        )}
      </span>
      <span>{name}</span>
      {running && <i className={styles.runningDot} aria-label="Running" />}
    </button>
  );
}
