import { msg, maxPlayers, graceMs } from "../shared/global.js";

export class Lobby {
  constructor(send) {
    this.send = send;
    this.players = new Map(); // id -> { id, nickname, socket }
    this.nextId = 1;
  }

  join(socket, nickname) {
    if ([...this.players.values()].some((p) => p.socket === socket))
      return { ok: false, reason: "already joined" };

    const name = nickname.trim();
    if (name.length < 1 || name.length > 12)
      return { ok: false, reason: "nickname must be 1-12 characters" };
    if (this.players.size >= maxPlayers)
      return { ok: false, reason: "lobby is full" };
    if ([...this.players.values()].some((p) => p.nickname.toLowerCase() === name.toLowerCase()))
      return { ok: false, reason: "nickname already taken" };

    const id = this.nextId++;
    this.players.set(id, { id, nickname: name, socket });
    socket.on("close", () => this.leave(id));
    this.broadcast();
    return { ok: true, playerId: id };
  }

  leave(id) {
    setTimeout(() => {
      if (this.players.delete(id)) this.broadcast();
    }, graceMs);
  }

  broadcast() {
    const players = [...this.players.values()].map((p) => ({
      id: p.id,
      nickname: p.nickname,
    }));
    for (const p of this.players.values())
      this.send(p.socket, {
        type: msg.lobby,
        players,
        queueEndsAt: null,
        countdownEndsAt: null,
      });
  }
}