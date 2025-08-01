document.addEventListener('DOMContentLoaded', () => {
    // --- Tab Management ---
    const tabs = document.querySelectorAll('.tab-link');
    const toolContents = document.querySelectorAll('.tool-content');

    tabs.forEach(tab => {
        tab.addEventListener('click', () => {
            tabs.forEach(item => item.classList.remove('active'));
            toolContents.forEach(content => content.classList.remove('active'));

            tab.classList.add('active');
            document.getElementById(tab.dataset.tool).classList.add('active');
        });
    });

    // --- General Helper Functions ---
    const createTableHTML = (id) => `<table class="results-table" id="${id}"></table>`;
    const renderPlaceholder = (container, message) => {
        container.innerHTML = createTableHTML('');
        const table = container.querySelector('table');
        table.innerHTML = `<tbody><tr><td class="placeholder" colspan="100%">${message}</td></tr></tbody>`;
    };
    const renderError = (container, message) => {
        container.innerHTML = createTableHTML('');
        const table = container.querySelector('table');
        table.innerHTML = `<tbody><tr><td class="error" colspan="100%">${message}</td></tr></tbody>`;
    };

    // --- Tool 1: Data Decoder ---
    const decoderInput = document.getElementById('decoder-input');
    const encodingTypeSelect = document.getElementById('encoding-type');
    const decoderOutputContainer = document.getElementById('decoder-output-container');

    const handleDecode = () => {
        const encodedText = decoderInput.value.trim();
        if (!encodedText) {
            renderPlaceholder(decoderOutputContainer, 'Decoded items will appear here.');
            return;
        }

        try {
            const encodingType = encodingTypeSelect.value;
            let decodedText;

            if (encodingType === 'base64') decodedText = atob(encodedText);
            else if (encodingType === 'url') decodedText = decodeURIComponent(encodedText);
            else throw new Error('Unsupported encoding type.');

            const dataItems = decodedText.split(';');
            
            let tableHTML = createTableHTML('decoder-table');
            const table = new DOMParser().parseFromString(tableHTML, 'text/html').querySelector('table');
            
            table.innerHTML = `
                <thead><tr><th>#</th><th>Value</th></tr></thead>
                <tbody>
                    ${dataItems.map((item, index) => `
                        <tr>
                            <td class="row-header">${index + 1}</td>
                            <td>${item.replace(/</g, "<")}</td>
                        </tr>
                    `).join('')}
                </tbody>
                <tfoot><tr><td colspan="2">Total Items: ${dataItems.length}</td></tr></tfoot>
            `;
            decoderOutputContainer.innerHTML = '';
            decoderOutputContainer.appendChild(table);

        } catch (e) {
            renderError(decoderOutputContainer, 'Decoding Error: Invalid input string.');
        }
    };

    // --- Tool 2: DSV Parser & Extractor ---
    const parserInput = document.getElementById('parser-input');
    const parserOutputContainer = document.getElementById('parser-output-container');
    let parserTimeout;

    const handleParseAndExtract = () => {
        clearTimeout(parserTimeout);
        const rawText = parserInput.value.trim();

        if (!rawText) {
            renderPlaceholder(parserOutputContainer, 'Parsed table and statistics will appear here.');
            return;
        }

        // Preloader
        renderPlaceholder(parserOutputContainer, '<div class="shimmer-cell" style="height:150px; width:100%"></div>');

        parserTimeout = setTimeout(() => {
            try {
                const rows = rawText.split('\n').filter(r => r.trim() !== '');
                const tableData = rows.map(row => row.split(';'));
                const columnCount = Math.max(...tableData.map(row => row.length), 0);
                
                if (columnCount === 0) {
                    renderPlaceholder(parserOutputContainer, 'No data to display.');
                    return;
                }

                // --- Build Table ---
                const table = new DOMParser().parseFromString(createTableHTML('parser-table'), 'text/html').querySelector('table');
                let headerHTML = '<tr><th class="row-header">#</th>';
                for(let i=1; i<=columnCount; i++) headerHTML += `<th>Column ${i}</th>`;
                headerHTML += '</tr>';
                table.innerHTML = `<thead>${headerHTML}</thead>`;
                
                const tbody = document.createElement('tbody');
                tableData.forEach((row, rowIndex) => {
                    const tr = document.createElement('tr');
                    let rowHTML = `<td class="row-header">${rowIndex + 1}</td>`;
                    for(let i=0; i<columnCount; i++) {
                        rowHTML += `<td>${(row[i] || '').replace(/</g, "<")}</td>`;
                    }
                    tr.innerHTML = rowHTML;
                    tbody.appendChild(tr);
                });
                table.appendChild(tbody);
                
                // --- Statistics ---
                const urlRegex = /https?:\/\/[^\s/$.?#].[^\s]*/gi;
                const foundUrls = rawText.match(urlRegex) || [];
                const tldCounts = {};
                const commonTlds = new Set(['com', 'ru', 'su', 'org', 'net', 'gov', 'edu', 'io', 'co', 'uk', 'de', 'fr', 'jp', 'cn']);

                foundUrls.forEach(url => {
                    try {
                        const hostname = new URL(url).hostname;
                        const parts = hostname.split('.');
                        const tld = parts[parts.length - 1];
                        if (commonTlds.has(tld)) {
                             tldCounts[tld] = (tldCounts[tld] || 0) + 1;
                        }
                    } catch (e) { /* Ignore invalid URLs */ }
                });

                let statsHTML = `Total Rows: ${rows.length}. `;
                const sortedTlds = Object.entries(tldCounts).sort((a,b) => b[1] - a[1]);
                if(sortedTlds.length > 0) {
                     statsHTML += `| Domain Stats: ${sortedTlds.map(([tld, count]) => `.${tld} (${count})`).join(', ')}`;
                }

                const tfoot = document.createElement('tfoot');
                tfoot.innerHTML = `<tr><td colspan="${columnCount + 1}">${statsHTML}</td></tr>`;
                table.appendChild(tfoot);

                parserOutputContainer.innerHTML = '';
                parserOutputContainer.appendChild(table);

            } catch (e) {
                console.error(e);
                renderError(parserOutputContainer, 'Error parsing data. Check format.');
            }
        }, 500); // Debounce with 500ms delay
    };
    
    // --- Initial State & Event Listeners ---
    renderPlaceholder(decoderOutputContainer, 'Decoded items will appear here.');
    renderPlaceholder(parserOutputContainer, 'Parsed table and statistics will appear here.');

    decoderInput.addEventListener('input', handleDecode);
    encodingTypeSelect.addEventListener('change', handleDecode);
    parserInput.addEventListener('input', handleParseAndExtract);
});
