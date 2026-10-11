import { World } from "./types/World.js";

export function createWorld(players) {
  return new World(players);
}

export function step(world, dt, inputs, bombReqs) {
  return world.step(dt, inputs, bombReqs);
}

export function toSnapshot(world) {
  return world.toSnapshot();
}
