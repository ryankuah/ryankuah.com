import { build } from "esbuild";
import postcss from "postcss";
import tailwind from "tailwindcss";
import loadConfig from "tailwindcss/loadConfig.js";
import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { createHash } from "node:crypto";
const base = path.dirname(fileURLToPath(import.meta.url));
const output = path.resolve(base, "../../public/visionverse-history");
const adapters = {
  html: {
    "src/actions/quiz": "quiz.js",
    "src/actions/template": "template.js",
    "src/lib/uploadthing": "uploadthing.js",
  },
  fabric: { "src/components/quiz/ImagePickerDialog": "ImagePickerDialog.jsx" },
};
const provenance = JSON.parse(
  await fs.readFile(path.join(base, "provenance.json"), "utf8"),
);
for (const revision of ["html", "fabric"]) {
  for (const [file, expected] of Object.entries(provenance[revision].files)) {
    const actual = createHash("sha256")
      .update(await fs.readFile(path.join(base, revision, file)))
      .digest("hex");
    if (actual !== expected)
      throw new Error(`Historical source changed: ${revision}/${file}`);
  }
  const out = path.join(output, revision);
  await fs.mkdir(out, { recursive: true });
  await fs.copyFile(
    path.join(base, "assets/Geist-Variable.woff2"),
    path.join(out, "Geist-Variable.woff2"),
  );
  await build({
    absWorkingDir: base,
    entryPoints: [`${revision}-entry.jsx`],
    outfile: path.join(out, "app.js"),
    bundle: true,
    minify: true,
    format: "esm",
    jsx: "automatic",
    define: { "process.env.NODE_ENV": '"production"' },
    plugins: [
      {
        name: "historical-adapters",
        setup(b) {
          b.onResolve({ filter: /^(next\/|@clerk\/)/ }, () => ({
            path: path.join(base, "adapters/navigation.jsx"),
          }));
          b.onResolve({ filter: /^@\// }, (args) => {
            const relative = "src/" + args.path.slice(2);
            return {
              path: adapters[revision][relative]
                ? path.join(base, "adapters", adapters[revision][relative])
                : path.join(base, revision, relative) +
                  (/\.[a-z]+$/i.test(relative)
                    ? ""
                    : ([".tsx", ".ts", ".js", ".jsx"].find((ext) =>
                        fsSync.existsSync(
                          path.join(base, revision, relative + ext),
                        ),
                      ) ?? "/index.ts")),
            };
          });
        },
      },
    ],
  });
  // Compile the original Tailwind theme and source classes in isolation.
  const config = loadConfig(path.join(base, revision, "tailwind.config.ts"));
  config.content = [
    path.join(base, revision, "src/**/*.tsx"),
    path.join(base, `${revision}-entry.jsx`),
    path.join(base, "adapters/*.jsx"),
  ];
  let css = await fs.readFile(
    path.join(base, revision, "src/styles/globals.css"),
    "utf8",
  );
  // The 2025 config omitted shadcn theme colors, although its base CSS uses them.
  if (revision === "html")
    config.theme.extend.colors = { border: "hsl(var(--border))" };
  css +=
    "\n@font-face {font-family:Geist;src:url(./Geist-Variable.woff2) format('woff2');font-style:normal;font-weight:100 900;font-display:swap} :root {--font-geist-sans: Geist;} html,body,#root {height:100%;margin:0;overflow:hidden} .example-controls {height:40px;display:flex;align-items:center;justify-content:space-between;padding:0 16px;background:#fff;border-bottom:1px solid #e2e8f0;font:12px Arial;color:#475569} .example-controls button {margin-left:16px;text-decoration:underline;cursor:pointer} .example-body {height:calc(100% - 40px)} .example-body>main {height:100%;width:100%} .example-body>main>div:last-child>section:first-child {width:46%;flex-shrink:0}";
  const result = await postcss([tailwind(config)]).process(css, {
    from: undefined,
  });
  await fs.writeFile(path.join(out, "app.css"), result.css);
  await fs.writeFile(
    path.join(out, "index.html"),
    `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><title>VisionVerse ${revision === "html" ? "HTML editor · 99e00ba" : "Fabric editor · 04d5a6f"}</title><link rel="stylesheet" href="app.css"></head><body><div id="root"></div><script type="module" src="app.js"></script></body></html>`,
  );
  console.log(`Built ${revision} historical editor`);
}
import fsSync from "node:fs";
