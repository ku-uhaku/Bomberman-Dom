import {
  cols,
  rows,
  tile,
  playerBox,
  baseSpeed,
  speedStep,
  speedMax,
  lives,
  iFrames,
  blastRange,
  caps,
  fuse,
  explosionTtl,
  powerupChance,
  toCol,
  toRow,
  toIdx,
  toCenterX,
  toCenterY,
} from "../../shared/global.js";
import { createMap } from "./map.js";

const half = playerBox / 2;
const powerupTypes = ["bombs", "flames", "speed"];

export class Player {
  constructor({ id, nickname, spawn }) {
    const idx = toIdx(spawn[0], spawn[1]);
    this.id = id;
    this.nickname = nickname;
    this.x = toCenterX(idx);
    this.y = toCenterY(idx);
    this.lives = lives;
    this.alive = true;
    this.maxBombs = 1;
    this.range = blastRange;
    this.speed = baseSpeed;
    this.iFrames = 0;
  }

  get cell() {
    return toIdx(Math.floor(this.x / tile), Math.floor(this.y / tile));
  }

  move(world, intent, dt) {
    const length = Math.hypot(intent.x, intent.y);
    if (length === 0) return;

    const secs = dt / 1000;
    const vx = (intent.x / length) * this.speed * secs;
    const vy = (intent.y / length) * this.speed * secs;

    const current = world.boxTiles(this.x, this.y);
    const nx = this.x + vx;
    if (!world.collides(nx, this.y, current)) this.x = nx;

    const ny = this.y + vy;
    if (!world.collides(this.x, ny, current)) this.y = ny;
  }

  applyPowerup(type) {
    if (type === "bombs")
      this.maxBombs = Math.min(caps.bombs, this.maxBombs + 1);
    else if (type === "flames")
      this.range = Math.min(caps.flames, this.range + 1);
    else if (type === "speed")
      this.speed = Math.min(
        baseSpeed + speedMax * speedStep,
        this.speed + speedStep
      );
  }

  takeHit() {
    this.lives -= 1;
    this.iFrames = iFrames;
    if (this.lives <= 0) {
      this.alive = false;
      return true;
    }
    return false;
  }

  toWire() {
    return {
      x: Math.round(this.x),
      y: Math.round(this.y),
      lives: this.lives,
      alive: this.alive,
      maxBombs: this.maxBombs,
      range: this.range,
      speed: this.speed,
      nickname: this.nickname,
    };
  }
}

export class Bomb {
  constructor(idx, owner, range) {
    this.idx = idx;
    this.owner = owner;
    this.fuse = fuse;
    this.range = range;
  }

  tick(dt) {
    this.fuse -= dt;
    return this.fuse <= 0;
  }
}

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
    events.push({ type: "bomb", playerId: id, idx });
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
          events.push({ type: "box_destroyed", idx });
          if (Math.random() < powerupChance) {
            const type =
              powerupTypes[Math.floor(Math.random() * powerupTypes.length)];
            this.powerups.set(idx, type);
            events.push({ type: "powerup_dropped", idx, powerup: type });
          }
          break;
        }
      }
    }

    this.explosions.set(bomb.idx, explosionTtl);
    events.push({ type: "explode", idx: bomb.idx });
  }

  pickup(player, events) {
    const type = this.powerups.get(player.cell);
    if (!type) return;
    player.applyPowerup(type);
    this.powerups.delete(player.cell);
    events.push({ type: "powerup_picked", playerId: player.id, powerup: type });
  }

  damage(player, dt, events) {
    if (player.iFrames > 0) {
      player.iFrames -= dt;
      return;
    }

    for (const idx of this.boxTiles(player.x, player.y)) {
      if (!this.explosions.has(idx)) continue;
      const died = player.takeHit();
      events.push({ type: "hit", playerId: player.id, lives: player.lives });
      if (died) events.push({ type: "died", playerId: player.id });
      return;
    }
  }

  checkWin(events) {
    if (this.over) return;
    const alive = [...this.players.values()].filter((p) => p.alive);
    if (alive.length <= 1) {
      this.over = true;
      events.push({ type: "game_over", winnerId: alive[0]?.id ?? null });
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
