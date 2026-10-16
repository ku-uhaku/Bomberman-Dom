import { cols, rows, maxPlayers } from "../../shared/global.js";
import { shuffle, toIdx } from "../../shared/util.js";

const mapTemplate = [ // match global.js cols/rows; wall variants 1-5, open '.'
  "121144121111321",
  "1.............1",
  "1.1.1.1.1.1.1.1",
  "3.............1",
  "1.1.1.1.1.1.1.1",
  "1.............3",
  "1.1.1.1.1.1.1.1",
  "1.............1",
  "1.1.1.1.1.1.1.1",
  "3.............1",
  "1.1.1.1.1.1.1.1",
  "1.............3",
  "121555521143121",
];

const spawns = [ // 4 corners
  [1, 1],
  [13, 1],
  [1, 11],
  [13, 11],
];

const blockDensity = 0.5;

// spawn cell plus 2 cells inward along both edges to not trap player
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
  const wallVariants = {}; // idx -> sprite variant (1-5)
  const open = [];
  mapTemplate.forEach((line, row) => {
    if (line.length !== cols)
      throw new Error(`map: row ${row} has ${line.length} chars, expected ${cols}`);
    [...line].forEach((char, col) => {
      const idx = toIdx(col, row);
      if (char >= "1" && char <= "5") {
        walls.add(idx);
        wallVariants[idx] = Number(char);
      } else if (char === ".") open.push(idx);
      else throw new Error(`map: unknown char "${char}" at ${col},${row}`);
    });
  });
  return { walls, wallVariants, open };
}

export function createMap(playerCount) {
  if (playerCount < 1 || playerCount > maxPlayers)
    throw new Error(`map: playerCount ${playerCount} out of range`);

  const { walls, wallVariants, open } = parseMap();
  const safe = new Set();
  for (const spawn of spawns.slice(0, playerCount))
    for (const idx of safeZone(spawn)) safe.add(idx);

  const canBeFilled = open.filter((idx) => !safe.has(idx));
  const blocks = new Set(
    shuffle(canBeFilled).slice(0, Math.floor(canBeFilled.length * blockDensity))
  );

  return { walls, blocks, spawns: spawns.slice(0, playerCount), wallVariants };
}
