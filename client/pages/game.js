import { el, Component } from "../framework/index.js";
import { AnimatedImage } from "../components/animatedImage.js";

// !!!!!!!!!!!! THIS IS TEMPORARY FOR TESTING ART


const atlas = "/assets/images/art.png";
const cellSize = 32;

const wallFrames = [[0, 0]];
const pillarFrames = [[96, 0]];
const windowFrames = [[128, 0]];
const drawersFrames = [[160, 0]];
const floorFrames = [[32, 0]];
const blockFrames = [[64, 0]];
const bombFrames = [[0, 32], [32, 32]];
const explosionFrames = [[64, 32], [96, 32]];
const characterOneFrames = [[0, 64], [32, 64]];
const characterTwoFrames = [[0, 96], [32, 96]];

const cellSprites = {
	"1": wallFrames,
	"2": pillarFrames,
	"3": windowFrames,
	"4": drawersFrames,
	"X": blockFrames,
};

const mockMap = [
	"1121312411131211",
	"1..X..X..X..X..1",
	"1.1.1.2.1.1.1..4",
	"1X..X..X..X.X..1",
	"1.1.1.1.1.1.1..1",
	"4..X.X..X..X...1",
	"1.1.1.1.1.1.1..1",
	"1X..X..X.X..X..1",
	"1..............1",
	"1211311144132111",
];

function createSprite(frames, key) {
	return el(AnimatedImage, {
		key,
		atlas,
		cellW: cellSize,
		cellH: cellSize,
		frames,
	});
}

function createToken(frames, col, row, key) {
	return el(
		"div",
		{
			key,
			style: `position:absolute;left:${col * cellSize}px;top:${row * cellSize}px;width:${cellSize}px;height:${cellSize}px`,
		},
		createSprite(frames, `${key}-img`)
	);
}

export class GamePage extends Component {
	render() {
		const columnCount = mockMap[0].length;
		if (mockMap.some((line) => line.length !== columnCount))
			throw new Error("mockMap: all rows must have the same length");
		const boardCells = [];
		mockMap.forEach((line, row) => {
			[...line].forEach((cell, col) => {
				const frames = cellSprites[cell] ?? floorFrames;
				boardCells.push(createSprite(frames, `${col},${row}`));
			});
		});

		return el(
			"div",
			{
				class: "game-board",
				style: `display:grid;grid-template-columns:repeat(${columnCount},32px);position:relative;width:max-content;margin:16px;transform:scale(2);transform-origin:top left`,
			},
			[
				...boardCells,
				createToken(characterOneFrames, 1, 1, "player-one"),
				createToken(characterTwoFrames, 7, 5, "player-two"),
				createToken(bombFrames, 3, 3, "bomb"),
				createToken(explosionFrames, 5, 3, "explosion"),
			]
		);
	}
}

