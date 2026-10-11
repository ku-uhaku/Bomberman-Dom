import {
  cols,
  rows,
  tile,
  playerBox,
  explosionTtl,
  powerupChance,
  event_names,
} from "../../../shared/global.js";
import { toCol, toRow, toIdx } from "../../../shared/util.js";
import { createMap } from "../map.js";
import { Player } from "./Player.js";
import { Bomb } from "./Bomb.js";

const half = playerBox / 2;
const powerupTypes = ["bombs", "flames", "speed"];

export class World {
  constructor(players) {
    const { walls, blocks, spawns } = createMap(players.length);
    this.cols = cols;
    this.rows = rows;
    this.tile = tile;
    this.walls = walls;
    this.blocks = blocks;
    this.bombs = new Map(); // idx -> Bomb
    this.explosions = new Map(); // idx -> ttl
    this.powerups = new Map(); // idx -> type
    this.players = new Map(); // id -> Player
    this.time = 0;
    this.seq = 0;
    this.over = false;

    players.forEach((player, i) => {
      const instance = new Player({ ...player, spawn: spawns[i] });
      this.players.set(instance.id, instance);
    });
  }

  isSolid(idx) {
    return this.walls.has(idx) || this.blocks.has(idx) || this.bombs.has(idx);
  }

  boxTiles(x, y) {
    const c0 = Math.max(0, Math.floor((x - half) / tile));
    const c1 = Math.min(cols - 1, Math.floor((x + half - 1e-6) / tile));
    const r0 = Math.max(0, Math.floor((y - half) / tile));
    const r1 = Math.min(rows - 1, Math.floor((y + half - 1e-6) / tile));
    const tiles = [];
    for (let r = r0; r <= r1; r++)
      for (let c = c0; c <= c1; c++) tiles.push(toIdx(c, r));
    return tiles;
  }

  // tiles the player already overlaps (their own bomb) don't block them out of it
  collides(x, y, current = []) {
    if (
      x - half < 0 ||
      x + half > cols * tile ||
      y - half < 0 ||
      y + half > rows * tile
    )
      return true;
    return this.boxTiles(x, y).some(
      (idx) => this.isSolid(idx) && !current.includes(idx)
    );
  }

  placeBomb(id, events) {
    const player = this.players.get(id);
    if (!player || !player.alive) return;

    const idx = player.cell;
    if (this.bombs.has(idx)) return;

    let active = 0;
    for (const bomb of this.bombs.values())
      if (bomb.owner === id) active++;
    if (active >= player.maxBombs) return;

    this.bombs.set(idx, new Bomb(idx, id, player.range));
    events.push({ type: event_names.bomb, playerId: id, idx });
  }

  explode(bomb, events) {
    this.bombs.delete(bomb.idx);

    const baseCol = toCol(bomb.idx);
    const baseRow = toRow(bomb.idx);
    for (const [dc, dr] of [
      [1, 0],
      [-1, 0],
      [0, 1],
      [0, -1],
    ]) {
      for (let d = 1; d <= bomb.range; d++) {
        const c = baseCol + dc * d;
        const r = baseRow + dr * d;
        if (c < 0 || c >= cols || r < 0 || r >= rows) break;

        const idx = toIdx(c, r);
        if (this.walls.has(idx)) break;

        this.explosions.set(idx, explosionTtl);
        if (this.blocks.has(idx)) {
          this.blocks.delete(idx);
          events.push({ type: event_names.boxDestroyed, idx });
          if (Math.random() < powerupChance) {
            const type =
              powerupTypes[Math.floor(Math.random() * powerupTypes.length)];
            this.powerups.set(idx, type);
            events.push({ type: event_names.powerupDropped, idx, powerup: type });
          }
          break;
        }
      }
    }

    this.explosions.set(bomb.idx, explosionTtl);
    events.push({ type: event_names.explode, idx: bomb.idx });
  }

  pickup(player, events) {
    const type = this.powerups.get(player.cell);
    if (!type) return;
    player.applyPowerup(type);
    this.powerups.delete(player.cell);
    events.push({ type: event_names.powerupPicked, playerId: player.id, powerup: type });
  }

  damage(player, dt, events) {
    if (player.iFrames > 0) {
      player.iFrames -= dt;
      return;
    }

    for (const idx of this.boxTiles(player.x, player.y)) {
      if (!this.explosions.has(idx)) continue;
      const died = player.takeHit();
      events.push({ type: event_names.hit, playerId: player.id, lives: player.lives });
      if (died) events.push({ type: event_names.died, playerId: player.id });
      return;
    }
  }

  checkWin(events) {
    if (this.over) return;
    const alive = [...this.players.values()].filter((p) => p.alive);
    if (alive.length <= 1) {
      this.over = true;
      events.push({ type: event_names.gameOver, winnerId: alive[0]?.id ?? null });
    }
  }

  // dt in milliseconds; inputs: Map playerId -> { x, y } intent, each -1..1
  // bombReqs: iterable of playerIds requesting a bomb this tick
  step(dt, inputs, bombReqs) {
    const events = [];
    this.time += dt;

    for (const id of bombReqs) this.placeBomb(id, events);

    for (const player of this.players.values()) {
      if (!player.alive) continue;
      player.move(this, inputs.get(player.id) ?? { x: 0, y: 0 }, dt);
    }

    for (const [idx, bomb] of [...this.bombs]) {
      if (bomb.tick(dt)) this.explode(bomb, events);
    }

    for (const [idx, ttl] of [...this.explosions]) {
      if (ttl - dt <= 0) this.explosions.delete(idx);
      else this.explosions.set(idx, ttl - dt);
    }

    for (const player of this.players.values()) {
      if (!player.alive) continue;
      this.pickup(player, events);
      this.damage(player, dt, events);
    }

    this.checkWin(events);
    return events;
  }

  toSnapshot() {
    const players = {};
    for (const player of this.players.values())
      players[player.id] = player.toWire();
    return {
      seq: this.seq++,
      players,
      blocks: [...this.blocks],
      bombs: [...this.bombs.keys()],
      explosions: [...this.explosions.keys()],
      powerups: [...this.powerups].map(([idx, type]) => [idx, type]),
    };
  }
}
