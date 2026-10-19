"use client";

import {
  useEffect,
  useRef,
  useState,
  type CSSProperties,
  type HTMLAttributes,
  type ReactNode,
} from "react";
import styles from "./desktop-environment.module.css";
import {
  resizeWindow,
  keyboardStep,
  type Point,
  type ResizeEdge,
  type WindowRect,
} from "./desktop-window-geometry";

const resizeEdges: { edge: ResizeEdge; label: string }[] = [
  { edge: "n", label: "top edge" },
  { edge: "e", label: "right edge" },
  { edge: "s", label: "bottom edge" },
  { edge: "w", label: "left edge" },
  { edge: "ne", label: "top-right corner" },
  { edge: "se", label: "bottom-right corner" },
  { edge: "sw", label: "bottom-left corner" },
  { edge: "nw", label: "top-left corner" },
];

export function DesktopWindow({
  id,
  title,
  index,
  active,
  minimized,
  onActivate,
  onClose,
  onMinimize,
  children,
}: {
  id: string;
  title: string;
  index: number;
  active: boolean;
  minimized: boolean;
  onActivate: () => void;
  onClose: () => void;
  onMinimize: () => void;
  children: ReactNode | ((chrome: ReactNode) => ReactNode);
}) {
  const frame = useRef<HTMLDivElement>(null);
  const handle = useRef<HTMLDivElement>(null);
  const drag = useRef<{ pointer: number; start: Point; origin: Point } | null>(
    null,
  );
  const resize = useRef<{
    pointer: number;
    start: Point;
    origin: WindowRect;
    edge: ResizeEdge;
    bounds: { width: number; height: number };
  } | null>(null);
  const [initialOffset] = useState(index * 24);
  const [position, setPosition] = useState<Point | null>(null);
  const [size, setSize] = useState<{ width: number; height: number } | null>(
    null,
  );
  const [maximized, setMaximized] = useState(false);
  const [dragging, setDragging] = useState(false);
  const [resizing, setResizing] = useState(false);

  useEffect(() => {
    if (!active || minimized) return;
    const request = requestAnimationFrame(() => {
      if (!frame.current?.contains(document.activeElement)) {
        (id === "aria" ? frame.current : handle.current)?.focus({
          preventScroll: true,
        });
      }
    });
    return () => cancelAnimationFrame(request);
  }, [active, minimized, id]);

  function currentPosition() {
    const rect = frame.current!.getBoundingClientRect();
    const parent = frame.current!.parentElement!.getBoundingClientRect();
    return { x: rect.left - parent.left, y: rect.top - parent.top };
  }

  function move(point: Point) {
    const rect = frame.current!.getBoundingClientRect();
    const parent = frame.current!.parentElement!.getBoundingClientRect();
    setPosition({
      x: Math.max(8, Math.min(point.x, parent.width - rect.width - 8)),
      y: Math.max(48, Math.min(point.y, parent.height - rect.height - 96)),
    });
  }

  function resizeFrom(
    origin: WindowRect,
    bounds: { width: number; height: number },
    edge: ResizeEdge,
    delta: Point,
  ) {
    const next = resizeWindow(
      origin,
      bounds,
      edge,
      delta,
      id === "shd-app" ? { width: 360, height: 480 } : undefined,
    );
    setPosition({ x: next.x, y: next.y });
    setSize({ width: next.width, height: next.height });
  }

  function resizeOrigin() {
    const rect = frame.current!.getBoundingClientRect();
    const parent = frame.current!.parentElement!.getBoundingClientRect();
    return {
      origin: {
        x: rect.left - parent.left,
        y: rect.top - parent.top,
        width: rect.width,
        height: rect.height,
      },
      bounds: { width: parent.width, height: parent.height },
    };
  }

  const dragHandleProps: HTMLAttributes<HTMLDivElement> = {
    role: "button",
    tabIndex: 0,
    title: "Drag to move · arrow keys to move · double-click to maximize",
    onDoubleClick: () => setMaximized(!maximized),
    onKeyDown: (event) => {
      const direction = keyboardStep[event.key];
      if (direction && !maximized) {
        event.preventDefault();
        const current = currentPosition();
        move({ x: current.x + direction.x, y: current.y + direction.y });
      } else if (event.key === "Enter" || event.key === " ") {
        event.preventDefault();
        setMaximized(!maximized);
      }
    },
    onPointerDown: (event) => {
      if (event.button !== 0 || maximized) return;
      event.preventDefault();
      event.currentTarget.focus({ preventScroll: true });
      event.currentTarget.setPointerCapture(event.pointerId);
      drag.current = {
        pointer: event.pointerId,
        start: { x: event.clientX, y: event.clientY },
        origin: currentPosition(),
      };
      setDragging(true);
    },
    onPointerMove: (event) => {
      const current = drag.current;
      if (!current || current.pointer !== event.pointerId) return;
      move({
        x: current.origin.x + event.clientX - current.start.x,
        y: current.origin.y + event.clientY - current.start.y,
      });
    },
    onPointerUp: (event) => {
      if (event.currentTarget.hasPointerCapture(event.pointerId))
        event.currentTarget.releasePointerCapture(event.pointerId);
      drag.current = null;
      setDragging(false);
    },
    onLostPointerCapture: () => {
      drag.current = null;
      setDragging(false);
    },
    onPointerCancel: () => {
      drag.current = null;
      setDragging(false);
    },
  };

  const chrome = (
    <div className={styles.titlebar} data-window-titlebar>
      <div className={styles.windowControls} data-window-controls>
        <button
          className={styles.close}
          onClick={onClose}
          aria-label={`Close ${title}`}
          title="Close"
        >
          ×
        </button>
        <button
          className={styles.minimize}
          onClick={onMinimize}
          aria-label={`Minimize ${title}`}
          title="Minimize — reopen from the desktop icon"
        >
          −
        </button>
        <button
          className={styles.maximize}
          onClick={() => setMaximized(!maximized)}
          aria-label={`${maximized ? "Restore" : "Maximize"} ${title}`}
          title={maximized ? "Restore" : "Maximize"}
        >
          ⤢
        </button>
      </div>
      <div
        {...dragHandleProps}
        ref={handle}
        data-window-drag-handle
        className={styles.dragHandle}
        aria-label={`Move ${title} window`}
      >
        <span>{title}</span>
      </div>
    </div>
  );

  return (
    <div
      ref={frame}
      className={styles.window}
      data-app={id}
      data-active={active}
      data-maximized={maximized}
      data-dragging={dragging}
      data-resizing={resizing}
      hidden={minimized}
      tabIndex={-1}
      role="dialog"
      aria-label={title}
      style={
        {
          zIndex: index + 10,
          "--window-width":
            size && !maximized
              ? `min(${size.width}px, calc(100vw - 16px))`
              : undefined,
          "--window-height":
            size && !maximized
              ? `min(${size.height}px, calc(100svh - 144px))`
              : undefined,
          "--window-x": position
            ? `${position.x}px`
            : `calc((100% - var(--window-width)) / 2 - 70px + ${initialOffset}px)`,
          "--window-y": position
            ? `${position.y}px`
            : `${70 + initialOffset}px`,
        } as CSSProperties
      }
      onPointerDownCapture={onActivate}
      onFocusCapture={onActivate}
      onKeyDown={(event) => {
        if (event.key === "Escape" && !event.defaultPrevented) {
          event.stopPropagation();
          onClose();
        }
      }}
    >
      {id === "aria" && (
        <div
          {...dragHandleProps}
          className={styles.ariaTopBezel}
          aria-label={`Move ${title} using top bezel`}
        />
      )}
      {typeof children !== "function" && chrome}
      <div className={styles.windowBody}>
        {typeof children === "function" ? children(chrome) : children}
      </div>
      {!maximized &&
        resizeEdges.map(({ edge, label }) => (
          <button
            key={edge}
            className={styles.resizeHandle}
            data-edge={edge}
            aria-label={`Resize ${title} from ${label}`}
            title={`Resize from ${label} · drag or use arrow keys`}
            onPointerDown={(event) => {
              if (event.button !== 0) return;
              event.preventDefault();
              event.currentTarget.focus({ preventScroll: true });
              event.currentTarget.setPointerCapture(event.pointerId);
              resize.current = {
                pointer: event.pointerId,
                start: { x: event.clientX, y: event.clientY },
                edge,
                ...resizeOrigin(),
              };
              setResizing(true);
            }}
            onPointerMove={(event) => {
              const current = resize.current;
              if (!current || current.pointer !== event.pointerId) return;
              resizeFrom(current.origin, current.bounds, current.edge, {
                x: event.clientX - current.start.x,
                y: event.clientY - current.start.y,
              });
            }}
            onPointerUp={(event) => {
              if (event.currentTarget.hasPointerCapture(event.pointerId))
                event.currentTarget.releasePointerCapture(event.pointerId);
              resize.current = null;
              setResizing(false);
            }}
            onPointerCancel={() => {
              resize.current = null;
              setResizing(false);
            }}
            onLostPointerCapture={() => {
              resize.current = null;
              setResizing(false);
            }}
            onKeyDown={(event) => {
              if (!keyboardStep[event.key]) return;
              event.preventDefault();
              const { origin, bounds } = resizeOrigin();
              resizeFrom(origin, bounds, edge, keyboardStep[event.key]);
            }}
          />
        ))}
    </div>
  );
}
