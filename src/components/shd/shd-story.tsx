"use client";

import Image from "next/image";
import { useRef, useState, type PointerEvent } from "react";
import { createPortal } from "react-dom";
import styles from "./shd-story.module.css";
import StashExample from "./stash-example";

const slotNames = ["Mask", "Chestplate"] as const;
const slotIcons = ["mask", "chestplate"] as const;

function Brand() {
  return (
    <>
      <span className={styles.brandMark} aria-hidden="true">
        PD
      </span>
      <span>
        <strong>Providence Defense</strong>
        <small>Brand set</small>
      </span>
    </>
  );
}

function LoadoutExample({ mode }: { mode: "click" | "drag" }) {
  const [slots, setSlots] = useState([false, false]);
  const [picker, setPicker] = useState<number | null>(null);
  const [selected, setSelected] = useState(false);
  const [hovered, setHovered] = useState<number | null>(null);
  const [ghost, setGhost] = useState<{ x: number; y: number } | null>(null);
  const [message, setMessage] = useState("");
  const targets = useRef<(HTMLButtonElement | null)[]>([]);
  const start = useRef<{ x: number; y: number; moved: boolean } | null>(null);
  const suppressClick = useRef(false);
  const source = useRef<HTMLButtonElement>(null);
  const brandDialog = useRef<HTMLDialogElement>(null);

  function equip(index: number) {
    setSlots((current) => current.map((filled, i) => i === index || filled));
    brandDialog.current?.close();
    setPicker(null);
    setSelected(false);
    setMessage(
      `Providence Defense equipped in ${slotNames[index].toLowerCase()}.`,
    );
  }

  function targetAt(x: number, y: number) {
    return targets.current.findIndex((element) => {
      const rect = element?.getBoundingClientRect();
      return (
        rect &&
        x >= rect.left &&
        x <= rect.right &&
        y >= rect.top &&
        y <= rect.bottom
      );
    });
  }

  function clearDrag() {
    start.current = null;
    setGhost(null);
    setHovered(null);
  }

  function move(event: PointerEvent<HTMLButtonElement>) {
    if (!start.current) return;
    if (
      Math.hypot(
        event.clientX - start.current.x,
        event.clientY - start.current.y,
      ) > 5
    )
      start.current.moved = true;
    if (!start.current.moved) return;
    setGhost({ x: event.clientX, y: event.clientY });
    const index = targetAt(event.clientX, event.clientY);
    setHovered(index < 0 ? null : index);
  }

  return (
    <div
      className={styles.example}
      role="group"
      aria-label={
        mode === "click" ? "Click-to-select example" : "Drag-and-drop example"
      }
      onKeyDown={(event) => {
        if (
          event.key === "Escape" &&
          (selected || picker !== null || start.current)
        ) {
          event.stopPropagation();
          suppressClick.current = Boolean(start.current);
          clearDrag();
          setSelected(false);
          setPicker(null);
          setMessage("Selection cancelled.");
          source.current?.focus();
        }
      }}
    >
      <div className={styles.exampleHeader}>
        <button
          type="button"
          onClick={() => {
            setSlots([false, false]);
            setPicker(null);
            setSelected(false);
            clearDrag();
            setMessage("Example reset.");
          }}
        >
          Reset
        </button>
      </div>
      <div className={styles.demoBody}>
        <div className={styles.slots}>
          {slotNames.map((name, index) => (
            <button
              type="button"
              key={name}
              ref={(element) => {
                targets.current[index] = element;
              }}
              className={`${styles.slot} ${slots[index] ? styles.filled : ""} ${hovered === index || picker === index ? styles.active : ""}`}
              aria-label={`${name} slot${slots[index] ? ": Providence Defense" : ": empty"}`}
              onClick={() => {
                if (mode === "click") {
                  setPicker(index);
                  brandDialog.current?.showModal();
                  setMessage(`Choose a brand for ${name.toLowerCase()}.`);
                } else if (selected) equip(index);
                else
                  setMessage(
                    "Select Providence Defense first, then choose a slot.",
                  );
              }}
            >
              <span className={styles.slotLabel}>{name}</span>
              <Image
                src={`/images/shd/${slotIcons[index]}.svg`}
                width={46}
                height={46}
                alt=""
                draggable={false}
              />
              {slots[index] ? (
                <span>
                  <strong>Providence Defense</strong>
                  <small>Brand set</small>
                </span>
              ) : (
                <span className={styles.empty}>
                  {mode === "click" ? "Choose brand" : "Drop brand"}
                </span>
              )}
            </button>
          ))}
        </div>
        {mode === "drag" && (
          <div className={styles.itemArea}>
            <span className={styles.areaLabel}>Brands</span>
            <button
              ref={source}
              type="button"
              className={`${styles.brand} ${styles.draggable} ${selected ? styles.active : ""}`}
              aria-label="Select or drag Providence Defense"
              aria-pressed={selected}
              onPointerDown={(event) => {
                if (event.button !== 0 || !event.isPrimary) return;
                suppressClick.current = false;
                start.current = {
                  x: event.clientX,
                  y: event.clientY,
                  moved: false,
                };
                event.currentTarget.setPointerCapture(event.pointerId);
              }}
              onPointerMove={move}
              onPointerUp={(event) => {
                if (start.current?.moved) {
                  suppressClick.current = true;
                  const index = targetAt(event.clientX, event.clientY);
                  if (index >= 0) equip(index);
                  else
                    setMessage("Drop cancelled. Drag the brand onto a slot.");
                }
                clearDrag();
              }}
              onPointerCancel={() => {
                suppressClick.current = true;
                clearDrag();
              }}
              onLostPointerCapture={clearDrag}
              onClick={() => {
                if (suppressClick.current) {
                  suppressClick.current = false;
                  return;
                }
                setSelected(!selected);
                setMessage(
                  selected
                    ? "Selection cancelled."
                    : "Providence Defense selected. Choose either slot.",
                );
              }}
            >
              <Brand />
              <span className={styles.grip} aria-hidden="true">
                ⠿
              </span>
            </button>
          </div>
        )}
      </div>
      <p className="sr-only" role="status">
        {message}
      </p>
      {mode === "click" && (
        <dialog
          ref={brandDialog}
          className={styles.brandDialog}
          aria-labelledby="shd-brand-dialog-title"
          onClose={() => setPicker(null)}
          onCancel={(event) => {
            event.stopPropagation();
            setMessage("Selection cancelled.");
          }}
          onKeyDown={(event) => {
            if (event.key === "Escape") event.stopPropagation();
          }}
        >
          <div className={styles.dialogHeading}>
            <h3 id="shd-brand-dialog-title">
              Choose a brand
              {picker !== null ? ` for ${slotNames[picker].toLowerCase()}` : ""}
            </h3>
            <button
              type="button"
              aria-label="Close brand dialog"
              onClick={() => {
                brandDialog.current?.close();
                setMessage("Selection cancelled.");
              }}
            >
              ×
            </button>
          </div>
          <button
            type="button"
            className={styles.brand}
            onClick={() => {
              if (picker === null) return;
              const index = picker;
              equip(index);
              targets.current[index]?.focus();
            }}
          >
            <Brand />
          </button>
        </dialog>
      )}
      {ghost &&
        createPortal(
          <div
            className={`${styles.brand} ${styles.ghost}`}
            style={{ left: ghost.x, top: ghost.y }}
            aria-hidden="true"
          >
            <Brand />
          </div>,
          document.body,
        )}
    </div>
  );
}

export default function ShdStory() {
  return (
    <div className={styles.story}>
      <div className={styles.comparison}>
        <section className={styles.chapter}>
          <h2>The starting point</h2>
          <p>
            I used{" "}
            <a
              href="https://mxswat.github.io/mx-division-builds/#/"
              target="_blank"
              rel="noreferrer"
            >
              MXSwat’s build tool ↗
            </a>{" "}
            to plan my builds. Each armour slot opens a dialog to choose a
            brand, repeating the same clicks for every piece.
          </p>
          <LoadoutExample mode="click" />
        </section>
        <section className={styles.chapter}>
          <h2>Drag and drop</h2>
          <p>
            My idea: keep brands visible and drag them directly into armour
            slots.
          </p>
          <LoadoutExample mode="drag" />
        </section>
      </div>
      <section className={styles.threeChapter}>
        <h2>Learning the dark arts of Three.js</h2>
        <p>
          I wanted the menu to be a 3D scene, with objects opening different
          parts of the site. I even commissioned models for it. The stash became
          a way into the build tools: approach the case, open the lid, then
          choose where to go.
        </p>
        <StashExample />
        <p>
          It looked cool, but was awkward to build and tiring to use. The
          animation became a wait every time I just wanted to use the website,
          and blending the 3D scene into a 2D page never felt seamless.
          Eventually, I moved back to a regular menu.
        </p>
      </section>
      <section className={styles.next}>
        <p>
          I also wanted players to save, share, and browse builds. I built a
          Street View-style raid explorer to help players learn the map.
        </p>
      </section>
    </div>
  );
}
