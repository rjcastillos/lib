let portfolioData = {};
let currentTicker = "";
let renderedTicker = "";
const periodMultiplier = { M: 12, Q: 4, S: 2, A: 1 };

function isPlannerTicker(ticker) {
    return ticker.startsWith(".");
}

function validatePortfolio(data) {
    if (!data || typeof data !== "object" || Array.isArray(data)) {
        throw new Error("Portfolio JSON must be an object keyed by ticker.");
    }
    for (const [ticker, asset] of Object.entries(data)) {
        if (!asset || typeof asset !== "object" || Array.isArray(asset)) {
            throw new Error(`${ticker} must contain an asset object.`);
        }
        if (asset.Trades !== undefined && !Array.isArray(asset.Trades)) {
            throw new Error(`${ticker}.Trades must be an array.`);
        }
        for (const [index, trade] of (asset.Trades || []).entries()) {
            if (!trade || typeof trade !== "object" || Array.isArray(trade)) {
                throw new Error(`${ticker}.Trades[${index}] must be an object.`);
            }
            if (trade.On !== undefined && typeof trade.On !== "boolean") {
                throw new Error(`${ticker}.Trades[${index}].On must be a boolean.`);
            }
            if (trade.Action !== undefined && !["Buy", "Sell"].includes(trade.Action)) {
                throw new Error(`${ticker}.Trades[${index}].Action must be Buy or Sell.`);
            }
            for (const field of ["Qty", "PriceIn", "Price", "Commission"]) {
                if (trade[field] !== undefined && trade[field] !== "" && !Number.isFinite(Number(trade[field]))) {
                    throw new Error(`${ticker}.Trades[${index}].${field} must be numeric.`);
                }
            }
            if (trade.Action && !/^\d{4}-\d{2}-\d{2}$/.test(trade.Date || "")) {
                throw new Error(`${ticker}.Trades[${index}].Date must use YYYY-MM-DD.`);
            }
        }
    }
}

function handleFileUpload(event) {
    const file = event.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
        try {
            const nextPortfolio = JSON.parse(reader.result);
            validatePortfolio(nextPortfolio);
            portfolioData = nextPortfolio;
            currentTicker = "";
            renderedTicker = "";
            populateDropdown();
            showStatus("Portfolio loaded. Changes remain in this page until export.");
        } catch (error) {
            showStatus(`Portfolio not loaded: ${error.message}`, true);
        } finally {
            event.target.value = "";
        }
    };
    reader.onerror = () => showStatus("Could not read the selected file.", true);
    reader.readAsText(file);
}

function exportJSONFile() {
    saveCurrentViewToData();
    if (Object.keys(portfolioData).length === 0) {
        showStatus("Load or create a portfolio before exporting.", true);
        return;
    }
    const blob = new Blob([JSON.stringify(portfolioData, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = "portfolio.json";
    link.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
    showStatus("Portfolio exported. Replace your working JSON with the downloaded copy.");
}

let statusTimer;
function showStatus(message, isError = false) {
    const status = document.getElementById("statusMessage");
    status.textContent = message;
    status.dataset.kind = isError ? "error" : "success";
    clearTimeout(statusTimer);
    statusTimer = setTimeout(() => {
        status.textContent = "";
        status.dataset.kind = "";
    }, 6000);
}

function populateDropdown() {
    const dropdown = document.getElementById("assetDropdown");
    dropdown.replaceChildren();
    const keys = Object.keys(portfolioData).sort();
    if (keys.length === 0) {
        dropdown.add(new Option("No assets found", ""));
        currentTicker = "";
        document.getElementById("ledgerBody").replaceChildren();
        calculateDCA();
        return;
    }
    keys.forEach(key => dropdown.add(new Option(portfolioData[key].name || key, key)));
    if (!keys.includes(currentTicker)) currentTicker = keys[0];
    dropdown.value = currentTicker;
    switchAsset();
}

function addNewTicker() {
    const rawInput = document.getElementById("newTickerInput").value.trim().toUpperCase();
    const symbol = rawInput.replace(/^\.+/, "");
    if (!symbol) {
        showStatus("Enter a ticker symbol for the DCA planner.", true);
        return;
    }
    const plannerTicker = `.${symbol}`;
    if (!portfolioData[plannerTicker]) {
        portfolioData[plannerTicker] = {
            name: `${symbol} DCA Plan`,
            Ticker: plannerTicker,
            Div: 0,
            Price: 0,
            Periodicity: "M",
            Qty: 0,
            NextExDate: "",
            Positions: [{ Direction: "Long", Size: 0, AvgPrice: 0 }],
            Trades: [],
            Invested: 0,
            DivAmnt: 0
        };
    }
    document.getElementById("newTickerInput").value = "";
    populateDropdown();
    document.getElementById("assetDropdown").value = plannerTicker;
    switchAsset();
    showStatus(`Planner ticker ${plannerTicker} is ready. Export to save it.`);
}

function switchAsset() {
    if (renderedTicker && portfolioData[renderedTicker]) saveCurrentViewToData(renderedTicker);
    currentTicker = document.getElementById("assetDropdown").value;
    renderedTicker = currentTicker;
    const tbody = document.getElementById("ledgerBody");
    tbody.replaceChildren();
    const asset = portfolioData[currentTicker];
    if (!asset) {
        calculateDCA();
        return;
    }

    document.getElementById("divInput").value = Number(asset.Div) || 0;
    document.getElementById("periodInput").value = asset.Periodicity || "M";
    const trades = asset.Trades || [];
    if (isPlannerTicker(currentTicker)) {
        trades.forEach((trade, index) => {
            if (trade.Strategy !== "DCA_Planner") return;
            addTrancheRow(trade.On === true, Number(trade.Qty) || 0, Number(trade.PriceIn) || 0,
                Number(trade.Commission) || 0, "planner", index);
        });
        if (tbody.children.length === 0) addTrancheRow(true, 0, 0, 0, "planner");
    } else if (trades.some(trade => trade.Action === "Buy" || trade.Action === "Sell")) {
        const openQuantity = Number(asset.Qty) || 0;
        const averageBasis = Number(asset.Positions?.[0]?.AvgPrice) || 0;
        if (openQuantity > 0) addTrancheRow(true, openQuantity, averageBasis, 0, "position");
    } else {
        trades.forEach(trade => {
            if (trade.On !== true || trade.Strategy === "DCA_Planner") return;
            addTrancheRow(true, Number(trade.Qty) || 0, Number(trade.PriceIn) || 0,
                Number(trade.Commission) || 0, "position");
        });
        if (trades.some(trade => trade.Strategy === "DCA_Planner")) {
            showStatus(`${currentTicker} has legacy DCA_Planner rows. They are hidden here; use a dot-prefixed planner ticker.`, true);
        }
    }
    calculateDCA();
}

function addTrancheRow(active, qty = 0, price = 0, comm = 0, kind, tradeIndex = -1) {
    const tbody = document.getElementById("ledgerBody");
    const tr = document.createElement("tr");
    const rowKind = kind || (isPlannerTicker(currentTicker) ? "planner" : "planned");
    const included = active ?? rowKind !== "planned";
    tr.dataset.rowKind = rowKind;
    tr.dataset.tradeIndex = String(tradeIndex);
    const readOnly = rowKind === "position";
    const kindLabel = rowKind === "position" ? "Open position" : rowKind === "planner" ? "Planner row" : "Future only";
    tr.innerHTML = `
        <td>${kindLabel}</td>
        <td><input type="checkbox" class="table-input row-on" ${included ? "checked" : ""} ${readOnly ? "disabled" : ""} aria-label="Include this row in DCA calculations"></td>
        <td><input type="number" class="table-input row-qty" min="0" step="any" value="${qty}" ${readOnly ? "disabled" : ""}></td>
        <td><input type="number" class="table-input row-price" min="0" step="any" value="${price}" ${readOnly ? "disabled" : ""}></td>
        <td><input type="number" class="table-input row-comm" min="0" step="0.01" value="${comm}" ${readOnly ? "disabled" : ""}></td>
        <td class="investment">$0.00</td>
        <td class="priceAfterComm">—</td>
        <td class="dollarAvg">—</td>
        <td class="payableAmount">$0.00</td>
        <td class="yoc">0.00%</td>`;
    tr.querySelectorAll("input").forEach(input => {
        input.addEventListener("input", calculateDCA);
        input.addEventListener("change", calculateDCA);
    });
    tbody.appendChild(tr);
    calculateDCA();
}

function updateMetaAndCalc() {
    if (!currentTicker || !portfolioData[currentTicker]) return;
    const dividend = Number(document.getElementById("divInput").value);
    if (!Number.isFinite(dividend) || dividend < 0) {
        showStatus("Dividend per payout cycle must be a nonnegative number.", true);
        return;
    }
    portfolioData[currentTicker].Div = dividend;
    portfolioData[currentTicker].Periodicity = document.getElementById("periodInput").value;
    calculateDCA();
}

function saveCurrentViewToData(ticker = currentTicker) {
    if (!ticker || !portfolioData[ticker]) return;
    const asset = portfolioData[ticker];
    const rows = [...document.querySelectorAll("#ledgerBody tr")];
    const activeRows = rows.filter(row => row.querySelector(".row-on").checked);
    const totalShares = activeRows.reduce((sum, row) => sum + (Number(row.querySelector(".row-qty").value) || 0), 0);
    const totalInvested = activeRows.reduce((sum, row) => sum
        + (Number(row.querySelector(".row-qty").value) || 0) * (Number(row.querySelector(".row-price").value) || 0)
        + (Number(row.querySelector(".row-comm").value) || 0), 0);

    if (!isPlannerTicker(ticker)) {
        asset.DivAmnt = (Number(asset.Qty) || 0) * (Number(asset.Div) || 0);
        return;
    }

    const originalTrades = asset.Trades || [];
    const updatesByIndex = new Map();
    const addedTrades = [];
    rows.filter(row => row.dataset.rowKind === "planner").forEach(row => {
        const index = Number(row.dataset.tradeIndex);
        const original = originalTrades[index] || {};
        const trade = {
            ...original,
            On: row.querySelector(".row-on").checked,
            Strategy: "DCA_Planner",
            Qty: Number(row.querySelector(".row-qty").value) || 0,
            Direction: original.Direction || "Long",
            DateIn: original.DateIn || new Date().toISOString().slice(0, 10),
            PriceIn: Number(row.querySelector(".row-price").value) || 0,
            Commission: Number(row.querySelector(".row-comm").value) || 0,
            DateOut: original.DateOut || "",
            PriceOut: Number(original.PriceOut) || 0,
            CommissionOut: Number(original.CommissionOut) || 0
        };
        if (index >= 0) updatesByIndex.set(index, trade);
        else addedTrades.push(trade);
    });
    asset.Trades = originalTrades.map((trade, index) => updatesByIndex.get(index) || trade).concat(addedTrades);
    asset.Qty = totalShares;
    asset.Invested = totalInvested;
    asset.DivAmnt = totalShares * (Number(asset.Div) || 0);
    const position = asset.Positions?.[0] || { Direction: "Long", Size: 0, AvgPrice: 0 };
    position.Size = totalShares;
    position.AvgPrice = totalShares > 0 ? totalInvested / totalShares : 0;
    asset.Positions = [position];
}

function calculateDCA() {
    const dividendInput = Number(document.getElementById("divInput").value);
    const divValue = Number.isFinite(dividendInput) && dividendInput >= 0 ? dividendInput : 0;
    const period = document.getElementById("periodInput").value || "M";
    const annualDiv = divValue * (periodMultiplier[period] || 12);
    document.getElementById("annualDiv").value = `$${annualDiv.toFixed(2)}`;
    let runningShares = 0;
    let runningInvestment = 0;

    document.querySelectorAll("#ledgerBody tr").forEach(row => {
        const included = row.querySelector(".row-on").checked;
        const qty = Number(row.querySelector(".row-qty").value) || 0;
        const price = Number(row.querySelector(".row-price").value) || 0;
        const commission = Number(row.querySelector(".row-comm").value) || 0;
        const investment = qty * price + commission;
        if (included) {
            runningShares += qty;
            runningInvestment += investment;
        }
        const average = runningShares > 0 ? runningInvestment / runningShares : 0;
        const payable = runningShares * divValue;
        const yoc = average > 0 ? annualDiv / average * 100 : 0;
        row.querySelector(".investment").textContent = `$${investment.toFixed(2)}`;
        row.querySelector(".priceAfterComm").textContent = qty > 0 ? `$${(investment / qty).toFixed(2)}` : "—";
        row.querySelector(".dollarAvg").textContent = included && runningShares > 0 ? `$${average.toFixed(2)}` : "—";
        row.querySelector(".payableAmount").textContent = included && runningShares > 0 ? `$${payable.toFixed(2)}` : "—";
        row.querySelector(".yoc").textContent = included && runningShares > 0 ? `${yoc.toFixed(2)}%` : "—";
    });

    const average = runningShares > 0 ? runningInvestment / runningShares : 0;
    document.getElementById("totalQty").textContent = runningShares;
    document.getElementById("totalInvestment").textContent = `$${runningInvestment.toFixed(2)}`;
    document.getElementById("finalAvg").textContent = `$${average.toFixed(2)}`;
    document.getElementById("finalPayable").textContent = `$${(runningShares * divValue).toFixed(2)}`;
    document.getElementById("finalYoc").textContent = average > 0 ? `${(annualDiv / average * 100).toFixed(2)}%` : "0.00%";
}
