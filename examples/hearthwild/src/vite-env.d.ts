/// <reference types="vite/client" />

interface ImportMetaHot {
  on(event: "world-data-update", callback: () => void): void;
  off(event: "world-data-update", callback: () => void): void;
}
