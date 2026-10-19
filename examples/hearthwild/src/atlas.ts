import type { Biome, BiomeBlock, BiomeGrid, WorldData } from "./types";

const REFERENCE_WORLD_SIZE = 8192;

const WARP_OCTAVES = [
  { scale: 1 / 1450, amplitude: 300 },
  { scale: 1 / 620, amplitude: 195 },
  { scale: 1 / 240, amplitude: 80 },
  { scale: 1 / 95, amplitude: 27 }
];

const EDGE_OCTAVES = [
  { scale: 1 / 950, amplitude: 0.2 },
  { scale: 1 / 340, amplitude: 0.1 },
  { scale: 1 / 125, amplitude: 0.04 }
];

export const TYPE_LABELS: Record<string, string> = {
  village: "Villages",
  hamlet: "Hamlets",
  landmark: "Landmarks",
  ruin: "Ruins",
  shrine: "Shrines",
  dungeon: "Dungeons"
};

export function titleCase(value = ""): string {
  return value.replaceAll("_", " ").replace(/\b\w/g, (letter) => letter.toUpperCase());
}

export function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

export function formatCoordinate(value: number): string {
  return Math.floor(value).toLocaleString("en-US");
}

export function toMinecraftCoordinates(data: WorldData, plannerX: number, plannerZ: number) {
  return {
    x: plannerX - data.meta.width / 2,
    z: plannerZ - data.meta.height / 2
  };
}

export function gridCellFor(data: WorldData, x: number, z: number) {
  const size = data.meta.gridSize ?? 128;
  const minecraft = toMinecraftCoordinates(data, x, z);
  return { x: Math.floor(minecraft.x / size), z: Math.floor(minecraft.z / size), size };
}

export function validateWorldData(input: unknown): WorldData {
  if (!input || typeof input !== "object") throw new Error("The JSON file is empty or invalid.");
  const candidate = input as Partial<WorldData>;
  if (!candidate.meta || !Number.isFinite(candidate.meta.width) || !Number.isFinite(candidate.meta.height)) {
    throw new Error("meta.width and meta.height must be numbers.");
  }
  if (!Array.isArray(candidate.biomes) || candidate.biomes.length === 0) {
    throw new Error("Add at least one biome to the biomes array.");
  }

  const biomeIds = new Set<string>();
  candidate.biomes.forEach((biome, index) => {
    if (!biome.id || biomeIds.has(biome.id)) throw new Error(`Biome ${index + 1} needs a unique id.`);
    if (!Array.isArray(biome.regions) || biome.regions.length === 0) {
      throw new Error(`Biome "${biome.id}" needs at least one region.`);
    }
    biomeIds.add(biome.id);
  });

  const pointsOfInterest = Array.isArray(candidate.pointsOfInterest) ? candidate.pointsOfInterest : [];
  const poiIds = new Set<string>();
  pointsOfInterest.forEach((poi, index) => {
    if (!poi.id || poiIds.has(poi.id)) throw new Error(`Point of interest ${index + 1} needs a unique id.`);
    if (!Number.isFinite(poi.x) || !Number.isFinite(poi.z)) {
      throw new Error(`Point "${poi.id}" needs numeric x and z values.`);
    }
    poiIds.add(poi.id);
  });

  return { ...candidate, pointsOfInterest } as WorldData;
}

export async function fetchWorldData(): Promise<{ data: WorldData; source: string }> {
  const response = await fetch(`${import.meta.env.BASE_URL}world-data.json`);
  if (!response.ok) throw new Error(`world-data.json returned ${response.status}.`);
  const source = await response.text();
  return { data: validateWorldData(JSON.parse(source)), source };
}

function parseHex(hex: string) {
  const clean = hex.replace("#", "");
  const expanded = clean.length === 3 ? clean.split("").map((part) => part + part).join("") : clean;
  const value = Number.parseInt(expanded, 16);
  return { r: (value >> 16) & 255, g: (value >> 8) & 255, b: value & 255 };
}

function seededValue(x: number, y: number, seed = 0): number {
  let value = Math.imul(x + seed * 31, 374761393) + Math.imul(y - seed * 17, 668265263);
  value = (value ^ (value >>> 13)) * 1274126177;
  return ((value ^ (value >>> 16)) >>> 0) / 4294967295;
}

function smoothNoise(x: number, z: number, seed: number): number {
  const x0 = Math.floor(x);
  const z0 = Math.floor(z);
  const fx = x - x0;
  const fz = z - z0;
  const sx = fx * fx * (3 - 2 * fx);
  const sz = fz * fz * (3 - 2 * fz);
  const n00 = seededValue(x0, z0, seed);
  const n10 = seededValue(x0 + 1, z0, seed);
  const n01 = seededValue(x0, z0 + 1, seed);
  const n11 = seededValue(x0 + 1, z0 + 1, seed);
  return (n00 * (1 - sx) + n10 * sx) * (1 - sz) + (n01 * (1 - sx) + n11 * sx) * sz;
}

function fbm(x: number, z: number, seed: number, octaves = 3): number {
  let sum = 0;
  let amplitude = 1;
  let frequency = 1;
  let norm = 0;
  for (let index = 0; index < octaves; index += 1) {
    sum += amplitude * (smoothNoise(x * frequency, z * frequency, seed + index * 1013) - 0.5);
    norm += amplitude;
    amplitude *= 0.5;
    frequency *= 2;
  }
  return (sum / norm) * 2;
}

function removeSmallBiomePatches(
  source: Uint16Array,
  width: number,
  height: number,
  sampleSize: number,
  minArea = 0
): Uint16Array {
  if (!Number.isFinite(minArea) || minArea <= 0) return source;
  const minCells = Math.ceil(minArea / (sampleSize * sampleSize));
  const cleaned = source.slice();
  const visited = new Uint8Array(source.length);
  const queue = new Int32Array(source.length);

  for (let start = 0; start < source.length; start += 1) {
    if (visited[start]) continue;
    const biome = source[start];
    const component: number[] = [];
    const neighbours = new Map<number, number>();
    let head = 0;
    let tail = 1;
    let componentSize = 0;
    queue[0] = start;
    visited[start] = 1;

    const inspectNeighbour = (index: number) => {
      const neighbourBiome = source[index];
      if (neighbourBiome === biome) {
        if (!visited[index]) {
          visited[index] = 1;
          queue[tail] = index;
          tail += 1;
        }
      } else {
        neighbours.set(neighbourBiome, (neighbours.get(neighbourBiome) ?? 0) + 1);
      }
    };

    while (head < tail) {
      const index = queue[head];
      head += 1;
      componentSize += 1;
      if (componentSize < minCells) component.push(index);
      const x = index % width;
      const z = Math.floor(index / width);
      if (x > 0) inspectNeighbour(index - 1);
      if (x + 1 < width) inspectNeighbour(index + 1);
      if (z > 0) inspectNeighbour(index - width);
      if (z + 1 < height) inspectNeighbour(index + width);
    }

    if (componentSize < minCells && neighbours.size > 0) {
      let replacement = biome;
      let strongestBoundary = -1;
      for (const [candidate, boundary] of neighbours) {
        if (boundary > strongestBoundary) {
          replacement = candidate;
          strongestBoundary = boundary;
        }
      }
      component.forEach((index) => { cleaned[index] = replacement; });
    }
  }
  return cleaned;
}

export function buildBiomeGrid(data: WorldData, sampleSizeOverride?: number): BiomeGrid {
  const { width: worldWidth, height: worldHeight } = data.meta;
  const sampleSize = sampleSizeOverride ?? data.meta.biomeSampleSize ?? Math.max(4, Math.floor((data.meta.gridSize ?? 128) / 8));
  const terrainScale = Math.min(worldWidth, worldHeight) / REFERENCE_WORLD_SIZE;
  const canvasWidth = Math.ceil(worldWidth / sampleSize);
  const canvasHeight = Math.ceil(worldHeight / sampleSize);
  let values: Uint16Array = new Uint16Array(canvasWidth * canvasHeight);
  const regions = data.biomes.flatMap((biome, biomeIndex) =>
    biome.regions.map((region, regionIndex) => ({ biomeIndex, region, regionIndex }))
  );
  const seedNumber = String(data.meta.seed ?? "atlas").split("").reduce((total, char) => total + char.charCodeAt(0), 0);

  for (let sampleZ = 0; sampleZ < canvasHeight; sampleZ += 1) {
    const worldZ = Math.min(worldHeight, (sampleZ + 0.5) * sampleSize);
    for (let sampleX = 0; sampleX < canvasWidth; sampleX += 1) {
      const worldX = Math.min(worldWidth, (sampleX + 0.5) * sampleSize);
      let warpX = 0;
      let warpZ = 0;
      WARP_OCTAVES.forEach((octave, index) => {
        const nx = worldX * octave.scale / terrainScale;
        const nz = worldZ * octave.scale / terrainScale;
        warpX += fbm(nx, nz, seedNumber + index * 617, 3) * octave.amplitude * terrainScale;
        warpZ += fbm(nx + 41.7, nz - 26.3, seedNumber + index * 617 + 733, 3) * octave.amplitude * terrainScale;
      });

      let bestScore = Number.NEGATIVE_INFINITY;
      let biomeIndex = 0;
      regions.forEach((entry) => {
        const radiusX = Math.max(1, entry.region.radiusX ?? 600 * terrainScale);
        const radiusZ = Math.max(1, entry.region.radiusZ ?? 600 * terrainScale);
        const dx = (worldX + warpX - entry.region.x) / radiusX;
        const dz = (worldZ + warpZ - entry.region.z) / radiusZ;
        const noiseSeed = seedNumber + entry.biomeIndex * 137 + entry.regionIndex * 29;
        let edgeNoise = 0;
        EDGE_OCTAVES.forEach((octave, index) => {
          edgeNoise += fbm(worldX * octave.scale / terrainScale, worldZ * octave.scale / terrainScale, noiseSeed + index * 401, 2) * octave.amplitude;
        });
        const score = (entry.region.weight ?? 0) - dx * dx - dz * dz + edgeNoise;
        if (score > bestScore) {
          bestScore = score;
          biomeIndex = entry.biomeIndex;
        }
      });
      values[sampleZ * canvasWidth + sampleX] = biomeIndex;
    }
  }

  values = removeSmallBiomePatches(values, canvasWidth, canvasHeight, sampleSize, data.meta.minBiomePatchArea);
  return { values, width: canvasWidth, height: canvasHeight };
}

export function paintBiomeMap(canvas: HTMLCanvasElement, data: WorldData, grid: BiomeGrid): void {
  canvas.width = grid.width;
  canvas.height = grid.height;
  const context = canvas.getContext("2d", { alpha: false });
  if (!context) throw new Error("The browser could not create the atlas canvas.");
  const image = context.createImageData(grid.width, grid.height);
  for (let index = 0; index < grid.values.length; index += 1) {
    const color = parseHex(data.biomes[grid.values[index]].color);
    const dataIndex = index * 4;
    image.data[dataIndex] = color.r;
    image.data[dataIndex + 1] = color.g;
    image.data[dataIndex + 2] = color.b;
    image.data[dataIndex + 3] = 255;
  }
  context.putImageData(image, 0, 0);
}

export function renderBiomeMap(canvas: HTMLCanvasElement, data: WorldData): BiomeGrid {
  const grid = buildBiomeGrid(data);
  paintBiomeMap(canvas, data, grid);
  return grid;
}

export function getBiomeAt(data: WorldData, grid: BiomeGrid | null, worldX: number, worldZ: number): Biome | null {
  if (!grid) return null;
  const x = clamp(Math.floor((worldX / data.meta.width) * grid.width), 0, grid.width - 1);
  const z = clamp(Math.floor((worldZ / data.meta.height) * grid.height), 0, grid.height - 1);
  return data.biomes[grid.values[z * grid.width + x]] ?? null;
}

function pickBiomeBlock(biome: Biome, random: number): BiomeBlock {
  const blocks = biome.blocks?.length
    ? biome.blocks
    : [{ id: "minecraft:grass_block", color: biome.color, weight: 1, role: "surface" }];
  const totalWeight = blocks.reduce((total, block) => total + Math.max(0, block.weight ?? 0), 0) || blocks.length;
  let cursor = random * totalWeight;
  for (const block of blocks) {
    cursor -= Math.max(0, block.weight ?? 0) || 1;
    if (cursor <= 0) return block;
  }
  return blocks[blocks.length - 1];
}

export function drawDetailPreview(canvas: HTMLCanvasElement, biome: Biome): void {
  const rect = canvas.getBoundingClientRect();
  const ratio = Math.min(window.devicePixelRatio || 1, 2);
  canvas.width = Math.max(1, Math.round(rect.width * ratio));
  canvas.height = Math.max(1, Math.round(rect.height * ratio));
  const context = canvas.getContext("2d");
  if (!context) return;
  const tileSize = Math.max(12, Math.round(13 * ratio));
  const columns = Math.ceil(canvas.width / tileSize);
  const rows = Math.ceil(canvas.height / tileSize);
  for (let row = 0; row < rows; row += 1) {
    for (let column = 0; column < columns; column += 1) {
      const clusterSize = ["conifer", "birch", "mountain"].includes(biome.texture ?? "") ? 3 : 2;
      const random = seededValue(Math.floor(column / clusterSize), Math.floor(row / clusterSize), biome.id.length * 47);
      const block = pickBiomeBlock(biome, random);
      const color = parseHex(block.color ?? biome.color);
      const variation = 0.92 + seededValue(column, row, biome.id.length * 79) * 0.12;
      context.fillStyle = `rgb(${clamp(Math.round(color.r * variation), 0, 255)}, ${clamp(Math.round(color.g * variation), 0, 255)}, ${clamp(Math.round(color.b * variation), 0, 255)})`;
      context.fillRect(column * tileSize, row * tileSize, tileSize, tileSize);
      context.strokeStyle = "rgba(31, 34, 28, 0.13)";
      context.lineWidth = Math.max(1, ratio * 0.55);
      context.strokeRect(column * tileSize + 0.5, row * tileSize + 0.5, tileSize - 1, tileSize - 1);
    }
  }
}

export function gridPaths(data: WorldData): { minor: string; major: string } {
  const { width, height, gridSize = 128 } = data.meta;
  const minor: string[] = [];
  const major: string[] = [];
  for (let x = gridSize; x < width; x += gridSize) {
    (Math.round(x / gridSize) % 4 === 0 ? major : minor).push(`M ${x} 0 V ${height}`);
  }
  for (let z = gridSize; z < height; z += gridSize) {
    (Math.round(z / gridSize) % 4 === 0 ? major : minor).push(`M 0 ${z} H ${width}`);
  }
  return { minor: minor.join(" "), major: major.join(" ") };
}
