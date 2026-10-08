const path = require("path");
const express = require("express");
const http = require("http");
const { WebSocketServer } = require("ws");

const PORT = process.env.PORT || 3000;
const app = express();
app.use(express.static(path.join(__dirname, "..")));

const server = http.createServer(app);
const wss = new WebSocketServer({ server });



server.listen(PORT, () => console.log(`Server running at http://localhost:${PORT}`));
