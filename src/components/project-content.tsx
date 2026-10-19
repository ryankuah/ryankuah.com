import Image from "next/image";
import { getProjectSections, type Project } from "@/data/projects";
import { Icon, ProjectIcon } from "./portfolio-icons";

// Projects whose image is a logo: shown whole on its own backdrop.
const logoBackdrops: Record<string, string> = {
  aria: "bg-[#ffffff04]",
  "shd-app": "bg-[#1a1a2e]",
};

// `compact` is the phone app's layout.
export function ProjectContent({
  project,
  compact = false,
}: {
  project: Project;
  compact?: boolean;
}) {
  const logo = logoBackdrops[project.id];
  const sections =
    project.about || project.story ? getProjectSections(project) : [];
  return (
    <article aria-labelledby={`title-${project.id}`}>
      <header>
        <div className="flex items-center gap-3">
          {compact && project.id === "suiyu" && (
            <ProjectIcon id={project.id} size="desktop" />
          )}
          <h2
            id={`title-${project.id}`}
            tabIndex={-1}
            data-project-heading
            className={
              compact
                ? "font-sans text-[25px] font-medium tracking-[-1px] @max-[280px]:text-[21px]"
                : "text-[42px] @max-[480px]:text-[30px]"
            }
          >
            {project.name}
          </h2>
        </div>
      </header>
      {project.image && (
        <div
          data-project-image
          className={`overflow-hidden rounded-md ${logo ?? "bg-[#ffffff04]"} ${compact ? "my-5 h-27.5" : "my-6.25 h-41.25"}`}
        >
          <Image
            src={project.image}
            alt={project.imageAlt || project.name}
            width={640}
            height={360}
            sizes="(max-width:700px) 85vw, 600px"
            className={`size-full ${logo ? "object-contain p-2.5" : "object-cover"}`}
          />
        </div>
      )}
      {sections.length > 0 ? (
        <div
          data-project-story
          className={`max-w-[65ch] ${compact ? "mt-6 space-y-7" : "mt-7.5 space-y-9"}`}
        >
          {!project.about && (
            <p className="text-[15px]/[1.8] text-[var(--project-body,#bdcdc4)]">
              {project.description}
            </p>
          )}
          {sections.map((section) => (
            <section key={section.heading ?? "introduction"}>
              {section.heading && (
                <h3
                  className={`mb-4 text-[var(--project-heading,#e4d8c5)] ${compact ? "text-[21px]" : "text-[25px]"}`}
                >
                  {section.heading}
                </h3>
              )}
              <div
                className={`space-y-4 text-[var(--project-body,#bdcdc4)] ${compact ? "text-[13px]/[1.85]" : "text-[14px]/[1.85]"}`}
              >
                {section.paragraphs.map((paragraph) => (
                  <p key={paragraph}>{paragraph}</p>
                ))}
              </div>
            </section>
          ))}
        </div>
      ) : (
        <dl
          className={`flex flex-col ${compact ? "mt-6.25 gap-5" : "mt-7.5 gap-6.25"}`}
        >
          {[
            ["Built", project.built],
            ["Learned", project.lesson],
          ].map(([term, detail]) => (
            <div
              key={term}
              className={
                compact
                  ? "block"
                  : "grid grid-cols-[60px_1fr] gap-5 @max-[480px]:block"
              }
            >
              <dt
                className={`pt-0.5 text-[11px] text-[var(--project-label,#cbb08e)] ${compact ? "mb-1.75" : "@max-[480px]:mb-2"}`}
              >
                {term}
              </dt>
              <dd
                className={`text-[var(--project-body,#bdcdc4)] ${compact ? "text-[12px]/[1.8]" : "text-[13px]/[1.85] @max-[480px]:text-[12px]"}`}
              >
                {detail}
              </dd>
            </div>
          ))}
        </dl>
      )}
      <ul
        className={`flex flex-wrap border-t border-line pt-4.5 text-[var(--project-skills,#829f90)] ${compact ? "mt-5.5 gap-x-3 gap-y-1.75 text-[9px]" : "mt-6.75 gap-x-5 gap-y-2.5 text-[10px]"}`}
        aria-label="Skills"
      >
        {project.skills.map((skill) => (
          <li key={skill}>{skill}</li>
        ))}
      </ul>
      {project.link && (
        <a
          className="mt-5.5 inline-flex items-center gap-3 text-[11px] text-[var(--project-link,#b1d6c6)]"
          href={project.link}
          target="_blank"
          rel="noreferrer"
        >
          {project.linkLabel || "Visit project"}
          <Icon name="arrow" className="size-4" />
        </a>
      )}
    </article>
  );
}
