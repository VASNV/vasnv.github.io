// --- GLOBAL APP NAMESPACE & CONFIG ---
const App = {
    config: {
        GRID_SIZE: 10,
        FLEET_TEMPLATE: [
            { name: 'carrier', length: 5 },
            { name: 'battleship', length: 4 },
            { name: 'cruiser', length: 3 },
            { name: 'submarine', length: 3 },
            { name: 'destroyer', length: 2 },
        ]
    }
};

// --- UI RENDERER & EVENT HANDLER ---
App.UI = {
    init() {
        this.cacheDOM();
        this.bindEvents();
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
    },
    bindEvents() {
        this.playerGrid.addEventListener('click', e => App.GameController.onPlayerGridClick(e.target));
        this.playerGrid.addEventListener('mouseover', e => App.GameController.onPlayerGridHover(e.target));
        this.playerGrid.addEventListener('mouseout', () => App.GameController.onPlayerGridMouseOut());
        this.playerGrid.addEventListener('contextmenu', e => { e.preventDefault(); App.GameController.onPlacementRotate(); });
        this.opponentGrid.addEventListener('click', e => App.GameController.onOpponentGridClick(e.target));
        document.getElementById('play-again-btn').addEventListener('click', () => App.GameController.start());
        document.getElementById('view-history-btn').addEventListener('click', () => this.showModal('match-history-modal', true));
        document.getElementById('history-btn').addEventListener('click', () => this.showModal('match-history-modal', true));
        document.getElementById('store-btn').addEventListener('click', () => this.showModal('store-modal', true));
        document.querySelectorAll('.modal-close-btn').forEach(btn => btn.addEventListener('click', () => this.showModal(btn.dataset.modal, false)));
    },
    drawGrid(element) {
        element.innerHTML = '';
        for (let y = 0; y < App.config.GRID_SIZE; y++) {
            for (let x = 0; x < App.config.GRID_SIZE; x++) {
                const cell = document.createElement('div');
                cell.className = 'cell';
                cell.dataset.x = x;
                cell.dataset.y = y;
                element.appendChild(cell);
            }
        }
    },
    drawShip(gridEl, ship) {
        const shipEl = document.createElement('div');
        shipEl.className = `ship ${ship.name} ${ship.isVertical ? 'vertical' : ''}`;
        shipEl.style.left = `calc(var(--cell-size) * ${ship.x})`;
        shipEl.style.top = `calc(var(--cell-size) * ${ship.y})`;
        shipEl.dataset.shipName = ship.name;
        gridEl.appendChild(shipEl);
        return shipEl;
    },
    renderShot(gridEl, x, y, result) {
        const cell = gridEl.querySelector(`[data-x='${x}'][data-y='${y}']`);
        cell.classList.add('locked');
        cell.classList.add('cell-effect-hit');
        setTimeout(() => cell.classList.remove('cell-effect-hit'), 500);
        const marker = document.createElement('div');
        marker.className = `marker ${result}`;
        cell.appendChild(marker);
    },
    updatePlayerInfo(user, opponent) {
        this.playerUsernameEl.textContent = user.username;
        this.playerGoldEl.textContent = user.gold;
        this.playerGemsEl.textContent = user.gems;
        if (opponent) {
            this.opponentUsernameEl.textContent = opponent.username;
            this.opponentRatingEl.textContent = `Rating: ${opponent.rating}`;
        }
    },
    updateMatchInfo(id) { this.matchIdEl.textContent = `Match ID: ${id}`; },
    updateStatus(text) { this.statusEl.textContent = text; },
    showModal(modalId, show) {
        const modal = document.getElementById(modalId);
        if (show) {
            if (modalId === 'match-history-modal') this.renderMatchHistory();
            if (modalId === 'store-modal') this.renderStoreItems();
            modal.classList.add('visible');
        } else {
            modal.classList.remove('visible');
        }
    },
    renderMatchHistory() {
        const testHistory = [
            { id: 'match_abc123', opponent: 'AI_Cruiser', result: 'Victory' },
            { id: 'match_ghi789', opponent: 'AI_Admiral', result: 'Defeat' },
        ];
        document.getElementById('history-list').innerHTML = testHistory.map(item => `
            <div class="history-item">
                <span>vs ${item.opponent}</span>
                <span class="result-${item.result}">${item.result}</span>
                <code>${item.id}</code>
            </div>
        `).join('');
    },
    renderStoreItems() {
        const testItems = [
            { id: 'skin_01', name: 'Holographic Skin', type: 'ship_skin', price: 500, currency: 'gold' },
            { id: 'skin_02', name: 'Gilded Fleet Skin', type: 'ship_skin', price: 100, currency: 'gems' },
        ];
        const itemsEl = document.getElementById('store-items');
        itemsEl.innerHTML = testItems.map(item => `
            <div class="store-item" data-item-id="${item.id}">
                <span>${item.name}</span>
                <div>
                    <span>${item.price} ${item.currency === 'gold' ? '🪙' : '💎'}</span>
                    <button class="cta-button secondary">Purchase</button>
                </div>
            </div>
        `).join('');
        itemsEl.querySelectorAll('.store-item button').forEach(button => {
            button.addEventListener('click', (e) => {
                const itemId = e.target.closest('.store-item').dataset.itemId;
                alert(`Transaction initiated for item: ${itemId}.`);
            });
        });
    },
    showGameOver(isVictory) {
        document.getElementById('game-over-title').textContent = isVictory ? "VICTORY" : "DEFEAT";
        document.getElementById('game-over-message').textContent = isVictory ? "You have destroyed the enemy fleet!" : "Your entire fleet has been sunk.";
        this.showModal('game-over-modal', true);
    }
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
            return { result: 'miss' };
        }
    },
    Player: class {
        constructor(isAI = false) {
            this.grid = new App.Models.Grid();
            this.isAI = isAI;
            this.aiTargetMode = false;
            this.aiHitQueue = [];
        }
    }
};

// --- GAME CONTROLLER ---
App.GameController = {
    state: {},
    init() {
        App.UI.init();
        const username = sessionStorage.getItem('loggedInUser');
        if (!username) { window.location.href = 'login.html'; return; }
        
        this.state.currentUser = { username, rating: 1520, gold: 5000, gems: 250 };
        App.UI.updatePlayerInfo(this.state.currentUser);
        this.start();
    },
    start() {
        App.UI.showModal('game-over-modal', false);
        this.state.gameState = 'MATCHING';
        App.UI.updateStatus("Searching for an opponent...");
        
        setTimeout(() => {
            this.state.match = { id: `match_${Math.random().toString(36).substr(2, 9)}`, opponent: { username: 'AI_Admiral', rating: 1500 } };
            this.state.player = new App.Models.Player();
            this.state.opponent = new App.Models.Player(true);
            App.UI.updatePlayerInfo(this.state.currentUser, this.state.match.opponent);
            App.UI.updateMatchInfo(this.state.match.id);
            this.enterPlacementState();
        }, 500);
    },
    enterPlacementState() {
        this.state.gameState = 'PLACEMENT';
        this.state.placement = { fleetIndex: 0, isVertical: false, previewShip: null };
        App.UI.drawGrid(App.UI.playerGrid);
        App.UI.drawGrid(App.UI.opponentGrid);
        App.UI.playerGrid.classList.add('placement-mode');
        this.updatePlacementStatus();
    },
    updatePlacementStatus() {
        if (this.state.gameState !== 'PLACEMENT') return;
        const ship = App.config.FLEET_TEMPLATE[this.state.placement.fleetIndex];
        App.UI.updateStatus(`Place your ${ship.name}. Right-click to rotate.`);
    },
    onPlayerGridClick(cell) {
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
                this.enterBattleState();
            } else {
                this.updatePlacementStatus();
            }
        }
    },
    onPlayerGridHover(cell) {
        if (this.state.gameState !== 'PLACEMENT' || !cell.classList.contains('cell') || !App.config.FLEET_TEMPLATE[this.state.placement.fleetIndex]) return;
        if (this.state.placement.previewShip) this.state.placement.previewShip.remove();
        
        const shipInfo = App.config.FLEET_TEMPLATE[this.state.placement.fleetIndex];
        const x = parseInt(cell.dataset.x);
        const y = parseInt(cell.dataset.y);
        const shipEl = App.UI.drawShip(App.UI.playerGrid, { ...shipInfo, x, y, isVertical: this.state.placement.isVertical });
        shipEl.classList.add('ship-preview');
        shipEl.style.opacity = '0.5';
        
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
    enterBattleState() {
        this.state.gameState = 'BATTLE';
        App.UI.playerGrid.classList.remove('placement-mode');
        this.onPlayerGridMouseOut();
        App.UI.updateStatus("Deploying fleet to combat zone...");
        
        this.state.opponent.grid = new App.Models.Grid();
        const opponentFleetLayout = this.generateAIFleetLayout();
        opponentFleetLayout.forEach(ship => this.state.opponent.grid.addShip(ship));
        
        this.state.isPlayerTurn = true;
        App.UI.updateStatus("Battle commencing! Your turn.");
    },
    async onOpponentGridClick(cell) {
        if (this.state.gameState !== 'BATTLE' || !this.state.isPlayerTurn || !cell.classList.contains('cell') || cell.classList.contains('locked')) return;
        
        this.state.isPlayerTurn = false;
        const x = parseInt(cell.dataset.x);
        const y = parseInt(cell.dataset.y);

        const result = this.state.opponent.grid.receiveShot(x, y);
        App.UI.renderShot(App.UI.opponentGrid, x, y, result.result);
        
        if (result.result === 'sunk') {
            App.UI.updateStatus(`You sunk their ${result.shipName}!`);
            if (this.state.opponent.grid.ships.every(s => s.hits >= s.length)) {
                this.endGame(true); return;
            }
        }
        if (this.state.gameState === 'BATTLE') this.triggerAITurn();
    },
    triggerAITurn() {
        App.UI.updateStatus("Opponent is taking aim...");
        setTimeout(() => {
            if (this.state.gameState !== 'BATTLE') return;
            const {x, y} = this.getAIMove();
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
            App.UI.updateStatus("Your turn, Captain.");
        }, 1200);
    },
    getAIMove() {
        const ai = this.state.opponent;
        while(ai.aiHitQueue.length > 0) {
            const target = ai.aiHitQueue.shift();
            const cellState = this.state.player.grid.grid[target.y][target.x];
            if (cellState !== 'hit' && cellState !== 'miss') {
                return target;
            }
        }
        ai.aiTargetMode = false;
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
            [{x:x, y:y-1}, {x:x, y:y+1}, {x:x-1, y:y}, {x:x+1, y:y}].forEach(p => {
                if(p.x >= 0 && p.x < App.config.GRID_SIZE && p.y >= 0 && p.y < App.config.GRID_SIZE) {
                    ai.aiHitQueue.push(p);
                }
            });
        } else if (result === 'sunk') {
            ai.aiTargetMode = false;
            ai.aiHitQueue = [];
        }
    },
    endGame(playerWon) {
        this.state.gameState = 'GAMEOVER';
        App.UI.updateStatus(playerWon ? "VICTORY!" : "DEFEAT!");
        App.UI.showGameOver(playerWon);
    },
    generateAIFleetLayout() {
        const fleet = [];
        const grid = new App.Models.Grid();
        App.config.FLEET_TEMPLATE.forEach(shipInfo => {
            let placed = false;
            while (!placed) {
                const x = Math.floor(Math.random() * App.config.GRID_SIZE);
                const y = Math.floor(Math.random() * App.config.GRID_SIZE);
                const isVertical = Math.random() < 0.5;
                if (grid.canPlace(shipInfo.length, x, y, isVertical)) {
                    const newShip = { ...shipInfo, x, y, isVertical, hits: 0 };
                    grid.addShip(newShip);
                    fleet.push(newShip);
                    placed = true;
                }
            }
        });
        return fleet;
    }
};

// --- KICKSTART THE APPLICATION ---
document.addEventListener('DOMContentLoaded', () => App.GameController.init());
