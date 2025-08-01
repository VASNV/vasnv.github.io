document.addEventListener('DOMContentLoaded', () => {
    // --- GOODIE: THEME SWITCHER ---
    const themeToggle = document.getElementById('theme-toggle');
    const currentTheme = localStorage.getItem('theme') || 'dark';
    document.documentElement.setAttribute('data-theme', currentTheme);
    if (currentTheme === 'light') themeToggle.checked = true;

    themeToggle.addEventListener('change', (e) => {
        const newTheme = e.target.checked ? 'light' : 'dark';
        document.documentElement.setAttribute('data-theme', newTheme);
        localStorage.setItem('theme', newTheme);
    });

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
    
    // --- HELPER FUNCTIONS ---
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
    
    // --- TOOL 1: 2D DATA DECODER (REBUILT LOGIC) ---
    const decoderInput = document.getElementById('decoder-input');
    const encodingTypeSelect = document.getElementById('encoding-type');
    const decoderOutputContainer = document.getElementById('decoder-output-container');

    const handleDecode = () => {
        const encodedText = decoderInput.value.trim();
        if (!encodedText) {
            renderPlaceholder(decoderOutputContainer, 'Decoded table will appear here.');
            return;
        }

        try {
            const encodingType = encodingTypeSelect.value;
            let decodedText;

            if (encodingType === 'base64') decodedText = atob(encodedText);
            else if (encodingType === 'url') decodedText = decodeURIComponent(encodedText);
            else throw new Error('Unsupported encoding type.');

            // 1. Split by <::> to get rows
            const rows = decodedText.split('<::>').map(r => r.trim()).filter(r => r);
            if (rows.length === 0) {
                renderPlaceholder(decoderOutputContainer, 'No rows found in data.');
                return;
            }

            // 2. Split each row by ; to get columns, creating a 2D array
            const tableData = rows.map(row => row.split(';'));
            
            // 3. Find the maximum number of columns to build a consistent table
            const maxColumns = Math.max(0, ...tableData.map(row => row.length));
            if (maxColumns === 0) {
                 renderPlaceholder(decoderOutputContainer, 'No columns found in data.');
                 return;
            }
            
            const table = new DOMParser().parseFromString(createTableHTML('decoder-table'), 'text/html').querySelector('table');

            // 4. Build Table Header
            let headerHTML = '<thead><tr><th class="row-header">#</th>';
            for (let i = 1; i <= maxColumns; i++) {
                headerHTML += `<th>Column ${i}</th>`;
            }
            headerHTML += '</tr></thead>';
            table.innerHTML = headerHTML;
            
            // 5. Build Table Body
            const tbody = document.createElement('tbody');
            tableData.forEach((row, rowIndex) => {
                const tr = document.createElement('tr');
                let rowHTML = `<td class="row-header">${rowIndex + 1}</td>`;
                for (let i = 0; i < maxColumns; i++) {
                    const cellData = row[i] || ''; // Use empty string for missing cells
                    rowHTML += `<td>${cellData.replace(/</g, "<")}</td>`;
                }
                tr.innerHTML = rowHTML;
                tbody.appendChild(tr);
            });
            table.appendChild(tbody);

            // 6. Build Table Footer
            const totalCells = tableData.reduce((acc, row) => acc + row.length, 0);
            const tfoot = document.createElement('tfoot');
            tfoot.innerHTML = `<tr><td colspan="${maxColumns + 1}">Total Rows: ${rows.length} | Total Cells: ${totalCells}</td></tr>`;
            table.appendChild(tfoot);

            // 7. Render the complete table
            decoderOutputContainer.innerHTML = '';
            decoderOutputContainer.appendChild(table);

        } catch (e) {
            renderError(decoderOutputContainer, 'Decoding Error: Invalid input string.');
        }
    };

    // --- TOOL 2: DSV PARSER (Unchanged) ---
    const parserInput = document.getElementById('parser-input');
    const parserOutputContainer = document.getElementById('parser-output-container');
    let parserTimeout;
    const handleParseAndExtract = () => {
        // This function from the previous response remains unchanged.
        // It correctly handles its own logic based on newlines and semicolons.
        clearTimeout(parserTimeout);
        const rawText = parserInput.value.trim();
        if (!rawText) {
            renderPlaceholder(parserOutputContainer, 'Parsed table and statistics will appear here.');
            return;
        }
        renderPlaceholder(parserOutputContainer, '<div class="shimmer-cell" style="height:150px; width:100%"></div>');
        parserTimeout = setTimeout(() => {
            try {
                const rows = rawText.split('\n').filter(r => r.trim() !== '');
                const tableData = rows.map(row => row.split(';'));
                const columnCount = Math.max(...tableData.map(row => row.length), 0);
                if (columnCount === 0) { renderPlaceholder(parserOutputContainer, 'No data to display.'); return; }
                const table = new DOMParser().parseFromString(createTableHTML('parser-table'), 'text/html').querySelector('table');
                let headerHTML = '<tr><th class="row-header">#</th>';
                for(let i=1; i<=columnCount; i++) headerHTML += `<th>Column ${i}</th>`;
                headerHTML += '</tr>';
                table.innerHTML = `<thead>${headerHTML}</thead>`;
                const tbody = document.createElement('tbody');
                tableData.forEach((row, rowIndex) => { const tr = document.createElement('tr'); let rowHTML = `<td class="row-header">${rowIndex + 1}</td>`; for(let i=0; i<columnCount; i++) { rowHTML += `<td>${(row[i] || '').replace(/</g, "<")}</td>`; } tr.innerHTML = rowHTML; tbody.appendChild(tr); });
                table.appendChild(tbody);
                const urlRegex = /https?:\/\/[^\s/$.?#].[^\s]*/gi; const foundUrls = rawText.match(urlRegex) || []; const tldCounts = {}; const commonTlds = new Set(['com', 'ru', 'su', 'org', 'net', 'gov', 'edu', 'io', 'co', 'uk', 'de', 'fr', 'jp', 'cn']);
                foundUrls.forEach(url => { try { const hostname = new URL(url).hostname; const parts = hostname.split('.'); const tld = parts[parts.length - 1]; if (commonTlds.has(tld)) { tldCounts[tld] = (tldCounts[tld] || 0) + 1; } } catch (e) {} });
                let statsHTML = `Total Rows: ${rows.length}. `; const sortedTlds = Object.entries(tldCounts).sort((a,b) => b[1] - a[1]);
                if(sortedTlds.length > 0) { statsHTML += `| Domain Stats: ${sortedTlds.map(([tld, count]) => `.${tld} (${count})`).join(', ')}`; }
                const tfoot = document.createElement('tfoot'); tfoot.innerHTML = `<tr><td colspan="${columnCount + 1}">${statsHTML}</td></tr>`; table.appendChild(tfoot);
                parserOutputContainer.innerHTML = ''; parserOutputContainer.appendChild(table);
            } catch (e) { console.error(e); renderError(parserOutputContainer, 'Error parsing data. Check format.'); }
        }, 500);
    };

    // --- PROTOTYPE & COPY BUTTONS (with updated prototype data) ---
    const prototypes = {
        'decoder-input-base64': 'Sm9obiBEb2U7am9obkBleGFtcGxlLmNvbTw6OmpBTmUgU21pdGg7amFuZUBleGFtcGxlLm9yZztBZG1pbjw6Oj5LZXZpbjtrZXZpbkBzaXRlLnJ1',
        'parser-input': `User;Email;Website\nJohn Doe;john@example.com;https://example.com\nИван Петров;ivan@site.ru;https://site.ru\nJane Smith;jane@example.org;https://example.org`
    };
    document.querySelectorAll('.prototype-btn').forEach(button => {
        button.addEventListener('click', () => {
            const targetId = button.dataset.target;
            const prototypeKey = button.dataset.type ? `${targetId}-${button.dataset.type}` : targetId;
            const targetTextarea = document.getElementById(targetId);
            targetTextarea.value = prototypes[prototypeKey] || '';
            targetTextarea.dispatchEvent(new Event('input', { bubbles: true }));
        });
    });

    document.querySelectorAll('.copy-btn').forEach(button => {
        button.addEventListener('click', () => {
            const table = document.querySelector(`#${button.dataset.targetTable} table`);
            if (!table) return;
            navigator.clipboard.writeText(table.innerText).then(() => {
                const originalText = button.innerText;
                button.innerText = 'Copied!';
                button.classList.add('copied');
                setTimeout(() => { button.innerText = originalText; button.classList.remove('copied'); }, 2000);
            });
        });
    });

    // --- INITIALIZE VIEWS ---
    renderPlaceholder(decoderOutputContainer, 'Decoded table will appear here.');
    renderPlaceholder(parserOutputContainer, 'Parsed table and statistics will appear here.');
    
    decoderInput.addEventListener('input', handleDecode);
    encodingTypeSelect.addEventListener('change', handleDecode);
    parserInput.addEventListener('input', handleParseAndExtract);
});
