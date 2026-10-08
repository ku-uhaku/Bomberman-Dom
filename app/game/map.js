// Cell values: 0 = empty, 1 = solid wall, 2 = breakable wall
export const EMPTY = 0;
export const SOLID = 1;
export const BREAKABLE = 2;

export default class GameMap {
    constructor(level) {
        this.name = level.name;
        this.width = level.width;
        this.height = level.height;
        // copy the grid; unknown markers (like "E") become empty floor
        this.grid = level.map.map(row => row.map(c => (c === 1 || c === 2 ? c : 0)));
    }

    inBounds(x, y) {
        return x >= 0 && x < this.width && y >= 0 && y < this.height;
    }

    get(x, y) {
        return this.inBounds(x, y) ? this.grid[y][x] : SOLID;
    }

    set(x, y, value) {
        if (this.inBounds(x, y)) this.grid[y][x] = value;
    }

    isWalkable(x, y) {
        return this.get(x, y) === EMPTY;
    }
}
