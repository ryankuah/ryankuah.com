"use client";

import Image from "next/image";
import { useId, useState } from "react";
import { SwiftletScene } from "./swiftlet-scene";
import characters from "./name-characters.json";
import styles from "./minluyen-story.module.css";

const asset = (name: string) => `/images/minluyen/${name}`;

function Wordmark() {
  const id = useId();
  return (
    <div className={styles.wordmark} aria-label="明練家 Minluyen">
      {[
        { name: "chinese", box: "262.35 145.14 1249.3 328.76" },
        { name: "english", box: "332.625 484.68 1108.75 316.79" },
      ].map(({ name, box }) => (
        <svg key={name} viewBox={box} aria-hidden="true">
          <defs>
            <filter id={`${id}-${name}`} colorInterpolationFilters="sRGB">
              <feColorMatrix
                type="matrix"
                values="0 0 0 0 0.42745 0 0 0 0 0.25882 0 0 0 0 0.13333 0.2126 0.7152 0.0722 0 0"
              />
            </filter>
          </defs>
          <image
            href={asset("minluyen-wordmark-mask.png")}
            width="1774"
            height="887"
            filter={`url(#${id}-${name})`}
          />
        </svg>
      ))}
    </div>
  );
}

function Scenery({
  birds = false,
  paused = false,
  original = false,
}: {
  birds?: boolean;
  paused?: boolean;
  original?: boolean;
}) {
  return (
    <div
      className={`${styles.scenery} ${original ? styles.originalScenery : ""}`}
    >
      <div className={styles.aperture}>
        <div className={styles.mountain}>
          <Image
            src={asset("swiftlet-mountain-clear-sky.webp")}
            alt="Forested mountains beneath an open sky"
            loading={birds ? "eager" : "lazy"}
            fill
            sizes="(max-width: 700px) 90vw, 560px"
          />
        </div>
        {birds && <SwiftletScene paused={paused} />}
        {original && (
          <>
            <Image
              className={styles.seal}
              src={asset("minluyen-seal-wood-burgundy.png")}
              alt=""
              fill
              sizes="350px"
            />
            <Wordmark />
          </>
        )}
      </div>
      {original && (
        <>
          <span
            className={`${styles.inscription} ${styles.inscriptionLeft}`}
            lang="zh-Hant"
          >
            厚德載物五洲行
          </span>
          <span
            className={`${styles.inscription} ${styles.inscriptionRight}`}
            lang="zh-Hant"
          >
            自強不息練精華
          </span>
        </>
      )}
    </div>
  );
}

function BirdsExample() {
  const [paused, setPaused] = useState(false);
  return (
    <figure className={`${styles.example} ${styles.birdExample}`}>
      <div className={`${styles.stage} ${styles.birdStage}`}>
        <Scenery birds paused={paused} />
      </div>
      <figcaption className={styles.toolbar}>
        <span>Move across the sky to scatter the flock.</span>
        <button
          type="button"
          onClick={() => setPaused(!paused)}
          aria-pressed={paused}
        >
          {paused ? "Resume birds" : "Pause birds"}
        </button>
      </figcaption>
    </figure>
  );
}

function OpeningExample() {
  const [open, setOpen] = useState(false);
  return (
    <figure className={styles.example}>
      <div className={`${styles.stage} ${styles.opening}`} data-open={open}>
        <div className={styles.collection} aria-hidden={!open}>
          <span>MINLUYEN</span>
          <h3>Bird’s nest collection</h3>
          <div className={styles.products}>
            {[
              { image: "1721682.png", weight: "100g" },
              { image: "1721683.png", weight: "150g" },
            ].map((product) => (
              <div key={product.weight}>
                <Image
                  src={asset(product.image)}
                  alt={`Minluyen ${product.weight} bird’s nest box`}
                  width={400}
                  height={400}
                  sizes="(max-width: 700px) 38vw, 320px"
                />
                <span>{product.weight}</span>
              </div>
            ))}
          </div>
        </div>
        <div className={styles.lids} aria-hidden="true">
          {(["left", "right"] as const).map((side) => (
            <div className={`${styles.lid} ${styles[side]}`} key={side}>
              <div className={styles.lidFace}>
                <Scenery original />
              </div>
              <div className={styles.lidEdge} />
            </div>
          ))}
        </div>
      </div>
      <figcaption className={styles.toolbar}>
        <span>
          {open
            ? "The panels fold away to reveal the collection."
            : "A small example of the site’s opening."}
        </span>
        <button
          type="button"
          onClick={() => setOpen(!open)}
          aria-expanded={open}
        >
          {open ? "Reset opening" : "Open the box"}
        </button>
      </figcaption>
    </figure>
  );
}

function NameExample() {
  const [selected, setSelected] = useState(0);
  const entry = characters[selected];
  const panelId = useId();
  return (
    <div className={styles.folio}>
      <div className={styles.character} aria-hidden="true">
        <span key={entry.character} lang="zh-Hant">
          {entry.character}
        </span>
        <small>{entry.roman}</small>
      </div>
      <div className={styles.folioCopy}>
        <span className={styles.runningTitle}>MINLUYEN / THE NAME</span>
        <div
          className={styles.characterPicker}
          role="group"
          aria-label="Explore the Minluyen name"
        >
          {characters.map((item, index) => (
            <button
              type="button"
              key={item.character}
              aria-pressed={selected === index}
              aria-controls={panelId}
              onClick={() => setSelected(index)}
            >
              {item.label}
            </button>
          ))}
        </div>
        <div
          id={panelId}
          aria-live="polite"
          aria-atomic="true"
          className={styles.folioEntry}
        >
          <div key={entry.character}>
            <h3>{entry.title}</h3>
            <p>{entry.description}</p>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function MinluyenStory() {
  return (
    <div className={styles.story}>
      <BirdsExample />
      <section className={styles.chapter}>
        <h2>From Game AI to a flock of birds</h2>
        <p>
          Taking a Game AI class at school introduced me to different techniques
          for making movement feel believable. Flocking behaviour stood out: a
          few simple rules could make individual birds feel like part of a
          living group.
        </p>
        <p>
          I brought that idea into Minluyen’s main screen. Each bird keeps some
          distance from its neighbours, follows their direction, and stays close
          to the flock. Together with bursts of wingbeats and gliding, those
          behaviours make the scene feel alive. Moving the cursor through the
          sky scatters the birds, then they find their way back to each other.
        </p>
      </section>
      <section className={styles.chapter}>
        <h2>Opening a box</h2>
        <p>
          I wanted entering the website to feel like opening a box. The two
          halves of the main screen fold away, revealing the collection inside.
          A little depth and a gentle transition give it the elegant feeling I
          was looking for.
        </p>
        <p>
          SHDNetwork had taught me how easily an elaborate entrance could become
          tiring to use. This time, I wanted to keep the gesture simple: one
          opening, then straight into the content. The animation should set the
          mood without becoming an obstacle.
        </p>
        <OpeningExample />
      </section>
      <section className={styles.chapter}>
        <h2>The smaller details</h2>
        <p>
          The same visual language continues inside the site. This small booklet
          lets visitors explore the three characters in Minluyen’s name,
          changing the illustration and its accompanying story together.
        </p>
        <NameExample />
        <p className={styles.caption}>
          Interactive excerpts adapted from the app, using its original artwork,
          flocking simulation, and name descriptions.
        </p>
      </section>
    </div>
  );
}
