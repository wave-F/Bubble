import { mkdir, readFile, writeFile, cp } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { spawnSync } from "node:child_process";
import { buildProductionHtml } from "./build-html.mjs";
import { build } from "esbuild";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.resolve(__dirname, "..");
const releaseDir = path.join(rootDir, "release", "web");
const distDir = path.join(rootDir, "dist");
const sourceHtmlPath = path.join(rootDir, "index.html");

const releaseAssets = {
  images: [
    "currency128_Coin.png",
    "HandPointer.png",
    "iconShade_Restart.png",
  ],
  popAudio: [
    "oga-pop1.ogg",
    "oga-pop3.ogg",
    "oga-pop4.ogg",
    "oga-pop5.ogg",
    "oga-pop6.ogg",
    "oga-pop7.ogg",
    "oga-pop8.ogg",
    "oga-pop9.ogg",
    "oga-pop10.ogg",
    "click.wav",
    "gain_coin.wav",
    "gamelose.mp3",
    "win.mp3",
  ],
};

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

async function buildWebRelease() {
  await mkdir(releaseDir, { recursive: true });

  await build({
    entryPoints: [path.join(rootDir, "src", "main.js")],
    bundle: true,
    format: "iife",
    minify: true,
    legalComments: "none",
    target: ["safari16", "chrome109"],
    outfile: path.join(releaseDir, "main.js"),
  });

  const css = normalizeCssAssetUrls(await bundleCssWithImports(path.join(rootDir, "src", "styles.css")));
  await writeFile(path.join(releaseDir, "styles.css"), css, "utf8");

  for (const file of releaseAssets.images) {
    const src = path.join(rootDir, "assets", "images", file);
    const dest = path.join(releaseDir, "assets", "images", file);
    await mkdir(path.dirname(dest), { recursive: true });
    await cp(src, dest, { force: true });
  }

  for (const file of releaseAssets.popAudio) {
    const src = path.join(rootDir, "assets", "audio", "pop", file);
    const dest = path.join(releaseDir, "assets", "audio", "pop", file);
    await mkdir(path.dirname(dest), { recursive: true });
    await cp(src, dest, { force: true });
  }

  const sourceHtml = await readFile(sourceHtmlPath, "utf8");
  const html = buildProductionHtml(sourceHtml);
  await writeFile(path.join(releaseDir, "index.html"), html, "utf8");

}

async function cleanReleaseDir() {
  const result = spawnSync("rm", ["-rf", releaseDir], { stdio: "inherit" });
  if (result.status !== 0) {
    throw new Error(`failed to clean release dir with exit code ${result.status ?? "unknown"}`);
  }
}

async function createZip() {
  await mkdir(distDir, { recursive: true });
  const stamp = new Date().toISOString().slice(0, 10);
  const zipName = `fruit-web-${stamp}.zip`;
  const zipPath = path.join(distDir, zipName);

  spawnSync("rm", ["-f", zipPath], { stdio: "inherit" });

  const result = spawnSync("zip", ["-r", zipPath, "."], {
    cwd: releaseDir,
    stdio: "inherit",
  });

  if (result.status !== 0) {
    throw new Error(`zip failed with exit code ${result.status ?? "unknown"}`);
  }

  return zipPath;
}

await cleanReleaseDir();
await buildWebRelease();
const zipPath = await createZip();
console.log(`Release package created: ${zipPath}`);