document.addEventListener('DOMContentLoaded', () => {

    // --- DOM Elements ---
    const coin = document.getElementById('coin');
    const balanceDisplay = document.getElementById('balance-display');
    const perClickStat = document.getElementById('per-click-stat');
    const perSecondStat = document.getElementById('per-second-stat');
    const shopContainer = document.getElementById('shop');
    const notification = document.getElementById('notification');

    // --- Game State ---
    let gameState = {
        balance: 0,
        perClick: 1,
        perSecond: 0,
        upgrades: {}
    };

    // --- Shop Definition ---
    const shopItems = {
        'click_power': {
            name: 'Quantum Tap',
            description: 'Increases value per tap.',
            baseCost: 10,
            baseValue: 1,
            type: 'perClick'
        },
        'auto_miner_1': {
            name: 'Neutrino Collector',
            description: 'Passively generates Q/sec.',
            baseCost: 50,
            baseValue: 1,
            type: 'perSecond'
        },
        'click_power_2': {
            name: 'Boson Amplifier',
            description: 'Greatly increases value per tap.',
            baseCost: 500,
            baseValue: 10,
            type: 'perClick'
        },
        'auto_miner_2': {
            name: 'Dark Matter Harvester',
            description: 'Passively generates more Q/sec.',
            baseCost: 1000,
            baseValue: 5,
            type: 'perSecond'
        }
    };

    // --- Core Game Functions ---
    function handleCoinClick(event) {
        gameState.balance += gameState.perClick;
        updateBalanceDisplay();
        createFloatingText(event.clientX, event.clientY);
    }
    
    function passiveIncome() {
        gameState.balance += gameState.perSecond;
        updateBalanceDisplay();
    }

    // --- UI Update Functions ---
    function updateBalanceDisplay() {
        balanceDisplay.textContent = Math.floor(gameState.balance).toLocaleString();
    }
    
    function updateStatsDisplay() {
        perClickStat.textContent = gameState.perClick.toLocaleString();
        perSecondStat.textContent = gameState.perSecond.toLocaleString();
    }
    
    function createFloatingText(x, y) {
        const text = document.createElement('div');
        text.className = 'floating-text';
        text.textContent = `+${gameState.perClick}`;
        document.body.appendChild(text);

        const rect = coin.getBoundingClientRect();
        text.style.left = `${rect.left + rect.width / 2}px`;
        text.style.top = `${rect.top + rect.height / 2}px`;
        
        text.addEventListener('animationend', () => {
            text.remove();
        });
    }

    function renderShop() {
        shopContainer.innerHTML = '';
        for (const id in shopItems) {
            const item = shopItems[id];
            const level = gameState.upgrades[id] || 0;
            const cost = calculateCost(item.baseCost, level);

            const itemElement = document.createElement('div');
            itemElement.className = 'shop-item';
            itemElement.innerHTML = `
                <div class="item-info">
                    <h3>${item.name}</h3>
                    <p>${item.description}</p>
                    <span class="item-level">Level: ${level}</span>
                </div>
                <button class="buy-button" data-id="${id}" ${gameState.balance < cost ? 'disabled' : ''}>
                    Buy
                    <span class="item-cost">${cost.toLocaleString()} Q</span>
                </button>
            `;
            shopContainer.appendChild(itemElement);
        }
    }

    function buyItem(id) {
        const item = shopItems[id];
        const level = gameState.upgrades[id] || 0;
        const cost = calculateCost(item.baseCost, level);
        
        if (gameState.balance >= cost) {
            gameState.balance -= cost;
            gameState.upgrades[id] = (gameState.upgrades[id] || 0) + 1;
            
            if(item.type === 'perClick') {
                gameState.perClick += item.baseValue;
            } else if (item.type === 'perSecond') {
                gameState.perSecond += item.baseValue;
            }
            
            updateBalanceDisplay();
            updateStatsDisplay();
            renderShop();
        } else {
            showNotification('Not enough Q!', 'error');
        }
    }

    function calculateCost(base, level) {
        return Math.floor(base * Math.pow(1.15, level));
    }

    function showNotification(message, type) {
        notification.textContent = message;
        notification.className = `notification ${type} show`;
        setTimeout(() => {
            notification.classList.remove('show');
        }, 2000);
    }


    // --- Data Persistence ---
    function saveGame() {
        try {
            localStorage.setItem('quantumTapperSave', JSON.stringify(gameState));
        } catch (e) {
            console.error("Could not save game state:", e);
        }
    }

    function loadGame() {
        try {
            const savedState = localStorage.getItem('quantumTapperSave');
            if (savedState) {
                const loadedState = JSON.parse(savedState);
                // Merge loaded state with default to prevent issues with new updates
                gameState = {...gameState, ...loadedState};
            }
        } catch (e) {
            console.error("Could not load game state:", e);
        }
    }
    
    // --- Event Listeners ---
    coin.addEventListener('click', handleCoinClick);
    
    shopContainer.addEventListener('click', (event) => {
        if (event.target.classList.contains('buy-button')) {
            buyItem(event.target.dataset.id);
        }
    });

    // --- Game Initialization ---
    function init() {
        loadGame();
        updateBalanceDisplay();
        updateStatsDisplay();
        renderShop();
        setInterval(passiveIncome, 1000);
        setInterval(saveGame, 5000); // Save game every 5 seconds
    }
    
    init();
});
