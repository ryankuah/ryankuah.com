import {
  type CSSProperties,
  type PointerEvent as ReactPointerEvent,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState
} from "react";
import {
  TYPE_LABELS,
  clamp,
  drawDetailPreview,
  fetchWorldData,
  formatCoordinate,
  getBiomeAt,
  gridCellFor,
  gridPaths,
  paintBiomeMap,
  renderBiomeMap,
  titleCase,
  toMinecraftCoordinates
} from "./atlas";
import type {
  Biome,
  BiomeGrid,
  MapTransform,
  PointOfInterest,
  Selection,
  WorldData
} from "./types";

const EMPTY_TRANSFORM: MapTransform = { scale: 0.1, x: 0, y: 0, fitScale: 0.1 };

function mapFitScale(width: number, height: number, worldWidth: number, worldHeight: number): number {
  const padding = window.innerWidth <= 860 ? 8 : 18;
  return Math.max(0.001, Math.min((width - padding * 2) / worldWidth, (height - padding * 2) / worldHeight));
}

function useWorldData() {
  const [data, setData] = useState<WorldData | null>(null);
  const [error, setError] = useState<string | null>(null);
  useEffect(() => {
    let active = true;
    void fetchWorldData().then(result => {
      if (active) setData(result.data);
    }).catch(caught => {
      if (active) setError(caught instanceof Error ? caught.message : "Could not load the atlas.");
    });
    return () => { active = false; };
  }, []);
  return { data, error };
}

function TerrainCanvas({ data, onGridReady }: { data: WorldData; onGridReady: (grid: BiomeGrid) => void }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const terrainSignature = useMemo(() => JSON.stringify({ meta: data.meta, biomes: data.biomes }), [data]);
  const terrainData = useMemo(() => data, [terrainSignature]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const worker = new Worker(new URL("./terrain.worker.ts", import.meta.url), { type: "module" });
    worker.onmessage = (event: MessageEvent<{ quality?: "preview" | "final"; width?: number; height?: number; values?: ArrayBuffer; error?: string }>) => {
      if (event.data.error || !event.data.values || !event.data.width || !event.data.height) {
        console.error(event.data.error || "The terrain worker returned incomplete data.");
        onGridReady(renderBiomeMap(canvas, terrainData));
        worker.terminate();
        return;
      }
      const grid: BiomeGrid = { values: new Uint16Array(event.data.values), width: event.data.width, height: event.data.height };
      paintBiomeMap(canvas, terrainData, grid);
      onGridReady(grid);
      if (event.data.quality !== "preview") worker.terminate();
    };
    worker.onerror = (event) => {
      console.error(event.message);
      onGridReady(renderBiomeMap(canvas, terrainData));
      worker.terminate();
    };
    worker.postMessage(terrainData);
    return () => worker.terminate();
  }, [terrainData, onGridReady]);

  return <canvas ref={canvasRef} id="biome-canvas" aria-label="Top-down biome map" />;
}

function BiomePreview({ biome }: { biome: Biome }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const draw = () => drawDetailPreview(canvas, biome);
    draw();
    const observer = new ResizeObserver(draw);
    observer.observe(canvas);
    return () => observer.disconnect();
  }, [biome]);
  return <canvas ref={canvasRef} className="biome-preview" aria-label={`${biome.name} texture preview`} />;
}

function PoiInspector({ data, poi, biome }: { data: WorldData; poi: PointOfInterest; biome: Biome | null }) {
  const minecraft = toMinecraftCoordinates(data, poi.x, poi.z);
  const cell = gridCellFor(data, poi.x, poi.z);
  return (
    <article className="inspector-detail inspector-enter" key={`poi-${poi.id}`}>
      {biome && <BiomePreview biome={biome} />}
      <div className="inspector-body">
        <div className="inspector-kicker"><span>{titleCase(poi.type)}</span><span>X {formatCoordinate(minecraft.x)} · Z {formatCoordinate(minecraft.z)}</span></div>
        <h2 className="inspector-title">{poi.name}</h2>
        <p className="inspector-summary">{poi.summary || "No summary yet."}</p>
        <dl className="detail-facts">
          <div><dt>Status</dt><dd>{poi.status || "Planned"}</dd></div>
          <div><dt>Biome</dt><dd>{biome?.name || "Resolving…"}</dd></div>
          <div><dt>Grid cell</dt><dd>{cell.x}, {cell.z} · {cell.size} blocks</dd></div>
          {Number.isFinite(poi.population) && <div><dt>Population</dt><dd>{poi.population} planned residents</dd></div>}
        </dl>
        <section className="detail-section"><h3>World-building note</h3><p>{poi.notes || "Add notes in world-data.json."}</p></section>
        {!!poi.npcs?.length && (
          <section className="detail-section">
            <h3>People to place here</h3>
            <ul className="npc-list">{poi.npcs.map((npc) => <li key={`${poi.id}-${npc.name}`}><strong>{npc.name}</strong><span>{npc.role}</span><small>{npc.hook}</small></li>)}</ul>
          </section>
        )}
      </div>
    </article>
  );
}

function BiomeInspector({ data, biome, coordinates }: { data: WorldData; biome: Biome; coordinates: [number, number] }) {
  const minecraft = toMinecraftCoordinates(data, coordinates[0], coordinates[1]);
  const cell = gridCellFor(data, coordinates[0], coordinates[1]);
  return (
    <article className="inspector-detail inspector-enter" key={`biome-${biome.id}`}>
      <BiomePreview biome={biome} />
      <div className="inspector-body">
        <div className="inspector-kicker"><span>Custom biome</span><span>X {formatCoordinate(minecraft.x)} · Z {formatCoordinate(minecraft.z)}</span></div>
        <h2 className="inspector-title">{biome.name}</h2>
        <p className="inspector-summary">{biome.description || "No biome description yet."}</p>
        <dl className="detail-facts">
          <div><dt>Climate</dt><dd>{biome.climate || "Not defined"}</dd></div>
          <div><dt>Terrain</dt><dd>{biome.terrain || "Not defined"}</dd></div>
          <div><dt>Grid cell</dt><dd>{cell.x}, {cell.z} · {cell.size} blocks</dd></div>
          <div><dt>Regions</dt><dd>{biome.regions.length} authored {biome.regions.length === 1 ? "region" : "regions"}</dd></div>
        </dl>
        <section className="detail-section">
          <h3>Minecraft block palette</h3>
          {biome.blocks?.length ? <ul className="block-palette-list">{biome.blocks.map((block) => <li key={`${biome.id}-${block.id}-${block.role}`}><span className="block-color" style={{ background: block.color || biome.color }} /><code>{block.id}</code><small>{block.role || "surface"} · {block.weight || 0}%</small></li>)}</ul> : <p>No Minecraft block palette defined yet.</p>}
        </section>
        <section className="detail-section"><h3>Ground palette</h3><div className="tag-list">{(biome.ground?.length ? biome.ground : ["Not defined"]).map((item) => <span key={item}>{item}</span>)}</div></section>
        <section className="detail-section"><h3>Vegetation</h3><div className="tag-list">{(biome.flora?.length ? biome.flora : ["Not defined"]).map((item) => <span key={item}>{item}</span>)}</div></section>
        <section className="detail-section"><h3>Placement model</h3><p>Every {cell.size}-block planning cell resolves to one biome. Its top-down texture is sampled from the weighted vanilla-block palette above.</p></section>
      </div>
    </article>
  );
}

function Inspector({ data, grid, selection, open, onClose }: { data: WorldData; grid: BiomeGrid | null; selection: Selection | null; open: boolean; onClose: () => void }) {
  let content = (
    <div className="inspector-empty">
      <span className="empty-symbol" aria-hidden="true" />
      <p className="eyebrow">Atlas notes</p>
      <h2>Select a place</h2>
      <p>Choose a settlement, landmark, route, or biome to inspect its world-building notes.</p>
    </div>
  );
  if (selection?.type === "poi") {
    const poi = data.pointsOfInterest.find((entry) => entry.id === selection.id);
    if (poi) content = <PoiInspector data={data} poi={poi} biome={getBiomeAt(data, grid, poi.x, poi.z)} />;
  } else if (selection?.type === "biome") {
    const biome = data.biomes.find((entry) => entry.id === selection.id);
    if (biome) content = <BiomeInspector data={data} biome={biome} coordinates={selection.coordinates} />;
  }
  return (
    <aside className={`inspector${open ? " open" : ""}`} aria-label="Selected map detail">
      <button className="icon-button mobile-close inspector-close" type="button" aria-label="Close details" onClick={onClose}>×</button>
      {content}
    </aside>
  );
}

function App() {
  const { data, error } = useWorldData();
  const [grid, setGrid] = useState<BiomeGrid | null>(null);
  const [selection, setSelection] = useState<Selection | null>(null);
  const [enabledPoiTypes, setEnabledPoiTypes] = useState<Set<string>>(new Set());
  const [showGrid, setShowGrid] = useState(true);
  const [showLabels, setShowLabels] = useState(true);
  const [search, setSearch] = useState("");
  const [transform, setTransform] = useState<MapTransform>(EMPTY_TRANSFORM);
  const [readout, setReadout] = useState({ coordinates: "X 0 · Z 0", biome: "Move across the map to inspect terrain" });
  const [leftOpen, setLeftOpen] = useState(false);
  const [inspectorOpen, setInspectorOpen] = useState(false);
  const mapPaperRef = useRef<HTMLDivElement>(null);
  const transformRef = useRef(transform);
  const mapViewportRef = useRef({ width: 0, height: 0 });
  const dragRef = useRef<{ pointerId: number; startX: number; startY: number; mapX: number; mapY: number; moved: boolean } | null>(null);
  const knownPoiTypesRef = useRef<Set<string>>(new Set());

  useEffect(() => { transformRef.current = transform; }, [transform]);
  useEffect(() => { if (data) document.title = `${data.meta.name || "World"} · Atlas`; }, [data]);

  useEffect(() => {
    if (!data) return;
    const types = new Set(data.pointsOfInterest.map((poi) => poi.type));
    const previouslyKnownTypes = new Set(knownPoiTypesRef.current);
    setEnabledPoiTypes((current) => {
      const next = new Set([...current].filter((type) => types.has(type)));
      types.forEach((type) => { if (!previouslyKnownTypes.has(type)) next.add(type); });
      return next;
    });
    knownPoiTypesRef.current = types;
    setSelection((current) => {
      if (current?.type === "poi" && data.pointsOfInterest.some((poi) => poi.id === current.id)) return current;
      if (current?.type === "biome" && data.biomes.some((biome) => biome.id === current.id)) return current;
      const firstPoi = data.pointsOfInterest.find((poi) => poi.type === "village") ?? data.pointsOfInterest[0];
      return firstPoi ? { type: "poi", id: firstPoi.id, coordinates: [firstPoi.x, firstPoi.z] } : null;
    });
  }, [data]);

  const updateTransform = useCallback((next: MapTransform) => {
    transformRef.current = next;
    setTransform(next);
  }, []);

  const clampMapTransform = useCallback((next: MapTransform): MapTransform => {
    const paper = mapPaperRef.current;
    if (!paper || !data) return next;
    const rect = paper.getBoundingClientRect();
    const scaledWidth = data.meta.width * next.scale;
    const scaledHeight = data.meta.height * next.scale;
    const visibleEdge = 84;
    const x = scaledWidth <= rect.width ? (rect.width - scaledWidth) / 2 : clamp(next.x, visibleEdge - scaledWidth, rect.width - visibleEdge);
    const y = scaledHeight <= rect.height ? (rect.height - scaledHeight) / 2 : clamp(next.y, visibleEdge - scaledHeight, rect.height - visibleEdge);
    return { ...next, x, y };
  }, [data]);

  const fitMap = useCallback(() => {
    const paper = mapPaperRef.current;
    if (!paper || !data) return;
    const rect = paper.getBoundingClientRect();
    mapViewportRef.current = { width: rect.width, height: rect.height };
    const scale = mapFitScale(rect.width, rect.height, data.meta.width, data.meta.height);
    updateTransform({ scale, fitScale: scale, x: (rect.width - data.meta.width * scale) / 2, y: (rect.height - data.meta.height * scale) / 2 });
  }, [data, updateTransform]);

  const centerOn = useCallback((worldX: number, worldZ: number, requestedScale?: number) => {
    const paper = mapPaperRef.current;
    if (!paper || !data) return;
    const rect = paper.getBoundingClientRect();
    const current = transformRef.current;
    const scale = clamp(requestedScale ?? current.scale, current.fitScale, Math.max(1.25, current.fitScale * 8));
    updateTransform(clampMapTransform({ ...current, scale, x: rect.width / 2 - worldX * scale, y: rect.height / 2 - worldZ * scale }));
  }, [clampMapTransform, data, updateTransform]);

  useEffect(() => {
    if (!data) return;
    const frame = window.requestAnimationFrame(() => {
      fitMap();
      const view = data.meta.initialView;
      if (window.innerWidth > 860 && view) {
        const fit = transformRef.current.fitScale;
        centerOn(view.x, view.z, fit * (Math.max(data.meta.width, data.meta.height) / view.span));
      } else if (data.meta.spawn) {
        centerOn(data.meta.spawn[0], data.meta.spawn[1], transformRef.current.fitScale * 1.72);
      }
    });
    return () => window.cancelAnimationFrame(frame);
  }, [centerOn, data, fitMap]);

  useEffect(() => {
    const paper = mapPaperRef.current;
    if (!paper || !data) return;
    const observer = new ResizeObserver(() => {
      const rect = paper.getBoundingClientRect();
      const previousViewport = mapViewportRef.current;
      mapViewportRef.current = { width: rect.width, height: rect.height };
      if (!previousViewport.width || !previousViewport.height) {
        fitMap();
        return;
      }

      const current = transformRef.current;
      const nextFitScale = mapFitScale(rect.width, rect.height, data.meta.width, data.meta.height);
      const zoomRatio = current.scale / Math.max(current.fitScale, 0.001);
      const nextScale = clamp(nextFitScale * zoomRatio, nextFitScale, Math.max(1.25, nextFitScale * 8));
      const worldCenterX = (previousViewport.width / 2 - current.x) / current.scale;
      const worldCenterZ = (previousViewport.height / 2 - current.y) / current.scale;
      updateTransform(clampMapTransform({
        scale: nextScale,
        fitScale: nextFitScale,
        x: rect.width / 2 - worldCenterX * nextScale,
        y: rect.height / 2 - worldCenterZ * nextScale
      }));
    });
    observer.observe(paper);
    return () => observer.disconnect();
  }, [clampMapTransform, data, fitMap, updateTransform]);

  const screenToWorld = useCallback((clientX: number, clientY: number) => {
    const rect = mapPaperRef.current?.getBoundingClientRect();
    if (!rect) return { x: 0, z: 0 };
    const current = transformRef.current;
    return { x: (clientX - rect.left - current.x) / current.scale, z: (clientY - rect.top - current.y) / current.scale };
  }, []);

  const zoomAt = useCallback((clientX: number, clientY: number, factor: number) => {
    const rect = mapPaperRef.current?.getBoundingClientRect();
    if (!rect) return;
    const current = transformRef.current;
    const screenX = clientX - rect.left;
    const screenY = clientY - rect.top;
    const worldX = (screenX - current.x) / current.scale;
    const worldZ = (screenY - current.y) / current.scale;
    const scale = clamp(current.scale * factor, current.fitScale, Math.max(1.25, current.fitScale * 8));
    updateTransform(clampMapTransform({ ...current, scale, x: screenX - worldX * scale, y: screenY - worldZ * scale }));
  }, [clampMapTransform, updateTransform]);

  const selectPoi = useCallback((poi: PointOfInterest, center = false) => {
    setSelection({ type: "poi", id: poi.id, coordinates: [poi.x, poi.z] });
    if (center) centerOn(poi.x, poi.z, Math.max(transformRef.current.fitScale * 2.45, 0.34));
    if (window.innerWidth <= 860) { setInspectorOpen(true); setLeftOpen(false); }
  }, [centerOn]);

  const selectBiome = useCallback((biome: Biome, coordinates?: [number, number], center = false) => {
    const point: [number, number] = coordinates ?? [biome.regions[0].x, biome.regions[0].z];
    setSelection({ type: "biome", id: biome.id, coordinates: point });
    if (center) centerOn(point[0], point[1], Math.max(transformRef.current.fitScale * 2.2, 0.3));
    if (window.innerWidth <= 860) { setInspectorOpen(true); setLeftOpen(false); }
  }, [centerOn]);

  useEffect(() => {
    const paper = mapPaperRef.current;
    if (!paper) return;
    const handleWheel = (event: WheelEvent) => {
      event.preventDefault();
      zoomAt(event.clientX, event.clientY, Math.exp(-event.deltaY * 0.0012));
    };
    // React's passive wheel listener cannot cancel scrolling into the parent window.
    paper.addEventListener("wheel", handleWheel, { passive: false });
    return () => paper.removeEventListener("wheel", handleWheel);
  }, [data, zoomAt]);

  const handlePointerDown = (event: ReactPointerEvent<HTMLDivElement>) => {
    if (event.button !== 0 || (event.target as Element).closest("button")) return;
    event.currentTarget.setPointerCapture(event.pointerId);
    const current = transformRef.current;
    dragRef.current = { pointerId: event.pointerId, startX: event.clientX, startY: event.clientY, mapX: current.x, mapY: current.y, moved: false };
  };

  const handlePointerMove = (event: ReactPointerEvent<HTMLDivElement>) => {
    if (data && grid) {
      const point = screenToWorld(event.clientX, event.clientY);
      if (point.x >= 0 && point.z >= 0 && point.x <= data.meta.width && point.z <= data.meta.height) {
        const biome = getBiomeAt(data, grid, point.x, point.z);
        const cell = gridCellFor(data, point.x, point.z);
        const minecraft = toMinecraftCoordinates(data, point.x, point.z);
        setReadout({ coordinates: `G ${cell.x}:${cell.z} · X ${formatCoordinate(minecraft.x)} · Z ${formatCoordinate(minecraft.z)}`, biome: biome?.name || "Unknown biome" });
      }
    }
    const drag = dragRef.current;
    if (!drag || drag.pointerId !== event.pointerId) return;
    const dx = event.clientX - drag.startX;
    const dy = event.clientY - drag.startY;
    if (Math.abs(dx) + Math.abs(dy) > 5) drag.moved = true;
    updateTransform(clampMapTransform({ ...transformRef.current, x: drag.mapX + dx, y: drag.mapY + dy }));
  };

  const handlePointerUp = (event: ReactPointerEvent<HTMLDivElement>) => {
    const drag = dragRef.current;
    if (!drag || drag.pointerId !== event.pointerId) return;
    dragRef.current = null;
    if (drag.moved || !data || !grid || (event.target as Element).closest("button")) return;
    const point = screenToWorld(event.clientX, event.clientY);
    if (point.x < 0 || point.z < 0 || point.x > data.meta.width || point.z > data.meta.height) return;
    const biome = getBiomeAt(data, grid, point.x, point.z);
    if (biome) selectBiome(biome, [point.x, point.z]);
  };

  const handleGridReady = useCallback((nextGrid: BiomeGrid) => setGrid(nextGrid), []);
  const paths = useMemo(() => data ? gridPaths(data) : { minor: "", major: "" }, [data]);
  const types = useMemo(() => data ? [...new Set(data.pointsOfInterest.map((poi) => poi.type))] : [], [data]);
  const visiblePois = useMemo(() => data?.pointsOfInterest.filter((poi) => enabledPoiTypes.has(poi.type)) ?? [], [data, enabledPoiTypes]);
  const searchResults = useMemo(() => {
    const query = search.trim().toLowerCase();
    if (!data || !query) return [];
    return data.pointsOfInterest.filter((poi) => `${poi.name} ${poi.type} ${poi.summary ?? ""}`.toLowerCase().includes(query)).slice(0, 6);
  }, [data, search]);
  const inverseScale = 1 / Math.max(transform.scale, 0.001);

  if (!data) {
    return <main className="app-loading"><span className="brand-mark" /><p className="eyebrow">Pumpkin's World</p><h1>Loading the atlas</h1>{error && <p className="load-error">{error}</p>}</main>;
  }

  const togglePoiType = (type: string) => setEnabledPoiTypes((current) => {
    const next = new Set(current);
    if (next.has(type)) next.delete(type); else next.add(type);
    return next;
  });

  return (
    <main className={`app-shell${new URLSearchParams(window.location.search).has("embed") ? " embedded" : ""}`}>
      <header className="topbar">
        <div className="brand-lockup"><span className="brand-mark" aria-hidden="true" /><div><p className="eyebrow">Pumpkin's World</p><h1>{data.meta.name || "World Atlas"}</h1></div></div>
        <div className="world-facts" aria-label="World facts"><span>{data.meta.width.toLocaleString()} × {data.meta.height.toLocaleString()} blocks</span><span>Seed {data.meta.seed || "—"}</span><span>{data.biomes.length} biomes · {data.pointsOfInterest.length} sites</span></div>

      </header>

      <section className="workspace">
        <aside className={`left-rail${leftOpen ? " open" : ""}`} aria-label="Map controls">
          <div className="rail-section search-section"><label htmlFor="search-input">Find a place</label><div className="search-wrap"><span aria-hidden="true" /><input id="search-input" type="search" placeholder="Village, ruin, crossing…" autoComplete="off" value={search} onChange={(event) => setSearch(event.target.value)} /></div>
            {!!search.trim() && <div className="search-results">{searchResults.length ? searchResults.map((poi) => <button className="search-result" type="button" key={poi.id} onClick={() => { selectPoi(poi, true); setSearch(""); }}><span>{poi.name}</span><small>{titleCase(poi.type)}</small></button>) : <div className="search-result"><span>No matching places</span></div>}</div>}
          </div>
          <div className="rail-section"><div className="section-heading"><h2>Map layers</h2><button className="icon-button mobile-close" type="button" aria-label="Close map controls" onClick={() => setLeftOpen(false)}>×</button></div>
            <label className="toggle-row"><input type="checkbox" checked={showGrid} onChange={(event) => setShowGrid(event.target.checked)} /><span className="toggle-control" /><span>Planning grid</span></label>
            <label className="toggle-row"><input type="checkbox" checked={showLabels} onChange={(event) => setShowLabels(event.target.checked)} /><span className="toggle-control" /><span>Place labels</span></label>
          </div>
          <div className="rail-section filter-section"><div className="section-heading"><h2>Points of interest</h2><span>{visiblePois.length} shown</span></div><div className="filter-list">{types.map((type) => <button className={`filter-chip${enabledPoiTypes.has(type) ? " active" : ""}`} type="button" key={type} onClick={() => togglePoiType(type)}><span>{TYPE_LABELS[type] || titleCase(type)}</span><small>{data.pointsOfInterest.filter((poi) => poi.type === type).length}</small></button>)}</div></div>
          <div className="rail-section biome-section"><div className="section-heading"><h2>Biome key</h2><span>Click to inspect</span></div><div className="biome-list">{data.biomes.map((biome) => <button className={`biome-key${selection?.type === "biome" && selection.id === biome.id ? " active" : ""}`} type="button" key={biome.id} onClick={() => selectBiome(biome, undefined, true)}><span className="biome-swatch" style={{ background: biome.color }} /><span>{biome.name}</span><small>{(biome.climate || "").split("·")[0].trim()}</small></button>)}</div></div>

        </aside>

        <section className="map-workspace" aria-label="Interactive world map">
          <div ref={mapPaperRef} className={`map-paper${dragRef.current ? " dragging" : ""}`} onPointerDown={handlePointerDown} onPointerMove={handlePointerMove} onPointerUp={handlePointerUp} onPointerCancel={() => { dragRef.current = null; }}>
            <div className="map-stage" style={{ width: data.meta.width, height: data.meta.height, transform: `translate3d(${transform.x}px, ${transform.y}px, 0) scale(${transform.scale})` }}>
              <TerrainCanvas data={data} onGridReady={handleGridReady} />
              <svg className={`map-svg grid-layer${showGrid ? "" : " layer-hidden"}`} viewBox={`0 0 ${data.meta.width} ${data.meta.height}`} preserveAspectRatio="none" aria-hidden="true"><path className="grid-minor" d={paths.minor} /><path className="grid-major" d={paths.major} /></svg>
              <div className={`poi-layer${showLabels ? "" : " labels-hidden"}`}>{visiblePois.map((poi) => <div className={`poi${selection?.type === "poi" && selection.id === poi.id ? " selected" : ""}`} data-type={poi.type} key={poi.id} style={{ left: poi.x, top: poi.z, "--inv-scale": inverseScale } as CSSProperties}><button className="poi-anchor" type="button" aria-label={`${poi.name}, ${titleCase(poi.type)}`} onPointerDown={(event) => event.stopPropagation()} onClick={(event) => { event.stopPropagation(); selectPoi(poi); }} onDoubleClick={(event) => { event.stopPropagation(); selectPoi(poi, true); }} /><span className="poi-label">{poi.name}</span></div>)}</div>
              <div className="map-origin" aria-label="Minecraft origin X 0, Z 0" style={{ "--inv-scale": inverseScale } as CSSProperties}><span>X 0 · Z 0</span></div>
              {selection?.type === "biome" && <div className="map-reticle" style={{ left: selection.coordinates[0], top: selection.coordinates[1], "--inv-scale": inverseScale } as CSSProperties} />}
            </div>
            <div className="map-vignette" aria-hidden="true" /><div className="map-compass" aria-label="North"><span>N</span><i /></div>
            <div className="zoom-controls" aria-label="Map zoom controls"><button type="button" aria-label="Zoom in" onClick={() => { const rect = mapPaperRef.current?.getBoundingClientRect(); if (rect) zoomAt(rect.left + rect.width / 2, rect.top + rect.height / 2, 1.35); }}>+</button><button type="button" aria-label="Zoom out" onClick={() => { const rect = mapPaperRef.current?.getBoundingClientRect(); if (rect) zoomAt(rect.left + rect.width / 2, rect.top + rect.height / 2, 0.74); }}>−</button><button type="button" aria-label="Fit map" onClick={fitMap}>⌂</button></div>
            <div className="map-status" aria-live="polite"><span>{readout.coordinates}</span><span className="status-divider" /><span>{readout.biome}</span></div>
            <button className="mobile-panel-button left" type="button" onClick={() => { setLeftOpen(true); setInspectorOpen(false); }}>Layers</button><button className="mobile-panel-button right" type="button" onClick={() => { setInspectorOpen(true); setLeftOpen(false); }}>Details</button>
          </div>
        </section>
        <Inspector data={data} grid={grid} selection={selection} open={inspectorOpen} onClose={() => setInspectorOpen(false)} />
      </section>
    </main>
  );
}

export default App;
