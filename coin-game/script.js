document.addEventListener('DOMContentLoaded', () => {

    // --- DOM Elements ---
    const gameContainer = document.getElementById('game-container');
    const balanceDisplay = document.getElementById('balance-display');
    const perClickStat = document.getElementById('per-click-stat');
    const perSecondStat = document.getElementById('per-second-stat');
    const coin = document.getElementById('coin');
    const navButtons = document.querySelectorAll('.nav-btn');
    const pages = document.querySelectorAll('.page');
    const shopContainer = document.getElementById('shop-container');
    const boostsContainer = document.getElementById('boosts-container');
    const topPlayersContainer = document.getElementById('top-players-container');
    const dailyBonusModal = document.getElementById('daily-bonus-modal');
    const claimBonusBtn = document.getElementById('claim-bonus-btn');
    const dailyBonusAmount = document.getElementById('daily-bonus-amount');
    const boostTimerDisplay = document.getElementById('boost-timer-display');

    // --- Game State ---
    let gameState = {
        balance: 0,
        perClick: 1,
        perSecond: 0,
        upgrades: {},
        lastBonusClaimed: null,
        boost: {
            active: false,
            multiplier: 1,
            endTime: 0,
        }
    };

    // ======================================================================
    // --- API STUBS (Replace with actual backend calls) ---
    // ======================================================================
    const api = {
        async saveGameState(state) {
            console.log("Saving state to Local Storage:", state);
            localStorage.setItem('quantumTapperState', JSON.stringify(state));
        },
        async loadGameState() {
            console.log("Loading state from Local Storage.");
            const savedState = localStorage.getItem('quantumTapperState');
            return savedState ? JSON.parse(savedState) : null;
        },
        async getTopPlayers() {
            console.log("Loading MOCK top players list.");
            // In a real app, this would fetch from a server.
            // We add the current player's score to the list for context.
            let top = [
                { rank: 1, name: 'QuantumLeaper', score: 1250000000 },
                { rank: 2, name: 'ByteSmasher', score: 987000000 },
                { rank: 3, name: 'ClickWizard', score: 543000000 },
                { rank: 4, name: 'NanoNibbler', score: 123000000 },
                { rank: 5, name: 'You', score: gameState.balance }
            ];
            return top.sort((a,b) => b.score - a.score).map((player, index) => ({...player, rank: index + 1}));
        }
    };

    // --- Shop & Boosts Definition ---
    const shopItems = {
        'click_power_1': { name: 'Quantum Tap', description: '+1 per click', baseCost: 10, value: 1, type: 'perClick', icon: 'fa-hand-pointer' },
        'auto_miner_1': { name: 'Neutrino Collector', description: '+1 per second', baseCost: 50, value: 1, type: 'perSecond', icon: 'fa-atom' },
        'click_power_2': { name: 'Boson Amplifier', description: '+10 per click', baseCost: 500, value: 10, type: 'perClick', icon: 'fa-bolt' },
        'auto_miner_2': { name: 'Dark Matter Harvester', description: '+5 per second', baseCost: 1000, value: 5, type: 'perSecond', icon: 'fa-satellite-dish' },
        'click_power_3': { name: 'Singularity Tap', description: '+100 per click', baseCost: 10000, value: 100, type: 'perClick', icon: 'fa-compress-arrows-alt' },
        'auto_miner_3': { name: 'Galaxy Grid', description: '+50 per second', baseCost: 25000, value: 50, type: 'perSecond', icon: 'fa-dungeon' }
    };

    const boostItems = {
        'daily': { name: 'Daily Reward', description: 'Claim a free bonus every 24 hours.', icon: 'fa-calendar-day' },
        'golden': { name: 'Golden Quantum', description: 'Click the flying orb for a 15s x2 click boost!', icon: 'fa-star' }
    };

    // --- Game Initialization ---
    async function init() {
        const loadedState = await api.loadGameState();
        if (loadedState) {
            // Merging ensures that if we add new properties to the default state, old saves don't break the game.
            gameState = { ...gameState, ...loadedState, boost: gameState.boost }; // Don't persist boosts
        }

        coin.addEventListener('click', handleCoinClick);
        navButtons.forEach(btn => btn.addEventListener('click', handleNavClick));
        claimBonusBtn.addEventListener('click', claimDailyBonus);
        
        setInterval(gameTick, 100);
        setInterval(() => api.saveGameState(gameState), 10000);

        renderAllTabs();
        checkDailyBonus();
        // Start spawning the golden quantum after a delay
        setTimeout(spawnGoldenQuantum, 15000 + Math.random() * 15000);
    }

    // --- Core Game Loop ---
    function gameTick() {
        gameState.balance += gameState.perSecond / 10;
        
        if (gameState.boost.active && Date.now() > gameState.boost.endTime) {
            gameState.boost.active = false;
            gameState.boost.multiplier = 1;
        }
        
        updateUIDisplays();
    }

    // --- UI Update & Rendering ---
    function updateUIDisplays() {
        balanceDisplay.textContent = Math.floor(gameState.balance).toLocaleString();
        perClickStat.textContent = (gameState.perClick * gameState.boost.multiplier).toLocaleString();
        perSecondStat.textContent = gameState.perSecond.toLocaleString();

        if (gameState.boost.active) {
            const timeLeft = Math.ceil((gameState.boost.endTime - Date.now()) / 1000);
            boostTimerDisplay.textContent = `x${gameState.boost.multiplier} Click Boost: ${timeLeft}s left`;
            boostTimerDisplay.style.display = 'block';
        } else {
            boostTimerDisplay.style.display = 'none';
        }
    }

    function renderAllTabs() {
        renderShop();
        renderBoosts();
        renderTopPlayers();
    }

    function renderShop() {
        shopContainer.innerHTML = '';
        for (const id in shopItems) {
            const item = shopItems[id];
            const level = gameState.upgrades[id] || 0;
            const cost = calculateCost(item.baseCost, level);
            
            const itemElement = document.createElement('div');
            itemElement.className = 'list-item';
            itemElement.innerHTML = `
                <div class="icon"><i class="fas ${item.icon}"></i></div>
                <div class="info">
                    <h3>${item.name}</h3>
                    <p>${item.description} (Level: ${level})</p>
                </div>
                <button class="btn-primary buy-button" data-id="${id}">
                    ${cost.toLocaleString()} Q
                </button>
            `;
            shopContainer.appendChild(itemElement);
        }
        updateShopButtons(); // Set initial button states
    }

    function renderBoosts() {
        boostsContainer.innerHTML = '';
        for (const id in boostItems) {
            const boost = boostItems[id];
            const boostElement = document.createElement('div');
            boostElement.className = 'list-item';
            boostElement.innerHTML = `
                <div class="icon"><i class="fas ${boost.icon}"></i></div>
                <div class="info">
                    <h3>${boost.name}</h3>
                    <p>${boost.description}</p>
                </div>
            `;
            boostsContainer.appendChild(boostElement);
        }
    }

    async function renderTopPlayers() {
        topPlayersContainer.innerHTML = `<p>Loading...</p>`;
        const players = await api.getTopPlayers();
        topPlayersContainer.innerHTML = '';
        players.forEach(player => {
            const playerElement = document.createElement('div');
            playerElement.className = 'list-item';
            playerElement.innerHTML = `
                <div class="icon">#${player.rank}</div>
                <div class="info">
                    <h3>${player.name}</h3>
                    <p>${Math.floor(player.score).toLocaleString()} Q</p>
                </div>
            `;
            if (player.name === 'You') {
                playerElement.style.border = '2px solid var(--primary-color)';
            }
            topPlayersContainer.appendChild(playerElement);
        });
    }

    function updateShopButtons() {
        const buttons = shopContainer.querySelectorAll('.buy-button');
        buttons.forEach(button => {
            const id = button.dataset.id;
            const level = gameState.upgrades[id] || 0;
            const cost = calculateCost(shopItems[id].baseCost, level);
            button.disabled = gameState.balance < cost;
        });
    }

    // --- Event Handlers ---
    function handleCoinClick(event) {
        const earnings = gameState.perClick * gameState.boost.multiplier;
        gameState.balance += earnings;
        createFloatingText(event, `+${earnings.toLocaleString()}`);
    }

    function handleNavClick(event) {
        const targetId = event.currentTarget.dataset.target;
        navButtons.forEach(btn => btn.classList.remove('active'));
        event.currentTarget.classList.add('active');
        pages.forEach(page => page.classList.toggle('active', page.id === targetId));
        
        if (targetId === 'shop-page') renderShop();
        if (targetId === 'top-page') renderTopPlayers();
    }

    shopContainer.addEventListener('click', (event) => {
        if (event.target.classList.contains('buy-button')) {
            buyItem(event.target.dataset.id);
        }
    });

    function buyItem(id) {
        const item = shopItems[id];
        const level = gameState.upgrades[id] || 0;
        const cost = calculateCost(item.baseCost, level);

        if (gameState.balance >= cost) {
            gameState.balance -= cost;
            gameState.upgrades[id] = level + 1;
            
            if (item.type === 'perClick') gameState.perClick += item.value;
            if (item.type === 'perSecond') gameState.perSecond += item.value;
            
            renderShop(); // Re-render the shop to update costs and levels
        }
    }
    
    function calculateCost(base, level) {
        return Math.floor(base * Math.pow(1.18, level));
    }

    // --- Bonus & Boost Logic ---
    function checkDailyBonus() {
        const today = new Date().toDateString();
        if(gameState.lastBonusClaimed !== today) {
            const bonus = Math.floor(boostItems.daily.baseValue + gameState.perSecond * 120); // 2 mins of passive income
            dailyBonusAmount.textContent = `${bonus.toLocaleString()} Q`;
            dailyBonusModal.dataset.bonus = bonus;
            dailyBonusModal.classList.remove('hidden');
        }
    }

    function claimDailyBonus() {
        const bonusValue = parseInt(dailyBonusModal.dataset.bonus);
        gameState.balance += bonusValue;
        gameState.lastBonusClaimed = new Date().toDateString();
        dailyBonusModal.classList.add('hidden');
    }

    function spawnGoldenQuantum() {
        const golden = document.createElement('div');
        golden.className = 'golden-quantum';
        golden.innerHTML = `<i class="fas fa-star"></i>`;

        // Random start and end points
        const startX = Math.random() > 0.5 ? -50 : gameContainer.clientWidth + 50;
        const startY = Math.random() * gameContainer.clientHeight;
        const endX = gameContainer.clientWidth - startX;
        const endY = Math.random() * gameContainer.clientHeight;

        golden.style.left = `${startX}px`;
        golden.style.top = `${startY}px`;

        gameContainer.appendChild(golden);
        
        // Use requestAnimationFrame for smooth animation
        setTimeout(() => {
            golden.style.transition = 'transform 5s linear';
            golden.style.transform = `translate(${endX - startX}px, ${endY - startY}px)`;
        }, 100);

        golden.addEventListener('click', () => {
            activateBoost(2, 15000); // 2x multiplier for 15 seconds
            golden.remove();
        }, { once: true });

        setTimeout(() => golden.remove(), 5100); // Clean up if not clicked
        setTimeout(spawnGoldenQuantum, 30000 + Math.random() * 30000); // Spawn next one in 30-60 seconds
    }

    function activateBoost(multiplier, duration) {
        if (gameState.boost.active) return;
        gameState.boost.active = true;
        gameState.boost.multiplier = multiplier;
        gameState.boost.endTime = Date.now() + duration;
    }

    function createFloatingText(event, text) {
        const el = document.createElement('div');
        el.textContent = text;
        el.className = 'floating-text'; // You need to style this class in CSS
        el.style.left = `${event.clientX}px`;
        el.style.top = `${event.clientY}px`;
        document.body.appendChild(el);
        el.addEventListener('animationend', () => el.remove());
    }
    // Add CSS for .floating-text (copied from a previous response for completeness)
    const styleSheet = document.createElement("style");
    styleSheet.type = "text/css";
    styleSheet.innerText = `
        .floating-text {
            position: fixed;
            font-size: 1.5em;
            font-weight: 600;
            color: var(--primary-color);
            pointer-events: none;
            animation: float-up 1.5s ease-out forwards;
            text-shadow: 0 0 5px white;
            z-index: 9999;
        }
        @keyframes float-up {
            to {
                transform: translateY(-150px);
                opacity: 0;
            }
        }
    `;
    document.head.appendChild(styleSheet);


    // --- Let's go! ---
    init();
});
