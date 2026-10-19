import fs from "node:fs";
import path from "node:path";
import { defineConfig, type Plugin } from "vite";
import react from "@vitejs/plugin-react";

const WORLD_DATA_FILE = path.resolve(import.meta.dirname, "world-data.json");

function worldDataPlugin(): Plugin {
  return {
    name: "hearthwild-world-data",
    configureServer(server) {
      server.middlewares.use("/world-data.json", (_request, response) => {
        response.setHeader("Content-Type", "application/json; charset=utf-8");
        response.setHeader("Cache-Control", "no-store");
        response.end(fs.readFileSync(WORLD_DATA_FILE));
      });
      server.watcher.add(WORLD_DATA_FILE);
      server.watcher.on("change", (changedFile) => {
        if (path.resolve(changedFile) === WORLD_DATA_FILE) {
          server.ws.send({ type: "custom", event: "world-data-update" });
        }
      });
    },
    generateBundle() {
      this.emitFile({
        type: "asset",
        fileName: "world-data.json",
        source: fs.readFileSync(WORLD_DATA_FILE, "utf8")
      });
    }
  };
}

export default defineConfig({
  plugins: [react(), worldDataPlugin()],
  base: "/minecraft/hearthwild/planner/",
  build: { outDir: "../../public/minecraft/hearthwild/planner", emptyOutDir: true },
  publicDir: false,
  server: {
    host: "127.0.0.1",
    port: 4173,
    strictPort: true
  },
  preview: {
    host: "127.0.0.1",
    port: 4173,
    strictPort: true
  }
});
