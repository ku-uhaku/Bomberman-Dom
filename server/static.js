import { createReadStream } from "node:fs";
import { stat } from "node:fs/promises";
import path from "node:path";

const root = path.resolve(import.meta.dirname, "..");

const mime = {
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".png": "image/png",
  ".ico": "image/x-icon",
  ".ttf": "font/ttf", // for custom font
  ".wav": "audio/wav",
};

export async function serveStatic(res, urlPath) {
  const target = path.resolve(root, "." + urlPath);
  if (target !== root && !target.startsWith(root + path.sep)) return false;

  let info;
  try {
    info = await stat(target);
  } catch {
    return false;
  }
  if (!info.isFile()) return false;

  res.writeHead(200, {
    "content-type": mime[path.extname(target)] ?? "application/octet-stream",
    "content-length": info.size,
  });

  createReadStream(target).pipe(res);
  return true;
}


