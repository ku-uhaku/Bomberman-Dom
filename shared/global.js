// shared stuff (used in client and server)

export const cols = 15;
export const rows = 13;
export const tile = 32;
export const playerBox = 22;
export const maxPlayers = 4;

export const baseSpeed = 96;
export const speedStep = 24;
export const speedMax = 5;

export const lives = 3;
export const iFrames = 1500;
export const fuse = 2000;
export const explosionTtl = 400;
export const blastRange = 2;

export const powerupChance = 0.3;
export const caps = { bombs: 6, flames: 6, speed: 5 };

export const tickMs = 1000 / 30;
export const queueMs = 20000;
export const countdownMs = 10000;
export const graceMs = 4000;

export const chatMax = 300;
export const chatHistory = 50;
export const chatRate = 5;
export const chatRateWindow = 5000;

export const msg = {
  join: "join",
  chat: "chat",
  input: "input",
  bomb: "bomb",
  joined: "joined",
  error: "error",
  lobby: "lobby",
  chatHistory: "chat_history",
  chatMsg: "chat",
  start: "start",
  state: "state",
  gameOver: "game_over",
  roundEnd: "round_end",
};

export function toCol(i) {
  return i % cols;
}

export function toRow(i) {
  return Math.floor(i / cols);
}

export function toIdx(col, row) {
  return row * cols + col;
}

export function toCenterX(i) {
  return toCol(i) * tile + tile / 2;
}

export function toCenterY(i) {
  return toRow(i) * tile + tile / 2;
}
