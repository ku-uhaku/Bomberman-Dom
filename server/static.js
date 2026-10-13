import { createReadStream } from "node:fs";
import { stat } from "node:fs/promises";
import path from "node:path";

const ROOT = path.resolve(import.meta.dirname, "..");

const MIME = {
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".png": "image/png",
  ".ico": "image/x-icon",
};

// resolve urlPath inside ROOT; null if it escapes the root
function resolveInside(urlPath) {
  const target = path.resolve(ROOT, "." + urlPath);
  if (target !== ROOT && !target.startsWith(ROOT + path.sep)) return null;
  return target;
}

export async function serveStatic(res, urlPath) {
  const target = resolveInside(urlPath);
  if (!target) return false;

  let info;
  try {
    info = await stat(target);
  } catch {
    return false;
  }
  if (!info.isFile()) return false;

  res.writeHead(200, {
    "content-type": MIME[path.extname(target)] ?? "application/octet-stream",
    "content-length": info.size,
  });

  createReadStream(target).pipe(res);
  return true;
}
