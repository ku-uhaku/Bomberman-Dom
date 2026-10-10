export class game {
    constructor() {
        this.map = null;
        this.Players = [];
        this.bombs = [];
        this.explosions = [];
        this.powerups = [];
        this.gameState = "waiting";
        this.startTime = null;
    }

    addPlayer(player) {
        if (this.Players.length >= 4) {
            throw new Error("Maximum number of players reached");
        }
        this.Players.push(player);
    }

    removePlayer(player) {
        const index = this.Players.indexOf(player);
        if (index !== -1) {
            this.Players.splice(index, 1);
        }
    
    }
}