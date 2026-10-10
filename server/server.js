import http from "node:http";
import { serveStatic } from "./static.js";
import { WebSocketServer } from "ws";

const PORT = process.env.PORT || 3000;

function respond(res, status, body) {
  res.writeHead(status, { "content-type": "text/plain; charset=utf-8" });
  res.end(body);
}

const server = http.createServer(async (req, res) => {
  if (req.method !== "GET") {
    res.writeHead(405, { allow: "GET" });
    res.end();
    return;
  }

  const urlPath = new URL(req.url, "http://localhost").pathname;
  const file = urlPath === "/" ? "/index.html" : urlPath;

  if (await serveStatic(res, file)) return;

  respond(res, 404, "404 Not Found");
});

const wss = new WebSocketServer({ server });

server.listen(PORT, () => console.log(`bomberman-dom on http://localhost:${PORT}`));
