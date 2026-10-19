# Portfolio snapshot

Restored from the Minecraft repository's `world-planner/` at commit `f3dfd2e` (the last version before removal in `181763b`). The original world data and map rendering are preserved. The portfolio copy loads its bundled data once, omits development import/sync controls, and hides its own top bar when embedded.

Build with `npm ci` and `npm run build` in this folder. Output goes to `public/minecraft/hearthwild/planner/`. This does not modify the Minecraft repository or its world saves.

The historical planner's original documentation follows; its live editing instructions describe the original app.

---

# Pumpkin's World Atlas

A TypeScript, React, and Vite world-planning app for the Minecraft mod. It previews grid-authored biome regions, Minecraft block palettes, settlements, NPC hooks, and other points of interest without changing the Fabric mod.

## Run it

From this folder:

```sh
npm install
npm run dev
```

Then open [http://localhost:4173](http://localhost:4173).

The Vite server watches `world-data.json` and pushes changes into the running app immediately. The app also polls the file without caching, so updates continue to work when the production build is hosted on a regular static server.

Production commands:

```sh
npm run typecheck
npm run build
npm run preview
```

The distributable site is written to `dist/`, including the current `world-data.json`.

## Edit the world

All authored content lives in [`world-data.json`](world-data.json):

- `meta` controls the world name, dimensions, planning-grid size, seed label, sea level, and spawn.
- `biomes` defines each biome's weighted Minecraft block palette, description, terrain notes, flora, and one or more influence regions.
- `pointsOfInterest` defines villages, hamlets, ruins, shrines, dungeons, and landmarks.

Save the file. The live map automatically refreshes metadata, spawn settings, biome regions and palettes, POIs, labels, filters, and inspector content. POI-only changes do not regenerate the terrain canvas; biome or dimension changes do.

### Add a point of interest

Add an object to `pointsOfInterest`:

```json
{
  "id": "poi_example_tower",
  "name": "Example Tower",
  "type": "ruin",
  "x": 1800,
  "z": 900,
  "status": "Unsurveyed",
  "summary": "A short player-facing description.",
  "notes": "Implementation or narrative notes for the world builder."
}
```

Supported example types are `village`, `hamlet`, `landmark`, `ruin`, `shrine`, and `dungeon`. New type names also work and receive a generic marker/filter.

### Add or reshape a biome

Each biome can have multiple influence regions:

```json
{
  "id": "orchard_vale",
  "name": "Orchard Vale",
  "color": "#82965c",
  "ink": "#3d5130",
  "texture": "meadow",
  "description": "Sheltered slopes of old fruit trees and pasture.",
  "climate": "Mild · Sheltered",
  "terrain": "Low valley",
  "ground": ["Grass", "Moss"],
  "flora": ["Apple", "Pear", "Hawthorn"],
  "blocks": [
    { "id": "minecraft:grass_block", "color": "#7f9b53", "weight": 65, "role": "surface" },
    { "id": "minecraft:oak_leaves", "color": "#4f7738", "weight": 20, "role": "orchard canopy" },
    { "id": "minecraft:oak_log", "color": "#6c5534", "weight": 5, "role": "trunks" },
    { "id": "minecraft:short_grass", "color": "#6f8f46", "weight": 10, "role": "ground cover" }
  ],
  "regions": [
    { "x": 4400, "z": 3600, "radiusX": 1200, "radiusZ": 900, "weight": 0.45 }
  ]
}
```

Each `blocks` entry is a real Java Edition block ID plus an approximate map color, relative weight, and intended role. The main map uses each biome's flat `color` to create a crisp seed-map preview, while the inspector uses the weighted block palette to show how that biome could look in Minecraft. Regions overlap and resolve deterministically from `meta.seed`; `gridSize` controls the independent planning-grid overlay.

`meta.minBiomePatchArea` removes disconnected biome fragments smaller than that many blocks by folding them into the biome around them. The current 200,000-block threshold keeps the major biome bands continuous while removing scattered specks and accidental pockets at the enlarged scale.

## Interaction

- Drag to pan and use the wheel or map controls to zoom.
- Click the terrain to inspect the biome at that coordinate.
- Read the current planning cell and exact in-game Minecraft coordinates in the map footer. The labelled map origin at the centre is `X 0, Z 0`; the upper-left is `X -4096, Z -4096`, and the lower-right is `X 4095, Z 4095`.
- Click a marker for its location and NPC hooks.
- Double-click a marker to center and zoom to it.
- Toggle map layers and point-of-interest categories in the left rail.
- Use **Open JSON** to pause live syncing and preview another world file without replacing the checked-in data. Choose **Use live data** to reconnect to `world-data.json`.
