const files = {
	bombPlaced: "/client/assets/sounds/bombPlaced.wav",
	damaged: "/client/assets/sounds/damaged.wav",
	dead: "/client/assets/sounds/dead.wav",
	explosion: "/client/assets/sounds/explosion.wav",
	gameOver: "/client/assets/sounds/gameOver.wav",
	gameStarted: "/client/assets/sounds/gameStarted.wav",
	powerUp: "/client/assets/sounds/powerUp.wav",
	timer: "/client/assets/sounds/timer.wav",
};

const cache = new Map();

export function playSound(name) {
	if (!files[name]) return;
	let base = cache.get(name);
	if (!base) {
		base = new Audio(files[name]);
		base.preload = "auto";
		cache.set(name, base);
	}
	base.cloneNode().play().catch(() => {});
}
