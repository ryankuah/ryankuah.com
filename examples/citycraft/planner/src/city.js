// Expands city/city.json into flat GeoJSON-style features in block coordinates.
// Shared by the map viewer and the validator, so it must stay free of browser APIs.

export const SIDES = ['north', 'east', 'south', 'west'];

/** `shipHall` names one basin or several; always hand back a list. */
export const hallIds = (b) => (b.shipHall == null ? [] : [].concat(b.shipHall));
/** Deck height of each path point, in blocks above ground: `elevation` is one number or one per point. */
export function roadElevations(road) {
  const e = road.elevation ?? 0;
  return (road.path ?? []).map((_, i) => (Array.isArray(e) ? e[i] ?? 0 : e));
}
/** A building fits under a deck if its roof is at least this far below it. */
export const DECK_CLEARANCE = 6;
/** Steepest allowed ramp, rise over run. Freight trains can't climb anything like a road ramp. */
export const MAX_GRADE = 0.1;
export const MAX_RAIL_GRADE = 0.03;
/** Height of a loaded feeder ship above the water; anything elevated over a berth must clear it. */
export const SHIP_AIR_DRAFT = 40;

/** Blocks per rail track, clearance included; a railway is `tracks` times this wide. */
export const TRACK_SPACING = 5;
/** What an unowned building is for; the map tints it by use. */
// Shapes a building may take above its footprint (the generator's Massing); unset, they are picked by kind.
export const BUILDING_FORMS = ['plain', 'twist', 'stack', 'frame'];
export const BUILDING_CROWNS = ['none', 'spire', 'antennas', 'helipad', 'ring'];
export const BUILDING_USES = ['office', 'residential', 'hotel', 'entertainment', 'shop', 'industrial', 'market', 'clinic', 'temple', 'derelict'];
/** A corporation's buildings: its one headquarters, and the plant it runs its public service with. */
export const CORP_ROLES = ['hq', 'service'];
/** What a podium's roof is; megablocks are gardens. */
export const PODIUM_ROOFS = ['garden', 'plaza', 'plant'];
/** Kinds of skybridge: enclosed (the default) or an open, planted deck bridge between roofs at its height. */
export const SKYBRIDGE_KINDS = ['deck'];
/** How a building stands where its footprint leaves the land. */
export const WATER_FOUNDATIONS = ['pier', 'stilts', 'floating', 'aground', 'dam'];
export const WALL_KINDS = ['security', 'sea'];
export const RAILWAY_KINDS = ['freight', 'metro'];
export const DISTRICT_KINDS = ['core', 'office', 'residential', 'housing', 'market', 'park', 'plaza', 'industrial', 'military', 'data', 'customs', 'leisure', 'marine'];

/**
 * The solid pieces of a building, each standing from `base` to `top` blocks above ground:
 * the podium under its tower(s) and any raised tiers of it, each tower (rising from the tier it stands on), or the whole
 * footprint for a plain building.
 */
export function buildingParts(b) {
  const podium = b.podium?.height;
  if (Array.isArray(b.towers) && podium != null) {
    const tiers = (b.podium.tiers ?? []).map(t => ({ shape: t.footprint, base: 0, top: t.height, tier: true }));
    return [{ shape: b.footprint, base: 0, top: podium }, ...tiers, ...b.towers.map(t => ({ shape: t.footprint, base: towerBase(b, t), top: t.height }))];
  }
  if (b.tower && podium != null) return [{ shape: b.footprint, base: 0, top: podium }, { shape: b.tower, base: podium, top: b.height }];
  return [{ shape: b.footprint, base: 0, top: b.height ?? 0 }];
}

/** The height a tower rises from: the highest podium tier under its middle, or the podium. */
export function towerBase(b, t) {
  const c = centroid(t.footprint);
  return Math.max(b.podium?.height ?? 0, ...(b.podium?.tiers ?? []).filter(tier => pointIn(c, ring(tier.footprint))).map(tier => tier.height));
}
function pointIn([x, z], pts) {
  let hit = false;
  for (let i = 0, j = pts.length - 1; i < pts.length; j = i++) {
    const [xi, zi] = pts[i], [xj, zj] = pts[j];
    if ((zi > z) !== (zj > z) && x < ((xj - xi) * (z - zi)) / (zj - zi) + xi) hit = !hit;
  }
  return hit;
}

/** A shape is either a rect [x, z, width, depth] or a list of [x, z] points. */
export function isRect(shape) {
  return Array.isArray(shape) && shape.length === 4 && shape.every(n => typeof n === 'number');
}

export function ring(shape) {
  if (!isRect(shape)) return shape;
  const [x, z, w, d] = shape;
  return [[x, z], [x + w, z], [x + w, z + d], [x, z + d]];
}

export function bbox(shape) {
  const pts = ring(shape), xs = pts.map(p => p[0]), zs = pts.map(p => p[1]);
  return [Math.min(...xs), Math.min(...zs), Math.max(...xs), Math.max(...zs)];
}

/** Signed-area centroid of a polygon; falls back to the bbox centre for degenerate shapes. */
export function centroid(shape) {
  const pts = ring(shape);
  let a = 0, cx = 0, cz = 0;
  for (let i = 0; i < pts.length; i++) {
    const [x1, z1] = pts[i], [x2, z2] = pts[(i + 1) % pts.length], f = x1 * z2 - x2 * z1;
    a += f; cx += (x1 + x2) * f; cz += (z1 + z2) * f;
  }
  if (Math.abs(a) < 1e-9) { const [x0, z0, x1, z1] = bbox(shape); return [(x0 + x1) / 2, (z0 + z1) / 2]; }
  return [cx / (3 * a), cz / (3 * a)];
}

export function area(shape) {
  const pts = ring(shape);
  let a = 0;
  for (let i = 0; i < pts.length; i++) {
    const [x1, z1] = pts[i], [x2, z2] = pts[(i + 1) % pts.length];
    a += x1 * z2 - x2 * z1;
  }
  return Math.abs(a) / 2;
}

/**
 * Local frame of a rect whose seaward edge faces `seaSide`.
 * u runs from the sea edge inland (0..length), v runs across (0..width).
 */
export function frame(rect, seaSide) {
  const [x, z, w, d] = rect;
  switch (seaSide) {
    case 'west': return { length: w, width: d, at: (u, v) => [x + u, z + v] };
    case 'east': return { length: w, width: d, at: (u, v) => [x + w - u, z + v] };
    case 'north': return { length: d, width: w, at: (u, v) => [x + v, z + u] };
    case 'south': return { length: d, width: w, at: (u, v) => [x + v, z + d - u] };
    default: throw new Error(`seaSide must be one of ${SIDES.join(', ')}, got ${seaSide}`);
  }
}

/** Polygon for the local box u0..u1 × v0..v1. */
function box(f, u0, u1, v0, v1) {
  return [f.at(u0, v0), f.at(u1, v0), f.at(u1, v1), f.at(u0, v1)];
}

/** Walls outside a basin on its landward end and both sides; the seaward end stays open. */
function basinWalls(f, t) {
  return [
    box(f, 0, f.length, -t, 0),
    box(f, 0, f.length, f.width, f.width + t),
    box(f, f.length, f.length + t, -t, f.width + t),
  ];
}

const BOW = 46;

function shipHull(f, ship) {
  const u0 = (f.length - ship.length) / 2, u1 = u0 + ship.length;
  const v0 = (f.width - ship.beam) / 2, v1 = v0 + ship.beam;
  const shoulder = u1 - Math.min(BOW, ship.length / 3);
  return [f.at(u0, v0), f.at(shoulder, v0), f.at(u1, (v0 + v1) / 2), f.at(shoulder, v1), f.at(u0, v1)];
}

/** Everything drawable, as { id, owner, kind, name, geometry: {type, coordinates-in-blocks} }. */
export function expand(city) {
  const out = [];
  const polygon = (props, pts) => out.push({ ...props, geometry: { type: 'Polygon', coordinates: [close(pts)] } });
  const line = (props, pts) => out.push({ ...props, geometry: { type: 'LineString', coordinates: pts } });
  const point = (props, pt) => out.push({ ...props, geometry: { type: 'Point', coordinates: pt } });

  for (const land of city.land ?? []) {
    polygon({ id: land.id, owner: land.id, kind: land.kind, name: land.name }, land.outline);
    if (land.kind === 'island') point({ id: `${land.id}/label`, owner: land.id, kind: 'label-land', name: land.name }, land.labelAt ?? centroid(land.outline));
  }

  for (const d of city.districts ?? []) {
    polygon({ id: d.id, owner: d.id, kind: 'district', districtKind: d.kind, name: d.name }, ring(d.outline));
    point({ id: `${d.id}/label`, owner: d.id, kind: 'label-district', name: d.name }, d.labelAt ?? centroid(d.outline));
  }

  const corps = new Map((city.corporations ?? []).map(c => [c.id, c]));
  /** Footprint, ship hall, overhang and HQ label of one building, in site or city. */
  function building(b, site) {
    const corp = corps.get(b.corp);
    const props = { owner: b.id, role: b.role ?? null, corp: b.corp ?? null, color: corp?.color ?? null, height: b.height ?? null, use: b.use ?? null };
    // A podium covers the footprint up to podium.height; towers rise from it, each to its own height.
    const towers = Array.isArray(b.towers) ? b.towers : b.tower ? [{ footprint: b.tower, height: b.height }] : [];
    const podium = towers.length ? b.podium?.height ?? null : null;
    polygon({ ...props, id: b.id, kind: 'building', name: b.name, top: podium ?? b.height ?? null, hasTower: towers.length > 0, roof: b.podium?.roof ?? null }, ring(b.footprint));
    (towers.length ? b.podium?.tiers ?? [] : []).forEach((t, i) => polygon({ ...props, id: `${b.id}/tier-${i}`, kind: 'tier', name: `${b.name} tier`, height: t.height, base: 0, roof: b.podium?.roof ?? null }, ring(t.footprint)));
    towers.forEach((t, i) => polygon({ ...props, id: `${b.id}/tower-${i}`, kind: 'tower', name: t.name ?? `${b.name} tower`, height: t.height ?? b.height ?? null, base: podium != null ? towerBase(b, t) : 0 }, ring(t.footprint)));
    // A ship hall is the part of a basin (berth or dry dock) that runs inside the building.
    for (const id of hallIds(b)) {
      const berth = site?.berths?.find(x => x.id === id), dock = site?.dryDocks?.find(x => x.id === id);
      const basin = (berth ?? dock)?.basin;
      const hall = isRect(basin) && intersect(bbox(basin), bbox(b.footprint));
      if (hall) polygon({ id: `${b.id}/hall-${id}`, owner: b.id, kind: dock ? 'hall-dry' : 'hall', name: `${b.name} ship hall` }, ring(hall));
    }
    if (b.upperFootprint) polygon({ ...props, id: `${b.id}/upper`, kind: 'upper-floors', name: `${b.name} (upper floors)` }, ring(b.upperFootprint));
    if (b.role === 'hq') {
      const title = corp?.name ?? b.name;
      point({ id: `${b.id}/label`, owner: b.id, kind: 'label-hq', name: b.height ? `${title}\n${b.height} m` : title }, centroid(b.footprint));
    } else if (b.role === 'service' && area(b.footprint) >= 150) {
      // Named plant only; the grid of small masts would bury the map in labels.
      point({ id: `${b.id}/label`, owner: b.id, kind: 'label-service', name: b.name }, centroid(b.footprint));
    }
  }

  // A ground street named in a building's roadsThrough has been built over; it is drawn across the roof.
  const allBuildings = [...(city.buildings ?? []), ...(city.sites ?? []).flatMap(s => s.buildings ?? [])];
  const covered = new Set(allBuildings.flatMap(b => [].concat(b.roadsThrough ?? [])));
  for (const road of city.roads ?? []) {
    const width = road.width ?? city.roadTypes?.[road.type]?.width;
    const elev = roadElevations(road), top = Math.max(0, ...elev);
    const kind = top > 0 ? 'road-elevated' : covered.has(road.id) ? 'road-covered' : 'road';
    line({ id: road.id, owner: road.id, kind, name: road.name, roadType: road.type, width, elevation: top }, road.path);
    if (top > 0) deckSlabs(road.path, elev, width).forEach((pts, i) =>
      polygon({ id: `${road.id}/deck-${i}`, owner: road.id, kind: 'deck', name: road.name, base: pts.base, height: pts.height }, pts));
  }

  for (const rail of city.railways ?? []) {
    const width = (rail.tracks ?? 1) * TRACK_SPACING, elev = roadElevations(rail), top = Math.max(0, ...elev);
    const service = rail.kind ?? 'freight', color = rail.color ?? null;
    line({ id: rail.id, owner: rail.id, kind: 'railway', service, color, name: rail.name, width, elevation: top }, rail.path);
    if (top > 0) deckSlabs(rail.path, elev, width).forEach((pts, i) =>
      polygon({ id: `${rail.id}/deck-${i}`, owner: rail.id, kind: 'deck', service, color, name: rail.name, base: pts.base, height: pts.height }, pts));
    for (const st of rail.stations ?? []) point({ id: st.id, owner: st.id, kind: 'station', service, color, name: st.name }, st.at);
  }

  // Skybridges: walkways between buildings, drawn as short decks at their height.
  for (const sb of city.skybridges ?? []) {
    const width = sb.width ?? 4, elev = roadElevations(sb);
    line({ id: sb.id, owner: sb.id, kind: 'skybridge', bridgeKind: sb.kind ?? null, name: sb.name, width, elevation: Math.max(0, ...elev) }, sb.path);
    deckSlabs(sb.path, elev, width, 16, 3).forEach((pts, i) =>
      polygon({ id: `${sb.id}/deck-${i}`, owner: sb.id, kind: 'skybridge-deck', name: sb.name, base: pts.base, height: pts.height }, pts));
  }

  // Walls stand from the ground to their height along their centre line.
  for (const wall of city.walls ?? []) {
    const width = wall.thickness ?? 2, h = wall.height ?? 8;
    line({ id: wall.id, owner: wall.id, kind: 'city-wall', wallKind: wall.kind, name: wall.name, width }, wall.path);
    deckSlabs(wall.path, wall.path.map(() => h), width, 16, h).forEach((pts, i) =>
      polygon({ id: `${wall.id}/slab-${i}`, owner: wall.id, kind: 'city-wall-3d', name: wall.name, base: pts.base, height: pts.height }, pts));
  }

  // Screens: advertising and notice screens hung on a building's face, from `bottom` to `top`.
  for (const sc of city.screens ?? []) {
    const color = corps.get(sc.corp)?.color ?? null;
    line({ id: sc.id, owner: sc.id, kind: 'screen', name: sc.name, color }, sc.line);
    deckSlabs(sc.line, sc.line.map(() => sc.top), 2, 8, sc.top - sc.bottom).forEach((pts, i) =>
      polygon({ id: `${sc.id}/face-${i}`, owner: sc.id, kind: 'screen-3d', name: sc.name, color, base: pts.base, height: pts.height }, pts));
  }

  for (const site of city.sites ?? []) {
    const t = site.wallThickness ?? 0;
    const q = frame(site.quay, site.seaSide);
    polygon({ id: `${site.id}/quay`, owner: site.id, kind: 'quay', name: site.name }, ring(site.quay));
    if (t > 0) {
      // Perimeter walls sit inside the quay, open to the sea.
      [box(q, 0, q.length, 0, t), box(q, 0, q.length, q.width - t, q.width), box(q, q.length - t, q.length, 0, q.width)]
        .forEach((pts, i) => polygon({ id: `${site.id}/wall-${i}`, owner: site.id, kind: 'wall', name: site.name }, pts));
    }
    point({ id: `${site.id}/label`, owner: site.id, kind: 'label-site', name: site.name }, q.at(q.length / 2, -24));

    for (const berth of site.berths ?? []) {
      const f = frame(berth.basin, site.seaSide);
      polygon({ id: `${berth.id}/basin`, owner: berth.id, kind: 'basin', name: berth.name }, ring(berth.basin));
      basinWalls(f, t).forEach((pts, i) => polygon({ id: `${berth.id}/wall-${i}`, owner: berth.id, kind: 'wall', name: berth.name }, pts));
      if (berth.ship) polygon({ id: `${berth.id}/ship`, owner: berth.id, kind: 'ship', name: `${berth.name} ship`, length: berth.ship.length, beam: berth.ship.beam }, shipHull(f, berth.ship));
      point({ id: `${berth.id}/label`, owner: berth.id, kind: 'label-feature', name: berth.name }, f.at(f.length + t + 8, f.width / 2));
    }

    for (const dock of site.dryDocks ?? []) {
      const f = frame(dock.basin, site.seaSide);
      polygon({ id: `${dock.id}/floor`, owner: dock.id, kind: 'dry-dock', name: dock.name }, ring(dock.basin));
      basinWalls(f, t).forEach((pts, i) => polygon({ id: `${dock.id}/wall-${i}`, owner: dock.id, kind: 'wall', name: dock.name }, pts));
      polygon({ id: `${dock.id}/gate`, owner: dock.id, kind: 'dock-gate', name: `${dock.name} gate` }, box(f, 0, 4, 0, f.width));
      point({ id: `${dock.id}/label`, owner: dock.id, kind: 'label-feature', name: dock.name }, f.at(f.length / 2, f.width / 2));
    }

    for (const b of site.buildings ?? []) building(b, site);
  }

  for (const b of city.buildings ?? []) building(b, null);

  for (const label of city.labels ?? []) {
    point({ id: label.id, owner: label.id, kind: `label-${label.kind}`, name: label.text }, label.at);
  }
  return out;
}

/** Short flat slabs along an elevated road, stepping with its ramps, for the 3D view. Ground-level pieces are skipped. */
function deckSlabs(path, elev, width, step = 16, thickness = 2) {
  const out = [], h = width / 2;
  for (let i = 0; i + 1 < path.length; i++) {
    const [[x0, z0], [x1, z1]] = [path[i], path[i + 1]], len = Math.hypot(x1 - x0, z1 - z0);
    if (!len) continue;
    const [ux, uz] = [(x1 - x0) / len, (z1 - z0) / len], [nx, nz] = [-uz * h, ux * h];
    for (let a = 0; a < len; a += step) {
      const b = Math.min(len, a + step), top = elev[i] + (elev[i + 1] - elev[i]) * ((a + b) / 2 / len);
      if (top < 1) continue;
      // Pieces overlap by half a width so bends have no gaps.
      const [s, e] = [Math.max(0, a - h), Math.min(len, b + h)];
      const pts = [[x0 + ux * s + nx, z0 + uz * s + nz], [x0 + ux * e + nx, z0 + uz * e + nz], [x0 + ux * e - nx, z0 + uz * e - nz], [x0 + ux * s - nx, z0 + uz * s - nz]];
      out.push(Object.assign(pts, { height: Math.round(top), base: Math.max(0, Math.round(top) - thickness) }));
    }
  }
  return out;
}

/** Overlap of two bboxes [x0, z0, x1, z1] as a rect, or null. */
function intersect(a, b) {
  const [x0, z0, x1, z1] = [Math.max(a[0], b[0]), Math.max(a[1], b[1]), Math.min(a[2], b[2]), Math.min(a[3], b[3])];
  return x1 > x0 && z1 > z0 ? [x0, z0, x1 - x0, z1 - z0] : null;
}

function close(pts) {
  const [a, b] = [pts[0], pts[pts.length - 1]];
  return a[0] === b[0] && a[1] === b[1] ? pts : [...pts, a];
}

// Blocks map 1:1 onto Web Mercator metres at the equator, so the map's scale bar reads in blocks.
// +x is east, +z is south (north is up), matching Minecraft.
const R = 6378137;
export function toLngLat([x, z]) {
  return [(x / R) * 180 / Math.PI, Math.atan(Math.sinh(-z / R)) * 180 / Math.PI];
}
export function fromLngLat({ lng, lat }) {
  return [(lng * Math.PI / 180) * R, -R * Math.log(Math.tan(Math.PI / 4 + (lat * Math.PI) / 360))];
}
/** Pixels per block at zoom 0, for 512px tiles. Multiply by 2^zoom. */
export const PIXELS_PER_BLOCK_Z0 = 512 / (2 * Math.PI * R);

export function toGeoJSON(features) {
  const project = (g) => {
    if (g.type === 'Point') return { type: 'Point', coordinates: toLngLat(g.coordinates) };
    if (g.type === 'LineString') return { type: 'LineString', coordinates: g.coordinates.map(toLngLat) };
    return { type: 'Polygon', coordinates: g.coordinates.map(r => r.map(toLngLat)) };
  };
  return {
    type: 'FeatureCollection',
    features: features.map(({ geometry, ...properties }) => ({ type: 'Feature', properties, geometry: project(geometry) })),
  };
}
