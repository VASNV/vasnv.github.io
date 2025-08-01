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

    // --- TAB MANAGEMENT ---
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

    // --- TOOL 1: 2D DATA DECODER ---
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

            const rows = decodedText.split('<::>').map(r => r.trim()).filter(r => r);
            if (rows.length === 0) {
                renderPlaceholder(decoderOutputContainer, 'No rows found in data.');
                return;
            }

            const tableData = rows.map(row => row.split(';'));
            const maxColumns = Math.max(0, ...tableData.map(row => row.length));
            if (maxColumns === 0) {
                 renderPlaceholder(decoderOutputContainer, 'No columns found in data.');
                 return;
            }
            
            const table = new DOMParser().parseFromString(createTableHTML('decoder-table'), 'text/html').querySelector('table');

            let headerHTML = '<thead><tr><th class="row-header">#</th>';
            for (let i = 1; i <= maxColumns; i++) headerHTML += `<th>Column ${i}</th>`;
            headerHTML += '</tr></thead>';
            table.innerHTML = headerHTML;
            
            const tbody = document.createElement('tbody');
            tableData.forEach((row, rowIndex) => {
                const tr = document.createElement('tr');
                let rowHTML = `<td class="row-header">${rowIndex + 1}</td>`;
                for (let i = 0; i < maxColumns; i++) {
                    const cellData = row[i] || '';
                    rowHTML += `<td>${cellData.replace(/</g, "<")}</td>`;
                }
                tr.innerHTML = rowHTML;
                tbody.appendChild(tr);
            });
            table.appendChild(tbody);

            const totalCells = tableData.reduce((acc, row) => acc + row.length, 0);
            const tfoot = document.createElement('tfoot');
            tfoot.innerHTML = `<tr><td colspan="${maxColumns + 1}">Total Rows: ${rows.length} | Total Cells: ${totalCells}</td></tr>`;
            table.appendChild(tfoot);

            decoderOutputContainer.innerHTML = '';
            decoderOutputContainer.appendChild(table);

        } catch (e) {
            renderError(decoderOutputContainer, 'Decoding Error: Invalid input string.');
        }
    };
    decoderInput.addEventListener('input', handleDecode);
    encodingTypeSelect.addEventListener('change', handleDecode);


    // --- TOOL 2: DSV PARSER & EXTRACTOR ---
    const parserInput = document.getElementById('parser-input');
    const parserOutputContainer = document.getElementById('parser-output-container');
    let parserTimeout;

    const handleParseAndExtract = () => {
        clearTimeout(parserTimeout);
        const rawText = parserInput.value.trim();

        if (!rawText) {
            renderPlaceholder(parserOutputContainer, 'Parsed table will appear here.');
            return;
        }

        renderPlaceholder(parserOutputContainer, '...'); // Simple preloader

        parserTimeout = setTimeout(() => {
            try {
                const allRows = rawText.split('\n').filter(r => r.trim() !== '');
                if (allRows.length === 0) {
                    renderPlaceholder(parserOutputContainer, 'No data to display.');
                    return;
                }

                const headerCells = allRows.shift().split(';');
                const dataRows = allRows;
                const columnCount = headerCells.length;

                const table = new DOMParser().parseFromString(createTableHTML('parser-table'), 'text/html').querySelector('table');

                let headerHTML = '<thead><tr><th class="row-header">#</th>';
                headerCells.forEach(cell => {
                    headerHTML += `<th>${cell.replace(/</g, "<")}</th>`;
                });
                headerHTML += '</tr></thead>';
                table.innerHTML = headerHTML;
                
                const tbody = document.createElement('tbody');
                dataRows.forEach((rowString, rowIndex) => {
                    const rowCells = rowString.split(';');
                    const tr = document.createElement('tr');
                    let rowHTML = `<td class="row-header">${rowIndex + 1}</td>`;
                    for (let i = 0; i < columnCount; i++) {
                        const cellData = rowCells[i] || '';
                        rowHTML += `<td>${cellData.replace(/</g, "<")}</td>`;
                    }
                    tr.innerHTML = rowHTML;
                    tbody.appendChild(tr);
                });
                table.appendChild(tbody);
                
                const statsHTML = `Total Data Rows: ${dataRows.length}`;
                const tfoot = document.createElement('tfoot');
                tfoot.innerHTML = `<tr><td colspan="${columnCount + 1}">${statsHTML}</td></tr>`;
                table.appendChild(tfoot);

                parserOutputContainer.innerHTML = '';
                parserOutputContainer.appendChild(table);

            } catch (e) {
                console.error(e);
                renderError(parserOutputContainer, 'Error parsing data. Check format.');
            }
        }, 300);
    };
    parserInput.addEventListener('input', handleParseAndExtract);


    // --- GOODIES & PROTOTYPES ---
    const prototypes = {
        'decoder-input-base64': 'Sm9obiBEb2U7am9obkBleGFtcGxlLmNvbTw6OmpBTmUgU21pdGg7amFuZUBleGFtcGxlLm9yZztBZG1pbjw6Oj5LZXZpbjtrZXZpbkBzaXRlLnJ1',
        'parser-input': `Ship_ID;Ship_Type;Length;Start_Coordinate;Orientation;Status
SHIP-01;Aircraft Carrier;5;J6;Vertical;Intact
SHIP-02;Battleship;4;B2;Horizontal;Intact
SHIP-03;Cruiser;3;E5;Vertical;Intact
SHIP-04;Submarine;3;G8;Horizontal;Intact
SHIP-05;Destroyer;2;A9;Vertical;Intact`
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
            const tableContainerId = button.dataset.targetTable;
            const table = document.querySelector(`#${tableContainerId} table`);
            if (!table) return;

            navigator.clipboard.writeText(table.innerText).then(() => {
                const originalText = button.innerText;
                button.innerText = 'Copied!';
                button.classList.add('copied');
                setTimeout(() => {
                    button.innerText = originalText;
                    button.classList.remove('copied');
                }, 2000);
            }).catch(err => {
                console.error('Failed to copy text: ', err);
            });
        });
    });


    // --- INITIALIZE APP STATE ---
    renderPlaceholder(decoderOutputContainer, 'Decoded table will appear here.');
    renderPlaceholder(parserOutputContainer, 'Parsed table will appear here.');
    
    // Default to the DSV Parser tab on load
    document.querySelector('.tab-link[data-tool="parser"]').classList.add('active');
    document.querySelector('#parser').classList.add('active');
    document.querySelector('.tab-link[data-tool="decoder"]').classList.remove('active');
    document.querySelector('#decoder').classList.remove('active');
});
