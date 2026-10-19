"use client";

import { useState } from "react";
import type { Project } from "@/data/projects";
import { ProjectIcon } from "./portfolio-icons";
import styles from "./desktop-environment.module.css";

export function TrashWindow({ projects }: { projects: Project[] }) {
  const [selected, setSelected] = useState<Project | null>(null);

  return (
    <div className={styles.trash}>
      <div className={styles.trashGrid} aria-label="Trash projects">
        {projects.map((project) => (
          <button
            key={project.id}
            type="button"
            data-app-id={project.id}
            aria-label={`Open ${project.name}`}
            aria-pressed={selected?.id === project.id}
            aria-controls="trash-details"
            draggable={false}
            onDragStart={(event) => event.preventDefault()}
            onClick={() => setSelected(project)}
          >
            <ProjectIcon id={project.id} size="desktop" />
            <span>{project.name}</span>
          </button>
        ))}
      </div>
      <section
        key={selected?.id ?? "empty"}
        id="trash-details"
        aria-label={selected ? `${selected.name} details` : "Project details"}
        className={styles.trashDetails}
        tabIndex={selected ? 0 : undefined}
      >
        {selected && (
          <div className={styles.trashDetailsText}>
            <h3>{selected.name}</h3>
            {(
              selected.about ?? [
                selected.description,
                selected.built,
                selected.lesson,
              ]
            ).map((paragraph) => (
              <p key={paragraph}>{paragraph}</p>
            ))}
            <p className={styles.trashSkills}>{selected.skills.join(" · ")}</p>
          </div>
        )}
      </section>
    </div>
  );
}
