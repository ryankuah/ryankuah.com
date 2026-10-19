"use client";

import Image from "next/image";
import dynamic from "next/dynamic";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import {
  useEffect,
  useRef,
  useState,
  type ReactNode,
  type MouseEvent,
} from "react";
import {
  getProjectSections,
  isProjectPublished,
  type Project,
} from "@/data/projects";
import { isPlainClick } from "@/lib/navigation";
import { Icon } from "./portfolio-icons";
import styles from "./web-projects.module.css";

const VisionVerseStory = dynamic(
  () => import("./visionverse/visionverse-story"),
);
const ShdStory = dynamic(() => import("./shd/shd-story"));
const MinluyenStory = dynamic(() => import("./minluyen/minluyen-story"));
const stories: Record<string, ReactNode> = {
  visionverse: <VisionVerseStory />,
  shd: <ShdStory />,
  minluyen: <MinluyenStory />,
};

function GitIcon() {
  return (
    <svg
      width="20"
      height="20"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <circle cx="7" cy="5" r="2" />
      <circle cx="7" cy="19" r="2" />
      <circle cx="17" cy="7" r="2" />
      <path d="M7 7v10m10-8v2c0 4-10 1-10 6" />
    </svg>
  );
}

function ProjectFavicon({ project }: { project: Project }) {
  return project.favicon ? (
    <Image
      src={project.favicon}
      width={32}
      height={32}
      alt=""
      className={styles.favicon}
    />
  ) : (
    <Icon name="web" className={styles.favicon} />
  );
}

function projectHref(project?: Project) {
  return project
    ? `/web?${new URLSearchParams({ project: project.id })}`
    : "/web";
}

export function WebProjects({ projects }: { projects: Project[] }) {
  const params = useSearchParams();
  const selected = projects.find(
    (project) => project.id === params.get("project"),
  );
  const [menuOpen, setMenuOpen] = useState(false);
  const menu = useRef<HTMLDialogElement>(null);
  const root = useRef<HTMLDivElement>(null);
  const scrollArea = useRef<HTMLDivElement>(null);
  const previousProject = useRef<string | undefined>(undefined);
  const listingScroll = useRef(0);

  // Old theme links still open the collection or their selected project.
  useEffect(() => {
    if (!params.has("view")) return;
    const next = new URLSearchParams(params.toString());
    next.delete("view");
    window.history.replaceState(null, "", next.size ? `/web?${next}` : "/web");
  }, [params]);

  function navigate(event: MouseEvent<HTMLAnchorElement>) {
    if (!isPlainClick(event)) return;
    event.preventDefault();
    menu.current?.close();
    if (!selected) listingScroll.current = scrollArea.current?.scrollTop ?? 0;
    window.history.pushState(null, "", event.currentTarget.href);
  }

  useEffect(() => {
    const frame = requestAnimationFrame(() => {
      const previous = previousProject.current;
      const returning = previous && !selected;
      scrollArea.current?.scrollTo({
        top: returning ? listingScroll.current : 0,
      });
      const focusTarget = returning
        ? root.current?.querySelector<HTMLElement>(
            `[data-project-id="${previous}"]`,
          )
        : root.current?.querySelector<HTMLElement>("[data-web-heading]");
      focusTarget?.focus({ preventScroll: true });
      previousProject.current = selected?.id;
    });
    return () => cancelAnimationFrame(frame);
  }, [selected]);

  return (
    <div
      className={styles.site}
      ref={root}
      onKeyDown={(event) => {
        if (event.key === "Escape" && selected) {
          event.stopPropagation();
          window.history.pushState(null, "", projectHref());
        }
      }}
    >
      <dialog
        ref={menu}
        id="web-navigation"
        aria-label="Portfolio navigation"
        className={styles.drawer}
        onClose={() => setMenuOpen(false)}
        onKeyDown={(event) => {
          if (event.key === "Escape") event.stopPropagation();
        }}
        onClick={(event) => {
          if (event.target === event.currentTarget) menu.current?.close();
        }}
      >
        <aside className={styles.sidebar}>
          <div className={styles.drawerHeader}>
            <Link href="/" aria-label="Return to campfire">
              <Image src="/icon.svg" width={28} height={28} alt="" />
            </Link>
            <button
              type="button"
              className={styles.closeButton}
              aria-label="Close navigation"
              autoFocus
              onClick={() => menu.current?.close()}
            >
              <Icon name="close" className="size-4" />
            </button>
          </div>
          <nav aria-label="Portfolio navigation" className={styles.navigation}>
            <a href="/web" onClick={navigate} aria-current="page">
              <GitIcon />
              <span>Web apps</span>
            </a>
            <Link href="/mobile">
              <Icon name="mobile" />
              <span>Mobile apps</span>
            </Link>
            <Link href="/desktop">
              <Icon name="desktop" />
              <span>Desktop apps</span>
            </Link>
          </nav>
          <div className={styles.sidebarBottom}>
            <span className={styles.projectCount}>
              {String(projects.length).padStart(2, "0")} projects
            </span>
          </div>
        </aside>
      </dialog>
      <div className={styles.workspace} ref={scrollArea}>
        <header className={styles.topbar}>
          <button
            type="button"
            className={styles.menuButton}
            aria-label="Open navigation"
            aria-expanded={menuOpen}
            aria-controls="web-navigation"
            aria-haspopup="dialog"
            onClick={() => {
              menu.current?.showModal();
              setMenuOpen(true);
            }}
          >
            <svg
              width="20"
              height="20"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.5"
              strokeLinecap="round"
              aria-hidden="true"
            >
              <path d="M4 6h16M4 12h16M4 18h16" />
            </svg>
          </button>
          <nav aria-label="Breadcrumb" className={styles.breadcrumb}>
            <Link
              href={selected ? "/web" : "/"}
              onClick={selected ? navigate : undefined}
              className={styles.owner}
              aria-label={selected ? "Web apps" : "Return to campfire"}
            >
              <Image src="/icon.svg" width={36} height={36} alt="" />
              <span>ryankuah</span>
            </Link>
            {selected && (
              <>
                <span className={styles.slash} aria-hidden="true">
                  /
                </span>
                <strong aria-current="page">{selected.name}</strong>
              </>
            )}
          </nav>
        </header>
        <div className={styles.content} key={selected?.id ?? "collection"}>
          {selected ? (
            <>
              <a
                href={projectHref()}
                onClick={navigate}
                className={styles.back}
              >
                <Icon name="back" className="size-4" />
                All projects
              </a>
              <article className={styles.detail}>
                <div className={styles.detailIntro}>
                  <div className={styles.detailTitle}>
                    <ProjectFavicon project={selected} />
                    <h1 tabIndex={-1} data-web-heading data-view-heading>
                      {selected.name}
                    </h1>
                  </div>
                  <p className={styles.projectDescription}>
                    {isProjectPublished(selected.id)
                      ? selected.description
                      : "Coming soon"}
                  </p>
                </div>
                {isProjectPublished(selected.id) && (
                  <div className={styles.readme}>
                    <div className={styles.readmeHeader}>README.md</div>
                    <div className={styles.readmeContent}>
                      {stories[selected.id] ?? (
                        <div className={styles.detailBody}>
                          {getProjectSections(selected).map((section) => (
                            <section key={section.heading ?? "introduction"}>
                              {section.heading && <h2>{section.heading}</h2>}
                              {section.paragraphs.map((paragraph) => (
                                <p key={paragraph}>{paragraph}</p>
                              ))}
                            </section>
                          ))}
                          <section>
                            <h2>Stack</h2>
                            <ul className={styles.skills}>
                              {selected.skills.map((skill) => (
                                <li key={skill}>{skill}</li>
                              ))}
                            </ul>
                          </section>
                          {selected.link && (
                            <a
                              className={styles.action}
                              href={selected.link}
                              target="_blank"
                              rel="noreferrer"
                            >
                              {selected.linkLabel || "Visit project"}
                              <Icon name="arrow" className="size-4" />
                            </a>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </article>
            </>
          ) : (
            <>
              <h1
                className="sr-only"
                tabIndex={-1}
                data-web-heading
                data-view-heading
              >
                Web projects
              </h1>
              <div className={styles.repositories}>
                <div className={styles.repoToolbar}>
                  <GitIcon />
                  <span>Web projects</span>
                  <span>{projects.length} repositories</span>
                </div>
                {projects.map((project) => (
                  <a
                    href={
                      isProjectPublished(project.id)
                        ? projectHref(project)
                        : undefined
                    }
                    onClick={
                      isProjectPublished(project.id) ? navigate : undefined
                    }
                    aria-disabled={!isProjectPublished(project.id) || undefined}
                    className={styles.repository}
                    data-project-id={project.id}
                    key={project.id}
                    aria-label={
                      isProjectPublished(project.id)
                        ? `Open ${project.name}`
                        : `${project.name} — Coming soon`
                    }
                  >
                    <div className={styles.repoTitle}>
                      <ProjectFavicon project={project} />
                      <h2>{project.name}</h2>
                      {isProjectPublished(project.id) ? (
                        <Icon name="arrow" className={styles.repoArrow} />
                      ) : (
                        <span className={styles.comingSoon}>Coming soon</span>
                      )}
                    </div>
                    {isProjectPublished(project.id) && (
                      <>
                        <p>{project.description}</p>
                        <div className={styles.repoSkills}>
                          {project.skills.map((skill) => (
                            <span key={skill}>{skill}</span>
                          ))}
                        </div>
                      </>
                    )}
                  </a>
                ))}
              </div>
              <footer className={styles.footer}>
                <span>Ryan Kuah</span>
                <span>Web development</span>
              </footer>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
