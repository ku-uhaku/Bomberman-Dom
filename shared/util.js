import { cols, tile } from "./global.js";

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

export function shuffle(items) {
  // trash shuffle
  for (let i = items.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [items[i], items[j]] = [items[j], items[i]];
  }
  return items;
}
