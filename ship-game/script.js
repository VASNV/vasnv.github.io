document.addEventListener('DOMContentLoaded', () => {

    // ------------------------------------------------------------------
    // 1. DATA MODELS & CONFIG
    // (User templates, fleet definitions - ready for Nakama)
    // ------------------------------------------------------------------

    class User {
        constructor(id, username, rating = 1500, wins = 0, losses = 0) {
            this.id = id;
            this.username = username;
            this.rating = rating;
            this.wins = wins;
            this.losses = losses;
        }
    }

    const FLEET_TEMPLATE = [
        { name: 'carrier', length: 5 },
        { name: 'battleship', length: 4 },
        { name: 'cruiser', length: 3 },
        { name: 'submarine', length: 3 },
        { name: 'destroyer', length: 2 },
    ];

    const GRID_SIZE = 10;
    const CELL_STATE = { EMPTY: 0, SHIP: 1, HIT: 2, MISS: 3, SUNK: 4 };

    // ------------------------------------------------------------------
    // 2. API SERVICE (THE BACKEND-READY LAYER)
    // All game actions go through here. Replace local calls with
    // fetch/Nakama SDK calls when you build the backend.
    // ------------------------------------------------------------------

    const ApiService = {
        /**
         * Simulates creating a match. Later, this will call the Nakama backend.
         * @returns {Promise<object>} A new game instance.
         */
        createMatch: async () => {
            console.log("API: createMatch called");
            // LOCAL SIMULATION:
            const game = new Game();
            game.initialize();
            return game;
        },

        /**
         * Simulates making a move.
         * @param {number} x - The x-coordinate.
         * @param {number} y - The y-coordinate.
         */
        makeMove: async (x, y) => {
            console.log(`API: makeMove called for [${x}, ${y}]`);
            // LOCAL SIMULATION:
            // In a real app, this would send an opcode to Nakama.
            // The server would validate the move and return the result.
            game.handlePlayerMove(x, y);
        }
    };


    // ------------------------------------------------------------------
    // 3. CORE GAME LOGIC
    // (Classes for Grid, Player, and the main Game controller)
    // ------------------------------------------------------------------

    class Grid {
        constructor() {
            this.grid = Array(GRID_SIZE).fill(null).map(() => Array(GRID_SIZE).fill(CELL_STATE.EMPTY));
            this.ships = [];
        }

        placeShip(ship, x, y, isVertical) {
            // Simple placement logic for now
            const newShip = { ...ship, x, y, isVertical, hits: 0 };
            this.ships.push(newShip);
            for (let i = 0; i < ship.length; i++) {
                if (isVertical) this.grid[y + i][x] = CELL_STATE.SHIP;
                else this.grid[y][x + i] = CELL_STATE.SHIP;
            }
        }
        
        receiveShot(x, y) {
            const cell = this.grid[y][x];
            if (cell === CELL_STATE.SHIP) {
                this.grid[y][x] = CELL_STATE.HIT;
                const hitShip = this.ships.find(ship => {
                    if (ship.isVertical) {
                        return x === ship.x && y >= ship.y && y < ship.y + ship.length;
                    } else {
                        return y === ship.y && x >= ship.x && x < ship.x + ship.length;
                    }
                });
                hitShip.hits++;
                if(hitShip.hits === hitShip.length) return { result: CELL_STATE.SUNK, ship: hitShip };
                return { result: CELL_STATE.HIT };
            }
            this.grid[y][x] = CELL_STATE.MISS;
            return { result: CELL_STATE.MISS };
        }
    }

    class Player {
        constructor(isAI = false) {
            this.grid = new Grid();
            this.isAI = isAI;
            this.fleet = JSON.parse(JSON.stringify(FLEET_TEMPLATE));

            // AI specific properties
            this.aiMode = 'hunt'; // 'hunt' or 'target'
            this.aiTargetQueue = [];
            this.aiKnownHits = [];
        }

        placeFleet() {
            // For simplicity, using a fixed layout. A real game would have random or player-chosen layouts.
            this.grid.placeShip(this.fleet[0], 5, 5, true);  // Carrier
            this.grid.placeShip(this.fleet[1], 1, 1, false); // Battleship
            this.grid.placeShip(this.fleet[2], 8, 2, true);  // Cruiser
            this.grid.placeShip(this.fleet[3], 3, 8, false); // Submarine
            this.grid.placeShip(this.fleet[4], 0, 9, false); // Destroyer
        }
        
        generateAIMove(opponentGrid) {
            if (this.aiMode === 'target' && this.aiTargetQueue.length > 0) {
                 return this.aiTargetQueue.shift();
            }

            // Hunt mode: fire at a random, unknown cell
            let x, y;
            do {
                x = Math.floor(Math.random() * GRID_SIZE);
                y = Math.floor(Math.random() * GRID_SIZE);
            } while (opponentGrid.grid[y][x] >= CELL_STATE.HIT); // Don't fire at known spots
            return {x, y};
        }

        updateAIState(x, y, result) {
            if (result === CELL_STATE.HIT) {
                this.aiMode = 'target';
                this.aiKnownHits.push({x, y});
                // Add adjacent cells to the target queue
                const potentialTargets = [
                    {x: x, y: y-1}, {x: x, y: y+1},
                    {x: x-1, y: y}, {x: x+1, y: y}
                ].filter(p => p.x >= 0 && p.x < GRID_SIZE && p.y >= 0 && p.y < GRID_SIZE);
                this.aiTargetQueue.push(...potentialTargets);
            } else if (result === CELL_STATE.SUNK) {
                this.aiMode = 'hunt';
                this.aiTargetQueue = []; // Clear the queue
                this.aiKnownHits = [];
            }
        }
    }

    class Game {
        constructor() {
            this.player = null;
            this.opponent = null;
            this.isPlayerTurn = true;
            this.gameOver = false;
        }

        initialize() {
            this.player = new Player();
            this.opponent = new Player(true);
            this.player.placeFleet();
            this.opponent.placeFleet();
            this.isPlayerTurn = true;
            this.gameOver = false;
        }

        handlePlayerMove(x, y) {
            if (!this.isPlayerTurn || this.gameOver) return;
            
            const shotResult = this.opponent.grid.receiveShot(x, y);
            renderShotResult('opponent', x, y, shotResult.result);

            if (shotResult.result === CELL_STATE.SUNK) {
                 updateStatus(`You sunk their ${shotResult.ship.name}!`);
                 if(this.checkWinCondition()) return;
            }
            
            this.isPlayerTurn = false;
            this.nextTurn();
        }
        
        nextTurn() {
            if(this.gameOver) return;

            if (!this.isPlayerTurn) {
                updateStatus("Opponent is thinking...");
                setTimeout(() => {
                    const move = this.opponent.generateAIMove(this.player.grid);
                    const shotResult = this.player.grid.receiveShot(move.x, move.y);
                    this.opponent.updateAIState(move.x, move.y, shotResult.result);
                    renderShotResult('player', move.x, move.y, shotResult.result);
                    
                    if (shotResult.result === CELL_STATE.SUNK) {
                         updateStatus(`They sunk your ${shotResult.ship.name}!`);
                         if(this.checkWinCondition()) return;
                    }

                    this.isPlayerTurn = true;
                    if(!this.gameOver) updateStatus("Your turn, Captain.");
                }, 1000);
            }
        }

        checkWinCondition() {
            const opponentShipsSunk = this.opponent.grid.ships.every(s => s.hits === s.length);
            if (opponentShipsSunk) {
                updateStatus("VICTORY! You have defeated the enemy fleet!");
                this.gameOver = true;
                return true;
            }
            const playerShipsSunk = this.player.grid.ships.every(s => s.hits === s.length);
            if(playerShipsSunk) {
                updateStatus("DEFEAT! Your fleet has been destroyed.");
                this.gameOver = true;
                return true;
            }
            return false;
        }
    }

    // ------------------------------------------------------------------
    // 4. DOM & RENDERING
    // (Functions to draw the grid, ships, and handle UI updates)
    // ------------------------------------------------------------------
    const playerGridEl = document.getElementById('player-grid');
    const opponentGridEl = document.getElementById('opponent-grid');
    const statusEl = document.getElementById('game-status');
    const startBtn = document.getElementById('start-game-btn');

    function renderGrid(element, player) {
        element.innerHTML = '';
        for (let y = 0; y < GRID_SIZE; y++) {
            for (let x = 0; x < GRID_SIZE; x++) {
                const cell = document.createElement('div');
                cell.className = 'cell';
                cell.dataset.x = x;
                cell.dataset.y = y;
                element.appendChild(cell);
            }
        }
        if (player) renderFleet(element, player);
    }
    
    function renderFleet(gridElement, player) {
        player.grid.ships.forEach(ship => {
            const shipEl = document.createElement('div');
            shipEl.className = `ship ${ship.name} ${ship.isVertical ? 'vertical' : 'horizontal'}`;
            shipEl.style.left = `calc(var(--cell-size) * ${ship.x})`;
            shipEl.style.top = `calc(var(--cell-size) * ${ship.y})`;
            gridElement.appendChild(shipEl);
        });
    }

    function renderShotResult(gridType, x, y, result) {
        const gridEl = gridType === 'player' ? playerGridEl : opponentGridEl;
        const cell = gridEl.querySelector(`[data-x='${x}'][data-y='${y}']`);
        const marker = document.createElement('div');
        marker.className = 'marker';
        if(result === CELL_STATE.HIT || result === CELL_STATE.SUNK) {
            marker.classList.add('hit');
        } else {
            marker.classList.add('miss');
        }
        cell.appendChild(marker);
    }

    function updateStatus(message) {
        statusEl.textContent = message;
    }

    function setupEventListeners() {
        opponentGridEl.addEventListener('click', (e) => {
            if (e.target.classList.contains('cell')) {
                const x = parseInt(e.target.dataset.x);
                const y = parseInt(e.target.dataset.y);
                ApiService.makeMove(x, y);
            }
        });
        startBtn.addEventListener('click', () => main());
    }

    // ------------------------------------------------------------------
    // 5. MAIN EXECUTION
    // ------------------------------------------------------------------
    let game;

    async function main() {
        updateStatus("Creating a new match...");
        startBtn.disabled = true;

        game = await ApiService.createMatch();

        renderGrid(playerGridEl, game.player);
        renderGrid(opponentGridEl); // Opponent's fleet is hidden

        updateStatus("Your turn, Captain. Fire at will!");
    }

    // Initial setup
    renderGrid(playerGridEl);
    renderGrid(opponentGridEl);
    updateStatus("Welcome! Press Start Game to begin.");
    startBtn.disabled = false;
    setupEventListeners();

});
