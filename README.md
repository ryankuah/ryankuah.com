# Ryan Kuah

A single-screen personal portfolio set in an illustrated woodland clearing. Built with Next.js, React, TypeScript, and CSS animation. No backend, accounts, or environment variables are required.

## Run

```sh
npm install
npm run dev
```

Open http://localhost:3000. For a production preview, use `npm run build` followed by `npm start`.

## Checks

```sh
npm run lint
npm run typecheck
npm run format:check
npm run build
```

## Portfolio availability

Aria and SHD Network are currently available. Other project entries are marked **Coming soon**, and `/mobile` displays a lock screen. All original project content, previews, examples, and the phone app interface remain in the repository for continued development.

`isProjectPublished` in `src/data/projects.ts` controls which project stories can open. To restore the phone apps, switch the mobile branch in `src/components/platform-surfaces.tsx` back to `MobileSurface` from `src/components/mobile-surface.tsx`.

## The experience

- A layered forest opening with a separately animated fire, rising embers, and firelight revealing the seated character.
- An introduction with coloured links to `/web`, `/mobile`, and `/desktop`.
- Web: an Aria-inspired glass address prompt types `ryankuah.com/web`, then opens a repository-style project list.
- Mobile: the forest contracts into a locked iPhone with a forgotten-password message.
- Desktop: an automatic decorative password sequence unlocks a desktop with project icons, a dock, and app windows. No credentials are collected.
- The scene persists across routes. There is no page scrolling; long project details can scroll inside an app window.
- The full inventory remains in `src/data/projects.ts`; platform membership lives in `src/data/platforms.ts`.
- Project selection stays inside the browser, phone, or desktop. Escape closes an open project; during an entrance animation it cancels navigation.
- Minimal copy: names, controls, built features, lessons, and skills.
- Reduced-motion support skips the transitions and goes straight to the selected page. The fire intro is skipped on project pages and return visits within a browser session.
- Responsive desktop and mobile compositions.

Edit project content in `src/data/projects.ts`, route transitions in `src/components/fireside.tsx`, device views in `src/components/platform-surfaces.tsx`, and styles in `src/app/globals.css` and the component CSS modules.

The character is a provisional illustrated avatar, not a verified likeness. Learning reflections are draft copy for Ryan to review. Descriptions are based on the inspected local projects, not fresh end-to-end verification of those products. Labels intentionally avoid unverified release claims. Team coursework identifies Ryan's contribution. Private projects are described without publishing private application data.

## Layered artwork

The final scene uses independent assets under `public/images/`. All were generated using the built-in image-generation tool; transparent files retain their original alpha channel. Each can be repositioned, lit, or animated without repainting the other layers. The sky occupies the upper portion; dense forest fills the middle; the campsite sits at the bottom. No panoramic valley or distant horizon is used.

Final generation prompts (shared style: mature hand-painted gouache storybook illustration, organic edges and grain, dark navy/teal forest, amber firelight; no text or watermarks):

- `night-sky.png`: Wide 3:2 near-black midnight sky, restrained painted paper grain and sparse small stars, calm dark centre, no moon, ground, trees, or horizon.
- `forest.png`: Wide 3:2 dense frontal wall of closely packed pine and spruce silhouettes. Variable crowns beginning in the upper quarter, close trunks and undergrowth, empty dark clearing at the bottom. Transparent sky gaps. No distant landscape, valley, mountains, lake, people, logs, or fire.
- `foreground.png`: Wide 3:2 transparent framing layer. Close dark pine trunks and branches restricted to the outer left and right edges, sparse ferns in bottom corners, completely empty transparent centre. No background or other objects.
- `character.png`: Full-body stylised young adult with short dark hair, olive overshirt, cream shirt, charcoal trousers, brown shoes, seated on the right half of a rustic horizontal log holding an enamel mug. Three-quarter view toward the right, relaxed storytelling expression, warm light from lower right, dark blue shadows. Transparent background; no scenery, fire, or ground plane.
- `logs.png`: Small unlit campfire wood and stone ring seen slightly from above. Four or five split logs in a loose teepee, irregular dark river stones, faint embers, warm highlights. Transparent background; no flame, smoke, or scenery.
- `flame.png`: Portrait 2:3 organic cluster of three painterly flame tongues, amber outer flame, yellow inner flame, pale core, soft translucent edges, transparent background; no wood, stones, ground, or smoke.

`social-preview.png` is a browser capture of the current layered scene. The earlier single-scene concept is not used.

Project images are existing local project assets: Aria's app icon, an early CityCraft development capture, and a Seerstone map capture. Hayday Companion, 随遇, and Forza Horizon Tuner also use icons from their local project assets. Other app icons are simple interface symbols. These are not newly fabricated product screenshots.

## Deployment

Use the standard Next.js deployment flow with `npm run build`. The previous empty Convex scaffold has been removed. This draft does not deploy or publish anything automatically.
