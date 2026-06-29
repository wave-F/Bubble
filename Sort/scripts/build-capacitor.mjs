import { build } from "esbuild";
import { cp, mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { buildProductionHtml } from "./build-html.mjs";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, "..");
const webDir = path.join(rootDir, "www");
const popAudioSrcDir = path.join(rootDir, "assets", "audio", "pop");
const popAudioWebDir = path.join(webDir, "assets", "audio", "pop");
const bgmAudioSrcDir = path.join(rootDir, "assets", "audio", "bgm_preview");
const bgmAudioWebDir = path.join(webDir, "assets", "audio", "bgm_preview");
const imageSrcDir = path.join(rootDir, "assets", "images");
const imageWebDir = path.join(webDir, "assets", "images");

await mkdir(webDir, { recursive: true });

await build({
  entryPoints: [path.join(rootDir, "src", "main.js")],
  bundle: true,
  format: "iife",
  minify: true,
  legalComments: "none",
  target: ["safari16", "chrome109"],
  outfile: path.join(webDir, "main.js"),
});

async function bundleCssWithImports(entryPath, seen = new Set()) {
  const key = path.resolve(entryPath);
  if (seen.has(key)) return "";
  seen.add(key);

  const css = await readFile(key, "utf8");
  const importRegex = /^\s*@import\s+"([^"]+)";\s*$/gm;
  let out = "";
  let last = 0;
  let match;

  while ((match = importRegex.exec(css)) !== null) {
    out += css.slice(last, match.index);
    const childPath = path.resolve(path.dirname(key), match[1]);
    out += await bundleCssWithImports(childPath, seen);
    last = importRegex.lastIndex;
  }
  out += css.slice(last);
  return out;
}

function normalizeCssAssetUrls(css) {
  return css.replace(/url\((['"]?)(?:\.\.\/)+assets\//g, "url($1./assets/");
}

const css = normalizeCssAssetUrls(await bundleCssWithImports(path.join(rootDir, "src", "styles.css")));
await writeFile(path.join(webDir, "styles.css"), css, "utf8");
await cp(popAudioSrcDir, popAudioWebDir, { recursive: true, force: true });
await cp(bgmAudioSrcDir, bgmAudioWebDir, { recursive: true, force: true });
await cp(imageSrcDir, imageWebDir, { recursive: true, force: true });

const sourceHtml = await readFile(path.join(rootDir, "index.html"), "utf8");
const html = buildProductionHtml(sourceHtml);
await writeFile(path.join(webDir, "index.html"), html, "utf8");
