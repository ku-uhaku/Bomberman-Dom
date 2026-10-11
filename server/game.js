import { maxPlayers, queueMs, countdownMs, msg } from "../shared/global.js";
import { createWorld } from "./core/engine.js";

export class Game {
  constructor(lobby, send) {
    this.lobby = lobby;
    this.send = send;
    this.phase = "idle"; // idle | queue | countdown | playing
    this.queueEndsAt = null;
    this.countdownEndsAt = null;
    this.world = null;
    this.interval = null;
  }

  // called on every roster change (join/leave)
  sync() {
    if (this.phase !== "playing") this.evaluate();
    this.lobby.broadcast();
  }

  evaluate() {
    const n = this.lobby.players.size;
    if (n >= maxPlayers) {
      if (this.phase !== "countdown") this.startCountdown();
    } else if (n >= 2) {
      if (this.phase === "idle") this.startQueue();
    } else {
      this.reset();
    }
  }

  startQueue() {
    this.phase = "queue";
    this.countdownEndsAt = null;
    this.queueEndsAt = Date.now() + queueMs;
    this.run();
  }

  startCountdown() {
    this.phase = "countdown";
    this.queueEndsAt = null;
    this.countdownEndsAt = Date.now() + countdownMs;
    this.run();
  }

  reset() {
    this.phase = "idle";
    this.queueEndsAt = null;
    this.countdownEndsAt = null;
    this.stop();
  }

  run() {
    this.stop();
    this.interval = setInterval(() => this.tick(), 250);
  }

  stop() {
    if (this.interval) {
      clearInterval(this.interval);
      this.interval = null;
    }
  }

  tick() {
    const now = Date.now();
    if (this.phase === "queue" && now >= this.queueEndsAt) {
      if (this.lobby.players.size >= 2) this.startCountdown();
      else this.reset();
      this.lobby.broadcast();
    } else if (this.phase === "countdown" && now >= this.countdownEndsAt) {
      this.beginMatch();
    }
  }

  beginMatch() {
    this.stop();
    this.phase = "playing";
    this.queueEndsAt = null;
    this.countdownEndsAt = null;

    const players = [...this.lobby.players.values()].map((p) => ({
      id: p.id,
      nickname: p.nickname,
    }));
    this.world = createWorld(players);

    const map = {
      walls: [...this.world.walls],
      blocks: [...this.world.blocks],
    };
    const startPlayers = {};
    for (const p of this.world.players.values())
      startPlayers[p.id] = { x: Math.round(p.x), y: Math.round(p.y), nickname: p.nickname };

    this.lobby.sendAll({ type: msg.start, map, players: startPlayers });
  }
}
