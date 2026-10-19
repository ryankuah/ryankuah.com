"use client";

import { Suspense } from "react";
import type { Project } from "@/data/projects";
import type { PlatformId } from "@/data/platforms";
import { DesktopEnvironment } from "./desktop-environment";
import { MobileLockScreen } from "./mobile-lock-screen";
import { WebProjects } from "./web-projects";

export function PlatformSurface({
  platform,
  projects,
  goHome,
  entering,
}: {
  platform: PlatformId;
  projects: Project[];
  goHome: () => void;
  entering: boolean;
}) {
  if (platform === "mobile") {
    return <MobileLockScreen goHome={goHome} entering={entering} />;
  }

  return (
    <div className="absolute inset-0 z-3" inert={entering}>
      {platform === "desktop" ? (
        <DesktopEnvironment projects={projects} goHome={goHome} />
      ) : (
        <Suspense fallback={<div className="absolute inset-0 bg-[#0d1117]" />}>
          <WebProjects projects={projects} />
        </Suspense>
      )}
    </div>
  );
}
