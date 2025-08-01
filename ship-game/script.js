// --- GLOBAL APP NAMESPACE ---
const App = {};

// --- CONFIG & CONSTANTS ---
App.config = {
    GRID_SIZE: 12,
    FLEET_TEMPLATE: [
        { name: 'carrier', length: 5 },
        { name: 'battleship', length: 4 },
        { name: 'cruiser', length: 3 },
        { name: 'submarine', length: 3 },
        { name: 'destroyer', length: 2 },
    ]
};

// --- API SERVICE (BACKEND-READY MOCK) ---
App.ApiService = {
    async login(username) {
        console.log(`API: Logging in ${username}...`);
        return new Promise(resolve => setTimeout(() => {
            resolve({ success: true, user: { id: 'user-123', username, rating: 1520, gold: 5000, gems: 250 } });
        }, 200));
    },
    async findMatch() {
        console.log("API: Finding match...");
        return new Promise(resolve => setTimeout(() => {
            resolve({ success: true, match: { id: `match_${Math.random().toString(36).substr(2, 9)}`, opponent: { username: 'AI_Admiral', rating: 1500 } } });
        }, 500));
    },
    async placeFleet(matchId, fleet) {
        console.log("API: Player fleet placed for match", matchId);
        return new Promise(resolve => setTimeout(() => {
            resolve({ success: true });
        }, 200));
    },
    async fireShot(matchId, x, y) {
        const result = App.Game.opponent.grid.receiveShot(x, y);
        return new Promise(resolve => setTimeout(() => resolve({ success: true, ...result }), 100));
    },
    async getMatchHistory() {
        return new Promise(resolve => setTimeout(() => {
            resolve({ success: true, history: [ { id: 'match_abc123', opponent: 'AI_Cruiser', result: 'Victory' }, { id: 'match_def456', opponent: 'AI_Destroyer', result: 'Victory' }, { id: 'match_ghi789', opponent: 'AI_Admiral', result: 'Defeat' } ]});
        }, 300));
    },
    async getStoreItems() {
        return new Promise(resolve => setTimeout(() => {
            resolve({ success: true, items: [ { id: 'skin_01', name: 'Holographic Skin', type: 'ship_skin', price: 500, currency: 'gold' }, { id: 'skin_02', name: 'Gilded Fleet Skin', type: 'ship_skin', price: 100, currency: 'gems' } ]});
        }, 300));
    }
};

// --- UI RENDERER & EVENT HANDLER ---
App.UI = {
    init() {
        this.cacheDOM();
        this.bindEvents();
        this.setupGridLabels();
    },
    cacheDOM() {
        this.playerGrid = document.getElementById('player-grid');
        this.opponentGrid = document.getElementById('opponent-grid');
        this.statusEl = document.getElementById('game-status');
        this.playerUsernameEl = document.getElementById('player-username');
        this.playerGoldEl = document.getElementById('player-gold');
        this.playerGemsEl = document.getElementById('player-gems');
        this.opponentUsernameEl = document.getElementById('opponent-username');
        this.opponentRatingEl = document.getElementById('opponent-rating');
        this.matchIdEl = document.getElementById('match-id');
        this.gameOverModal = document.getElementById('game-over-modal');
        this.matchHistoryModal = document.getElementById('match-history-modal');
        this.storeModal = document.getElementById('store-modal');
        this.deployBtn = document.getElementById('deploy-btn');
    },
    bindEvents() {
        this.playerGrid.addEventListener('click', e => App.GameController.onPlayerGridClick(e.target));
        this.playerGrid.addEventListener('mouseover', e => App.GameController.onPlayerGridHover(e.target));
        this.playerGrid.addEventListener('mouseout', () => App.GameController.onPlayerGridMouseOut());
        this.playerGrid.addEventListener('contextmenu', e => { e.preventDefault(); App.GameController.onPlacementRotate(); });
        this.opponentGrid.addEventListener('click', e => App.GameController.onOpponentGridClick(e.target));
        this.deployBtn.addEventListener('click', () => App.GameController.enterBattleState());
        document.getElementById('play-again-btn').addEventListener('click', () => App.GameController.start());
        document.getElementById('view-history-btn').addEventListener('click', () => this.showModal('match-history-modal', true));
        document.getElementById('history-btn').addEventListener('click', () => this.showModal('match-history-modal', true));
        document.getElementById('store-btn').addEventListener('click', () => this.showModal('store-modal', true));
        document.querySelectorAll('.modal-close-btn').forEach(btn => btn.addEventListener('click', () => this.showModal(btn.dataset.modal, false)));
    },
    setupGridLabels() {
        const topLabels = document.querySelectorAll('.grid-labels-top');
        const leftLabels = document.querySelectorAll('.grid-labels-left');
        let topHTML = '';
        for (let i = 0; i < App.config.GRID_SIZE; i++) {
            topHTML += `<span>${String.fromCharCode(65 + i)}</span>`;
        }
        let leftHTML = '';
        for (let i = 1; i <= App.config.GRID_SIZE; i++) {
            leftHTML += `<span>${i}</span>`;
        }
        topLabels.forEach(el => el.innerHTML = topHTML);
        leftLabels.forEach(el => el.innerHTML = leftHTML);
    },
    drawGrid(element) { /* Unchanged */ },
    drawShip(gridEl, ship) { /* Unchanged */ },
    async animateProjectile(fromGrid, toGrid, toX, toY) { /* Unchanged */ },
    renderShot(gridEl, x, y, result) { /* Unchanged */ },
    updatePlayerInfo(user, opponent) { /* Unchanged */ },
    updateMatchInfo(id) { /* Unchanged */ },
    updateStatus(text) { /* Unchanged */ },
    toggleActivePlayer(isPlayerTurn) { /* Unchanged */ },
    async showModal(modalId, show) { /* Unchanged */ },
    async renderMatchHistory() { /* Unchanged */ },
    async renderStoreItems() { /* Unchanged */ },
    showGameOver(isVictory) { /* Unchanged */ }
};

// --- CORE GAME MODELS ---
App.Models = {
    Grid: class {
        constructor() {
            this.grid = Array(App.config.GRID_SIZE).fill(null).map(() => Array(App.config.GRID_SIZE).fill(null));
            this.ships = [];
        }
        addShip(ship) {
            this.ships.push(ship);
            for (let i = 0; i < ship.length; i++) {
                const x = ship.isVertical ? ship.x : ship.x + i;
                const y = ship.isVertical ? ship.y + i : ship.y;
                this.grid[y][x] = ship;
            }
        }
        canPlace(length, x, y, isVertical) {
            if (isVertical) {
                if (y + length > App.config.GRID_SIZE) return false;
                for (let i = 0; i < length; i++) if (this.grid[y + i][x]) return false;
            } else {
                if (x + length > App.config.GRID_SIZE) return false;
                for (let i = 0; i < length; i++) if (this.grid[y][x + i]) return false;
            }
            return true;
        }
        receiveShot(x, y) {
            const target = this.grid[y][x];
            if (target && typeof target === 'object') {
                target.hits = (target.hits || 0) + 1;
                this.grid[y][x] = 'hit';
                if (target.hits >= target.length) {
                    return { result: 'sunk', shipName: target.name };
                }
                return { result: 'hit' };
            }
            if (target !== 'hit') {
                this.grid[y][x] = 'miss';
                return { result: 'miss' };
            }
            return { result: 'miss' }; // Already hit
        }
    },
    Player: class {
        constructor(isAI = false) {
            this.grid = new App.Models.Grid();
            this.isAI = isAI;
            // AI-specific state
            this.aiTargetMode = false;
            this.aiHitQueue = [];
            this.aiKnownHits = [];
        }
    }
};

// --- GAME CONTROLLER ---
App.GameController = {
    state: {},
    async init() {
        App.UI.init();
        const username = localStorage.getItem('loggedInUser');
        if (!username) { window.location.href = 'login.html'; return; }
        const { user } = await App.ApiService.login(username);
        this.state.currentUser = user;
        App.UI.updatePlayerInfo(user);
        this.start();
    },
    async start() {
        App.UI.showModal('game-over-modal', false);
        this.state.gameState = 'MATCHING';
        App.UI.updateStatus("Searching for an opponent...");
        const { match } = await App.ApiService.findMatch();
        this.state.match = match;
        this.state.player = new App.Models.Player();
        this.state.opponent = new App.Models.Player(true);
        App.UI.updatePlayerInfo(this.state.currentUser, match.opponent);
        App.UI.updateMatchInfo(match.id);
        this.enterPlacementState();
    },
    enterPlacementState() {
        this.state.gameState = 'PLACEMENT';
        this.state.placement = { fleetIndex: 0, isVertical: false, previewShip: null };
        App.UI.drawGrid(App.UI.playerGrid);
        App.UI.drawGrid(App.UI.opponentGrid);
        App.UI.playerGrid.classList.add('placement-mode');
        App.UI.deployBtn.classList.add('hidden');
        this.updatePlacementStatus();
    },
    updatePlacementStatus() {
        if (this.state.gameState !== 'PLACEMENT') return;
        const ship = App.config.FLEET_TEMPLATE[this.state.placement.fleetIndex];
        App.UI.updateStatus(`Place your ${ship.name}. Right-click to rotate.`);
    },
    async onPlayerGridClick(cell) {
        if (this.state.gameState !== 'PLACEMENT' || !cell.classList.contains('cell')) return;
        const x = parseInt(cell.dataset.x);
        const y = parseInt(cell.dataset.y);
        const shipInfo = App.config.FLEET_TEMPLATE[this.state.placement.fleetIndex];
        
        if (this.state.player.grid.canPlace(shipInfo.length, x, y, this.state.placement.isVertical)) {
            const newShip = { ...shipInfo, x, y, isVertical: this.state.placement.isVertical, hits: 0 };
            this.state.player.grid.addShip(newShip);
            App.UI.drawShip(App.UI.playerGrid, newShip);
            
            this.state.placement.fleetIndex++;
            if (this.state.placement.fleetIndex >= App.config.FLEET_TEMPLATE.length) {
                this.enterDeployState();
            } else {
                this.updatePlacementStatus();
            }
        }
    },
    onPlayerGridHover(cell) {
        if (this.state.gameState !== 'PLACEMENT' || !cell.classList.contains('cell')) return;
        if (this.state.placement.previewShip) this.state.placement.previewShip.remove();
        
        const shipInfo = App.config.FLEET_TEMPLATE[this.state.placement.fleetIndex];
        const shipEl = App.UI.drawShip(cell, { ...shipInfo, x: 0, y: 0, isVertical: this.state.placement.isVertical });
        shipEl.classList.add('ship-preview');
        shipEl.style.opacity = '0.5';
        
        const x = parseInt(cell.dataset.x);
        const y = parseInt(cell.dataset.y);
        if (!this.state.player.grid.canPlace(shipInfo.length, x, y, this.state.placement.isVertical)) {
            shipEl.style.background = 'rgba(255, 0, 0, 0.5)';
        }
        
        this.state.placement.previewShip = shipEl;
    },
    onPlayerGridMouseOut() {
        if (this.state.placement.previewShip) {
            this.state.placement.previewShip.remove();
            this.state.placement.previewShip = null;
        }
    },
    onPlacementRotate() {
        if (this.state.gameState !== 'PLACEMENT') return;
        this.state.placement.isVertical = !this.state.placement.isVertical;
        this.onPlayerGridMouseOut();
    },
    enterDeployState() {
        this.state.gameState = 'DEPLOY';
        App.UI.updateStatus("Fleet positioned. Ready to engage!");
        App.UI.deployBtn.classList.remove('hidden');
        App.UI.playerGrid.classList.remove('placement-mode');
        this.onPlayerGridMouseOut();
    },
    async enterBattleState() {
        this.state.gameState = 'BATTLE';
        App.UI.deployBtn.classList.add('hidden');
        App.UI.updateStatus("Deploying fleet to combat zone...");
        await App.ApiService.placeFleet(this.state.match.id, this.state.player.grid.ships);
        this.state.opponent.grid = new App.Models.Grid(); // Reset AI grid
        const opponentFleetLayout = App.ApiService.generateAIFleetLayout(); // Simulate getting layout from server
        opponentFleetLayout.forEach(ship => this.state.opponent.grid.addShip(ship));
        
        this.state.isPlayerTurn = true;
        App.UI.toggleActivePlayer(true);
        App.UI.updateStatus("Battle commencing! Your turn.");
    },
    async onOpponentGridClick(cell) {
        if (this.state.gameState !== 'BATTLE' || !this.state.isPlayerTurn || !cell.classList.contains('cell') || cell.classList.contains('locked')) return;
        
        this.state.isPlayerTurn = false;
        App.UI.toggleActivePlayer(false);
        const x = parseInt(cell.dataset.x);
        const y = parseInt(cell.dataset.y);

        await App.UI.animateProjectile(App.UI.playerGrid, App.UI.opponentGrid, x, y);
        const { result, shipName } = await App.ApiService.fireShot(this.state.match.id, x, y);
        App.UI.renderShot(App.UI.opponentGrid, x, y, result);
        
        if (result === 'sunk') {
            App.UI.updateStatus(`You sunk their ${shipName}!`);
            const sunkShipEl = App.UI.drawShip(App.UI.opponentGrid, this.state.opponent.grid.ships.find(s => s.name === shipName));
            sunkShipEl.classList.add('sunk');
            if (this.state.opponent.grid.ships.every(s => s.hits >= s.length)) {
                this.endGame(true); return;
            }
        }
        if (this.state.gameState === 'BATTLE') this.triggerAITurn();
    },
    triggerAITurn() {
        App.UI.updateStatus("Opponent is taking aim...");
        setTimeout(async () => {
            if (this.state.gameState !== 'BATTLE') return;
            const {x, y} = this.getAIMove();
            await App.UI.animateProjectile(App.UI.opponentGrid, App.UI.playerGrid, x, y);
            const result = this.state.player.grid.receiveShot(x, y);
            this.updateAIState(x, y, result.result);
            App.UI.renderShot(App.UI.playerGrid, x, y, result.result);

            if (result.result === 'sunk') {
                const shipEl = App.UI.playerGrid.querySelector(`[data-ship-name='${result.shipName}']`);
                if(shipEl) shipEl.classList.add('sunk');
                if (this.state.player.grid.ships.every(s => s.hits >= s.length)) {
                    this.endGame(false); return;
                }
            }

            this.state.isPlayerTurn = true;
            App.UI.toggleActivePlayer(true);
            App.UI.updateStatus("Your turn, Captain.");
        }, 1500);
    },
    getAIMove() {
        const ai = this.state.opponent;
        // Target Mode: Fire from the queue
        while(ai.aiHitQueue.length > 0) {
            const target = ai.aiHitQueue.shift();
            if (this.state.player.grid.grid[target.y][target.x] !== 'hit' && this.state.player.grid.grid[target.y][target.x] !== 'miss') {
                return target;
            }
        }
        // Hunt Mode: Fire at random
        ai.aiTargetMode = false;
        ai.aiKnownHits = [];
        let x, y;
        do {
            x = Math.floor(Math.random() * App.config.GRID_SIZE);
            y = Math.floor(Math.random() * App.config.GRID_SIZE);
        } while (this.state.player.grid.grid[y][x] === 'hit' || this.state.player.grid.grid[y][x] === 'miss');
        return {x, y};
    },
    updateAIState(x, y, result) {
        const ai = this.state.opponent;
        if (result === 'hit') {
            ai.aiTargetMode = true;
            ai.aiKnownHits.push({x,y});
            // Add adjacent cells to queue
            [{x:x, y:y-1}, {x:x, y:y+1}, {x:x-1, y:y}, {x:x+1, y:y}].forEach(p => {
                if(p.x >= 0 && p.x < App.config.GRID_SIZE && p.y >= 0 && p.y < App.config.GRID_SIZE) {
                    ai.aiHitQueue.push(p);
                }
            });
        } else if (result === 'sunk') {
            ai.aiTargetMode = false;
            ai.aiHitQueue = [];
            ai.aiKnownHits = [];
        }
    },
    endGame(playerWon) {
        this.state.gameState = 'GAMEOVER';
        App.UI.updateStatus(playerWon ? "VICTORY!" : "DEFEAT!");
        App.UI.showGameOver(playerWon);
    }
};

// --- KICKSTART THE APPLICATION ---
document.addEventListener('DOMContentLoaded', () => App.GameController.init());
