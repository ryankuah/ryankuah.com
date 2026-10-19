import Image from "next/image";
import type { CSSProperties, ReactNode } from "react";

const paths = {
  web: (
    <>
      <rect x="3" y="4" width="18" height="16" rx="3" />
      <path d="M3 9h18M7 6.5h.01M10 6.5h.01M10 12l-3 3 3 3m4-6 3 3-3 3" />
    </>
  ),
  mobile: (
    <>
      <rect x="6" y="2" width="12" height="20" rx="3" />
      <path d="M10 5h4m-3 14h2" />
    </>
  ),
  desktop: (
    <>
      <rect x="2" y="3" width="20" height="14" rx="2" />
      <path d="M8 21h8m-4-4v4" />
    </>
  ),
  back: <path d="m10 5-7 7 7 7M3 12h18" />,
  arrow: <path d="m14 5 7 7-7 7M3 12h18" />,
  close: <path d="m6 6 12 12M6 18 18 6" />,
  trash: (
    <>
      <path d="M3 6h18M9 6V3h6v3M5 6l1 15h12l1-15M10 10v7m4-7v7" />
    </>
  ),
  search: (
    <>
      <circle cx="10.5" cy="10.5" r="6.5" />
      <path d="m16 16 5 5" />
    </>
  ),
  lock: (
    <>
      <rect x="5" y="10" width="14" height="11" rx="3" />
      <path d="M8 10V7a4 4 0 0 1 8 0v3m-4 5v2" />
    </>
  ),
  fire: (
    <path d="M13 2c3 6-2 7 0 12 2-1 3-3 3-5 7 7 3 13-4 13S2 15 7 8c0 4 2 5 3 6-2-6 4-7 3-12Z" />
  ),
  terminal: (
    <>
      <path d="m5 6 5 6-5 6m8 0h6" />
      <rect x="2" y="2" width="20" height="20" rx="4" />
    </>
  ),
  cube: (
    <>
      <path d="m12 2 9 5v10l-9 5-9-5V7l9-5Zm0 10v10M3 7l9 5 9-5" />
    </>
  ),
  leaf: (
    <>
      <path d="M20 3C7 2 2 8 5 15c4 9 16 3 15-12ZM4 21l11-12" />
    </>
  ),
  dress: <path d="M8 3h8l-1 6 6 11H3L9 9 8 3Zm1 6h6" />,
  sword: (
    <>
      <path d="m14 3 7-1-1 7-9 9-5-5 8-10ZM4 11l9 9M2 22l6-6" />
    </>
  ),
  robot: (
    <>
      <rect x="4" y="7" width="16" height="14" rx="4" />
      <path d="M12 7V3m-2 0h4M8 12v2m8-2v2m-7 4h6M1 12v5m22-5v5" />
    </>
  ),
  heart: (
    <path d="M20 5c-3-3-7-1-8 2-1-3-5-5-8-2-4 4 1 10 8 16 7-6 12-12 8-16Z" />
  ),
  wifi: (
    <>
      <path d="M3 8a14 14 0 0 1 18 0M6 12a9 9 0 0 1 12 0m-9 4a4 4 0 0 1 6 0" />
      <circle cx="12" cy="20" r=".7" />
    </>
  ),
  battery: (
    <>
      <rect x="2" y="6" width="18" height="12" rx="3" />
      <path d="M23 10v4M6 10h10v4H6Z" />
    </>
  ),
} as const;
export type IconName = keyof typeof paths;

export function Icon({
  name,
  className = "size-5",
}: {
  name: IconName;
  className?: string;
}) {
  return (
    <svg
      className={`shrink-0 ${className}`}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      {paths[name]}
    </svg>
  );
}

// `tile` gives art that needs it a solid backing instead of the glossy colour.
const artwork: Record<string, { src: string; fit?: string; tile?: string }> = {
  minecraft: {
    src: "/images/minecraft-icon.svg",
    fit: "object-contain p-1",
    tile: "bg-[#263a2b]",
  },
  aria: { src: "/images/aria.png" },
  "shd-app": { src: "/images/shd-overlay.png" },
  hayday: { src: "/images/hayday-icon.png" },
  "pocket-worlds": { src: "/images/pocket-worlds-icon.png" },
  suiyu: {
    src: "/images/suiyu-icon.png",
    fit: "object-contain p-1.25",
    tile: "bg-[#efe7de]",
  },
  forza: { src: "/images/forza-icon.png" },
};
const symbols: Record<string, [IconName, string]> = {
  trash: ["trash", "#64716d"],
  kitty: ["terminal", "#414b58"],
  citycraft: ["cube", "#568e79"],
  hearthwild: ["leaf", "#787951"],
  multidress: ["dress", "#a0778f"],
  game: ["cube", "#5f7197"],
  combat: ["sword", "#967163"],
  "farm-agent": ["robot", "#798b68"],
};
const tileSizes = {
  phone: "aspect-square w-full rounded-[23%] @max-[280px]:w-12 md:short:w-8.25",
  desktop:
    "size-16 rounded-2xl max-md:size-14 max-md:rounded-[14px] md:short:size-11.25 md:short:rounded-[11px]",
  dock: "size-13 rounded-[13px] md:short:size-9.5 md:short:rounded-[10px]",
  toolbar: "size-7 rounded-lg",
};
export type TileSize = keyof typeof tileSizes;

// An app tile; it lifts when a surrounding `group/app` button is hovered.
export function AppTile({
  size,
  color,
  background = "bg-(--icon-color) bg-[linear-gradient(150deg,#ffffff26,transparent_75%)]",
  children,
}: {
  size: TileSize;
  color: string;
  background?: string;
  children: ReactNode;
}) {
  return (
    <span
      className={`grid place-items-center overflow-hidden shadow-[0_4px_12px_#0003,inset_0_0_0_1px_#ffffff20] transition-[translate,scale] duration-250 ease-[cubic-bezier(0.2,0.8,0.2,1)] group-hover/app:-translate-y-1.25 group-hover/app:scale-106 ${tileSizes[size]} ${background}`}
      style={{ "--icon-color": color } as CSSProperties}
    >
      {children}
    </span>
  );
}

export function tileSymbolClass(size: TileSize) {
  return `stroke-[1.35] ${size === "toolbar" ? "size-4.5" : "size-7.75"}`;
}

export function ProjectIcon({ id, size }: { id: string; size: TileSize }) {
  const art = artwork[id];
  const [symbol, color] = symbols[id] ?? ["web", "#668a80"];
  return (
    <AppTile size={size} color={color} background={art?.tile}>
      {art ? (
        <Image
          src={art.src}
          alt=""
          width={128}
          height={128}
          sizes="80px"
          className={`size-full ${art.fit ?? "object-cover"}`}
        />
      ) : (
        <Icon
          name={symbol}
          className={`text-[#f3f3ed] ${tileSymbolClass(size)}`}
        />
      )}
    </AppTile>
  );
}
