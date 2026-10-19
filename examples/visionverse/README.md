# VisionVerse historical editors

These are isolated browser builds of committed VisionVerse components. They are
embedded in the portfolio as iframes so its React version, Tailwind theme and
styles cannot change the archived editors' appearance.

## Sources

Source repository: https://github.com/ryankuah/vision-verse

- `html/`: commit `99e00baddc78d2c6be2acccc0254b6988af86dbb` (15 June 2025).
  Original edit page, Editor, ComponentEditor, Preview, renderers, quiz state,
  playback state, and UI primitives.
- `fabric/`: commit `04d5a6f` (11 September 2026; full SHA in provenance.json).
  Original FabricSceneEditor, FabricSceneRenderer, layer panel, tool dock,
  selection/background menus, scene format, and editing helpers.

`provenance.json` records every copied file and its SHA-256. Files inside the
revision directories are byte-for-byte copies. They are compiled by esbuild,
not rewritten to satisfy the portfolio's newer TypeScript/Next.js conventions.

## Local adapters and differences

- Quiz content is sample data authored for this portfolio, not a recovered
  customer's quiz. The original quiz artwork remains elsewhere in the story.
- The 40px example bar provides playback and reset outside the original editor.
- HTML account/navigation services are disconnected. Save keeps data in the tab;
  Publish explains that publishing is unavailable. Uploads use local data URLs.
  The original template picker has no server templates in this example.
- Fabric scene changes remain in memory; Preview uses the original renderer.
  The image picker uses local files and the three existing project images.
- The HTML snapshot contains an invalid `w-[850]` utility. The example sets that
  editor panel to 46% width to preserve its two-column desktop composition.
- The HTML theme lacks the border token used by its global CSS. The build adds
  that token so Tailwind can compile it. The original Geist font is loaded locally. Other theme/classes are from the snapshots.
- Both editors keep their desktop viewport when embedded, scaled to the available
  page width. The full-size links open the same applications separately.

## Rebuild

From the portfolio root:

```sh
npm ci --prefix examples/visionverse --ignore-scripts
npm run build --prefix examples/visionverse
```

The generated files in `public/visionverse-history` are kept as static
assets. The normal portfolio build does not need another install or server.
To refresh a historical component, retrieve its exact Git blob and update the
provenance digest; do not copy the source checkout's uncommitted edits.
