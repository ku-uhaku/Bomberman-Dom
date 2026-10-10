import {
  tile,
  baseSpeed,
  speedStep,
  speedMax,
  lives,
  iFrames,
  blastRange,
  caps,
} from "../../../shared/global.js";
import { toIdx, toCenterX, toCenterY } from "../../../shared/util.js";

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
