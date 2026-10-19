"use client";

import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import styles from "./shd-window.module.css";

function AgentList() {
  const [agents, setAgents] = useState<boolean[]>([]);

  useEffect(() => {
    const timers = Array.from({ length: 8 }, (_, index) => [
      setTimeout(
        () => setAgents((current) => [...current, false]),
        index * 180,
      ),
      setTimeout(
        () =>
          setAgents((current) =>
            current.map((ready, agent) => agent === index || ready),
          ),
        index * 180 + 320,
      ),
    ]).flat();
    return () => timers.forEach(clearTimeout);
  }, []);

  return (
    <ul className={styles.agentList} aria-label="Example raid team">
      {agents.map((ready, index) => (
        <li key={index} className={styles.agentRow} data-ready={ready}>
          <span className={styles.statusDot} aria-hidden="true" />
          <span>Agent {index + 1}</span>
          <span className={styles.agentStatus}>
            {ready ? "Ready" : "Unready"}
          </span>
        </li>
      ))}
    </ul>
  );
}

// Retains the connection window's branding and palette from ryankuah/shdapp.
export function ShdWindow() {
  const [showOverlay, setShowOverlay] = useState(false);
  const [countdown, setCountdown] = useState<number | null>(null);
  const timer = useRef<ReturnType<typeof setInterval> | null>(null);

  function stopRoll() {
    if (timer.current !== null) clearInterval(timer.current);
    timer.current = null;
    setCountdown(null);
  }

  useEffect(
    () => () => {
      if (timer.current !== null) clearInterval(timer.current);
    },
    [],
  );

  function startRoll() {
    stopRoll();
    setShowOverlay(true);
    setCountdown(3);
    const endTime = Date.now() + 3000;
    timer.current = setInterval(() => {
      const remaining = endTime - Date.now();
      if (remaining <= 0) {
        stopRoll();
        setShowOverlay(false);
      } else setCountdown(Math.ceil(remaining / 1000));
    }, 100);
  }

  return (
    <article className={styles.app} aria-labelledby="shd-title">
      <div className={styles.scroll}>
        <div className={styles.body}>
          <header className={styles.brand}>
            <div className={styles.brandIcon}>
              <svg viewBox="0 0 24 24" aria-hidden="true">
                <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
              </svg>
            </div>
            <h2 id="shd-title">
              SHD <span>OVERLAY</span>
            </h2>
            <p>Division 2 Speedrun Coordination</p>
          </header>
          <div className={styles.description}>
            <p className={styles.intro}>
              Division 2 raids require eight players. The speedrun starts with a
              glitch: rolling into a wall at precisely the right moment during a
              raid reset can prevent the game teleporting you back to the start.
            </p>
            <p className={styles.explanation}>
              It can take several attempts to get the required rolls. This app
              lets the resetter line up the reset button, then use one keypress
              to make everyone roll at the same time for more consistent timing.
            </p>
          </div>
          <div className={styles.actions}>
            <button
              type="button"
              aria-expanded={showOverlay}
              aria-controls="shd-overlay-preview"
              onClick={() => {
                stopRoll();
                setShowOverlay(!showOverlay);
              }}
            >
              {showOverlay ? "Hide overlay" : "Show overlay"}
            </button>
            <button
              type="button"
              className={styles.startButton}
              disabled={countdown !== null}
              onClick={startRoll}
            >
              Start roll
            </button>
          </div>
        </div>
      </div>
      {showOverlay &&
        createPortal(
          <section
            id="shd-overlay-preview"
            className={styles.desktopOverlay}
            aria-label="Overlay preview"
          >
            {countdown === null ? (
              <div className={styles.teamPanel}>
                <AgentList />
              </div>
            ) : (
              <div className={styles.countdown}>
                <strong>{countdown}</strong>
                <span>Starting</span>
              </div>
            )}
            <span className="sr-only" role="status" aria-live="polite">
              {countdown === null ? "" : `Starting in ${countdown}`}
            </span>
          </section>,
          document.body,
        )}
    </article>
  );
}
