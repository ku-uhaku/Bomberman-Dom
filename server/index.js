const path = require("path");
const express = require("express");
const http = require("http");
const { WebSocketServer } = require("ws");

const PORT = process.env.PORT || 3000;
const app = express();
app.use(express.static(path.join(__dirname, "..")));

const server = http.createServer(app);
const wss = new WebSocketServer({ server });

wss.on("connection", (socket) => {
    console.log(`Client connected (${wss.clients.size})`);

    socket.on("message", (data) => {
        // Broadcast to everyone
        for (const client of wss.clients) {
            if (client.readyState === 1) client.send(data.toString());
        }
    });

    socket.on("close", () => console.log(`Client disconnected (${wss.clients.size})`));
});

server.listen(PORT, () => console.log(`Server running at http://localhost:${PORT}`));
