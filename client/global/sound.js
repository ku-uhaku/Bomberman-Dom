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

const musicFiles = {
	lobby: "/client/assets/sounds/lobby.mp3",
	game: "/client/assets/sounds/game.mp3",
};

const cache = new Map();
let music = null;

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

export function playMusic(name) {
	if (!musicFiles[name] || (music && music.name === name)) return;
	stopMusic();
	const audio = new Audio(musicFiles[name]);
	audio.loop = true;
	const track = { name, audio };
	music = track;
	audio.play().catch(() => {
		if (music === track) music = null;
	});
}

export function stopMusic(name) {
	if (!music || (name && music.name !== name)) return;
	music.audio.pause();
	music = null;
}
