import type { Project } from "@/data/projects";
import styles from "./citycraft-showcase.module.css";
import atlasStyles from "./hearthwild-showcase.module.css";

const atlasUrl = "/minecraft/hearthwild/planner/index.html";

export function HearthwildShowcase({ project }: { project: Project }) {
  return (
    <article className={styles.showcase} aria-labelledby="title-hearthwild">
      <header className={styles.header}>
        <h2 id="title-hearthwild" tabIndex={-1} data-project-heading>
          {project.name}
        </h2>
      </header>
      <div className={`${styles.about} ${styles.intro}`}>
        {project.about?.map((paragraph) => (
          <p key={paragraph}>{paragraph}</p>
        ))}
      </div>
      <iframe
        className={atlasStyles.map}
        src={`${atlasUrl}?embed=1`}
        title="The Hearthwild interactive world planner"
        loading="lazy"
      />
    </article>
  );
}
