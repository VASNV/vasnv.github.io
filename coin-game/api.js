// api.js

// This object simulates a backend API.
// In a real application, each function would make a fetch() call to a server.
const QuantumNetAPI = {
    async saveGameState(state) {
        // In a real app: await fetch('/api/save', { method: 'POST', body: JSON.stringify(state) });
        console.log("API: Saving state to Local Storage.", state);
        // We remove fields that shouldn't be persisted, like active boosts.
        const stateToSave = { ...state, boost: { active: false, multiplier: 1, endTime: 0 } };
        localStorage.setItem('quantumTapperState', JSON.stringify(stateToSave));
        return { success: true, message: "Game saved." };
    },

    async loadGameState() {
        // In a real app: const response = await fetch('/api/load'); return await response.json();
        console.log("API: Loading state from Local Storage.");
        const savedState = localStorage.getItem('quantumTapperState');
        if (savedState) {
            return { success: true, data: JSON.parse(savedState) };
        }
        return { success: false, message: "No saved game found." };
    },

    // --- Mock Developer API Methods ---

    async getWalletBalance(apiKey, userId) {
        // This is a mock function. In a real scenario, it would validate the API key
        // and return the balance for the given user ID from a database.
        console.log(`API: Mock call to getWalletBalance for user ${userId}`);
        // For this example, we'll just return a random balance.
        return {
            success: true,
            data: {
                userId: userId,
                balance: {
                    quantum: Math.floor(Math.random() * 1000000),
                    darkMatter: Math.floor(Math.random() * 500),
                }
            }
        };
    },

    async transferCurrency(apiKey, fromUserId, toUserId, amount, currency) {
        console.log(`API: Mock transfer of ${amount} ${currency} from ${fromUserId} to ${toUserId}`);
        if (amount <= 0) {
            return { success: false, error: "Invalid amount." };
        }
        // In a real app, this would perform database transactions.
        return {
            success: true,
            data: {
                transactionId: `txn_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
                status: "Completed",
                from: fromUserId,
                to: toUserId,
                amount: amount,
                currency: currency
            }
        };
    }
};
