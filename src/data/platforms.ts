import { projects } from "./projects";

export const platforms = {
  web: {
    title: "Web development",
    projectIds: ["visionverse", "shd", "minluyen"],
  },
  mobile: {
    title: "Mobile development",
    projectIds: ["suiyu", "hayday", "pocket-worlds"],
  },
  desktop: {
    title: "Desktop apps",
    projectIds: [
      "aria",
      "shd-app",
      "forza",
      "kitty",
      "citycraft",
      "hearthwild",
      "multidress",
      "game",
      "combat",
      "farm-agent",
    ],
  },
};

export type PlatformId = keyof typeof platforms;

export function getPlatformProjects(platform: PlatformId) {
  return platforms[platform].projectIds.flatMap((id) => {
    const project = projects.find((item) => item.id === id);
    return project ? [project] : [];
  });
}
