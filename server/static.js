import path from "node:path";
import { readFile } from "node:fs/promises";

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

  const relative = path.relative(root, target);
  if (!relative.startsWith(`client${path.sep}`) && !relative.startsWith(`shared${path.sep}`)) {
    return false;
  }

  try {
    const data = await readFile(target);
    res.writeHead(200, {
      "content-type": mime[path.extname(target)] ?? "application/octet-stream",
      "content-length": data.length,
    });
    res.end(data);
    return true;
  } catch (error) {
    return false;
  }
}
