// MapLibre 6 loads its tile worker from a URL next to its own module, which bundlers break.
// Copy the installed worker into public/ so MapView can point setWorkerUrl() at it.
// Runs on postinstall (locally and on Vercel); the copy is gitignored.
import { copyFileSync, mkdirSync } from "node:fs";
import { createRequire } from "node:module";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const require = createRequire(import.meta.url);
const src = join(dirname(require.resolve("maplibre-gl/package.json")), "dist", "maplibre-gl-worker.mjs");
const dest = join(dirname(fileURLToPath(import.meta.url)), "..", "public", "maplibre-gl-worker.mjs");
mkdirSync(dirname(dest), { recursive: true });
copyFileSync(src, dest);
console.log(`copied ${src} -> ${dest}`);
