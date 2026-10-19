import { Map as MapLibreMap, NavigationControl, ScaleControl, setWorkerUrl } from 'maplibre-gl';
import 'maplibre-gl/dist/maplibre-gl.css';
import workerUrl from 'maplibre-gl/dist/maplibre-gl-worker.mjs?worker&url';
setWorkerUrl(workerUrl);
import './style.css';
import initialCity from '../../city/city.json';
import { PIXELS_PER_BLOCK_Z0, bbox, expand, fromLngLat, toGeoJSON, toLngLat } from './city.js';

// Google-Maps-like palette. Roads use true block widths, so what you see is what generates.
const COLOR = {
  water: '#aadaff',
  island: '#eef1e4',
  mainland: '#e4e8d8',
  coast: '#c5d2b4',
  quay: '#e2ded7',
  wall: '#a9a39a',
  building: '#d2ccc2',
  buildingEdge: '#b3ab9f',
  hq: '#4285f4',
  hqEdge: '#1a73e8',
  ship: '#5f6368',
  dryDock: '#cfd5dc',
  gate: '#80868b',
  road: '#ffffff',
  roadCasing: '#d4cfc6',
  boulevard: '#fde293',
  boulevardCasing: '#e8b64c',
  boardwalk: '#c9a06a', boardwalkCasing: '#8a6a44',
  median: '#8bc34a',
  label: '#3c4043',
  waterLabel: '#3f78b0',
  selected: '#ea4335',
  grid: '#1a73e8',
  buildingTall: '#8f887d',
  districtEdge: '#b9bcc2',
  districtLabel: '#80868b',
  rail: '#80868b',
  highway: '#f6b26b',
  highwayCasing: '#c9853a',
  deck3d: '#c9a47e',
  railTie: '#ffffff',
  metro: '#8e24aa',
  skybridge: '#7986cb',
  skybridgeEdge: '#3f51b5',
  deckBridge: '#7cb342',
  garden: '#9ccc65',
  cityWall: '#5f5a52',
  seaWall: '#8a9bab',
  screen: '#ff2bd6',
};
// Light Google-style area tints, keyed by district kind.
const DISTRICT = {
  core: '#e6e8f5', office: '#eceef3', residential: '#f7efe3', housing: '#f5e6df', market: '#fbf0d9',
  park: '#c9e8c1', plaza: '#f6f5f2', industrial: '#ebe5f2', military: '#e3e1dc', data: '#dff1f3',
  customs: '#e8ecec', leisure: '#f8e3ea', marine: '#8ec9f2',
};
const districtColor = ['match', ['get', 'districtKind'], ...Object.entries(DISTRICT).flat(), COLOR.island];
// Corporate buildings wear their corporation's colour; the rest darken with height.
// Unowned buildings are tinted by use, so districts read at a glance.
const USE = {
  office: '#9aa5b8', residential: '#c9b79c', hotel: '#d59ab0', entertainment: '#a78bc9',
  shop: '#d8b27a', industrial: '#a59a8d', market: '#c8a97e',
  clinic: '#e06c75', temple: '#e0a030', derelict: '#7d7a76',
};
const buildingColor = ['case',
  ['!=', ['get', 'color'], null], ['to-color', ['get', 'color']],
  ['==', ['get', 'role'], 'hq'], COLOR.hq,
  ['!=', ['get', 'use'], null], ['match', ['get', 'use'], ...Object.entries(USE).flat(), COLOR.building],
  ['interpolate-lab', ['linear'], ['coalesce', ['get', 'height'], 0], 0, COLOR.building, 256, COLOR.buildingTall]];
const FONT = { regular: ['Noto Sans Regular'], bold: ['Noto Sans Bold'], italic: ['Noto Sans Italic'] };
const HALO = { 'text-halo-color': 'rgba(255,255,255,0.9)', 'text-halo-width': 1.5 };

/** Line width in pixels for a width in blocks, exact at every zoom. */
const blocksWide = (blocks) => ['interpolate', ['exponential', 2], ['zoom'],
  0, ['*', blocks, PIXELS_PER_BLOCK_Z0],
  24, ['*', blocks, PIXELS_PER_BLOCK_Z0 * 2 ** 24]];
/** Like blocksWide, but never thinner than minPx, so narrow things stay visible zoomed out. */
const atLeast = (minPx, blocks) => ['interpolate', ['exponential', 2], ['zoom'],
  0, ['max', minPx, ['*', blocks, PIXELS_PER_BLOCK_Z0]],
  24, ['max', minPx, ['*', blocks, PIXELS_PER_BLOCK_Z0 * 2 ** 24]]];
const kind = (...kinds) => ['in', ['get', 'kind'], ['literal', kinds]];

let city = initialCity;
let selected = null;

const map = new MapLibreMap({
  container: 'map',
  hash: false,
  minZoom: 11,
  maxZoom: 22,
  renderWorldCopies: false,
  attributionControl: false,
  style: {
    version: 8,
    glyphs: 'https://demotiles.maplibre.org/font/{fontstack}/{range}.pbf',
    sources: {
      city: { type: 'geojson', data: toGeoJSON(expand(city)) },
      grid: { type: 'geojson', data: { type: 'FeatureCollection', features: [] } },
    },
    layers: [
      { id: 'water', type: 'background', paint: { 'background-color': COLOR.water } },
      { id: 'land', type: 'fill', source: 'city', filter: kind('island', 'mainland'),
        paint: { 'fill-color': ['match', ['get', 'kind'], 'mainland', COLOR.mainland, COLOR.island] } },
      { id: 'coast', type: 'line', source: 'city', filter: kind('island', 'mainland'),
        paint: { 'line-color': COLOR.coast, 'line-width': 1 } },
      { id: 'district', type: 'fill', source: 'city', filter: kind('district'), paint: { 'fill-color': districtColor } },
      { id: 'district-edge', type: 'line', source: 'city', filter: kind('district'),
        paint: { 'line-color': COLOR.districtEdge, 'line-width': 1, 'line-dasharray': [4, 3] } },
      { id: 'quay', type: 'fill', source: 'city', filter: kind('quay'), paint: { 'fill-color': COLOR.quay } },
      { id: 'basin', type: 'fill', source: 'city', filter: kind('basin'), paint: { 'fill-color': COLOR.water } },
      { id: 'dry-dock', type: 'fill', source: 'city', filter: kind('dry-dock'), paint: { 'fill-color': COLOR.dryDock } },
      { id: 'road-casing', type: 'line', source: 'city', filter: kind('road'),
        layout: { 'line-join': 'round', 'line-cap': 'round' },
        paint: {
          'line-color': ['match', ['get', 'roadType'], 'boulevard', COLOR.boulevardCasing, 'boardwalk', COLOR.boardwalkCasing, COLOR.roadCasing],
          'line-gap-width': blocksWide(['get', 'width']),
          'line-width': ['interpolate', ['linear'], ['zoom'], 13, 0.5, 18, 2],
        } },
      { id: 'road', type: 'line', source: 'city', filter: kind('road'),
        layout: { 'line-join': 'round', 'line-cap': 'round' },
        paint: {
          'line-color': ['match', ['get', 'roadType'], 'boulevard', COLOR.boulevard, 'boardwalk', COLOR.boardwalk, COLOR.road],
          'line-width': blocksWide(['get', 'width']),
        } },
      // An arterial's planted median, 4 blocks wide down its centre line.
      { id: 'road-median', type: 'line', source: 'city', filter: ['all', kind('road'), ['==', ['get', 'roadType'], 'boulevard']],
        layout: { 'line-join': 'round', 'line-cap': 'butt' },
        paint: { 'line-color': COLOR.median, 'line-width': atLeast(1, 4) } },
      { id: 'wall', type: 'fill', source: 'city', filter: kind('wall'), paint: { 'fill-color': COLOR.wall } },
      { id: 'building', type: 'fill', source: 'city', filter: kind('building'),
        paint: { 'fill-color': buildingColor, 'fill-outline-color': COLOR.buildingEdge, 'fill-opacity': ['case', ['get', 'hasTower'], 0.55, 1] } },
      // Raised tiers of a podium, and gardens on its roofs.
      { id: 'tier', type: 'fill', source: 'city', filter: kind('tier'),
        paint: { 'fill-color': ['case', ['==', ['get', 'roof'], 'garden'], COLOR.garden, buildingColor], 'fill-opacity': 0.55, 'fill-outline-color': COLOR.buildingEdge } },
      // Towers standing on a podium: drawn solid over the paler podium, and stacked on it in 3D.
      { id: 'tower', type: 'fill', source: 'city', filter: kind('tower'),
        paint: { 'fill-color': buildingColor, 'fill-outline-color': COLOR.buildingEdge } },
      // Streets a building is built over: dashed across its roof so the old grid still reads.
      { id: 'road-covered', type: 'line', source: 'city', filter: kind('road-covered'),
        paint: { 'line-color': COLOR.road, 'line-opacity': 0.6, 'line-width': blocksWide(['get', 'width']), 'line-dasharray': [2, 1] } },
      { id: 'building-3d', type: 'fill-extrusion', source: 'city', filter: kind('building'), layout: { visibility: 'none' },
        paint: { 'fill-extrusion-color': buildingColor, 'fill-extrusion-height': ['coalesce', ['get', 'top'], ['get', 'height'], 4], 'fill-extrusion-opacity': 0.9 } },
      { id: 'tier-3d', type: 'fill-extrusion', source: 'city', filter: kind('tier'), layout: { visibility: 'none' },
        paint: { 'fill-extrusion-color': ['case', ['==', ['get', 'roof'], 'garden'], COLOR.garden, buildingColor], 'fill-extrusion-height': ['get', 'height'], 'fill-extrusion-opacity': 0.9 } },
      { id: 'tower-3d', type: 'fill-extrusion', source: 'city', filter: kind('tower'), layout: { visibility: 'none' },
        paint: { 'fill-extrusion-color': buildingColor, 'fill-extrusion-base': ['get', 'base'], 'fill-extrusion-height': ['get', 'height'], 'fill-extrusion-opacity': 0.9 } },
      { id: 'hall', type: 'fill', source: 'city', filter: kind('hall', 'hall-dry'),
        paint: { 'fill-color': ['match', ['get', 'kind'], 'hall-dry', COLOR.dryDock, COLOR.water], 'fill-outline-color': COLOR.hqEdge } },
      { id: 'railway', type: 'line', source: 'city', filter: kind('railway'), layout: { 'line-join': 'round' },
        paint: { 'line-color': ['to-color', ['coalesce', ['get', 'color'], ['match', ['get', 'service'], 'metro', COLOR.metro, COLOR.rail]]], 'line-width': blocksWide(['get', 'width']) } },
      { id: 'railway-ties', type: 'line', source: 'city', filter: kind('railway'), layout: { 'line-join': 'round' },
        paint: { 'line-color': COLOR.railTie, 'line-width': blocksWide(['*', 0.35, ['get', 'width']]), 'line-dasharray': [2, 2] } },
      { id: 'ship', type: 'fill', source: 'city', filter: kind('ship'), paint: { 'fill-color': COLOR.ship } },
      { id: 'dock-gate', type: 'fill', source: 'city', filter: kind('dock-gate'), paint: { 'fill-color': COLOR.gate } },
      { id: 'upper-floors', type: 'line', source: 'city', filter: kind('upper-floors'),
        paint: { 'line-color': ['to-color', ['coalesce', ['get', 'color'], COLOR.hqEdge]], 'line-width': 1.5, 'line-dasharray': [3, 2] } },
      { id: 'deck-shadow', type: 'line', source: 'city', filter: kind('road-elevated'),
        layout: { 'line-join': 'round', 'line-sort-key': ['get', 'elevation'] },
        paint: { 'line-color': '#000000', 'line-opacity': 0.18, 'line-blur': 3, 'line-translate': [3, 4], 'line-width': blocksWide(['get', 'width']) } },
      { id: 'deck-casing', type: 'line', source: 'city', filter: kind('road-elevated'),
        layout: { 'line-join': 'round', 'line-sort-key': ['get', 'elevation'] },
        paint: { 'line-color': COLOR.highwayCasing, 'line-gap-width': blocksWide(['get', 'width']), 'line-width': ['interpolate', ['linear'], ['zoom'], 13, 0.5, 18, 2] } },
      { id: 'deck', type: 'line', source: 'city', filter: kind('road-elevated'),
        layout: { 'line-join': 'round', 'line-sort-key': ['get', 'elevation'] },
        paint: { 'line-color': ['match', ['get', 'roadType'], 'highway', COLOR.highway, COLOR.road], 'line-width': blocksWide(['get', 'width']) } },
      { id: 'deck-3d', type: 'fill-extrusion', source: 'city', filter: kind('deck'), layout: { visibility: 'none' },
        paint: { 'fill-extrusion-color': ['to-color', ['coalesce', ['get', 'color'], ['match', ['get', 'service'], 'metro', COLOR.metro, COLOR.deck3d]]], 'fill-extrusion-base': ['get', 'base'], 'fill-extrusion-height': ['get', 'height'] } },
      { id: 'city-wall', type: 'line', source: 'city', filter: kind('city-wall'), layout: { 'line-join': 'round' },
        paint: { 'line-color': ['match', ['get', 'wallKind'], 'sea', COLOR.seaWall, COLOR.cityWall], 'line-width': atLeast(1.5, ['get', 'width']) } },
      { id: 'city-wall-3d', type: 'fill-extrusion', source: 'city', filter: kind('city-wall-3d'), layout: { visibility: 'none' },
        paint: { 'fill-extrusion-color': COLOR.cityWall, 'fill-extrusion-base': ['get', 'base'], 'fill-extrusion-height': ['get', 'height'] } },
      { id: 'skybridge', type: 'line', source: 'city', filter: kind('skybridge'), layout: { 'line-cap': 'butt' },
        paint: { 'line-color': ['match', ['get', 'bridgeKind'], 'deck', COLOR.deckBridge, COLOR.skybridge], 'line-width': atLeast(1.5, ['get', 'width']) } },
      { id: 'skybridge-3d', type: 'fill-extrusion', source: 'city', filter: kind('skybridge-deck'), layout: { visibility: 'none' },
        paint: { 'fill-extrusion-color': COLOR.skybridgeEdge, 'fill-extrusion-base': ['get', 'base'], 'fill-extrusion-height': ['get', 'height'] } },
      { id: 'screen', type: 'line', source: 'city', filter: kind('screen'), layout: { 'line-cap': 'round', 'line-join': 'round' },
        paint: { 'line-color': ['to-color', ['coalesce', ['get', 'color'], COLOR.screen]], 'line-width': ['interpolate', ['linear'], ['zoom'], 14, 2, 18, 5] } },
      { id: 'screen-3d', type: 'fill-extrusion', source: 'city', filter: kind('screen-3d'), layout: { visibility: 'none' },
        paint: { 'fill-extrusion-color': COLOR.screen, 'fill-extrusion-base': ['get', 'base'], 'fill-extrusion-height': ['get', 'height'] } },
      { id: 'station', type: 'circle', source: 'city', filter: kind('station'), minzoom: 13.5,
        paint: { 'circle-color': '#ffffff', 'circle-stroke-color': ['to-color', ['coalesce', ['get', 'color'], COLOR.metro]], 'circle-stroke-width': 2.5, 'circle-radius': ['interpolate', ['linear'], ['zoom'], 14, 3, 18, 7] } },
      { id: 'grid-block', type: 'line', source: 'grid', filter: ['==', ['get', 'chunk'], false],
        paint: { 'line-color': COLOR.grid, 'line-opacity': 0.12, 'line-width': 0.5 } },
      { id: 'grid-chunk', type: 'line', source: 'grid', filter: ['==', ['get', 'chunk'], true],
        paint: { 'line-color': COLOR.grid, 'line-opacity': ['interpolate', ['linear'], ['zoom'], 15, 0.12, 19, 0.35], 'line-width': 0.75 } },
      { id: 'selected', type: 'line', source: 'city', filter: ['==', ['get', 'owner'], ''],
        paint: { 'line-color': COLOR.selected, 'line-width': 2 } },
      { id: 'road-label', type: 'symbol', source: 'city', filter: kind('road', 'road-elevated', 'road-covered'), minzoom: 14,
        layout: { 'symbol-placement': 'line', 'text-field': ['get', 'name'], 'text-font': FONT.regular, 'text-size': 12 },
        paint: { 'text-color': COLOR.label, ...HALO } },
      { id: 'railway-label', type: 'symbol', source: 'city', filter: kind('railway'), minzoom: 14,
        layout: { 'symbol-placement': 'line', 'text-field': ['get', 'name'], 'text-font': FONT.italic, 'text-size': 12 },
        paint: { 'text-color': COLOR.label, ...HALO } },
      { id: 'label-feature', type: 'symbol', source: 'city', filter: kind('label-feature'), minzoom: 15.5,
        layout: { 'text-field': ['get', 'name'], 'text-font': FONT.regular, 'text-size': 11, 'text-anchor': 'left' },
        paint: { 'text-color': COLOR.label, ...HALO } },
      { id: 'label-district', type: 'symbol', source: 'city', filter: kind('label-district'), minzoom: 13.3, maxzoom: 16.5,
        layout: { 'text-field': ['get', 'name'], 'text-font': FONT.bold, 'text-size': 11, 'text-transform': 'uppercase', 'text-letter-spacing': 0.15 },
        paint: { 'text-color': COLOR.districtLabel, ...HALO } },
      { id: 'label-hq', type: 'symbol', source: 'city', filter: kind('label-hq'), minzoom: 14.6,
        layout: { 'text-field': ['get', 'name'], 'text-font': FONT.bold, 'text-size': 11 },
        paint: { 'text-color': COLOR.label, ...HALO } },
      { id: 'label-station', type: 'symbol', source: 'city', filter: kind('station'), minzoom: 14.6,
        layout: { 'text-field': ['get', 'name'], 'text-font': FONT.bold, 'text-size': 11, 'text-anchor': 'top', 'text-offset': [0, 0.8] },
        paint: { 'text-color': '#3c4043', ...HALO } },
      { id: 'label-service', type: 'symbol', source: 'city', filter: kind('label-service'), minzoom: 15.4,
        layout: { 'text-field': ['get', 'name'], 'text-font': FONT.regular, 'text-size': 10, 'text-max-width': 8 },
        paint: { 'text-color': COLOR.label, ...HALO } },
      { id: 'label-place', type: 'symbol', source: 'city', filter: kind('label-place'), minzoom: 14.2,
        layout: { 'text-field': ['get', 'name'], 'text-font': FONT.italic, 'text-size': 12 },
        paint: { 'text-color': '#8e24aa', ...HALO } },
      { id: 'label-site', type: 'symbol', source: 'city', filter: kind('label-site'), minzoom: 13,
        layout: { 'text-field': ['get', 'name'], 'text-font': FONT.bold, 'text-size': 12 },
        paint: { 'text-color': COLOR.label, ...HALO } },
      { id: 'label-land', type: 'symbol', source: 'city', filter: kind('label-land'), maxzoom: 13.3,
        layout: { 'text-field': ['get', 'name'], 'text-font': FONT.bold, 'text-size': 14, 'text-transform': 'uppercase', 'text-letter-spacing': 0.2 },
        paint: { 'text-color': '#70757a', ...HALO } },
      { id: 'label-water', type: 'symbol', source: 'city', filter: kind('label-water'),
        layout: { 'text-field': ['get', 'name'], 'text-font': FONT.italic, 'text-size': 13, 'text-letter-spacing': 0.1 },
        paint: { 'text-color': COLOR.waterLabel, 'text-halo-color': COLOR.water, 'text-halo-width': 1 } },
    ],
  },
});
map.addControl(new NavigationControl(), 'top-right');
map.addControl(new ScaleControl({ unit: 'metric', maxWidth: 160 }), 'bottom-right');

const INTERACTIVE = ['station', 'screen', 'screen-3d', 'skybridge', 'skybridge-3d', 'city-wall', 'city-wall-3d', 'deck', 'deck-3d', 'ship', 'dock-gate', 'railway', 'hall', 'tower', 'tower-3d', 'tier', 'tier-3d', 'building', 'building-3d', 'upper-floors', 'wall', 'dry-dock', 'basin', 'road-covered', 'road', 'quay', 'district', 'land'];
const $ = (id) => document.getElementById(id);

/** Keep the full-city overview as the furthest zoom, including after resizing. */
function fitIsland(resetView = false) {
  const shapes = [...(city.land ?? []).filter(l => l.kind === 'island').map(l => l.outline), ...(city.sites ?? []).map(s => s.quay)];
  if (!shapes.length) return;
  const boxes = shapes.map(bbox);
  const [x0, z0, x1, z1] = [0, 1, 2, 3].map(i => (i < 2 ? Math.min : Math.max)(...boxes.map(b => b[i])));
  const camera = map.cameraForBounds([toLngLat([x0, z1]), toLngLat([x1, z0])],
    { padding: { top: 40, bottom: 40, right: 60, left: 40 } });
  if (!camera) return;
  map.setMinZoom(camera.zoom);
  if (resetView) map.jumpTo(camera);
}
fitIsland(true);
map.on('resize', () => fitIsland());

let ready = false;
function render(next) {
  city = next;
  if (!ready) return; // the load handler draws whatever is current
  map.getSource('city').setData(toGeoJSON(expand(city)));
  showSelection();
}

/** The city.json entry with this id, wherever it is nested. */
function findEntry(id) {
  const lists = [city.land, city.districts, city.corporations, city.buildings, city.railways, city.roads, city.labels, city.sites,
    city.skybridges, city.walls, city.screens, ...(city.railways ?? []).map(r => r.stations),
    ...(city.sites ?? []).flatMap(s => [s.berths, s.dryDocks, s.buildings])];
  for (const list of lists) for (const entry of list ?? []) if (entry.id === id) return entry;
  return null;
}

function showSelection() {
  const entry = selected && findEntry(selected);
  map.setFilter('selected', ['==', ['get', 'owner'], entry ? selected : '']);
  $('selection').hidden = !entry;
  if (!entry) return;
  $('selection-name').textContent = entry.name ?? entry.text ?? entry.id;
  $('selection-id').textContent = entry.id;
  $('selection-json').textContent = [entry.use, entry.height ? `${entry.height} blocks tall` : null, entry.notes].filter(Boolean).join(' · ');
}

map.on('mousemove', (e) => {
  const [x, z] = fromLngLat(e.lngLat).map(Math.floor);
  $('cursor').textContent = `x ${x}  z ${z}  ·  chunk ${Math.floor(x / 16)}, ${Math.floor(z / 16)}`;
  const hit = map.queryRenderedFeatures(e.point, { layers: INTERACTIVE.filter(l => l !== 'land' && l !== 'district') });
  map.getCanvas().style.cursor = hit.length ? 'pointer' : '';
});

map.on('click', (e) => {
  const [hit] = map.queryRenderedFeatures(e.point, { layers: INTERACTIVE });
  selected = hit?.properties.owner ?? null;
  showSelection();
});

// Chunk lines from mid zoom, individual blocks when zoomed right in. Built for the viewport only.
let gridOn = false;
try { gridOn = localStorage.getItem('citycraft.grid') === '1'; } catch {}
$('grid').checked = gridOn;
$('grid').addEventListener('change', (e) => {
  gridOn = e.target.checked;
  try { localStorage.setItem('citycraft.grid', gridOn ? '1' : '0'); } catch {}
  updateGrid();
});

function updateGrid() {
  const source = map.getSource('grid');
  if (!source) return;
  const zoom = map.getZoom(), features = [];
  if (gridOn && zoom >= 14.5) {
    const step = zoom >= 18.5 ? 1 : 16;
    const b = map.getBounds();
    const [x0, z0] = fromLngLat(b.getNorthWest()), [x1, z1] = fromLngLat(b.getSouthEast());
    const [sx, sz] = [Math.floor(x0 / step) * step, Math.floor(z0 / step) * step];
    const line = (a, c, v) => features.push({ type: 'Feature', properties: { chunk: v % 16 === 0 },
      geometry: { type: 'LineString', coordinates: [toLngLat(a), toLngLat(c)] } });
    for (let x = sx; x <= x1; x += step) line([x, z0], [x, z1], x);
    for (let z = sz; z <= z1; z += step) line([x0, z], [x1, z], z);
  }
  source.setData({ type: 'FeatureCollection', features });
}
map.on('moveend', updateGrid);

// 3D raises each building to its height in blocks and tilts the camera to show the skyline.
$('skyline').addEventListener('change', (e) => {
  const on = e.target.checked;
  for (const id of ['building-3d', 'tier-3d', 'tower-3d', 'deck-3d', 'skybridge-3d', 'city-wall-3d', 'screen-3d']) map.setLayoutProperty(id, 'visibility', on ? 'visible' : 'none');
  map.easeTo({ pitch: on ? 55 : 0 });
});
map.on('load', () => { ready = true; render(city); updateGrid(); });

// Editing city.json updates the map in place, keeping the camera where it is.
if (import.meta.hot) {
  import.meta.hot.accept('../../city/city.json', (mod) => { if (mod) render(mod.default); });
}

// The embedded viewer follows its window when the portfolio resizes.
new ResizeObserver(() => map.resize()).observe(document.body);
