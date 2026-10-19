// Plain-text checks on city.json. Returns { errors, warnings, summary }; never throws on bad data.
import { LONG_RUN, MIN_CROSSING, metroCrossings, stationGaps } from './metro.js';
import { BUILDING_CROWNS, BUILDING_FORMS, BUILDING_USES, CORP_ROLES, DECK_CLEARANCE, DISTRICT_KINDS, MAX_GRADE, MAX_RAIL_GRADE, PODIUM_ROOFS, RAILWAY_KINDS, SHIP_AIR_DRAFT, SIDES, SKYBRIDGE_KINDS, TRACK_SPACING, WALL_KINDS, WATER_FOUNDATIONS, buildingParts, centroid, hallIds, roadElevations, area, bbox, frame, isRect, ring } from './city.js';

/** With `sightlines`, the summary also reports each district's longest clear view down its streets (slower; the CLI asks). */
export function validate(city, { sightlines = false } = {}) {
  const errors = [], warnings = [], summary = [], halls = [];
  const err = (m) => errors.push(m), warn = (m) => warnings.push(m);

  if (city.schema !== 1) err(`schema must be 1, got ${city.schema}`);

  const ids = new Map();
  const claim = (id, where) => {
    if (typeof id !== 'string' || !/^[a-z0-9]+(-[a-z0-9]+)*$/.test(id)) err(`${where}: id "${id}" must be lowercase kebab-case`);
    else if (ids.has(id)) err(`duplicate id "${id}" (${ids.get(id)} and ${where})`);
    else ids.set(id, where);
  };
  const checkShape = (shape, where) => {
    if (isRect(shape)) {
      if (shape[2] <= 0 || shape[3] <= 0) err(`${where}: rect width and depth must be positive, got [${shape}]`);
    } else if (!Array.isArray(shape) || shape.length < 3 || !shape.every(p => Array.isArray(p) && p.length === 2)) {
      err(`${where}: must be a rect [x, z, width, depth] or at least 3 [x, z] points`);
      return false;
    }
    if (ring(shape).flat().some(n => !Number.isInteger(n))) warn(`${where}: non-integer coordinates; Minecraft blocks are whole numbers`);
    return true;
  };

  const lands = city.land ?? [];
  for (const land of lands) {
    claim(land.id, `land ${land.id}`);
    if (!['island', 'mainland'].includes(land.kind)) err(`land ${land.id}: kind must be island or mainland`);
    if (checkShape(land.outline, `land ${land.id}`) && selfIntersects(land.outline)) err(`land ${land.id}: outline crosses itself`);
  }
  const onLand = (p) => lands.some(l => Array.isArray(l.outline) && inside(p, ring(l.outline)));

  const ceiling = city.ceiling;
  if (ceiling != null && !(Number.isInteger(ceiling) && ceiling > 0)) err(`ceiling must be a positive whole number of blocks, got ${ceiling}`);
  const corps = new Map();
  for (const c of city.corporations ?? []) {
    claim(c.id, `corporation ${c.id}`);
    corps.set(c.id, c);
    if (!/^#[0-9a-f]{6}$/i.test(c.color ?? '')) err(`corporation ${c.id}: color must be a hex colour like #1a73e8`);
  }
  for (const d of city.districts ?? []) {
    const w = `district ${d.id}`;
    claim(d.id, w);
    if (!DISTRICT_KINDS.includes(d.kind)) err(`${w}: kind must be one of ${DISTRICT_KINDS.join(', ')}`);
    if (!checkShape(d.outline, w)) continue;
    if (!isRect(d.outline) && selfIntersects(d.outline)) err(`${w}: outline crosses itself`);
    const wet = ring(d.outline).findIndex(p => !onLand(p));
    if (d.kind !== 'marine' && wet >= 0) warn(`${w}: point ${wet} [${ring(d.outline)[wet]}] is in the water`);
  }

  const rails = new Map();
  for (const rail of city.railways ?? []) {
    const w = `railway ${rail.id}`;
    claim(rail.id, w);
    if (!Number.isInteger(rail.tracks) || rail.tracks < 1) err(`${w}: tracks must be a whole number of at least 1`);
    if (rail.kind != null && !RAILWAY_KINDS.includes(rail.kind)) err(`${w}: kind must be one of ${RAILWAY_KINDS.join(', ')}`);
    if (rail.color != null && !/^#[0-9a-f]{6}$/i.test(rail.color)) err(`${w}: color must be a hex colour like #ff1744`);
    if (!Array.isArray(rail.path) || rail.path.length < 2) { err(`${w}: path needs at least 2 points`); continue; }
    rails.set(rail.id, rail);
    for (const st of rail.stations ?? []) {
      claim(st.id, `station ${st.id}`);
      if (!Array.isArray(st.at) || distanceToPath([st.at], rail.path) > rail.tracks * TRACK_SPACING / 2) err(`station ${st.id}: at [${st.at}] is not on ${rail.id}`);
    }
    // Railways may cross water on viaducts, but each end has to arrive somewhere.
    for (const end of [rail.path[0], rail.path.at(-1)]) {
      const inSite = (city.sites ?? []).some(site => isRect(site.quay) && inside(end, ring(site.quay)));
      if (!onLand(end) && !inSite) warn(`${w}: end [${end}] is in the water`);
    }
    if (Array.isArray(rail.elevation) && rail.elevation.length !== rail.path.length) err(`${w}: elevation needs one value per path point (${rail.path.length})`);
    const elev = roadElevations(rail);
    if (elev.some(e => !Number.isInteger(e) || e < 0)) err(`${w}: elevations must be whole numbers of blocks, 0 or more`);
    const half = (rail.tracks ?? 1) * TRACK_SPACING / 2;
    for (let i = 0; i + 1 < rail.path.length; i++) {
      const [a, b] = [rail.path[i], rail.path[i + 1]], run = Math.hypot(b[0] - a[0], b[1] - a[1]);
      if (run && Math.abs(elev[i + 1] - elev[i]) / run > MAX_RAIL_GRADE) warn(`${w}: point ${i} to ${i + 1} climbs more than ${MAX_RAIL_GRADE * 100}%`);
      // At ground level a railway can't cross a basin; elevated, it must clear the ships.
      const deck = Math.min(elev[i], elev[i + 1]);
      for (const site of city.sites ?? []) for (const item of [...(site.berths ?? []), ...(site.dryDocks ?? [])]) {
        if (!isRect(item.basin) || distanceToPath(ring(item.basin), [a, b]) >= half) continue;
        if (deck === 0) err(`${w} runs through the basin of ${item.id}`);
        else if (item.ship && deck < SHIP_AIR_DRAFT) err(`${w} crosses ${item.id} at deck ${deck}, below the ${SHIP_AIR_DRAFT}-block ship`);
      }
    }
  }
  const railLength = (path) => path.slice(1).reduce((n, p, i) => n + Math.hypot(p[0] - path[i][0], p[1] - path[i][1]), 0);

  // Checks shared by site and city buildings: height under the ceiling, a known owner, clear of roads.
  const heights = [], owned = new Map(), services = new Map();
  // Which buildings each metro line's tube runs into (keyed by building, then line).
  const metro = metroCrossings(city), metroHits = new Map();
  for (const [id, { crossings }] of metro) for (const c of crossings) {
    if (!metroHits.has(c.building.id)) metroHits.set(c.building.id, new Map());
    metroHits.get(c.building.id).set(id, c);
  }

  const checkBuilding = (b, w) => {
    if (b.height != null) {
      if (!Number.isInteger(b.height) || b.height <= 0) err(`${w}: height must be a positive whole number of blocks`);
      else if (ceiling != null && b.height > ceiling) err(`${w}: ${b.height} blocks is above the ${ceiling}-block ceiling`);
      else heights.push([b.height, b.id]);
    }
    if (b.corp != null && !corps.has(b.corp)) err(`${w}: unknown corp "${b.corp}"`);
    if (b.use != null && !BUILDING_USES.includes(b.use)) err(`${w}: use must be one of ${BUILDING_USES.join(', ')}`);
    if (b.water != null && !WATER_FOUNDATIONS.includes(b.water)) err(`${w}: water must be one of ${WATER_FOUNDATIONS.join(', ')}`);
    if (b.upperFrom != null && (!Number.isInteger(b.upperFrom) || b.upperFrom <= 0 || (b.height != null && b.upperFrom >= b.height))) err(`${w}: upperFrom must be a whole number of blocks below the roof`);
    if (b.upperFrom != null && !b.upperFootprint) warn(`${w}: upperFrom without an upperFootprint`);
    if (b.setbacks != null) {
      const ok = Array.isArray(b.setbacks) && b.setbacks.every(sb => Array.isArray(sb) && sb.length === 2 && sb.every(v => Number.isInteger(v) && v > 0));
      if (!ok) err(`${w}: setbacks must be [[height, inset], ...] in whole blocks`);
      else if (b.setbacks.some((sb, i) => i > 0 && (sb[0] <= b.setbacks[i - 1][0] || sb[1] <= b.setbacks[i - 1][1]))) err(`${w}: each setback must be higher and deeper than the one before`);
      else if (b.height != null && b.setbacks.some(sb => sb[0] >= b.height)) err(`${w}: a setback is at or above the roof`);
    }
    if (b.chamfer != null && (!Number.isInteger(b.chamfer) || b.chamfer < 0)) err(`${w}: chamfer must be a whole number of blocks`);
    if (b.form != null && !BUILDING_FORMS.includes(b.form)) err(`${w}: form must be one of ${BUILDING_FORMS.join(', ')}`);
    if (b.crown != null && !BUILDING_CROWNS.includes(b.crown)) err(`${w}: crown must be one of ${BUILDING_CROWNS.join(', ')}`);
    if (b.skyGap != null && (!Number.isInteger(b.skyGap) || b.skyGap < 0 || (b.height != null && b.skyGap > 0 && b.skyGap + 20 > b.height))) err(`${w}: skyGap must be 0 (none) or a height at least 20 below the roof`);
    if (b.podium != null) {
      if (!Number.isInteger(b.podium.height) || b.podium.height <= 0) err(`${w}: podium height must be a positive whole number of blocks`);
      else if (b.height != null && b.podium.height >= b.height) err(`${w}: podium (${b.podium.height}) must be lower than the building (${b.height})`);
      if (b.podium.roof != null && !PODIUM_ROOFS.includes(b.podium.roof)) err(`${w}: podium roof must be one of ${PODIUM_ROOFS.join(', ')}`);
      // Raised tiers of the podium: inside its footprint, above it, below the towers.
      for (const [i, t] of (b.podium.tiers ?? []).entries()) {
        const tw = `${w} tier ${i}`;
        if (!checkShape(t.footprint, tw)) continue;
        const out = ring(t.footprint).find(p => !inside(p, ring(b.footprint)) && edgeDistance(p, ring(b.footprint)) > 0.5);
        if (out) err(`${tw}: corner [${out}] is outside the podium`);
        if (!Number.isInteger(t.height) || t.height <= b.podium.height) err(`${tw}: height must be a whole number above the podium (${b.podium.height})`);
        else if (b.height != null && t.height >= b.height) err(`${tw}: height ${t.height} must be below the building's (${b.height})`);
      }
    }
    if (b.tower != null && b.towers != null) err(`${w}: use tower (one) or towers (several), not both`);
    const towerShapes = b.tower != null ? [[b.tower, b.height, `${w} tower`]] : (b.towers ?? []).map((t, i) => [t.footprint, t.height, `${w} tower ${i}`]);
    if (towerShapes.length && b.podium == null) err(`${w}: a tower needs a podium to stand on`);
    for (const [shape, h, tw] of towerShapes) {
      if (!checkShape(shape, tw)) continue;
      const out = ring(shape).find(p => !inside(p, ring(b.footprint)) && edgeDistance(p, ring(b.footprint)) > 0.5);
      if (out) err(`${tw}: corner [${out}] is outside the podium`);
      // A tower stands on the highest tier under it, all of it.
      const under = (b.podium?.tiers ?? []).filter(t => Array.isArray(t.footprint) && shapesOverlap(t.footprint, shape));
      if (under.length) {
        const top = Math.max(...under.map(t => t.height));
        const within = (t) => ring(shape).every(p => inside(p, ring(t.footprint)) || edgeDistance(p, ring(t.footprint)) <= 0.5);
        if (!under.filter(t => t.height === top).some(within)) err(`${tw}: must stand wholly on the highest tier under it (${top})`);
        else if (Number.isInteger(h) && h <= top + 4) err(`${tw}: height ${h} must rise above its tier (${top})`);
      }
      if (!Number.isInteger(h) || (b.podium && h <= b.podium.height)) err(`${tw}: height must be a whole number above the podium`);
      else if (ceiling != null && h > ceiling) err(`${tw}: ${h} blocks is above the ${ceiling}-block ceiling`);
    }
    if (b.towers != null) {
      const top = Math.max(...b.towers.map(t => t.height));
      if (b.height !== top) err(`${w}: height (${b.height}) must be its tallest tower (${top})`);
      for (let i = 0; i < b.towers.length; i++) for (let j = i + 1; j < b.towers.length; j++) {
        if (shapesOverlap(b.towers[i].footprint, b.towers[j].footprint)) err(`${w}: towers ${i} and ${j} overlap`);
      }
    }
    // Each corporation has exactly one headquarters; everything else it owns is plant for its public service.
    if (b.corp != null) {
      if (!CORP_ROLES.includes(b.role)) err(`${w}: a corporation's building needs role ${CORP_ROLES.map(r => `"${r}"`).join(' or ')}`);
      else if (b.role === 'hq') {
        if (owned.has(b.corp)) err(`${w}: ${b.corp} already has its HQ, ${owned.get(b.corp)}`);
        else owned.set(b.corp, b.id);
      } else services.set(b.corp, (services.get(b.corp) ?? 0) + 1);
    } else if (b.role != null) err(`${w}: role "${b.role}" needs a corp`);
    const pts = ring(b.footprint), parts = buildingParts(b);
    /** Roof height of whatever part of the building lies within `half` of a segment. */
    const topNear = (seg, half) => Math.max(0, ...parts.filter(p => distanceToPath(ring(p.shape), seg) < half).map(p => p.top));
    const railHalls = [].concat(b.railHall ?? []), railsThrough = [].concat(b.railsThrough ?? []), railThreaded = new Set();
    for (const rail of rails.values()) {
      if (railHalls.includes(rail.id)) continue;
      // The metro is checked against its real tube and platforms (see metro.js), not just its tracks.
      if (rail.kind === 'metro') {
        const c = metroHits.get(b.id)?.get(rail.id);
        if (!c) continue;
        if (railsThrough.includes(rail.id)) {
          railThreaded.add(rail.id);
          if (!c.through) warn(`${w}: ${rail.id} only clips it (${c.centre} blocks along its centre line); move the line clear or through it, or trim the building`);
          continue;
        }
        const deck = Math.max(...roadElevations(rail));
        err(`${w} is in the way of metro ${rail.id}'s tube or platforms (deck ${deck}); keep it under ${deck - DECK_CLEARANCE}, list it in railsThrough, or move the line`);
        continue;
      }
      const half = rail.tracks * TRACK_SPACING / 2, elev = roadElevations(rail);
      for (let i = 0; i + 1 < rail.path.length; i++) {
        const seg = [rail.path[i], rail.path[i + 1]];
        if (distanceToPath(pts, seg) >= half) continue;
        const deck = Math.min(elev[i], elev[i + 1]);
        if (deck > 0 && topNear(seg, half) <= deck - DECK_CLEARANCE) continue;
        if (deck > 0 && railsThrough.includes(rail.id)) { railThreaded.add(rail.id); continue; }
        err(deck > 0
          ? `${w} is in the way of railway ${rail.id}'s deck at ${deck}; keep it under ${deck - DECK_CLEARANCE} or list it in railsThrough`
          : `${w} sits on railway ${rail.id}`);
        break;
      }
    }
    for (const id of railsThrough) {
      if (!rails.has(id)) err(`${w}: railsThrough "${id}" is not a railway`);
      else if (!railThreaded.has(id)) warn(`${w}: railsThrough "${id}" never passes through it`);
    }
    // A rail hall is a terminal: each named line ends inside the building, so trains load under cover.
    for (const id of railHalls) {
      const rail = rails.get(id);
      if (!rail) { err(`${w}: railHall "${id}" is not a railway`); continue; }
      const ends = [rail.path[0], rail.path.at(-1)].map(p => inside(p, pts));
      if (!ends.includes(true)) { err(`${w}: railway ${rail.id} must end inside the footprint`); continue; }
      const far = ends[0] ? rail.path.at(-1) : rail.path[0];
      const at = lands.find(l => Array.isArray(l.outline) && inside(far, ring(l.outline)))
        ?? (city.sites ?? []).find(site => isRect(site.quay) && inside(far, ring(site.quay)));
      const dest = ends.every(Boolean) ? 'inside the building' : `to ${at?.id ?? 'the water'}`;
      const deck = Math.max(0, ...roadElevations(rail));
      halls.push(`Rail hall ${b.id} → ${rail.id}: ${rail.tracks} tracks, ${Math.round(railLength(rail.path))} blocks ${dest}${deck ? `, deck ${deck}` : ''}`);
    }
    // Roads must stay clear. Elevated decks may pass over low buildings (or low parts, like a podium), or through ones that list them;
    // a ground street listed in roadsThrough has been built over and runs on inside the building.
    const through = [].concat(b.roadsThrough ?? []), threaded = new Set();
    for (const road of city.roads ?? []) {
      if (!Array.isArray(road.path)) continue;
      const half = (road.width ?? city.roadTypes?.[road.type]?.width ?? 0) / 2, elev = roadElevations(road);
      for (let i = 0; i + 1 < road.path.length; i++) {
        const seg = [road.path[i], road.path[i + 1]];
        if (distanceToPath(pts, seg) >= half) continue;
        const deck = Math.min(elev[i], elev[i + 1]), top = topNear(seg, half);
        if (deck > 0 && top <= deck - DECK_CLEARANCE) continue;
        if (through.includes(road.id)) { threaded.add(road.id); continue; }
        err(deck > 0
          ? `${w} (${top}) is in the way of ${road.id}'s deck at ${deck}; keep it under ${deck - DECK_CLEARANCE} or list the road in roadsThrough`
          : `${w} sits on road ${road.id}`);
        break;
      }
    }
    for (const id of through) {
      if (!(city.roads ?? []).some(r => r.id === id)) err(`${w}: roadsThrough "${id}" is not a road`);
      else if (!threaded.has(id)) warn(`${w}: roadsThrough "${id}" never passes through it`);
    }
  };

  let elevated = 0;
  for (const road of city.roads ?? []) {
    claim(road.id, `road ${road.id}`);
    if (road.width == null && !city.roadTypes?.[road.type]) err(`road ${road.id}: unknown type "${road.type}" (known: ${Object.keys(city.roadTypes ?? {}).join(', ')})`);
    if (!Array.isArray(road.path) || road.path.length < 2) { err(`road ${road.id}: path needs at least 2 points`); continue; }
    if (Array.isArray(road.elevation) && road.elevation.length !== road.path.length) err(`road ${road.id}: elevation needs one value per path point (${road.path.length})`);
    if (road.color != null && !/^#[0-9a-f]{6}$/i.test(road.color)) err(`road ${road.id}: color must be a hex colour like #1ff2ff`);
    const elev = roadElevations(road);
    if (elev.some(e => !Number.isInteger(e) || e < 0)) err(`road ${road.id}: elevations must be whole numbers of blocks, 0 or more`);
    // Bridges cross water; only ground-level points need land under them.
    road.path.forEach((p, i) => { if (elev[i] === 0 && !onLand(p)) warn(`road ${road.id}: point ${i} [${p}] is in the water`); });
    for (let i = 0; i + 1 < road.path.length; i++) {
      const [a, b] = [road.path[i], road.path[i + 1]], run = Math.hypot(b[0] - a[0], b[1] - a[1]);
      const grade = run ? Math.abs(elev[i + 1] - elev[i]) / run : 0;
      if (grade > MAX_GRADE) warn(`road ${road.id}: ramp from point ${i} to ${i + 1} climbs ${Math.round(grade * 100)}% (max ${MAX_GRADE * 100}%)`);
    }
    if (elev.some(e => e > 0)) elevated += road.path.slice(1).reduce((n, p, i) => n + Math.hypot(p[0] - road.path[i][0], p[1] - road.path[i][1]), 0);
  }

  for (const site of city.sites ?? []) {
    const where = `site ${site.id}`;
    claim(site.id, where);
    if (!SIDES.includes(site.seaSide)) { err(`${where}: seaSide must be one of ${SIDES.join(', ')}`); continue; }
    if (!isRect(site.quay)) { err(`${where}: quay must be a rect [x, z, width, depth]`); continue; }
    checkShape(site.quay, `${where} quay`);
    const t = site.wallThickness ?? 0, q = frame(site.quay, site.seaSide);
    if (onLand(q.at(0, q.width / 2))) warn(`${where}: seaward edge (${site.seaSide}) is on land; ships cannot reach it`);
    if (!onLand(q.at(q.length, q.width / 2))) err(`${where}: landward edge is in the water; the site is not attached to the coast`);

    // Everything that occupies ground inside the site, for overlap checks. Upper floors are exempt.
    const occupied = [];
    const basin = (item, kind) => {
      const w = `${kind} ${item.id}`;
      claim(item.id, w);
      if (!isRect(item.basin)) { err(`${w}: basin must be a rect`); return; }
      checkShape(item.basin, w);
      const f = frame(item.basin, site.seaSide);
      const outer = outerBox(item.basin, site.seaSide, t);
      if (!contains(site.quay, outer)) err(`${w}: basin plus ${t}-block walls [${outer}] extends outside the quay [${site.quay}]`);
      const seaEdge = bbox(ring(item.basin)), quayEdge = bbox(ring(site.quay));
      const aligned = { west: seaEdge[0] === quayEdge[0], east: seaEdge[2] === quayEdge[2], north: seaEdge[1] === quayEdge[1], south: seaEdge[3] === quayEdge[3] }[site.seaSide];
      if (!aligned) warn(`${w}: basin does not open onto the quay's ${site.seaSide} (sea) edge`);
      occupied.push({ id: item.id, name: w, rect: outer });
      if (item.ship) {
        const { length, beam } = item.ship;
        if (length > f.length) err(`${w}: ${length}-block ship is longer than the ${f.length}-block basin`);
        if (beam > f.width) err(`${w}: ${beam}-block beam is wider than the ${f.width}-block basin`);
      }
    };
    // The building must straddle the basin's landward end, walls included, so ships sail inside it.
    const shipHall = (b, w, id, notes) => {
      const berth = [...(site.berths ?? []), ...(site.dryDocks ?? [])].find(x => x.id === id);
      if (!berth) { err(`${w}: shipHall "${id}" is not a berth or dry dock of ${site.id}`); return; }
      if (!isRect(berth.basin)) return;
      const f = frame(berth.basin, site.seaSide), fp = bbox(b.footprint);
      const end = bbox([f.at(f.length, -t), f.at(f.length + t, f.width + t)]);
      if (!contains(b.footprint, end)) { err(`${w}: footprint must cover the landward end of ${berth.id}, walls included [${end}]`); return; }
      const [x0, z0, x1, z1] = bbox(berth.basin);
      const covered = ['west', 'east'].includes(site.seaSide)
        ? Math.min(x1, fp[2]) - Math.max(x0, fp[0]) : Math.min(z1, fp[3]) - Math.max(z0, fp[1]);
      const out = berth.ship ? f.length - covered - (f.length - berth.ship.length) / 2 : 0;
      notes.push(out > 0 ? `${berth.id} (${covered}/${f.length} covered, stern out ${out})` : berth.id);
    };
    (site.berths ?? []).forEach(b => basin(b, 'berth'));
    (site.dryDocks ?? []).forEach(d => basin(d, 'dry dock'));

    for (const b of site.buildings ?? []) {
      const w = `building ${b.id}`;
      claim(b.id, w);
      if (!checkShape(b.footprint, `${w} footprint`)) continue;
      if (b.upperFootprint) checkShape(b.upperFootprint, `${w} upperFootprint`);
      if (!contains(site.quay, bbox(b.footprint))) err(`${w}: footprint extends outside the quay [${site.quay}]`);
      if (hallIds(b).length) {
        const notes = [];
        hallIds(b).forEach(id => shipHall(b, w, id, notes));
        if (notes.length) halls.push(`Ship hall ${b.id} → ${notes.join(', ')}${notes.some(n => n.includes('stern')) ? '' : ': every ship fully inside'}`);
      }
      checkBuilding(b, w);
      occupied.push({ id: b.id, name: w, rect: bbox(b.footprint), halls: hallIds(b) });
    }
    for (let i = 0; i < occupied.length; i++) for (let j = i + 1; j < occupied.length; j++) {
      const [a, c] = [occupied[i], occupied[j]];
      if (a.halls?.includes(c.id) || c.halls?.includes(a.id)) continue; // a basin runs into its ship hall by design
      if (overlaps(a.rect, c.rect)) err(`${a.name} overlaps ${c.name}`);
    }
  }

  const placed = [];
  for (const b of city.buildings ?? []) {
    const w = `building ${b.id}`;
    claim(b.id, w);
    if (!checkShape(b.footprint, `${w} footprint`)) continue;
    if (b.upperFootprint) checkShape(b.upperFootprint, `${w} upperFootprint`);
    if (b.shipHall != null) err(`${w}: shipHall only works for buildings inside a site`);
    // Corners, edge midpoints and the middle: a dam can have both ends ashore and still cross water.
    const fp = ring(b.footprint), probes = [...fp, ...fp.map((p, i) => [(p[0] + fp[(i + 1) % fp.length][0]) / 2, (p[1] + fp[(i + 1) % fp.length][1]) / 2]), centroid(b.footprint)];
    const wet = probes.find(p => !onLand(p));
    if (wet && b.water == null) err(`${w}: [${wet.map(Math.round)}] is in the water; give it a water foundation (${WATER_FOUNDATIONS.join(', ')}) or move it ashore`);
    if (!wet && b.water != null && !['pier', 'stilts'].includes(b.water)) warn(`${w}: water "${b.water}" but it stands wholly on land`);
    for (const site of city.sites ?? []) if (isRect(site.quay) && overlaps(bbox(b.footprint), bbox(site.quay))) err(`${w} overlaps site ${site.id}`);
    checkBuilding(b, w);
    placed.push({ name: w, shape: b.footprint });
  }
  for (let i = 0; i < placed.length; i++) for (let j = i + 1; j < placed.length; j++) {
    if (shapesOverlap(placed[i].shape, placed[j].shape)) err(`${placed[i].name} overlaps ${placed[j].name}`);
  }

  const allBuildings = [...(city.buildings ?? []), ...(city.sites ?? []).flatMap(site => site.buildings ?? [])];
  const byId = new Map(allBuildings.map(b => [b.id, b]));
  /** The part of a building whose outline contains p, tallest first, or null. */
  const partAt = (p) => {
    let best = null;
    for (const b of allBuildings) {
      if (!Array.isArray(b.footprint) || !inside(p, ring(b.footprint))) continue;
      for (const part of buildingParts(b)) if (inside(p, ring(part.shape)) && (!best || part.top > best.top)) best = { ...part, building: b };
    }
    return best;
  };

  // Elevated lines (roads, railways, skybridges) as sample points, to check where they cross each other.
  const decks = [];
  const sample = (id, kind, path, elev, width) => {
    const pts = [];
    for (let i = 0; i + 1 < path.length; i++) {
      const [a, b] = [path[i], path[i + 1]], len = Math.hypot(b[0] - a[0], b[1] - a[1]), n = Math.max(1, Math.ceil(len / 4));
      for (let k = 0; k <= n; k++) pts.push([a[0] + (b[0] - a[0]) * k / n, a[1] + (b[1] - a[1]) * k / n, elev[i] + (elev[i + 1] - elev[i]) * k / n]);
    }
    decks.push({ id, kind, path, elev, half: width / 2, pts });
  };
  for (const road of city.roads ?? []) if (Array.isArray(road.path)) sample(road.id, 'road', road.path, roadElevations(road), road.width ?? city.roadTypes?.[road.type]?.width ?? 0);
  for (const rail of rails.values()) sample(rail.id, 'railway', rail.path, roadElevations(rail), rail.tracks * TRACK_SPACING);

  let bridged = 0;
  for (const sb of city.skybridges ?? []) {
    const w = `skybridge ${sb.id}`;
    claim(sb.id, w);
    if (!Array.isArray(sb.path) || sb.path.length < 2) { err(`${w}: path needs at least 2 points`); continue; }
    if (Array.isArray(sb.elevation) && sb.elevation.length !== sb.path.length) err(`${w}: elevation needs one value per path point (${sb.path.length})`);
    const elev = roadElevations(sb), width = sb.width ?? 4, deck = sb.kind === 'deck';
    if (elev.some(e => !Number.isInteger(e) || e <= 0)) err(`${w}: elevations must be whole numbers of blocks above ground`);
    if (!Number.isInteger(width) || width < 2) err(`${w}: width must be a whole number of at least 2`);
    if (sb.kind != null && !SKYBRIDGE_KINDS.includes(sb.kind)) err(`${w}: kind must be ${SKYBRIDGE_KINDS.join(', ')} (or none, for an enclosed skybridge)`);
    if (deck && (width < 8 || width > 16)) warn(`${w}: a deck bridge is 8 to 16 wide, not ${width}`);
    // Both ends go into a building that stands at least a storey above the deck; a deck bridge lands on a roof at its height.
    const ends = [];
    for (const [p, e] of [[sb.path[0], elev[0]], [sb.path.at(-1), elev.at(-1)]]) {
      const part = partAt(p);
      if (!part) err(`${w}: end [${p}] is not inside a building`);
      else if (deck && part.top !== e) err(`${w}: end [${p}] is at ${e}, but ${part.building.id}'s roof there is at ${part.top}`);
      else if (!deck && part.top < e + 4) err(`${w}: end [${p}] meets ${part.building.id} at ${e}, but it is only ${part.top} tall there`);
      else ends.push(part.building.id);
    }
    // In between it may pass over roofs, but not into the side of anything else.
    for (const b of allBuildings) {
      if (ends.includes(b.id) || !Array.isArray(b.footprint)) continue;
      for (const part of buildingParts(b)) {
        if (distanceToPath(ring(part.shape), sb.path) >= width / 2) continue;
        if (part.top > Math.min(...elev) - 3) { err(`${w} runs into ${b.id} (${part.top} tall)`); break; }
      }
    }
    sample(sb.id, 'skybridge', sb.path, elev, width);
    bridged++;
  }
  // Decks must clear each other where they cross. Roads may meet where one ends on the other (a ramp joining its road, a
  // street ending at another) or where they share a point (an interchange): near there, and wherever the two still overlap
  // on the way in, they are one deck. Railways and skybridges only branch from their own ends.
  const junctions = (a, c) => {
    const out = [];
    for (const [end, idx] of [[a.pts[0], 0], [a.pts.at(-1), a.pts.length - 1]]) {
      const near = nearestSample(c.pts, end);
      if (near.d <= c.half + 1 && Math.abs(end[2] - c.pts[near.i][2]) <= 2) out.push({ ai: idx, ci: near.i });
    }
    for (let i = 0; i < a.path.length; i++) for (let k = 0; k < c.path.length; k++) {
      if (a.path[i][0] !== c.path[k][0] || a.path[i][1] !== c.path[k][1]) continue;
      const [ai, ci] = [nearestSample(a.pts, a.path[i]).i, nearestSample(c.pts, c.path[k]).i];
      if (Math.abs(a.pts[ai][2] - c.pts[ci][2]) <= 2) out.push({ ai, ci }); // a flyover over the same spot is no junction
    }
    return out;
  };
  /** Samples of `p` from index i outward while they still overlap `q` at about its height, plus JUNCTION_ZONE beyond. */
  const zone = (p, q, i, into) => {
    const reach = p.half + q.half;
    for (const dir of [-1, 1]) {
      let k = i, beyond = 0;
      while (k >= 0 && k < p.pts.length) {
        into.add(k);
        const near = nearestSample(q.pts, p.pts[k]);
        const overlapping = near.d < reach && Math.abs(p.pts[k][2] - q.pts[near.i][2]) < DECK_CLEARANCE;
        if (!overlapping) beyond += 4;
        if (beyond > JUNCTION_ZONE) break;
        k += dir;
      }
    }
  };
  const turns = [];
  for (let i = 0; i < decks.length; i++) for (let j = i + 1; j < decks.length; j++) {
    const [a, c] = [decks[i], decks[j]];
    const roads = a.kind === 'road' && c.kind === 'road';
    if (roads && !a.pts.some(p => p[2] > 0) && !c.pts.some(p => p[2] > 0)) continue; // streets meet on the ground
    const joined = roads ? [...junctions(a, c), ...junctions(c, a).map(({ ai, ci }) => ({ ai: ci, ci: ai }))] : [];
    if (!roads) {
      const shared = [a.path[0], a.path.at(-1)].some(p => c.path.some(q => q[0] === p[0] && q[1] === p[1]))
        || [c.path[0], c.path.at(-1)].some(p => a.path.some(q => q[0] === p[0] && q[1] === p[1]));
      if (shared) continue; // a branch leaving its main line
    }
    const freeA = new Set(), freeC = new Set();
    for (const { ai, ci } of joined) { zone(a, c, ai, freeA); zone(c, a, ci, freeC); }
    if (roads) {
      // A ramp (a road with any deck) joins its road tangentially.
      for (const [r, o, ends] of [[a, c, junctions(a, c)], [c, a, junctions(c, a)]]) {
        if (!r.pts.some(p => p[2] > 0)) continue;
        for (const { ai, ci } of ends) {
          const dr = direction(r.pts, ai), dq = direction(o.pts, ci);
          const angle = Math.acos(Math.min(1, Math.abs(dr[0] * dq[0] + dr[1] * dq[1]))) * 180 / Math.PI;
          if (angle > RAMP_ANGLE) turns.push(`road ${r.id} meets ${o.id} at ${Math.round(angle)}° near [${r.pts[ai].slice(0, 2).map(Math.round)}]; ramps should join at ${RAMP_ANGLE}° or less`);
        }
      }
    }
    const [bx0, bz0, bx1, bz1] = bbox(c.path.length > 2 ? c.path : [...c.path, c.path[0]]);
    const reach = a.half + c.half;
    for (let k = 0; k < a.pts.length; k++) {
      const [x, z, e] = a.pts[k];
      if (freeA.has(k) || x < bx0 - reach || x > bx1 + reach || z < bz0 - reach || z > bz1 + reach) continue;
      const hit = c.pts.find(([x2, z2, e2], m) => !freeC.has(m) && Math.hypot(x - x2, z - z2) < reach && (e > 0 || e2 > 0) && Math.abs(e - e2) < DECK_CLEARANCE);
      if (hit) { err(`${a.kind} ${a.id} crosses ${c.kind} ${c.id} near [${Math.round(x)}, ${Math.round(z)}] with only ${Math.abs(Math.round(e - hit[2]))} blocks between decks (min ${DECK_CLEARANCE})`); break; }
    }
  }
  turns.forEach(warn);

  for (const wall of city.walls ?? []) {
    const w = `wall ${wall.id}`;
    claim(wall.id, w);
    if (!WALL_KINDS.includes(wall.kind)) err(`${w}: kind must be one of ${WALL_KINDS.join(', ')}`);
    if (!Array.isArray(wall.path) || wall.path.length < 2) { err(`${w}: path needs at least 2 points`); continue; }
    if (!Number.isInteger(wall.height) || wall.height <= 0) err(`${w}: height must be a positive whole number of blocks`);
    const half = (wall.thickness ?? 2) / 2;
    wall.path.forEach((p, i) => { if (!onLand(p)) warn(`${w}: point ${i} [${p}] is in the water`); });
    // Walls leave gaps (gates) where ground roads pass, and stand clear of buildings.
    for (const road of city.roads ?? []) {
      const elev = roadElevations(road), rh = (road.width ?? city.roadTypes?.[road.type]?.width ?? 0) / 2;
      for (let i = 0; i + 1 < road.path.length; i++) {
        if (Math.min(elev[i], elev[i + 1]) > wall.height + DECK_CLEARANCE) continue;
        if (distanceToPath(ring([road.path[i], road.path[i + 1], road.path[i]]), wall.path) < rh + half) { err(`${w} blocks road ${road.id}; leave a gate`); break; }
      }
    }
    for (const b of allBuildings) {
      if (Array.isArray(b.footprint) && distanceToPath(ring(b.footprint), wall.path) < half) err(`${w} runs into ${b.id}`);
    }
  }

  for (const sc of city.screens ?? []) {
    const w = `screen ${sc.id}`;
    claim(sc.id, w);
    const b = byId.get(sc.on);
    if (!b) { err(`${w}: on "${sc.on}" is not a building`); continue; }
    if (sc.corp != null && !corps.has(sc.corp)) err(`${w}: unknown corp "${sc.corp}"`);
    if (!Number.isInteger(sc.bottom) || !Number.isInteger(sc.top) || sc.bottom < 0 || sc.top <= sc.bottom) err(`${w}: bottom and top must be whole numbers with bottom below top`);
    if (!Array.isArray(sc.line) || sc.line.length < 2) { err(`${w}: line needs at least 2 points`); continue; }
    // Hung on a face: every point within a few blocks of the outline of a part tall enough to carry it.
    const parts = buildingParts(b).filter(p => p.top >= sc.top);
    if (!parts.length) { err(`${w}: ${b.id} is only ${b.height} tall; the screen reaches ${sc.top}`); continue; }
    const off = sc.line.find(p => !parts.some(part => edgeDistance(p, ring(part.shape)) <= 3));
    if (off) err(`${w}: point [${off}] is not on a face of ${b.id} that reaches ${sc.top}`);
  }

  for (const corp of corps.keys()) if (!owned.has(corp)) warn(`corporation ${corp} has no HQ`);
  for (const label of city.labels ?? []) claim(label.id, `label ${label.id}`);

  const island = lands.find(l => l.kind === 'island');
  if (island && Array.isArray(island.outline)) {
    const [x0, z0, x1, z1] = bbox(island.outline);
    summary.push(`Island ${island.id}: ${x1 - x0} × ${z1 - z0} blocks (x ${x0}..${x1}, z ${z0}..${z1}), ${(area(island.outline) / 1e6).toFixed(2)} km² land`);
  }
  summary.push(`${lands.length} land areas, ${(city.districts ?? []).length} districts, ${(city.roads ?? []).length} roads, ${rails.size} railways, ${(city.sites ?? []).length} sites, ${(city.buildings ?? []).length} city buildings, ${corps.size} corporations, ${ids.size} ids`);
  if (elevated) summary.push(`Elevated roads: ${Math.round(elevated)} blocks`);
  if (heights.length) summary.push(`Skyline: ${heights.sort((a, b) => b[0] - a[0]).slice(0, 5).map(([h, id]) => `${id} ${h}`).join(', ')}${ceiling ? ` (ceiling ${ceiling})` : ''}`);
  for (const site of city.sites ?? []) {
    summary.push(`Site ${site.id}: ${(site.berths ?? []).length} berths, ${(site.dryDocks ?? []).length} dry docks, ${(site.buildings ?? []).length} buildings`);
  }
  for (const rail of rails.values()) if (rail.kind === 'metro') {
    summary.push(`Metro ${rail.id}: ${Math.round(railLength(rail.path))} blocks, ${(rail.stations ?? []).length} stations${(rail.stations ?? []).length ? ` (${rail.stations.map(s => s.name).join(', ')})` : ''}`);
    const m = metro.get(rail.id);
    if (!m) continue;
    const gaps = stationGaps(m.geometry).sort((a, b) => b.gap - a.gap);
    if (gaps.length) summary.push(`  longest gaps: ${gaps.slice(0, 3).map(g => `${Math.round(g.gap)} (${g.from.name} → ${g.to.name})`).join(', ')}`);
    const ends = m.geometry.stations;
    if (!m.geometry.loop && ends.length && (ends[0].s > 30 || m.geometry.length - ends.at(-1).s > 30)) warn(`metro ${rail.id}: its ends should be stations (runs ${Math.round(ends[0].s)} and ${Math.round(m.geometry.length - ends.at(-1).s)} blocks past them)`);
    // A long run inside one building should stop in it.
    for (const c of m.crossings) {
      if (c.s1 - c.s0 >= LONG_RUN && !c.station && ![].concat(c.building.railHall ?? []).includes(rail.id)) {
        warn(`metro ${rail.id}: runs ${Math.round(c.s1 - c.s0)} blocks through ${c.building.id} without a station in it`);
      }
    }
  }
  if (bridged) summary.push(`Skybridges: ${bridged}; walls: ${(city.walls ?? []).length}; screens: ${(city.screens ?? []).length}`);
  if (services.size) summary.push(`Service buildings: ${[...services].map(([c, n]) => `${c} ${n}`).join(', ')}`);
  summary.push(...halls);
  if (sightlines) summary.push(...views(city, allBuildings, lands));
  return { errors, warnings, summary };
}

/** Streets outside the Exchange should not give views longer than this (blocks). */
const SIGHTLINE_TARGET = 200;

/**
 * For each district, the longest clear straight view along its ground streets: from points every 12 blocks along each
 * street, looking both ways along it until the view meets a building (a covered passage included) or leaves the land.
 * Local streets and alleys are what makes a district tight; collectors and arterials are reported apart.
 */
function views(city, buildings, lands) {
  const CELL = 32, cells = new Map(), key = (x, z) => `${Math.floor(x / CELL)},${Math.floor(z / CELL)}`;
  for (const b of buildings) {
    if (!Array.isArray(b.footprint)) continue;
    const pts = ring(b.footprint), [x0, z0, x1, z1] = bbox(pts);
    for (let x = Math.floor(x0 / CELL); x <= Math.floor(x1 / CELL); x++) for (let z = Math.floor(z0 / CELL); z <= Math.floor(z1 / CELL); z++) {
      const k = `${x},${z}`;
      if (!cells.has(k)) cells.set(k, []);
      cells.get(k).push({ pts, box: [x0, z0, x1, z1] });
    }
  }
  const blocked = (x, z) => (cells.get(key(x, z)) ?? []).some(({ pts, box }) => x >= box[0] && x <= box[2] && z >= box[1] && z <= box[3] && inside([x, z], pts));
  const onLand = (x, z) => lands.some(l => inside([x, z], ring(l.outline)));
  const districts = (city.districts ?? []).filter(d => Array.isArray(d.outline));
  const best = new Map();
  for (const road of city.roads ?? []) {
    if (!Array.isArray(road.path) || roadElevations(road).some(e => e > 0) || ['highway', 'boulevard'].includes(road.type)) continue;
    const tight = ['local', 'alley'].includes(road.type);
    for (let i = 0; i + 1 < road.path.length; i++) {
      const [a, b] = [road.path[i], road.path[i + 1]], len = Math.hypot(b[0] - a[0], b[1] - a[1]);
      if (len < 1) continue;
      const d = [(b[0] - a[0]) / len, (b[1] - a[1]) / len];
      for (let t = 0; t <= len; t += 12) {
        const p = [a[0] + d[0] * t, a[1] + d[1] * t];
        const home = districts.find(dd => inside(p, ring(dd.outline)));
        if (!home || blocked(p[0], p[1])) continue;
        for (const s of [1, -1]) {
          let run = 0;
          while (run < 1500) {
            const q = [p[0] + d[0] * s * (run + 2), p[1] + d[1] * s * (run + 2)];
            if (blocked(q[0], q[1]) || !onLand(q[0], q[1])) break;
            run += 2;
          }
          const k = `${home.id}|${tight}`, was = best.get(k);
          if (!was || run > was.run) best.set(k, { run, road: road.id, at: p.map(Math.round), district: home, tight });
        }
      }
    }
  }
  const out = [];
  for (const d of districts) {
    const [t, c] = [best.get(`${d.id}|true`), best.get(`${d.id}|false`)];
    if (!t && !c) continue;
    const over = (v) => v && d.kind !== 'core' && d.kind !== 'plaza' && v.run > SIGHTLINE_TARGET ? ' (over target)' : '';
    const part = (v, what) => v ? `${what} ${v.run} (${v.road} at [${v.at}])${over(v)}` : `${what} none`;
    out.push(`Sightlines ${d.id}: ${part(t, 'streets')}; ${part(c, 'collectors')}`);
  }
  return out;
}

/** Roads that meet stay one deck this far (in blocks) past where they stop overlapping. */
const JUNCTION_ZONE = 30;
/** Steepest angle, in degrees, at which a ramp may join its road. */
const RAMP_ANGLE = 15;

/** The sample [x, z, e] nearest to p, as { i, d }. */
function nearestSample(pts, p) {
  let best = { i: 0, d: Infinity };
  for (let i = 0; i < pts.length; i++) {
    const d = Math.hypot(pts[i][0] - p[0], pts[i][1] - p[1]);
    if (d < best.d) best = { i, d };
  }
  return best;
}
/** Unit direction of a sampled line at sample i. */
function direction(pts, i) {
  const [a, b] = i + 1 < pts.length ? [pts[i], pts[i + 1]] : [pts[i - 1], pts[i]];
  const d = Math.hypot(b[0] - a[0], b[1] - a[1]) || 1;
  return [(b[0] - a[0]) / d, (b[1] - a[1]) / d];
}

/** Bbox [x0, z0, x1, z1] of a basin plus its walls on the landward end and both sides. */
function outerBox(rect, seaSide, t) {
  const [x, z, w, d] = rect;
  return {
    west: [x, z - t, x + w + t, z + d + t],
    east: [x - t, z - t, x + w, z + d + t],
    north: [x - t, z, x + w + t, z + d + t],
    south: [x - t, z - t, x + w + t, z + d],
  }[seaSide];
}
function contains(rect, [x0, z0, x1, z1]) {
  const [a0, b0, a1, b1] = bbox(rect);
  return x0 >= a0 && z0 >= b0 && x1 <= a1 && z1 <= b1;
}
/** Interior overlap of two shapes; rects compare exactly, polygons (e.g. rotated footprints) by edge crossings and containment. */
function shapesOverlap(a, b) {
  if (isRect(a) && isRect(b)) return overlaps(bbox(a), bbox(b));
  const [p, q] = [ring(a), ring(b)];
  if (!overlaps(bbox(p), bbox(q))) return false;
  const cross = (o, s, t) => (s[0] - o[0]) * (t[1] - o[1]) - (s[1] - o[1]) * (t[0] - o[0]);
  for (let i = 0; i < p.length; i++) for (let j = 0; j < q.length; j++) {
    const [a1, a2, b1, b2] = [p[i], p[(i + 1) % p.length], q[j], q[(j + 1) % q.length]];
    if (cross(a1, a2, b1) * cross(a1, a2, b2) < 0 && cross(b1, b2, a1) * cross(b1, b2, a2) < 0) return true;
  }
  return inside(interiorPoint(p), q) || inside(interiorPoint(q), p);
}
/** A point inside a simple polygon (its vertex average can fall outside a concave one, like an L-shaped lot). */
function interiorPoint(pts) {
  const mid = [pts.reduce((n, v) => n + v[0], 0) / pts.length, pts.reduce((n, v) => n + v[1], 0) / pts.length];
  if (inside(mid, pts)) return mid;
  for (let i = 0; i < pts.length; i++) {
    const [a, b, c] = [pts[(i + pts.length - 1) % pts.length], pts[i], pts[(i + 1) % pts.length]];
    for (const w of [0.5, 0.1, 0.02]) {
      const t = [(a[0] + b[0] + c[0]) / 3, (a[1] + b[1] + c[1]) / 3], q = [b[0] + (t[0] - b[0]) * w, b[1] + (t[1] - b[1]) * w];
      if (inside(q, pts)) return q;
    }
  }
  return mid;
}
/** Strict interior overlap; shared edges are fine. */
function overlaps(a, b) {
  return a[0] < b[2] && b[0] < a[2] && a[1] < b[3] && b[1] < a[3];
}
function inside([x, z], pts) {
  let hit = false;
  for (let i = 0, j = pts.length - 1; i < pts.length; j = i++) {
    const [xi, zi] = pts[i], [xj, zj] = pts[j];
    if ((zi > z) !== (zj > z) && x < ((xj - xi) * (z - zi)) / (zj - zi) + xi) hit = !hit;
  }
  return hit;
}
function selfIntersects(shape) {
  const pts = ring(shape), n = pts.length;
  const cross = (o, a, b) => (a[0] - o[0]) * (b[1] - o[1]) - (a[1] - o[1]) * (b[0] - o[0]);
  for (let i = 0; i < n; i++) for (let j = i + 2; j < n; j++) {
    if (i === 0 && j === n - 1) continue;
    const [a, b, c, d] = [pts[i], pts[(i + 1) % n], pts[j], pts[(j + 1) % n]];
    if (cross(a, b, c) * cross(a, b, d) < 0 && cross(c, d, a) * cross(c, d, b) < 0) return true;
  }
  return false;
}

/** Distance from a point to a polygon's outline, inside or out. */
function edgeDistance(p, poly) {
  let best = Infinity;
  for (let j = 0; j < poly.length; j++) best = Math.min(best, pointSegment(p, poly[j], poly[(j + 1) % poly.length]));
  return best;
}

/** Shortest distance from a polygon to a polyline; 0 if they touch or cross. */
function distanceToPath(poly, path) {
  let best = Infinity;
  for (let i = 0; i + 1 < path.length; i++) {
    const [a, b] = [path[i], path[i + 1]];
    if (inside(a, poly) || inside(b, poly)) return 0;
    for (let j = 0; j < poly.length; j++) {
      const [c, d] = [poly[j], poly[(j + 1) % poly.length]];
      best = Math.min(best, segmentDistance(a, b, c, d));
    }
  }
  return best;
}
function segmentDistance(a, b, c, d) {
  const cross = (o, p, q) => (p[0] - o[0]) * (q[1] - o[1]) - (p[1] - o[1]) * (q[0] - o[0]);
  if (cross(a, b, c) * cross(a, b, d) < 0 && cross(c, d, a) * cross(c, d, b) < 0) return 0;
  return Math.min(pointSegment(a, c, d), pointSegment(b, c, d), pointSegment(c, a, b), pointSegment(d, a, b));
}
function pointSegment([px, pz], [ax, az], [bx, bz]) {
  const [dx, dz] = [bx - ax, bz - az], len = dx * dx + dz * dz;
  const t = len ? Math.max(0, Math.min(1, ((px - ax) * dx + (pz - az) * dz) / len)) : 0;
  return Math.hypot(px - ax - t * dx, pz - az - t * dz);
}
