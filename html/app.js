let portfolioData = {};
let currentTicker = "";

const periodMultiplier = { "M": 12, "Q": 4, "S": 2, "A": 1 };

function handleFileUpload(event) {
    const file = event.target.files[0]; // Fixed file reference handler index
    if (!file) return;

    const reader = new FileReader();
    reader.onload = function(e) {
        try {
            portfolioData = JSON.parse(e.target.result);
            showStatus("File loaded successfully into web app cache.");
            populateDropdown();
        } catch (err) {
            alert("Error parsing file contents. Please verify that it is valid JSON.");
        }
    };
    reader.readAsText(file);
}

function exportJSONFile() {
    saveCurrentViewToData();
    
    if (Object.keys(portfolioData).length === 0) {
        alert("There is no active data profile workspace to download.");
        return;
    }

    const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(portfolioData, null, 2));
    const downloadAnchor = document.createElement('a');
    downloadAnchor.setAttribute("href", dataStr);
    downloadAnchor.setAttribute("download", "portfolio.json");
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();
    showStatus("JSON downloaded! Replace your local working copy with this file.");
}

function showStatus(msg) {
    const el = document.getElementById('statusMessage');
    el.innerText = msg;
    setTimeout(() => el.innerText = "", 5000);
}

function populateDropdown() {
    const dropdown = document.getElementById('assetDropdown');
    dropdown.innerHTML = "";
    
    const keys = Object.keys(portfolioData);
    if(keys.length === 0) {
        dropdown.innerHTML = '<option value="">-- No Assets Found --</option>';
        return;
    }
    
    keys.forEach(key => {
        const option = document.createElement('option');
        option.value = key;
        option.innerText = portfolioData[key].name || key;
        dropdown.appendChild(option);
    });
    
    // FIX: Extracted correct first string variable element key index element instead of array instance
    dropdown.value = keys[0];
    switchAsset();
}

function addNewTicker() {
    const rawInput = document.getElementById('newTickerInput').value.toUpperCase().trim();
    if (!rawInput) return;
    
    if (portfolioData[rawInput]) {
        alert("Asset node already exists in memory structure.");
        document.getElementById('assetDropdown').value = rawInput;
        switchAsset();
        return;
    }
    
    portfolioData[rawInput] = {
        "name": `${rawInput} Corporation`,
        "Ticker": rawInput,
        "Div": 0.0,
        "Price": 0.0,
        "Periodicity": "M",
        "Qty": 0,
        "NextExDate": "",
        "Positions": [],
        "Trades": []
    };
    
    document.getElementById('newTickerInput').value = "";
    populateDropdown();
    document.getElementById('assetDropdown').value = rawInput;
    switchAsset();
}

function switchAsset() {
    // Save current state of old asset if switching away
    if (currentTicker && portfolioData[currentTicker]) {
        saveCurrentViewToData();
    }

    currentTicker = document.getElementById('assetDropdown').value;
    if (!currentTicker || !portfolioData[currentTicker]) return;

    const asset = portfolioData[currentTicker];
    
    document.getElementById('divInput').value = asset.Div || 0;
    document.getElementById('periodInput').value = asset.Periodicity || "M";
    
    const tbody = document.getElementById('ledgerBody');
    tbody.innerHTML = "";
    
    if (asset.Trades && asset.Trades.length > 0) {
        asset.Trades.forEach(trade => {
            const qtyVal = parseFloat(trade.Qty) || 0;
            const priceVal = parseFloat(trade.PriceIn) || 0;
            const commVal = parseFloat(trade.Commission) || 0;
            // Handle logical checkbox activation strictly
            const activeVal = trade.On !== undefined ? trade.On : true;
            addTrancheRow(activeVal, qtyVal, priceVal, commVal);
        });
    } else {
        addTrancheRow(true, 0, 0, 0);
    }
    
    calculateDCA();
}

function addTrancheRow(active = true, qty = 0, price = 0, comm = 0) {
    const tbody = document.getElementById('ledgerBody');
    const tr = document.createElement('tr');
    
    tr.innerHTML = `
        <td><input type="checkbox" class="table-input row-on" ${active ? 'checked' : ''} onchange="calculateDCA()"></td>
        <td><input type="number" class="table-input row-qty" value="${qty}" oninput="calculateDCA()"></td>
        <td><input type="number" class="table-input row-price" value="${price}" step="0.01" oninput="calculateDCA()"></td>
        <td><input type="number" class="table-input row-comm" value="${comm}" step="0.01" oninput="calculateDCA()"></td>
        <td class="investment">$0.00</td>
        <td class="priceAfterComm">—</td>
        <td class="dollarAvg">—</td>
        <td class="payableAmount">$0.00</td>
        <td class="yoc">0.00%</td>
    `;
    tbody.appendChild(tr);
    calculateDCA();
}

function updateMetaAndCalc() {
    if (!currentTicker || !portfolioData[currentTicker]) return;
    portfolioData[currentTicker].Div = parseFloat(document.getElementById('divInput').value) || 0;
    portfolioData[currentTicker].Periodicity = document.getElementById('periodInput').value;
    calculateDCA();
}

function saveCurrentViewToData() {
    if (!currentTicker || !portfolioData[currentTicker]) return;
    
    const rows = document.querySelectorAll('#ledgerBody tr');
    const tradesArray = [];
    let totalShares = 0;
    let totalInvested = 0;
    
    rows.forEach(row => {
        const isOn = row.querySelector('.row-on').checked;
        const qty = parseFloat(row.querySelector('.row-qty').value) || 0;
        const price = parseFloat(row.querySelector('.row-price').value) || 0;
        const comm = parseFloat(row.querySelector('.row-comm').value) || 0;
        const totalCost = (qty * price) + comm;

        if (isOn) {
            totalShares += qty;
            totalInvested += totalCost;
        }

        tradesArray.push({
            On: isOn,
            Strategy: "DCA_Planner",
            Qty: qty,
            Direction: "Long",
            DateIn: new Date().toISOString().split('T')[0],
            PriceIn: price,
            Commission: comm,
            DateOut: "",
            PriceOut: 0
        });
    });
    
    // Sync calculations inside JSON schema mirrors
    portfolioData[currentTicker].Trades = tradesArray;
    portfolioData[currentTicker].Qty = totalShares;
    portfolioData[currentTicker].Invested = parseFloat(totalInvested.toFixed(2));
    portfolioData[currentTicker].DivAmnt = parseFloat((totalShares * (portfolioData[currentTicker].Div || 0)).toFixed(2));
    
    if (portfolioData[currentTicker].Positions && portfolioData[currentTicker].Positions[0]) {
        portfolioData[currentTicker].Positions[0].Size = totalShares;
        portfolioData[currentTicker].Positions[0].AvgPrice = totalShares > 0 ? parseFloat((totalInvested / totalShares).toFixed(4)) : 0;
    }
}

function calculateDCA() {
    const divValue = parseFloat(document.getElementById('divInput').value) || 0;
    const period = document.getElementById('periodInput').value || "M";
    const multiplier = periodMultiplier[period] || 12;
    const annualDiv = divValue * multiplier;
    
    document.getElementById('annualDiv').value = `$${annualDiv.toFixed(2)}`;

    const rows = document.querySelectorAll('#ledgerBody tr');
    let runningShares = 0;
    let runningInvestment = 0;

    rows.forEach(row => {
        const isOn = row.querySelector('.row-on').checked;
        const qty = parseFloat(row.querySelector('.row-qty').value) || 0;
        const price = parseFloat(row.querySelector('.row-price').value) || 0;
        const comm = parseFloat(row.querySelector('.row-comm').value) || 0;

        const investment = (qty * price) + comm;
        const priceAfterComm = qty > 0 ? investment / qty : 0;

        if (isOn) {
            runningShares += qty;
            runningInvestment += investment;
        }

        const currentAvg = runningShares > 0 ? runningInvestment / runningShares : 0;
        const currentPayable = runningShares * divValue;
        const currentYoc = currentAvg > 0 ? (annualDiv / currentAvg) * 100 : 0;

        row.querySelector('.investment').innerText = `$${investment.toFixed(2)}`;
        row.querySelector('.priceAfterComm').innerText = qty > 0 ? `$${priceAfterComm.toFixed(2)}` : '—';
        
        if (isOn && runningShares > 0) {
            row.querySelector('.dollarAvg').innerText = `$${currentAvg.toFixed(2)}`;
            row.querySelector('.payableAmount').innerText = `$${currentPayable.toFixed(2)}`;
            row.querySelector('.yoc').innerText = `${currentYoc.toFixed(2)}%`;
        } else {
            row.querySelector('.dollarAvg').innerText = '—';
            row.querySelector('.payableAmount').innerText = '—';
            row.querySelector('.yoc').innerText = '—';
        }
    });

    const finalAvg = runningShares > 0 ? runningInvestment / runningShares : 0;
    document.getElementById('totalQty').innerText = runningShares;
    document.getElementById('totalInvestment').innerText = `$${runningInvestment.toFixed(2)}`;
    document.getElementById('finalAvg').innerText = `$${finalAvg.toFixed(2)}`;
    document.getElementById('finalPayable').innerText = `$${(runningShares * divValue).toFixed(2)}`;
    document.getElementById('finalYoc').innerText = finalAvg > 0 ? `${(annualDiv / finalAvg * 100).toFixed(2)}%` : '0.00%';
}
