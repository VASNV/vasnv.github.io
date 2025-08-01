document.addEventListener('DOMContentLoaded', () => {
    const inputText = document.getElementById('input-text');
    const encodingTypeSelect = document.getElementById('encoding-type');
    const outputTableBody = document.querySelector('#output-table tbody');

    const showPreloader = () => {
        outputTableBody.innerHTML = `
            <tr class="shimmer-row"><td><div style="height: 20px; width: 80%;"></div></td><td><div style="height: 20px; width: 60%;"></div></td></tr>
            <tr class="shimmer-row"><td><div style="height: 20px; width: 70%;"></div></td><td><div style="height: 20px; width: 90%;"></div></td></tr>
            <tr class="shimmer-row"><td><div style="height: 20px; width: 60%;"></div></td><td><div style="height: 20px; width: 75%;"></div></td></tr>
        `;
    };

    const displayResults = (dataArray) => {
        outputTableBody.innerHTML = ''; // Clear previous results
        if (dataArray.length === 0 || (dataArray.length === 1 && dataArray[0] === '')) {
            outputTableBody.innerHTML = '<tr><td colspan="2" class="placeholder">Input is empty or resulted in no data.</td></tr>';
            return;
        }

        dataArray.forEach((item, index) => {
            const row = document.createElement('tr');
            row.innerHTML = `
                <td>Item ${index + 1}</td>
                <td>${item.replace(/</g, "<").replace(/>/g, ">")}</td>
            `; // Sanitize to prevent HTML injection
            outputTableBody.appendChild(row);
        });
    };

    const displayError = (message) => {
        outputTableBody.innerHTML = `<tr><td colspan="2" class="error">${message}</td></tr>`;
    };

    const handleDecode = () => {
        const encodedText = inputText.value.trim();
        const encodingType = encodingTypeSelect.value;

        if (!encodedText) {
            outputTableBody.innerHTML = '<tr><td colspan="2" class="placeholder">Your decoded data will appear here.</td></tr>';
            return;
        }

        showPreloader();

        // Simulate processing delay for a better user experience
        setTimeout(() => {
            try {
                let decodedText;
                
                // --- Decoding Logic ---
                if (encodingType === 'base64') {
                    decodedText = atob(encodedText);
                } else if (encodingType === 'url') {
                    decodedText = decodeURIComponent(encodedText);
                } else {
                    throw new Error('Unsupported encoding type selected.');
                }

                // --- Splitting Logic ---
                const dataParts = decodedText.split('<::>');
                displayResults(dataParts);

            } catch (e) {
                console.error('Decoding failed:', e);
                displayError('Decoding Error: Invalid input string for the selected encoding type.');
            }
        }, 500); // 0.5 second delay
    };

    // Trigger decoding on input change and encoding type change
    inputText.addEventListener('input', handleDecode);
    encodingTypeSelect.addEventListener('change', handleDecode);
});
