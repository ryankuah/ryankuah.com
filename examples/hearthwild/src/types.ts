export interface WorldMeta {
  name: string;
  subtitle?: string;
  seed: string | number;
  width: number;
  height: number;
  gridSize?: number;
  biomeSampleSize?: number;
  minBiomePatchArea?: number;
  seaLevel?: number;
  spawn?: [number, number];
  initialView?: { x: number; z: number; span: number };
}

export interface BiomeBlock {
  id: string;
  color?: string;
  weight?: number;
  role?: string;
}

export interface BiomeRegion {
  x: number;
  z: number;
  radiusX?: number;
  radiusZ?: number;
  weight?: number;
}

export interface Biome {
  id: string;
  name: string;
  color: string;
  ink?: string;
  texture?: string;
  description?: string;
  climate?: string;
  terrain?: string;
  ground?: string[];
  flora?: string[];
  blocks?: BiomeBlock[];
  regions: BiomeRegion[];
}

export interface NpcHook {
  name: string;
  role: string;
  hook: string;
}

export interface PointOfInterest {
  id: string;
  name: string;
  type: string;
  x: number;
  z: number;
  status?: string;
  summary?: string;
  notes?: string;
  population?: number;
  npcs?: NpcHook[];
}

export interface WorldData {
  meta: WorldMeta;
  biomes: Biome[];
  pointsOfInterest: PointOfInterest[];
}

export interface BiomeGrid {
  values: Uint16Array;
  width: number;
  height: number;
}

export type Selection =
  | { type: "poi"; id: string; coordinates: [number, number] }
  | { type: "biome"; id: string; coordinates: [number, number] };

export interface MapTransform {
  scale: number;
  x: number;
  y: number;
  fitScale: number;
}

export type SyncMode = "loading" | "live" | "updated" | "error" | "local";
