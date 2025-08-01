document.addEventListener('DOMContentLoaded', () => {

    // ======================================================================
    // --- MOCK API (Simulates a backend) ---
    // ======================================================================
    const QuantumNetAPI = {
        async saveGameState(state) {
            console.log("API: Saving state to Local Storage.", state);
            const stateToSave = { ...state, boost: { active: false, multiplier: 1, endTime: 0 } };
            localStorage.setItem('quantumTapperState', JSON.stringify(stateToSave));
            return { success: true, message: "Game saved." };
        },
        async loadGameState() {
            console.log("API: Loading state from Local Storage.");
            const savedState = localStorage.getItem('quantumTapperState');
            if (savedState) {
                return { success: true, data: JSON.parse(savedState) };
            }
            return { success: false, message: "No saved game found." };
        },
        async getTopPlayers() {
            console.log("API: Loading MOCK top players list.");
            let top = [
                { rank: 1, name: 'QuantumLeaper', score: 1.25e12 },
                { rank: 2, name: 'ByteSmasher', score: 9.87e11 },
                { rank: 3, name: 'ClickWizard', score: 5.43e11 },
                { rank: 4, name: 'NanoNibbler', score: 1.23e11 },
                { rank: 5, name: 'You', score: gameState.totalQuantumEarned }
            ];
            return top.sort((a, b) => b.score - a.score).map((player, index) => ({ ...player, rank: index + 1 }));
        }
    };

    // --- DOM Elements ---
    const balanceDisplay = document.getElementById('balance-display');
    const darkMatterDisplay = document.getElementById('dark-matter-display');
    const perClickStat = document.getElementById('per-click-stat');
    const perSecondStat = document.getElementById('per-second-stat');
    const globalBonusStat = document.getElementById('global-bonus-stat');
    const coin = document.getElementById('coin');
    const navButtons = document.querySelectorAll('.nav-btn');
    const pages = document.querySelectorAll('.page');
    const shopContainer = document.getElementById('shop-container');
    const superShopContainer = document.getElementById('super-shop-container');
    const missionsContainer = document.getElementById('missions-container');
    const exchangeContainer = document.getElementById('exchange-container');
    const apiDocsContainer = document.getElementById('api-docs-container');
    const collapseBtn = document.getElementById('collapse-btn');

    // --- Game State ---
    let gameState = {
        balance: 0,
        darkMatter: 0,
        totalQuantumEarned: 0,
        totalClicks: 0,
        collapseCount: 0,
        globalBonus: 1.0,
        perClick: 1,
        perSecond: 0,
        upgrades: {},
        superUpgrades: {},
        missions: {},
    };

    // --- Game Definitions ---
    const COLLAPSE_REQUIREMENT = 1e9; // 1 Billion Quantum

    const shopItems = {
        'qps1': { name: 'Neutrino Collector', description: '+1 Q/s', baseCost: 50, value: 1, type: 'perSecond', icon: 'fa-atom' },
        'qpc1': { name: 'Quantum Tap', description: '+1 Q/c', baseCost: 10, value: 1, type: 'perClick', icon: 'fa-hand-pointer' },
        'qps2': { name: 'Dark Matter Harvester', description: '+8 Q/s', baseCost: 1000, value: 8, type: 'perSecond', icon: 'fa-satellite-dish' },
        'qpc2': { name: 'Boson Amplifier', description: '+10 Q/c', baseCost: 500, value: 10, type: 'perClick', icon: 'fa-bolt' },
        'qps3': { name: 'Galaxy Grid', description: '+50 Q/s', baseCost: 25000, value: 50, type: 'perSecond', icon: 'fa-dungeon' },
        'qpc3': { name: 'Singularity Tap', description: '+100 Q/c', baseCost: 10000, value: 100, type: 'perClick', icon: 'fa-compress-arrows-alt' },
    };

    const superUpgrades = {
        'su_bonus_1': { name: 'Dark Matter Protocol', description: 'Each Collapse is 5% more effective.', baseCost: 1, type: 'collapseBonus', value: 0.05, icon: 'fa-infinity' },
        'su_click_1': { name: 'Persistent Tapping', description: '+1% of total Q/s added to Q/c.', baseCost: 5, type: 'qpsToqpc', value: 0.01, icon: 'fa-sync-alt' },
        'su_dark_1': { name: 'Matter Compression', description: 'Gain 10% more Dark Matter on Collapse.', baseCost: 10, type: 'dmGain', value: 0.1, icon: 'fa-compress' },
    };

    const missions = {
        'm_click_1': { name: 'First Steps', req: () => gameState.totalClicks >= 100, reward: { type: 'Q', value: 1000 } },
        'm_click_2': { name: 'Click Enthusiast', req: () => gameState.totalClicks >= 10000, reward: { type: 'DM', value: 1 } },
        'm_earn_1': { name: 'Getting Started', req: () => gameState.totalQuantumEarned >= 100000, reward: { type: 'Q', value: 50000 } },
        'm_earn_2': { name: 'Millionaire', req: () => gameState.totalQuantumEarned >= 1e6, reward: { type: 'DM', value: 5 } },
        'm_collapse_1': { name: 'Rebirth', req: () => gameState.collapseCount >= 1, reward: { type: 'DM', value: 10 } },
    };

    // --- Game Initialization ---
    async function init() {
        const response = await QuantumNetAPI.loadGameState();
        if (response.success) {
            gameState = { ...gameState, ...response.data };
        }

        coin.addEventListener('click', handleCoinClick);
        navButtons.forEach(btn => btn.addEventListener('click', handleNavClick));
        collapseBtn.addEventListener('click', handleCollapse);
        shopContainer.addEventListener('click', (e) => handleShopBuy(e, 'standard'));
        superShopContainer.addEventListener('click', (e) => handleShopBuy(e, 'super'));
        missionsContainer.addEventListener('click', handleMissionClaim);

        setInterval(gameTick, 100);
        setInterval(() => QuantumNetAPI.saveGameState(gameState), 10000);

        renderAllTabs();
    }

    // --- Core Game Loop & UI Updates ---
    function gameTick() {
        const finalPassiveGain = (gameState.perSecond * gameState.globalBonus) / 10;
        gameState.balance += finalPassiveGain;
        gameState.totalQuantumEarned += finalPassiveGain;
        updateUIDisplays();
        checkMissions();
    }

    function updateUIDisplays() {
        balanceDisplay.textContent = formatNumber(gameState.balance);
        darkMatterDisplay.textContent = formatNumber(gameState.darkMatter);
        perClickStat.textContent = formatNumber(getClickValue());
        perSecondStat.textContent = formatNumber(getPassiveValue());
        globalBonusStat.textContent = `${((gameState.globalBonus - 1) * 100).toFixed(0)}`;
        collapseBtn.disabled = gameState.balance < COLLAPSE_REQUIREMENT;
        // Dynamically update shop button states
        updateShopButtonStates(shopContainer, shopItems, 'balance');
        updateShopButtonStates(superShopContainer, superUpgrades, 'darkMatter');
    }

    function renderAllTabs() {
        renderShop(shopContainer, shopItems, 'balance');
        renderShop(superShopContainer, superUpgrades, 'darkMatter');
        renderMissions();
        renderExchange();
        renderDeveloperAPI();
    }

    // --- Rendering Functions ---
    function renderShop(container, items, currency) {
        container.innerHTML = '';
        for (const id in items) {
            const item = items[id];
            const level = (currency === 'balance' ? gameState.upgrades[id] : gameState.superUpgrades[id]) || 0;
            const cost = calculateCost(item.baseCost, level);
            container.innerHTML += `
                <div class="list-item">
                    <div class="icon"><i class="fas ${item.icon}"></i></div>
                    <div class="info">
                        <h3>${item.name}</h3>
                        <p>${item.description} (Level: ${level})</p>
                    </div>
                    <button class="btn-primary buy-button" data-id="${id}">
                        ${formatNumber(cost)} ${currency === 'balance' ? 'Q' : 'DM'}
                    </button>
                </div>`;
        }
    }

    function renderMissions() {
        missionsContainer.innerHTML = '';
        for (const id in missions) {
            const mission = missions[id];
            const isCompleted = gameState.missions[id];
            const canComplete = mission.req();

            missionsContainer.innerHTML += `
                <div class="list-item mission-item ${isCompleted ? 'completed' : ''}">
                    <div class="icon"><i class="fas fa-tasks"></i></div>
                    <div class="info">
                        <h3>${mission.name}</h3>
                        <p>Reward: ${mission.reward.value.toLocaleString()} ${mission.reward.type}</p>
                    </div>
                    <button class="btn-primary claim-button" data-id="${id}" ${(!canComplete || isCompleted) ? 'disabled' : ''}>
                        ${isCompleted ? 'Claimed' : 'Claim'}
                    </button>
                </div>`;
        }
    }

    function renderExchange() {
        exchangeContainer.innerHTML = `
            <div class="list-item">
                <div class="icon"><i class="fas fa-exchange-alt"></i></div>
                <div class="info">
                    <h3>Quantum Swap</h3>
                    <p>Exchange 1 Trillion Q for 1 DM.</p>
                </div>
                <button class="btn-primary" id="exchange-btn" ${gameState.balance < 1e12 ? 'disabled' : ''}>Swap</button>
            </div>`;
        document.getElementById('exchange-btn')?.addEventListener('click', () => {
            if (gameState.balance >= 1e12) {
                gameState.balance -= 1e12;
                gameState.darkMatter += 1;
                renderExchange(); // Re-render to update button state
            }
        });
    }

    function renderDeveloperAPI() {
        apiDocsContainer.innerHTML = `
            <div class="api-method">
                <h3>Get Wallet Balance</h3>
                <p>Retrieve the current balance of a specified user.</p>
                <pre><code>QuantumNetAPI.getWalletBalance(
    <span class="key">apiKey</span>: <span class="string">"YOUR_API_KEY"</span>,
    <span class="key">userId</span>: <span class="string">"USER_ID_HERE"</span>
)</code></pre>
            </div>
             <div class="api-method">
                <h3>Transfer Currency</h3>
                <p>Transfer Quantum (Q) or Dark Matter (DM) between users.</p>
                <pre><code>QuantumNetAPI.transferCurrency(
    <span class="key">apiKey</span>: <span class="string">"YOUR_API_KEY"</span>,
    <span class="key">fromUserId</span>: <span class="string">"SENDER_USER_ID"</span>,
    <span class="key">toUserId</span>: <span class="string">"RECIPIENT_USER_ID"</span>,
    <span class="key">amount</span>: <span class="number">1000</span>,
    <span class="key">currency</span>: <span class="string">"Q"</span>
)</code></pre>
            </div>`;
    }

    // --- Gameplay Logic ---
    function handleCoinClick(e) {
        const clickValue = getClickValue();
        gameState.balance += clickValue;
        gameState.totalQuantumEarned += clickValue;
        gameState.totalClicks++;
    }

    function getClickValue() {
        let baseClick = gameState.perClick;
        const qpsToqpcLevels = gameState.superUpgrades['su_click_1'] || 0;
        if (qpsToqpcLevels > 0) {
            const bonus = gameState.perSecond * (superUpgrades['su_click_1'].value * qpsToqpcLevels);
            baseClick += bonus;
        }
        return baseClick * gameState.globalBonus;
    }
    
    function getPassiveValue() {
        return gameState.perSecond * gameState.globalBonus;
    }

    function handleShopBuy(event, type) {
        if (!event.target.matches('.buy-button')) return;
        const id = event.target.dataset.id;
        const items = type === 'standard' ? shopItems : superUpgrades;
        const stateKey = type === 'standard' ? 'upgrades' : 'superUpgrades';
        const currency = type === 'standard' ? 'balance' : 'darkMatter';

        const item = items[id];
        const level = gameState[stateKey][id] || 0;
        const cost = calculateCost(item.baseCost, level);

        if (gameState[currency] >= cost) {
            gameState[currency] -= cost;
            gameState[stateKey][id] = level + 1;
            if (item.type === 'perClick') gameState.perClick += item.value;
            if (item.type === 'perSecond') gameState.perSecond += item.value;
            renderShop(event.currentTarget, items, currency);
        }
    }

    function handleMissionClaim(event) {
        if (!event.target.matches('.claim-button')) return;
        const id = event.target.dataset.id;
        if (gameState.missions[id] || !missions[id].req()) return;

        const reward = missions[id].reward;
        if (reward.type === 'Q') gameState.balance += reward.value;
        if (reward.type === 'DM') gameState.darkMatter += reward.value;

        gameState.missions[id] = true;
        renderMissions();
    }
    
    function checkMissions() {
        // This function enables claim buttons if requirements are met
        missionsContainer.querySelectorAll('.claim-button:disabled').forEach(button => {
            const id = button.dataset.id;
            if(!gameState.missions[id] && missions[id].req()) {
                button.disabled = false;
            }
        });
    }

    function handleCollapse() {
        if (gameState.balance < COLLAPSE_REQUIREMENT) return;
        
        const dmGainBonusLevels = gameState.superUpgrades['su_dark_1'] || 0;
        const dmGainMultiplier = 1 + (superUpgrades['su_dark_1'].value * dmGainBonusLevels);
        const darkMatterGained = Math.floor(Math.sqrt(gameState.balance / 1e7) * dmGainMultiplier);
        
        const collapseBonusLevels = gameState.superUpgrades['su_bonus_1'] || 0;
        const collapseBonusIncrease = 0.02 + (superUpgrades['su_bonus_1'].value * collapseBonusLevels);

        gameState.darkMatter += darkMatterGained;
        gameState.globalBonus += collapseBonusIncrease;
        gameState.collapseCount++;

        // Reset progress
        gameState.balance = 0;
        gameState.perClick = 1;
        gameState.perSecond = 0;
        gameState.upgrades = {};
        gameState.totalQuantumEarned = 0;
        gameState.totalClicks = 0;

        alert(`Universe Collapsed! You gained ${darkMatterGained} Dark Matter and a permanent production bonus!`);
        renderAllTabs();
    }
    
    // --- Navigation & Helpers ---
    function handleNavClick(event) {
        const targetId = event.currentTarget.dataset.target;
        navButtons.forEach(btn => btn.classList.remove('active'));
        event.currentTarget.classList.add('active');
        pages.forEach(page => page.classList.toggle('active', page.id === targetId));
        if (targetId === 'top-page') renderTopPlayers();
    }

    function calculateCost(base, level) {
        return Math.floor(base * Math.pow(1.2, level));
    }
    
    function formatNumber(num) {
        if (num < 1e6) return Math.floor(num).toLocaleString();
        return num.toExponential(2).replace('+', '');
    }

    function updateShopButtonStates(container, items, currency) {
        container.querySelectorAll('.buy-button').forEach(button => {
            const id = button.dataset.id;
            const level = (currency === 'balance' ? gameState.upgrades[id] : gameState.superUpgrades[id]) || 0;
            const cost = calculateCost(items[id].baseCost, level);
            button.disabled = gameState[currency] < cost;
        });
    }

    // --- Let's go! ---
    init();
});
