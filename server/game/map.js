import { cols, rows, maxPlayers } from "../../shared/global.js";
import { shuffle, toIdx } from "../../shared/util.js";

const mapTemplate = [
  "###############",
  "#.............#",
  "#.#.#.#.#.#.#.#",
  "#.............#",
  "#.#.#.#.#.#.#.#",
  "#.............#",
  "#.#.#.#.#.#.#.#",
  "#.............#",
  "#.#.#.#.#.#.#.#",
  "#.............#",
  "#.#.#.#.#.#.#.#",
  "#.............#",
  "###############",
];

const spawns = [ // 4 corners
  [1, 1],
  [13, 1],
  [1, 11],
  [13, 11],
];

const blockDensity = 0.6;

// spawn cell plus 2 cells inward along both edges, so a bomb dropped
// on the spawn leaves the player room to escape
function safeZone([col, row]) {
  const cells = new Set([toIdx(col, row)]);
  const dirCol = col < cols / 2 ? 1 : -1;
  const dirRow = row < rows / 2 ? 1 : -1;
  for (let step = 1; step <= 2; step++) {
    cells.add(toIdx(col + dirCol * step, row));
    cells.add(toIdx(col, row + dirRow * step));
  }
  return cells;
}

function parseMap() {
  if (mapTemplate.length !== rows)
    throw new Error(`map: expected ${rows} rows, got ${mapTemplate.length}`);

  const walls = new Set();
  const open = [];
  mapTemplate.forEach((line, row) => {
    if (line.length !== cols)
      throw new Error(`map: row ${row} has ${line.length} chars, expected ${cols}`);
    [...line].forEach((char, col) => {
      if (char === "#") walls.add(toIdx(col, row));
      else open.push(toIdx(col, row));
    });
  });
  return { walls, open };
}

export function createMap(playerCount) {
  if (playerCount < 1 || playerCount > maxPlayers)
    throw new Error(`map: playerCount ${playerCount} out of range`);

  const { walls, open } = parseMap();
  const safe = new Set();
  for (const spawn of spawns.slice(0, playerCount))
    for (const idx of safeZone(spawn)) safe.add(idx);

  const eligible = open.filter((idx) => !safe.has(idx));
  const blocks = new Set(
    shuffle(eligible).slice(0, Math.floor(eligible.length * blockDensity))
  );

  return { walls, blocks, spawns: spawns.slice(0, playerCount) };
}
