"use client";

import Image from "next/image";
import { useEffect, useRef, useState } from "react";
import type { Project } from "@/data/projects";
import { ProjectIcon } from "./portfolio-icons";
import { ProjectContent } from "./project-content";
import { CityCraftShowcase } from "./citycraft-showcase";
import { HearthwildShowcase } from "./hearthwild-showcase";
import { ForzaShowcase } from "./forza/forza-showcase";
import styles from "./desktop-environment.module.css";

export function ForzaWindow({ project }: { project: Project }) {
  return (
    <div className={styles.forza}>
      <aside className={styles.forzaSidebar}>
        <div className={styles.forzaBrand}>
          <ProjectIcon id="forza" size="toolbar" />
          <strong>Horizon Tuner</strong>
        </div>
        <div className={styles.forzaStack}>
          <span>BUILT WITH</span>
          <ul aria-label="Technologies">
            {project.skills.map((skill) => (
              <li key={skill}>{skill}</li>
            ))}
          </ul>
        </div>
        <div className={styles.sidebarFoot}>Forza Horizon 6</div>
      </aside>
      <article className={styles.forzaMain} aria-labelledby="forza-title">
        <header className={styles.forzaIntro}>
          <h2 id="forza-title">{project.name}</h2>
          <p>{project.description}</p>
        </header>
        <div className={styles.forzaFeatures}>
          <section>
            <h3>About the project</h3>
            {project.about?.map((paragraph) => (
              <p key={paragraph}>{paragraph}</p>
            ))}
          </section>
        </div>
        <ForzaShowcase />
      </article>
    </div>
  );
}

export function MinecraftWindow({ projects }: { projects: Project[] }) {
  // Title and panorama are from the locally installed Java Edition 1.20.1 assets.
  const [selected, setSelected] = useState<Project | null>(null);
  const content = useRef<HTMLDivElement>(null);
  const menu = useRef<HTMLButtonElement>(null);
  useEffect(() => {
    if (selected)
      content.current
        ?.querySelector<HTMLElement>("[data-project-heading]")
        ?.focus({ preventScroll: true });
  }, [selected]);
  function back() {
    setSelected(null);
    requestAnimationFrame(() => menu.current?.focus({ preventScroll: true }));
  }
  return (
    <div
      className={styles.minecraft}
      onKeyDown={(event) => {
        if (event.key === "Escape" && selected) {
          event.preventDefault();
          event.stopPropagation();
          back();
        }
      }}
    >
      <Image
        src="/images/minecraft-panorama.png"
        alt=""
        fill
        sizes="(max-width: 700px) 95vw, 850px"
        className={styles.minecraftBackground}
      />
      {selected ? (
        <div className={styles.minecraftDetail}>
          <div
            ref={content}
            className={
              selected.id === "citycraft" || selected.id === "hearthwild"
                ? styles.minecraftShowcaseScroll
                : styles.projectScroll
            }
          >
            {selected.id === "citycraft" ? (
              <CityCraftShowcase project={selected} />
            ) : selected.id === "hearthwild" ? (
              <HearthwildShowcase project={selected} />
            ) : (
              <ProjectContent project={selected} />
            )}
          </div>
          <button className={styles.minecraftButton} onClick={back}>
            Back to main menu
          </button>
        </div>
      ) : (
        <div className={styles.minecraftMenu}>
          <div className={styles.minecraftLogo}>
            <h2>
              <Image
                src="/images/minecraft-title.png"
                alt="Minecraft"
                width={1024}
                height={256}
                sizes="(max-width: 700px) 85vw, 460px"
              />
            </h2>
            <span>RYAN’S WORLDS</span>
          </div>
          <div className={styles.minecraftButtons}>
            {projects.map((project, i) => (
              <button
                ref={i === 0 ? menu : undefined}
                key={project.id}
                className={styles.minecraftButton}
                onClick={() => setSelected(project)}
              >
                {project.name}
              </button>
            ))}
          </div>
          <div className={styles.minecraftFooter}>
            <span>Java · Custom worlds</span>
            <span>Two worlds to explore</span>
          </div>
        </div>
      )}
    </div>
  );
}
