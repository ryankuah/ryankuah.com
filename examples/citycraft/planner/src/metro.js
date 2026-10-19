// The metro's real footprint, as the generator builds it (CityBuilder.monorail): a tube reaching `half + 1.5` either
// side of the centre line, widened to `half + 4.5` along the platforms (within STATION_REACH of a station), from just
// under the deck to TUBE_ABOVE over it. Shared by the validator and the planner scripts, so it stays free of browser
// and Node APIs.
import { DECK_CLEARANCE, TRACK_SPACING, bbox, buildingParts, ring, roadElevations } from './city.js';

export const TUBE_MARGIN = 1.5;
export const PLATFORM_MARGIN = 4.5;
/** Platforms run this far either side of a station. */
export const STATION_REACH = 22;
/** How far above its deck the tube (girders and all) reaches. */
export const TUBE_ABOVE = 9;
/** A line that crosses a building for less than this along its centre line only clips it. */
export const MIN_CROSSING = 16;
/** A run through one building at least this long wants a station inside it. */
export const LONG_RUN = 150;

/** A metro line's centre line measured out: arc positions of its points and of its stations. */
export function lineGeometry(rail) {
  const pts = rail.path, elev = roadElevations(rail), cum = [0];
  for (let i = 1; i < pts.length; i++) cum.push(cum[i - 1] + Math.hypot(pts[i][0] - pts[i - 1][0], pts[i][1] - pts[i - 1][1]));
  const g = { rail, pts, elev, cum, length: cum.at(-1), half: (rail.tracks ?? 1) * TRACK_SPACING / 2 };
  g.loop = pts.length > 2 && Math.hypot(pts[0][0] - pts.at(-1)[0], pts[0][1] - pts.at(-1)[1]) < 1;
  g.stations = (rail.stations ?? []).map(st => ({ ...st, s: project(g, st.at).s })).sort((a, b) => a.s - b.s);
  return g;
}

/** The arc position on a line nearest to p, and how far p is from it. */
export function project(g, [x, z]) {
  let best = { s: 0, dist: Infinity };
  for (let i = 0; i + 1 < g.pts.length; i++) {
    const [ax, az] = g.pts[i], [bx, bz] = g.pts[i + 1], vx = bx - ax, vz = bz - az, l2 = vx * vx + vz * vz;
    const t = l2 ? Math.max(0, Math.min(1, ((x - ax) * vx + (z - az) * vz) / l2)) : 0;
    const d = Math.hypot(x - ax - t * vx, z - az - t * vz);
    if (d < best.dist) best = { s: g.cum[i] + t * Math.sqrt(l2), dist: d };
  }
  return best;
}

/** Where the line is at arc position s: its point, direction and deck height. */
export function sampleLine(g, s) {
  let i = 0;
  while (i < g.pts.length - 2 && g.cum[i + 1] < s) i++;
  const len = g.cum[i + 1] - g.cum[i] || 1, t = Math.max(0, Math.min(1, (s - g.cum[i]) / len));
  const [ax, az] = g.pts[i], [bx, bz] = g.pts[i + 1];
  return { x: ax + (bx - ax) * t, z: az + (bz - az) * t, dx: (bx - ax) / len, dz: (bz - az) / len, deck: g.elev[i] + (g.elev[i + 1] - g.elev[i]) * t };
}

/** The tube's half width at arc position s: wider along the platforms. */
export function tubeHalf(g, s) {
  return g.half + (g.stations.some(st => Math.abs(st.s - s) < STATION_REACH) ? PLATFORM_MARGIN : TUBE_MARGIN);
}

/** The gaps between one station and the next along a line (round a loop, the last back to the first). */
export function stationGaps(g) {
  const st = g.stations, gaps = [];
  for (let i = 0; i + 1 < st.length; i++) gaps.push({ from: st[i], to: st[i + 1], gap: st[i + 1].s - st[i].s });
  if (g.loop && st.length > 1) gaps.push({ from: st.at(-1), to: st[0], gap: g.length - st.at(-1).s + st[0].s });
  return gaps;
}

function pointIn(x, z, pts) {
  let hit = false;
  for (let i = 0, j = pts.length - 1; i < pts.length; j = i++) {
    const [xi, zi] = pts[i], [xj, zj] = pts[j];
    if ((zi > z) !== (zj > z) && x < ((xj - xi) * (z - zi)) / (zj - zi) + xi) hit = !hit;
  }
  return hit;
}

/** Every solid piece of every building (overhangs included), bucketed by 32-block cell. */
function partIndex(city) {
  const cells = new Map(), key = (cx, cz) => `${cx},${cz}`;
  const buildings = [...(city.buildings ?? []), ...(city.sites ?? []).flatMap(s => s.buildings ?? [])];
  for (const b of buildings) {
    if (!b.footprint || b.height == null) continue;
    const parts = buildingParts(b).map(p => ({ ...p }));
    if (b.upperFootprint) parts.push({ shape: b.upperFootprint, base: b.upperFrom ?? Math.max(1, b.height - 12), top: b.height });
    for (const p of parts) {
      p.b = b;
      p.pts = ring(p.shape);
      p.bb = bbox(p.shape);
      for (let cx = Math.floor(p.bb[0] / 32); cx <= Math.floor(p.bb[2] / 32); cx++) {
        for (let cz = Math.floor(p.bb[1] / 32); cz <= Math.floor(p.bb[3] / 32); cz++) {
          const k = key(cx, cz);
          if (!cells.has(k)) cells.set(k, []);
          cells.get(k).push(p);
        }
      }
    }
  }
  return (x, z) => cells.get(key(Math.floor(x / 32), Math.floor(z / 32))) ?? [];
}

/**
 * Every building each metro line's tube runs into, by line id: from s0 to s1 along the line, `centre` blocks of its
 * centre line inside, the nearest it comes to the centre line (minLat), and whether that is a real crossing
 * (`through`) or only a clip. A building counts where some part of it reaches within DECK_CLEARANCE under the deck
 * and starts below the top of the tube.
 */
export function metroCrossings(city) {
  const partsAt = partIndex(city), out = new Map();
  for (const rail of city.railways ?? []) {
    if (rail.kind !== 'metro' || !Array.isArray(rail.path) || rail.path.length < 2) continue;
    const g = lineGeometry(rail), hits = new Map();
    for (let s = 0; s <= g.length; s += 1) {
      const p = sampleLine(g, s), reach = tubeHalf(g, s);
      for (let lat = -reach; lat <= reach + 1e-9; lat += 0.5) {
        const x = p.x - p.dz * lat, z = p.z + p.dx * lat;
        for (const part of partsAt(x, z)) {
          if (part.top <= p.deck - DECK_CLEARANCE || part.base >= p.deck + TUBE_ABOVE) continue;
          if (x < part.bb[0] || x > part.bb[2] || z < part.bb[1] || z > part.bb[3] || !pointIn(x, z, part.pts)) continue;
          let h = hits.get(part.b.id);
          if (!h) hits.set(part.b.id, h = { building: part.b, s0: s, s1: s, centre: 0, minLat: Infinity, centreAt: -1 });
          h.s0 = Math.min(h.s0, s);
          h.s1 = Math.max(h.s1, s);
          h.minLat = Math.min(h.minLat, Math.abs(lat));
          if (Math.abs(lat) < 0.25 && h.centreAt !== s) {
            h.centre++;
            h.centreAt = s;
          }
        }
      }
    }
    const list = [...hits.values()].sort((a, b) => a.s0 - b.s0);
    for (const h of list) {
      h.through = h.centre >= MIN_CROSSING;
      h.station = g.stations.find(st => st.s >= h.s0 && st.s <= h.s1) ?? null;
      delete h.centreAt;
    }
    out.set(rail.id, { geometry: g, crossings: list });
  }
  return out;
}
