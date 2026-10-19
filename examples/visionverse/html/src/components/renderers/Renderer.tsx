"use client";

import { type Page } from "@/types/types";
import ComponentRenderer from "./ComponentRenderer";

export default function Renderer({ page }: { page: Page }) {
  if (!page) {
    return (
      <div className="flex h-full w-full items-center justify-center text-gray-400">
        Page not found
      </div>
    );
  }

  const { background, components } = page;

  return (
    <div className="relative h-full w-full overflow-hidden">
      {/* Background color layer */}
      <div
        className="absolute inset-0"
        style={{ backgroundColor: background?.color ?? "white" }}
      />

      {/* Background image layer */}
      {background?.image && (
        <div
          className="absolute inset-0"
          style={{
            backgroundImage: `url(${background.image})`,
            backgroundSize: "cover",
            backgroundPosition: "center",
            backgroundRepeat: "no-repeat",
            opacity: background.settings?.opacity ?? 1,
            transform: `scale(${background.settings?.scale ?? 1})`,
          }}
        />
      )}

      {/* Foreground content */}
      <div
        className={`relative z-10 flex h-full w-full flex-col overflow-y-auto px-4 pb-24 pt-6`}
      >
        {components.length > 0 ? (
          components.map((component, idx) => (
            <ComponentRenderer key={idx} component={component} />
          ))
        ) : (
          <div className="flex flex-1 items-center justify-center text-gray-400">
            Add components to see preview
          </div>
        )}
      </div>
    </div>
  );
}
