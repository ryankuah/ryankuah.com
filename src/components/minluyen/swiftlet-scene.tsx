"use client";

import { useEffect, useRef } from "react";
import styles from "./minluyen-story.module.css";
import {
  createFlock,
  stepFlock,
  type SceneBounds,
  type ScenePointer,
  type Swiftlet,
} from "./swiftlets";

function drawBird(ctx: CanvasRenderingContext2D, bird: Swiftlet, time: number) {
  const cycle = (time + bird.phase) % 7;
  // Short bursts of wingbeats blend into a swept-wing glide without snapping.
  const activity = cycle < 2.4 ? Math.sin((Math.PI * cycle) / 2.4) ** 2 : 0;
  const beat = time * (17 + bird.size * 5) + bird.phase;
  const wingHeight = 7 + (Math.sin(beat) * 21 - 7) * activity;
  const farWingHeight = 5 + (Math.sin(beat + 0.3) * 17 - 5) * activity;
  const distanceScale = 1 + Math.sin(time * 0.16 + bird.flock * 2) * 0.14;
  const scale = bird.size * distanceScale;
  const pitch = Math.max(
    -0.16,
    Math.min(0.16, Math.atan2(bird.vy, Math.abs(bird.vx))),
  );
  ctx.save();
  ctx.translate(bird.x, bird.y);
  ctx.rotate(pitch * bird.facing);
  ctx.scale(bird.facing * scale, scale);
  // The reference has long, narrow wings and a compact body, not a swallow's long tail.
  ctx.fillStyle = `rgba(43, 42, 38, ${0.35 + bird.size})`;
  ctx.beginPath();
  ctx.moveTo(1.5, -0.8);
  ctx.bezierCurveTo(
    1,
    -farWingHeight * 0.45,
    -2,
    -farWingHeight * 0.8,
    -9,
    -farWingHeight,
  );
  ctx.bezierCurveTo(
    -5,
    -farWingHeight * 0.62,
    -3,
    -farWingHeight * 0.2,
    -2.5,
    0,
  );
  ctx.closePath();
  ctx.fill();
  ctx.fillStyle = `rgba(25, 27, 25, ${0.48 + scale})`;
  // Small head, cigar-shaped body and shallow tail notch remain in side profile.
  ctx.beginPath();
  ctx.moveTo(7, -0.3);
  ctx.lineTo(5.5, -0.9);
  ctx.quadraticCurveTo(4, -2.2, 1.5, -1.5);
  ctx.quadraticCurveTo(-1.5, -1.8, -4.5, -0.7);
  ctx.lineTo(-9, -1.4);
  ctx.lineTo(-7.8, 0);
  ctx.lineTo(-9, 1.5);
  ctx.lineTo(-4.5, 1);
  ctx.quadraticCurveTo(1, 2.5, 4.8, 0.7);
  ctx.closePath();
  ctx.fill();
  ctx.beginPath();
  ctx.moveTo(1, -0.7);
  ctx.bezierCurveTo(
    0,
    -wingHeight * 0.4,
    -2,
    -wingHeight * 0.8,
    -10,
    -wingHeight,
  );
  ctx.bezierCurveTo(-6.5, -wingHeight * 0.58, -4, -wingHeight * 0.2, -3, 0.8);
  ctx.closePath();
  ctx.fill();
  ctx.restore();
}

export function SwiftletScene({ paused = false }: { paused?: boolean }) {
  const layerRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const pausedRef = useRef(paused);
  const playbackRef = useRef<(() => void) | null>(null);

  useEffect(() => {
    pausedRef.current = paused;
    playbackRef.current?.();
  }, [paused]);

  useEffect(() => {
    const layer = layerRef.current;
    const canvas = canvasRef.current;
    const hero = layer?.parentElement;
    const ctx = canvas?.getContext("2d");
    if (!layer || !canvas || !hero || !ctx) return;

    const controller = new AbortController();
    const { signal } = controller;
    const motion = window.matchMedia("(prefers-reduced-motion: reduce)");
    let bounds: SceneBounds = { width: 0, height: 0 };
    let birds: Swiftlet[] = [];
    let pointer: ScenePointer = null;
    let visible = false;
    let frame = 0;
    let previousTime = 0;
    let elapsed = 0;
    let accumulator = 0;
    let pixelRatio = 1;
    const step = 1 / 120;

    function draw() {
      ctx!.setTransform(pixelRatio, 0, 0, pixelRatio, 0, 0);
      ctx!.clearRect(0, 0, bounds.width, bounds.height);
      for (const bird of birds) drawBird(ctx!, bird, elapsed);
    }

    function tick(now: number) {
      frame = 0;
      if (previousTime)
        accumulator += Math.min((now - previousTime) / 1000, 0.05);
      previousTime = now;
      while (accumulator >= step) {
        elapsed += step;
        stepFlock(birds, bounds, pointer, elapsed, step);
        accumulator -= step;
      }
      draw();
      frame = requestAnimationFrame(tick);
    }

    function syncPlayback() {
      cancelAnimationFrame(frame);
      frame = 0;
      previousTime = 0;
      accumulator = 0;
      pointer = null;
      const playing =
        visible && !document.hidden && !motion.matches && !pausedRef.current;
      layer!.dataset.playing = String(playing);
      draw();
      if (playing) frame = requestAnimationFrame(tick);
    }

    function resize() {
      const rect = { width: hero!.clientWidth, height: hero!.clientHeight };
      if (rect.width <= 0 || rect.height <= 0) return;
      const old = bounds;
      bounds = {
        width: rect.width,
        height: rect.height,
        apertureRadius: Math.min(rect.width, rect.height) / 2,
      };
      pixelRatio = Math.min(window.devicePixelRatio || 1, 2);
      canvas!.width = Math.round(bounds.width * pixelRatio);
      canvas!.height = Math.round(bounds.height * pixelRatio);
      if (!birds.length || old.width < 772 !== bounds.width < 772) {
        birds = createFlock(bounds);
      } else {
        const scaleX = bounds.width / old.width;
        const scaleY = bounds.height / old.height;
        for (const bird of birds) {
          bird.x *= scaleX;
          bird.y *= scaleY;
        }
      }
      pointer = null;
      draw();
    }

    function movePointer(event: PointerEvent) {
      if (
        motion.matches ||
        (event.pointerType === "touch" && event.buttons === 0)
      )
        return;
      const rect = hero!.getBoundingClientRect();
      if (rect.width < 1 || rect.height < 1) {
        pointer = null;
        return;
      }
      pointer = {
        x: ((event.clientX - rect.left) * bounds.width) / rect.width,
        y: ((event.clientY - rect.top) * bounds.height) / rect.height,
      };
      if (
        Math.hypot(
          pointer.x - bounds.width / 2,
          pointer.y - bounds.height / 2,
        ) > bounds.apertureRadius!
      )
        pointer = null;
    }
    function clearPointer() {
      pointer = null;
    }
    function releasePointer(event: PointerEvent) {
      if (event.pointerType !== "mouse") clearPointer();
    }

    playbackRef.current = syncPlayback;
    resize();
    const resizeObserver = new ResizeObserver(resize);
    resizeObserver.observe(hero);
    const intersection = new IntersectionObserver(([entry]) => {
      visible = entry.isIntersecting;
      syncPlayback();
    });
    intersection.observe(hero);
    motion.addEventListener("change", syncPlayback, { signal });
    document.addEventListener("visibilitychange", syncPlayback, { signal });
    window.addEventListener("blur", clearPointer, { signal });
    hero.addEventListener("pointermove", movePointer, {
      passive: true,
      signal,
    });
    hero.addEventListener("pointerdown", movePointer, {
      passive: true,
      signal,
    });
    hero.addEventListener("pointerleave", clearPointer, { signal });
    hero.addEventListener("pointercancel", clearPointer, { signal });
    hero.addEventListener("pointerup", releasePointer, { signal });
    return () => {
      playbackRef.current = null;
      cancelAnimationFrame(frame);
      resizeObserver.disconnect();
      intersection.disconnect();
      controller.abort();
    };
  }, []);

  return (
    <div className={styles.flock} ref={layerRef} aria-hidden="true">
      <canvas className={styles.canvas} ref={canvasRef} />
    </div>
  );
}
