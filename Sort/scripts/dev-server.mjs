import http from "node:http";
import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, "..");
const LEVELS_PATH = path.join(ROOT, "src/config/levels.json");
const PORT = Number(process.env.PORT) || 4173;

const MIME = {
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".mjs": "text/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".svg": "image/svg+xml",
  ".ico": "image/x-icon",
  ".woff": "font/woff",
  ".woff2": "font/woff2",
};

function sendJson(res, status, body) {
  const text = JSON.stringify(body);
  res.writeHead(status, {
    "Content-Type": "application/json; charset=utf-8",
    "Content-Length": Buffer.byteLength(text),
  });
  res.end(text);
}

async function readBody(req) {
  const chunks = [];
  for await (const chunk of req) chunks.push(chunk);
  const text = Buffer.concat(chunks).toString("utf8");
  if (!text) return null;
  return JSON.parse(text);
}

async function handleSaveLevels(req, res) {
  try {
    const payload = await readBody(req);
    if (!payload || !Array.isArray(payload.levels) || payload.levels.length === 0) {
      sendJson(res, 400, { ok: false, error: "Invalid payload: levels array required" });
      return;
    }

    const output = {
      source: payload.source ?? "level-editor",
      levels: payload.levels,
    };
    const text = `${JSON.stringify(output, null, 2)}\n`;
    await fs.writeFile(LEVELS_PATH, text, "utf8");

    sendJson(res, 200, {
      ok: true,
      path: "src/config/levels.json",
      levelCount: output.levels.length,
    });
  } catch (err) {
    sendJson(res, 500, { ok: false, error: err?.message ?? "Save failed" });
  }
}

async function serveStatic(req, res) {
  const url = new URL(req.url ?? "/", `http://${req.headers.host ?? "localhost"}`);
  let pathname = decodeURIComponent(url.pathname);
  if (pathname === "/") pathname = "/index.html";
  if (pathname.endsWith("/")) pathname = `${pathname}index.html`;

  const filePath = path.resolve(ROOT, `.${pathname}`);
  if (!filePath.startsWith(ROOT)) {
    res.writeHead(403).end("Forbidden");
    return;
  }

  try {
    const stat = await fs.stat(filePath);
    if (!stat.isFile()) {
      res.writeHead(404).end("Not Found");
      return;
    }

    const ext = path.extname(filePath).toLowerCase();
    const data = await fs.readFile(filePath);
    res.writeHead(200, { "Content-Type": MIME[ext] ?? "application/octet-stream" });
    res.end(data);
  } catch {
    res.writeHead(404).end("Not Found");
  }
}

const server = http.createServer(async (req, res) => {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");

  if (req.method === "OPTIONS") {
    res.writeHead(204).end();
    return;
  }

  if (req.method === "POST" && req.url === "/api/levels/save") {
    await handleSaveLevels(req, res);
    return;
  }

  if (req.method === "GET" && req.url === "/api/health") {
    sendJson(res, 200, { ok: true, saveApi: true });
    return;
  }

  if (req.method === "GET") {
    await serveStatic(req, res);
    return;
  }

  res.writeHead(405).end("Method Not Allowed");
});

server.listen(PORT, () => {
  console.log(`Dev server: http://localhost:${PORT}/`);
  console.log(`Level editor: http://localhost:${PORT}/tools/level-editor/`);
  console.log(`Bubble debug: http://localhost:${PORT}/tools/bubble-debug/`);
  console.log(`Save API: POST /api/levels/save -> src/config/levels.json`);
});