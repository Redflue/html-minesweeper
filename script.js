
/*

BUGS TO FIX:
- placing mines algorithm

FEATURES TO ADD:
- timer
- game over
- space to cycle-click
- the actual gameplay cycle
- scroll to zoom
- mid-click to pan
- change face to dead when lost the game

*/

const extraFaces = [
	"3-mouth.png",
	"lock-in.png",
	"sunglasses.png",
	"D-face.png",
	"stare.png",
	"surprised.png",
	"surprised-pikachu.png"
]

function getRandomIntInclusive(min, max) {
  const minCeiled = Math.ceil(min)
  const maxFloored = Math.floor(max)
  return Math.floor(Math.random() * (maxFloored - minCeiled + 1) + minCeiled)
}

class TileBoard {
	width
	height
	totalMines
	/** @type {Tile[]} */ tiles
	revealedTiles
	mineCount

	constructor() {
		this.revealedTiles = 0
		this.tiles = [];
	}

	initTiles(width, height, mineAmount) {
		this.width = width
		this.height = height
		this.totalMines = mineAmount
		this.mineCount = mineAmount
		this.revealedTiles = 0
		this.updateMineCounter()

		const tilesContainer = document.getElementById("tiles-container")
		tilesContainer.style.setProperty("--cols", this.width)
		tilesContainer.style.setProperty("--rows", this.height)

		for (let y = 0; y < this.height; y++) {
			for (let x = 0; x < this.width; x++) {
				let tile = new Tile(x, y, this)
				this.tiles.push(tile)

				tilesContainer.appendChild(tile.div)
			}
		}
	}

	clear() {
		this.tiles.forEach((tile) => {
			tile.delete()
		})

		this.tiles.length = 0
		this.tiles = []
	}

	placeMines() {
		let minesToPlace = this.totalMines

		while (minesToPlace > 0) {
			// TODO: change brute force algorithm to something smarter

			const randX = getRandomIntInclusive(0, this.width-1)
			const randY = getRandomIntInclusive(0, this.height-1)

			let tile = this.getTileAt(randX, randY)
			if (tile !== null && ! tile.hasMine) {
				tile.hasMine = true
				tile.updateImage()

				minesToPlace--
			}
		}
	}

	updateAllImages() {
		this.tiles.forEach((tile) => {
			tile.updateImage()
		})
	}

	#coordsToIndex(x, y) {
		return this.width * y + x
	}

	/**
	 * Get the tile at the given coordinates
	 * @param {number} x X coordinate
	 * @param {number} y Y coordinate
	 * @returns {Tile|null} The found tile or null if none exists at the location
	 */
	getTileAt(x, y) {
		if (x >= this.width || y >= this.height) return null
		if (x < 0 || y < 0) return null

		const index = this.#coordsToIndex(x, y)

		return this.tiles[index] ?? null
	}

	relocateMineAt(x, y, safeTiles = []) {

		// TODO: fix corner relocation bug

		const tile = this.getTileAt(x, y)

		const emptyTile = this.tiles.find((oTile) => ! oTile.hasMine && ! safeTiles.includes(oTile))
		emptyTile.hasMine = true
		tile.hasMine = false
	}

	revealTileAt(x, y, singleTile = false) {
		const tile = this.getTileAt(x, y)

		if (tile) {
			// First click
			if (this.revealedTiles <= 0) {
				const safeTiles = tile.getNeighbours()
				safeTiles.push(tile)

				safeTiles.forEach((safeTile) => {
					if (safeTile.hasMine) {
						this.relocateMineAt(safeTile.x, safeTile.y, safeTiles)
					}
				})
				this.updateAllImages()
			}

			if (tile.flagged) {
				this.flagTileAt(tile.x, tile.y, false)
			}

			tile.reveal()
			this.revealedTiles++

			if (tile.isEmpty() && ! singleTile) {
				this.#floodRevealEmptyTiles(x, y)
			}
		}
	}

	flagTileAt(x, y, overrideState = undefined) {
		const tile = this.getTileAt(x, y)
		if (tile === null || tile.revealed) return

		const previousState = tile.flagged
		if (overrideState == undefined) {
			tile.setFlagged(! tile.flagged)
		} else {
			tile.setFlagged(overrideState)
		}
		
		if (tile.flagged != previousState) {
			if (tile.flagged) {
				this.mineCount--
			} else {
				this.mineCount++
			}
			this.updateMineCounter()
		}
	}

	updateMineCounter() {
		const mineCounter = document.getElementById("mine-counter")
		mineCounter.innerText = this.mineCount.toString()
	}

	#floodRevealEmptyTiles(x, y, alreadyCoveredTiles = []) {
		const tile = this.getTileAt(x, y)
		if (! tile.revealed) {
			this.revealTileAt(tile.x, tile.y, true)
			alreadyCoveredTiles.push(this.#coordsToIndex(x, y))
		}

		if (tile.isEmpty()) {
			for (let dx = -1; dx <= 1; dx++) {
				for (let dy = -1; dy <= 1; dy++) {
					if (dx == 0 && dy == 0) continue;
	
					const targetX = x + dx
					const targetY = y + dy
					const targetIndex = this.#coordsToIndex(targetX, targetY)
					const targetTile = this.getTileAt(targetX, targetY)

					if (targetTile === null) continue;
					if (alreadyCoveredTiles.some((value) => value == targetIndex)) continue;
					
					if (targetTile.isEmpty()) {
						this.#floodRevealEmptyTiles(targetX, targetY, alreadyCoveredTiles)
					} else {
						if (! targetTile.revealed) {
							this.revealTileAt(targetTile.x, targetTile.y, true)
							alreadyCoveredTiles.push(targetIndex)
						}
					}
				}
			}
		}
	}
}

class Tile {
	x
	y

	hasMine
	revealed
	flagged

	parentBoard
	div
	typeImage
	flagImage

	/**
	 * 
	 * @param {number} x 
	 * @param {number} y 
	 * @param {TileBoard} parentBoard 
	 */
	constructor(x, y, parentBoard) {
		this.x = x
		this.y = y
		this.parentBoard = parentBoard

		this.revealed = false
		this.hasMine = false
		this.flagged = false

		this.div = document.createElement("div")
		this.div.style.setProperty("--x", x)
		this.div.style.setProperty("--y", y)
		this.div.setAttribute("x", x)
		this.div.setAttribute("y", y)
		this.div.classList.add("tile")

		this.typeImage = document.createElement("img")
		this.typeImage.src = "images/empty.png"
		this.typeImage.classList.add("tile-type")
		this.typeImage.ondragstart = (ev) => {ev.preventDefault()}

		this.flagImage = document.createElement("img")
		this.flagImage.src = "images/flag.png"
		this.flagImage.classList.add("tile-flag")
		this.flagImage.ondragstart = (ev) => {ev.preventDefault()}

		this.div.appendChild(this.typeImage)
		this.div.appendChild(this.flagImage)

		this.div.onclick = (ev) => {
			if (! this.revealed) {
				this.parentBoard.revealTileAt(this.x, this.y)

			} else {

				const minecount = this.countSurroundingMines()
				if (minecount == 0) return
				
				const neighbours = this.getNeighbours()
				let flagCount = 0
				neighbours.forEach((tile) => {
					if (tile.flagged && ! tile.revealed) flagCount++
				})

				if (flagCount == minecount) {
					neighbours.forEach((tile) => {
						if (! tile.flagged && ! tile.revealed) {
							this.parentBoard.revealTileAt(tile.x, tile.y)
						}
					})	
				}
			}
		}
		this.div.onauxclick = (ev) => {
			if (ev.button == 2) { // right click
				this.parentBoard.flagTileAt(this.x, this.y)
			} else if (ev.button == 1) { // middle click
				// nothing
			}

			ev.preventDefault()
		}
		this.div.oncontextmenu = (ev) => {ev.preventDefault()}
	}

	/**
	 * 
	 * @returns {Tile[]}
	 */
	getNeighbours() {
		const neighbours = []
		for (let dx = -1; dx <= 1; dx++) {
			for (let dy = -1; dy <= 1; dy++) {
				if (dx == 0 && dy == 0) continue;

				const tile = this.parentBoard.getTileAt(this.x + dx, this.y + dy)
				if (tile !== null) {
					neighbours.push(tile)
				}
			}
		}
		return neighbours
	}

	countSurroundingMines() {
		let count = 0

		for (let dx = -1; dx <= 1; dx++) {
			for (let dy = -1; dy <= 1; dy++) {
				if (dx == 0 && dy == 0) continue;

				const tile = this.parentBoard.getTileAt(this.x + dx, this.y + dy)
				if (tile !== null && tile.hasMine) {
					count++
				}
			}
		}

		return count
	}

	isEmpty() {
		const mineCount = this.countSurroundingMines()

		return mineCount <= 0 && ! this.hasMine
	}

	reveal() {
		this.revealed = true
		this.div.classList.add("revealed")
	}

	setFlagged(state = true) {
		this.flagged = state
		if (state) {
			this.div.classList.add("flagged")
		} else {
			this.div.classList.remove("flagged")
		}
	}

	delete() {
		this.flagImage.remove()
		this.typeImage.remove()
		this.div.remove()

		this.div = null
		this.typeImage = null
		this.flagImage = null
	}

	updateImage() {
		if (this.hasMine) {
			this.typeImage.src = "images/mine.png"
			return
		}

		const mineCount = this.countSurroundingMines()
		if (mineCount < 1) {
			this.typeImage.src = "images/empty.png"
			return
		}

		this.typeImage.src = `images/${mineCount}.png`
	}
}

/* values (to add somewhere later):
 * beginner     : 8x8  , 8  mines
 * intermediate : 16x16, 40 mines
 * expert       : 30x16, 99 mines
 */

const tileBoard = new TileBoard()
tileBoard.initTiles(30, 16, 99)
tileBoard.placeMines()
tileBoard.updateAllImages()

const restartBtn = document.getElementById("restart-button")
restartBtn.onclick = (ev) => {
	tileBoard.clear()
	tileBoard.initTiles(30, 16, 99)
	tileBoard.placeMines()
	tileBoard.updateAllImages()

	const restartBtnImg = document.querySelector('#restart-button img')
	if (getRandomIntInclusive(1, 10) == 1) {
		const randomFaceIndex = getRandomIntInclusive(0, extraFaces.length - 1)

		restartBtnImg.src = `images/restart-button/${extraFaces[randomFaceIndex]}`
	} else {
		restartBtnImg.src = "images/restart-button/default.png"
	}
}