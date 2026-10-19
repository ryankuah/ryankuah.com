"use client";

import { useSyncExternalStore } from "react";

const listeners = new Set<() => void>();
let interval: ReturnType<typeof setInterval> | undefined;

function refresh() {
  listeners.forEach((listener) => listener());
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  if (listeners.size === 1) {
    interval = setInterval(refresh, 1000);
    window.addEventListener("focus", refresh);
    document.addEventListener("visibilitychange", refresh);
  }

  return () => {
    listeners.delete(listener);
    if (listeners.size === 0) {
      clearInterval(interval);
      window.removeEventListener("focus", refresh);
      document.removeEventListener("visibilitychange", refresh);
    }
  };
}

// Only rerender when the displayed minute changes.
function getSnapshot() {
  return Math.floor(Date.now() / 60_000);
}

// Keep prerendered HTML and the first hydration render identical.
function getServerSnapshot() {
  return null;
}

export function LiveDateTime({
  format = "time",
}: {
  format?: "time" | "date";
}) {
  const minute = useSyncExternalStore(
    subscribe,
    getSnapshot,
    getServerSnapshot,
  );
  if (minute === null) return format === "time" ? "--:--" : "\u00a0";

  const date = new Date(minute * 60_000);
  const text =
    format === "date"
      ? date.toLocaleDateString("en-AU", {
          weekday: "long",
          day: "numeric",
          month: "long",
        })
      : date.toLocaleTimeString("en-GB", {
          hour: "2-digit",
          minute: "2-digit",
          hourCycle: "h23",
        });

  return <time dateTime={date.toISOString()}>{text}</time>;
}
