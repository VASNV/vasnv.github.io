document.addEventListener('DOMContentLoaded', () => {

    // --- DOM Elements ---
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
            // TODO: Replace this with a fetch() call to your backend API
            // For example: await fetch('/api/save', { method: 'POST', body: JSON.stringify(state) });
            console.log("Saving state to Local Storage:", state);
            localStorage.setItem('quantumTapperState', JSON.stringify(state));
        },
        async loadGameState() {
            // TODO: Replace this with a fetch() call to your backend API
            // For example: const response = await fetch('/api/load'); return await response.json();
            console.log("Loading state from Local Storage.");
            const savedState = localStorage.getItem('quantumTapperState');
            return savedState ? JSON.parse(savedState) : null;
        },
        async getTopPlayers() {
            // TODO: Replace this with a fetch() call to your backend API
            console.log("Loading MOCK top players list.");
            return [
                { rank: 1, name: 'QuantumLeaper', score: 1.25e9 },
                { rank: 2, name: 'ByteSmasher', score: 9.87e8 },
                { rank: 3, name: 'ClickWizard', score: 5.43e8 },
                { rank: 4, name: 'You!', score: gameState.balance }
            ].sort((a,b) => b.score - a.score);
        }
    };

    // --- Shop & Boosts Definition ---
    const shopItems = { /* ... same as before ... */ };
    const boostItems = {
        'daily': { name: 'Daily Reward', description: 'Claim a free bonus every 24 hours.', baseValue: 1000 },
        'golden': { name: 'Golden Quantum', description: 'Click the flying orb for a 15s click boost!', multiplier: 2, duration: 15000 } // 15 seconds
    };

    // --- Game Initialization ---
    async function init() {
        const loadedState = await api.loadGameState();
        if (loadedState) {
            gameState = { ...gameState, ...loadedState }; // Merge to ensure new properties are not lost
        }

        // Setup event listeners
        coin.addEventListener('click', handleCoinClick);
        navButtons.forEach(btn => btn.addEventListener('click', handleNavClick));
        claimBonusBtn.addEventListener('click', claimDailyBonus);
        
        // Start the game loop
        setInterval(gameTick, 100); // Main loop runs 10 times per second
        setInterval(() => api.saveGameState(gameState), 10000); // Auto-save every 10 seconds

        // Initial render
        updateUI();
        renderAllTabs();
        checkDailyBonus();
        spawnGoldenQuantum();
    }

    // --- Core Game Loop ---
    function gameTick() {
        const passiveGain = gameState.perSecond / 10;
        gameState.balance += passiveGain;
        
        // Handle boost expiration
        if (gameState.boost.active && Date.now() > gameState.boost.endTime) {
            gameState.boost.active = false;
            gameState.boost.multiplier = 1;
            updateUI(); // Update UI to remove boost state
        }
        
        updateUI();
    }

    // --- UI Update & Rendering ---
    function updateUI() {
        balanceDisplay.textContent = Math.floor(gameState.balance).toLocaleString();
        perClickStat.textContent = (gameState.perClick * gameState.boost.multiplier).toLocaleString();
        perSecondStat.textContent = gameState.perSecond.toLocaleString();

        // Update boost timer
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
    
    // (Add renderShop, renderBoosts, renderTopPlayers functions here)
    // ... Example for renderShop ...
    function renderShop() {
        shopContainer.innerHTML = ''; // Clear existing items
        // Loop through shopItems and create HTML elements
        // Add event listeners to buy buttons
    }

    // --- Event Handlers ---
    function handleCoinClick(event) {
        const earnings = gameState.perClick * gameState.boost.multiplier;
        gameState.balance += earnings;
        // visual feedback logic (floating text etc.)
    }

    function handleNavClick(event) {
        const targetId = event.currentTarget.dataset.target;
        
        navButtons.forEach(btn => btn.classList.remove('active'));
        event.currentTarget.classList.add('active');

        pages.forEach(page => {
            page.classList.toggle('active', page.id === targetId);
        });
        
        // Re-render tabs that need dynamic content
        if(targetId === 'shop-page') renderShop();
        if(targetId === 'top-page') renderTopPlayers();
    }

    // --- Bonus & Boost Logic ---
    function checkDailyBonus() {
        const today = new Date().toDateString();
        if(gameState.lastBonusClaimed !== today) {
            const bonus = Math.floor(boostItems.daily.baseValue + gameState.perSecond * 60); // 1 min of passive income
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
        updateUI();
    }

    function spawnGoldenQuantum() {
        // Create a golden quantum element, animate it, and set a click listener
        // On click, call activateBoost()
        // Use setTimeout to spawn the next one randomly
    }

    function activateBoost(multiplier, duration) {
        if (gameState.boost.active) return; // Don't stack boosts for now
        gameState.boost.active = true;
        gameState.boost.multiplier = multiplier;
        gameState.boost.endTime = Date.now() + duration;
        updateUI();
    }

    // --- Let's go! ---
    init();
});
