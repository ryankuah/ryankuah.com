import { ariaChapters } from "./aria-story";

// Portfolio availability is separate from the actual project's development state.
// Keep unpublished stories and previews in place while their coverage is prepared.
export function isProjectPublished(id: string) {
  return id === "aria" || id === "shd";
}

export type ChapterId = "tools" | "connection" | "worlds" | "curiosity";
export type Project = {
  id: string;
  name: string;
  chapter: ChapterId;
  description: string;
  about?: string[];
  built: string;
  lesson: string;
  story?: { heading: string; paragraphs: string[] }[];
  skills: string[];
  state: string;
  favicon?: string;
  image?: string;
  imageAlt?: string;
  link?: string;
  linkLabel?: string;
};
export const chapters: {
  id: ChapterId;
  number: string;
  title: string;
  featured: string;
}[] = [
  {
    id: "tools",
    number: "01",
    title: "Apps & tools",
    featured: "aria",
  },
  {
    id: "connection",
    number: "02",
    title: "Connection",
    featured: "suiyu",
  },
  {
    id: "worlds",
    number: "03",
    title: "Games & worlds",
    featured: "citycraft",
  },
  {
    id: "curiosity",
    number: "04",
    title: "Data & experiments",
    featured: "seerstone",
  },
];
export const projects: Project[] = [
  {
    id: "aria",
    name: "Aria",
    chapter: "tools",
    description: "A native macOS browser built around how I browse.",
    built:
      "A SwiftUI and WebKit browser with tabs, bookmarks, history, userscripts, and a direct macOS distribution pipeline.",
    lesson:
      "Integrating browser controls with WebKit navigation, permissions, downloads, and tab lifecycles.",
    story: ariaChapters.map(({ title, paragraphs, chat }) => ({
      heading: title,
      paragraphs: [...paragraphs, ...(chat?.reveal ?? [])],
    })),
    skills: ["SwiftUI", "WebKit", "macOS", "App distribution"],
    state: "Ongoing project",
    image: "/images/aria.png",
    imageAlt: "Aria’s blue and pink app icon",
    link: "https://github.com/ryankuah/browser/releases",
    linkLabel: "View releases",
  },
  {
    id: "hayday",
    name: "Hayday Companion",
    chapter: "tools",
    description:
      "An offline reference for recipes, machines, and the next thing to unlock on the farm.",
    built:
      "Searchable goods, production machines, recipe relationships, and progression data in an offline-first mobile app.",
    lesson:
      "Structuring related records, building reliable search, and making an app work offline.",
    skills: ["React Native", "Expo", "Offline data", "Search"],
    state: "App project",
  },
  {
    id: "shd",
    favicon: "/images/favicons/shd.png",
    name: "SHD Network",
    chapter: "tools",
    description:
      "A build planner and raid explorer for Tom Clancy’s The Division 2.",
    about: [
      "SHD Network helps Division 2 players put together equipment builds, inspect their attributes and damage, and save and share their setups. The aim is to make assembling a build more direct with drag-and-drop equipment selection, and to let players browse builds made by others.",
      "A separate speedrunning section covers the game’s raids. It includes a Street View-style explorer that lets players move through raid locations and learn about the map before a run.",
    ],
    built:
      "An equipment catalogue, live attribute totals, damage calculations, saved builds, shareable links, and a Street View-style raid explorer.",
    lesson:
      "Keeping editable state separate from saved builds and calculating derived attributes.",
    skills: ["Next.js", "Convex", "State management", "Data modelling"],
    state: "Web project",
  },
  {
    id: "shd-app",
    name: "SHD Speedrun Overlay",
    chapter: "tools",
    description:
      "An Electron companion to SHD Network for coordinating Division 2 raid speedruns.",
    built:
      "A raid-code connection flow, shared ready states and countdowns, a transparent always-on-top overlay, configurable global shortcuts, and optional raid session recording.",
    lesson:
      "Coordinating live raid state across desktop windows, global keyboard shortcuts, and screen recording without interrupting the game.",
    skills: [
      "Electron",
      "React",
      "Convex",
      "Screen recording",
      "Global shortcuts",
    ],
    state: "Desktop companion",
    image: "/images/shd-overlay.png",
    imageAlt: "SHD Speedrun Overlay’s orange targeting-ring app icon",
  },
  {
    id: "forza",
    name: "Forza Horizon Tuner",
    chapter: "tools",
    description:
      "A desktop telemetry tool for understanding your driving and tuning cars in Forza Horizon 6.",
    about: [
      "Forza Horizon Tuner receives driving telemetry from Forza Horizon 6 over UDP, letting players inspect live data, save driving sessions, and review runs with map playback. It is designed to make the game’s many tuning parameters easier to understand through what happens on the road.",
      "The aim is to help players find a setup that suits their driving style and input device. Reviewing how a car behaves provides a starting point for tuning decisions; automatic tuning advice is still exploratory.",
    ],
    built:
      "UDP telemetry ingestion, local session storage, map playback, and a first pass at tuning advice.",
    lesson:
      "Capturing real-time telemetry and making recorded sessions useful through playback and visualisation.",
    skills: ["Electron", "UDP", "SQLite", "Data visualisation"],
    state: "Desktop prototype",
  },
  {
    id: "eink",
    name: "E-ink Weather",
    chapter: "tools",
    description:
      "The weather and time on a small Raspberry Pi e-paper display.",
    built:
      "A shared renderer for local previews and a Waveshare e-paper display, with scheduled refreshes.",
    lesson:
      "Designing around display contrast, slow refreshes, and hardware limitations.",
    skills: ["Python", "Raspberry Pi", "Hardware"],
    state: "Hardware experiment",
  },
  {
    id: "kitty",
    name: "Claude Sessions",
    chapter: "tools",
    description: "A workspace and saved-session picker for Claude in Kitty.",
    about: [
      "Claude Sessions is a workspace and saved-session picker for Claude in Kitty. Each project opens in a reusable tab with an editor beside Claude, keeping the code and conversation together.",
      "The session picker resumes saved Claude conversations within the current project. Shortcuts make it easier to switch between project tabs and move between the editor and Claude panes.",
    ],
    built:
      "Project workspaces with an editor beside Claude, saved Claude session selection, reusable Kitty tabs, and pane navigation shortcuts.",
    lesson:
      "Integrating project and session management into an existing terminal workflow.",
    skills: ["Python", "CLI tools", "Workflow automation"],
    state: "Personal tool",
  },
  {
    id: "suiyu",
    name: "随遇",
    chapter: "connection",
    description:
      "A social app for couples in China to share everyday life and build a closer relationship.",
    about: [
      "随遇 is a social app for couples in China to share everyday life and feel closer, with a little white dog as its mascot.",
    ],
    story: [
      {
        heading: "My first mobile app",
        paragraphs: [
          "This is my first foray into mobile development. I signed up for an Apple Developer subscription and started building 随遇, learning how mobile apps work as I went. It is still in development, and the process has given me a lot to think about beyond the web projects I had built before.",
        ],
      },
      {
        heading: "Designing for touch",
        paragraphs: [
          "Building for a touch screen has made me pay attention to interactions I used to take for granted. Where a button sits, how easy it is to tap, and how a screen responds to a gesture all affect how comfortable the app feels to use.",
          "The keyboard is a good example. When it opens, there is suddenly much less room. I have to think about keeping the active input visible, how the content scrolls around it, and how someone dismisses it without interrupting what they are doing.",
        ],
      },
      {
        heading: "Local storage and offline use",
        paragraphs: [
          "The web apps I had built mostly assumed an internet connection. With 随遇, I am learning to think about what lives on the phone and what depends on the server. Opening the app with a poor signal, or no connection at all, needs to be part of the design.",
          "That brings up a different set of questions: what should be saved locally, what should still be available offline, and what happens to changes when the connection returns? Web apps can face these questions too, but building for mobile has made them a much more central part of how I think about an app.",
        ],
      },
    ],
    built:
      "A couples app in development, combining location, feelings, and health sharing with relationship games, communication guidance, and a planned relationship certificate.",
    lesson:
      "Organising multiple features around consistent mobile navigation and shared data.",
    skills: ["Mobile development", "Native integrations", "Interaction design"],
    state: "Startup in development",
  },
  {
    id: "citycraft",
    name: "CityCraft",
    chapter: "worlds",
    description:
      "A dense, neon-lit Minecraft city inspired by cyberpunk worlds.",
    about: [
      "CityCraft is a Minecraft world-building project inspired by Blade Runner, Altered Carbon, and Cyberpunk 2077. Its focus is a cramped futuristic city, with dense buildings and neon-lit streets that players can explore at ground level.",
      "A browser-based planner and a Minecraft mod turn city layouts into generated buildings and streets. The longer-term idea is an RPG world with quests; the current work focuses on creating the city and its atmosphere.",
    ],
    built:
      "A browser-based city planner and a NeoForge mod that generates the Minecraft city from a shared layout file.",
    lesson:
      "Translating a city plan into generated geometry and checking how it feels at street level.",
    skills: ["Java", "World generation", "Spatial design", "Editor tools"],
    state: "World in progress",
    image: "/images/citycraft.png",
    imageAlt:
      "An early CityCraft development capture showing high-rise blocks above a Minecraft city at night",
  },
  {
    id: "hearthwild",
    name: "The Hearthwild",
    chapter: "worlds",
    description:
      "A fantasy Minecraft world focused on expansive terrain, landmarks, and exploration.",
    about: [
      "The Hearthwild is a Minecraft world-building experiment inspired by fantasy manhwas. The aim is a large landscape with distinct landmarks and places that invite players to wander, get lost, and discover what lies beyond the next stretch of terrain.",
      "The broader idea is an RPG world with towns, dungeons, and quests. Development reached the terrain and world-creation stage, so those gameplay systems remain part of the intended direction.",
    ],
    built:
      "Custom terrain and world generation for an expansive fantasy setting, with towns, dungeons, and quests envisioned for later development.",
    lesson:
      "Exploring how terrain scale and landmarks shape a world that players want to explore.",
    skills: ["Java", "Fabric", "Procedural generation", "Game systems"],
    state: "World experiment",
  },
  {
    id: "multidress",
    name: "MultiDress",
    chapter: "worlds",
    description:
      "A Dressmaker mod with unlimited sandbox money and co-op dress creation.",
    about: [
      "MultiDress adds a sandbox mode to Dressmaker with unlimited money, so players can experiment freely with making dresses. Players can also invite a friend and work on a dress together in co-op.",
      "The core sandbox and co-op experience works, but still needs more testing and polish. The project is paused, with the possibility of returning to it later.",
    ],
    built:
      "An unlimited-money Dressmaker sandbox, friend invitations, shared dressmaking, and platform-specific installation tools. Further testing and polish are needed.",
    lesson:
      "Synchronising shared actions while respecting an existing game’s state and platform differences.",
    skills: ["C#", "Unity modding", "Networking", "Reverse engineering"],
    state: "Paused experiment",
  },
  {
    id: "pocket-worlds",
    name: "Pocket Worlds",
    chapter: "worlds",
    description:
      "Playable mobile game prototypes inspired by the simple games shown in ads.",
    about: [
      "Pocket Worlds experiments with turning the small, immediately understandable games shown in mobile ads into games people can actually play. It grew from the frustration of downloading a game only to find that it barely resembled the ad.",
      "The prototypes explore restaurant, farming, and cooking activities within one mobile app. The goal is to develop those simple interactions into fuller games while keeping the straightforward appeal of the original ad concepts.",
    ],
    built:
      "A shared mobile launcher with separate restaurant, farm, and cooking game experiences and local progression.",
    lesson: "Connecting game actions, rendering, feedback, and saved progress.",
    skills: ["Expo", "Game loops", "3D rendering", "Local persistence"],
    state: "Game prototypes",
  },
  {
    id: "game",
    name: "A Multiplayer World",
    chapter: "worlds",
    description:
      "A multiplayer farming-world prototype combining League-style controls with a 3D Stardew-inspired setting.",
    about: [
      "A Multiplayer World explores the idea of an MMORPG with League of Legends-style controls and a focus on farming. The intended experience takes inspiration from Stardew Valley, imagined as a shared 3D world.",
      "The prototype establishes a persistent multiplayer world, world streaming, and an in-game editor. It remained an early experiment toward that farming-focused game.",
    ],
    built:
      "A Bevy desktop client, an authoritative Rust server, world streaming, and in-game editing.",
    lesson:
      "Designing shared client-server contracts and tools for editing a persistent world.",
    skills: ["Rust", "Bevy", "Networking", "Editor design"],
    state: "Abandoned experiment",
  },
  {
    id: "combat",
    name: "Combat",
    chapter: "worlds",
    description:
      "A combat prototype exploring swordplay, parrying, and more involved melee encounters.",
    about: [
      "Combat is a focused experiment in a more involved melee combat system, exploring swordplay and parrying. It provides a place to test how movement, attacks, defensive timing, and feedback could work together before building them into a larger game.",
    ],
    built:
      "A Bevy prototype with movement, camera, combat, and ability systems.",
    lesson:
      "Coordinating movement, camera behaviour, abilities, and input feedback.",
    skills: ["Rust", "Bevy", "Input systems", "Game design"],
    state: "Abandoned experiment",
  },
  {
    id: "seerstone",
    name: "Seerstone",
    chapter: "curiosity",
    description:
      "A map-based workspace for understanding San Francisco property records.",
    built:
      "Property search, maps, independent risk and maintenance-evidence scores, and links back to the source records behind them.",
    lesson:
      "Reconciling inconsistent records and making the evidence behind a score inspectable.",
    skills: ["Next.js", "Convex", "MapLibre", "Data reconciliation"],
    state: "Web project",
    image: "/images/seerstone.png",
    imageAlt:
      "Seerstone’s map of San Francisco parcels with property evidence and scores",
  },
  {
    id: "visionverse",
    favicon: "/images/favicons/visionverse.png",
    name: "VisionVerse",
    chapter: "curiosity",
    description:
      "A visual quiz builder for personalised recommendations, with no coding required.",
    about: [
      "VisionVerse lets brands build quizzes without writing code, so visitors can answer questions and receive personalised suggestions. A visual drag-and-drop editor supports multi-page quizzes, reusable templates, mobile previews, and mapping answers to results.",
      "Finished quizzes run in a public quiz player, where visitors answer questions and receive recommendations based on their responses.",
    ],
    built:
      "A drag-and-drop editor, mobile preview, multi-page quizzes, reusable templates, result mapping, and a public quiz player.",
    lesson:
      "Translating direct manipulation into structured, persistent editor state.",
    skills: ["TypeScript", "Fabric.js", "Convex", "Editor architecture"],
    state: "Ongoing project",
  },
  {
    id: "minluyen",
    favicon: "/images/favicons/minluyen.png",
    name: "Minluyen",
    chapter: "curiosity",
    description:
      "A multilingual bird’s nest storefront, with a presentation inspired by imperial colours and traditional craftsmanship.",
    about: [
      "Minluyen is a multilingual website for selling edible bird’s nest, a high-value delicacy. Its presentation draws on imperial and royal aesthetics to give the products a premium, exclusive feel.",
      "Alongside the storefront, the site shares the company’s history and educational information about bird’s nest. Product and article management tools support maintaining the catalogue and publishing that content across three languages.",
    ],
    built:
      "A premium bird’s nest storefront, company history and educational pages, three-language routing, product management, and article editing.",
    lesson:
      "Carrying content and layout across languages and building an editing workflow.",
    skills: ["Next.js", "Localisation", "Content systems", "Responsive design"],
    state: "Web project",
  },
  {
    id: "farm-agent",
    name: "Farm Agent",
    chapter: "curiosity",
    description:
      "An automation experiment for repeatedly growing and harvesting wheat in Hay Day.",
    about: [
      "Farm Agent targets wheating in Hay Day: repeatedly growing and harvesting wheat for the chance of receiving rare upgrade supplies. Wheat’s short growth cycle makes this a repetitive activity suited to an automation experiment.",
      "The project combines an iPad control system with a desktop interface for observing inventory and coordinating actions. Its aim is to automate the wheating loop; it remains an abandoned experiment.",
    ],
    built:
      "A desktop inventory interface, observed item quantities, a serialised device-control queue, and explicit actions.",
    lesson:
      "Preserving uncertainty in observed data and serialising device interactions.",
    skills: ["Electron", "Appium", "Computer vision", "Automation"],
    state: "Abandoned experiment",
  },
  {
    id: "wildfire",
    name: "Wildfire Classification",
    chapter: "curiosity",
    description:
      "Coursework comparing models for classifying wildfire intensity.",
    built:
      "Exploratory analysis, feature preparation, and comparisons of random forests, support vector machines, and neural networks.",
    lesson:
      "Separating training, validation, and test data and comparing models with appropriate metrics.",
    skills: ["Python", "scikit-learn", "PyTorch", "Model evaluation"],
    state: "Coursework",
  },
  {
    id: "booking",
    name: "Raspberry Pi Booking",
    chapter: "curiosity",
    description:
      "A team-built classroom booking system spanning three Raspberry Pi roles.",
    built:
      "My contribution centred on the Master Pi: socket API, database, service logic, MQTT publishing, and the admin interface, plus parts of the shared Room Pi implementation.",
    lesson:
      "Defining contracts between a central server, user-facing devices, and room displays.",
    skills: ["Python", "Flask", "MQTT", "Distributed systems"],
    state: "Team coursework",
  },
];

export function getProjectSections(project: Project) {
  const introduction = project.about
    ? [{ heading: null, paragraphs: project.about }]
    : [];
  if (project.story) return [...introduction, ...project.story];
  if (project.about) return introduction;
  return [
    { heading: "Built", paragraphs: [project.built] },
    { heading: "Learned", paragraphs: [project.lesson] },
  ];
}
