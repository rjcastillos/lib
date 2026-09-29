const PositionCore = window.PositionCore;
let portfolioData = {};
let currentTicker = "";
let statusTimer;

const byId = id => document.getElementById(id);
const today = () => new Date().toISOString().slice(0, 10);
const money = value => new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
}).format(value);
const quantity = value => new Intl.NumberFormat("en-US", {
    maximumFractionDigits: 8
}).format(value);

function setStatus(message, isError = false) {
    const status = byId("statusMessage");
    status.textContent = message;
    status.dataset.kind = isError ? "error" : "success";
    clearTimeout(statusTimer);
    statusTimer = setTimeout(() => {
        status.textContent = "";
        status.dataset.kind = "";
    }, 7000);
}

function handleFileUpload(event) {
    const file = event.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
        try {
            const nextPortfolio = JSON.parse(reader.result);
            PositionCore.validatePortfolio(nextPortfolio);
            portfolioData = nextPortfolio;
            populateTickerDropdown();
            setStatus(`Loaded ${file.name}. Changes remain in this page until you export.`);
        } catch (error) {
            setStatus(`Portfolio was not loaded: ${error.message}`, true);
        } finally {
            event.target.value = "";
        }
    };
    reader.onerror = () => setStatus("Could not read the selected file.", true);
    reader.readAsText(file);
}

function exportJSONFile() {
    if (Object.keys(portfolioData).length === 0) {
        setStatus("Load or create a portfolio before exporting.", true);
        return;
    }
    const blob = new Blob([JSON.stringify(portfolioData, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = "portfolio.json";
    link.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
    setStatus("Portfolio exported. Replace your working JSON file with the downloaded copy.");
}

function populateTickerDropdown() {
    const dropdown = byId("assetDropdown");
    dropdown.replaceChildren();
    const tickers = Object.keys(portfolioData).filter(ticker => !ticker.startsWith("."));
    if (tickers.length === 0) {
        const option = new Option("No real tickers loaded", "");
        dropdown.add(option);
        currentTicker = "";
        render();
        return;
    }
    dropdown.add(new Option("Select a ticker", ""));
    tickers.sort().forEach(ticker => dropdown.add(new Option(portfolioData[ticker].name || ticker, ticker)));
    if (!tickers.includes(currentTicker)) currentTicker = tickers[0];
    dropdown.value = currentTicker;
    render();
}

function selectedAsset() {
    return currentTicker ? portfolioData[currentTicker] : null;
}

function assetHasLegacyPlannerRows(asset) {
    return (asset?.Trades || []).some(trade => trade.Strategy === "DCA_Planner");
}

function openRealLots(asset) {
    return (asset?.Trades || []).map((trade, index) => ({ trade, index }))
        .filter(item => item.trade.On === true && item.trade.Strategy !== "DCA_Planner");
}

function closedRealLots(asset) {
    return (asset?.Trades || []).map((trade, index) => ({ trade, index }))
        .filter(item => item.trade.On === false && item.trade.Strategy !== "DCA_Planner");
}

function appendCell(row, text, className = "") {
    const cell = document.createElement("td");
    cell.textContent = text;
    if (className) cell.className = className;
    row.appendChild(cell);
    return cell;
}

function renderOpenLots(asset) {
    const body = byId("openLotsBody");
    body.replaceChildren();
    openRealLots(asset).forEach(({ trade, index }) => {
        const row = document.createElement("tr");
        const selectCell = document.createElement("td");
        const checkbox = document.createElement("input");
        checkbox.type = "checkbox";
        checkbox.setAttribute("aria-label", `Select lot ${index + 1} to close`);
        checkbox.dataset.lotIndex = String(index);
        selectCell.appendChild(checkbox);
        row.appendChild(selectCell);
        appendCell(row, trade.Direction || "Long");
        appendCell(row, trade.Strategy || "");
        appendCell(row, trade.DateIn || "");
        appendCell(row, quantity(Number(trade.Qty) || 0));
        appendCell(row, money(Number(trade.PriceIn) || 0));
        appendCell(row, money(Number(trade.Commission) || 0));
        const closeCell = document.createElement("td");
        const closeInput = document.createElement("input");
        closeInput.type = "number";
        closeInput.min = "0";
        closeInput.max = String(Number(trade.Qty) || 0);
        closeInput.step = "any";
        closeInput.value = String(Number(trade.Qty) || 0);
        closeInput.disabled = true;
        closeInput.dataset.closeQuantity = String(index);
        closeInput.setAttribute("aria-label", `Quantity from lot ${index + 1} to close`);
        checkbox.addEventListener("change", () => {
            closeInput.disabled = !checkbox.checked;
        });
        closeCell.appendChild(closeInput);
        row.appendChild(closeCell);
        body.appendChild(row);
    });
    if (body.children.length === 0) {
        const row = document.createElement("tr");
        appendCell(row, "", "empty-cell").colSpan = 8;
        row.firstChild.textContent = "No open real-position lots.";
        body.appendChild(row);
    }
}

function realizedPnl(trade) {
    const quantityValue = Number(trade.Qty) || 0;
    const entryPrice = Number(trade.PriceIn) || 0;
    const exitPrice = Number(trade.PriceOut) || 0;
    const entryFee = Number(trade.Commission) || 0;
    const exitFee = Number(trade.CommissionOut) || 0;
    return trade.Direction === "Short"
        ? quantityValue * entryPrice - entryFee - quantityValue * exitPrice - exitFee
        : quantityValue * exitPrice - exitFee - quantityValue * entryPrice - entryFee;
}

function renderClosedLots(asset) {
    const body = byId("closedLotsBody");
    body.replaceChildren();
    closedRealLots(asset).forEach(({ trade }) => {
        const row = document.createElement("tr");
        appendCell(row, trade.Direction || "");
        appendCell(row, trade.Strategy || "");
        appendCell(row, trade.DateIn || "");
        appendCell(row, trade.DateOut || "");
        appendCell(row, quantity(Number(trade.Qty) || 0));
        appendCell(row, money(Number(trade.PriceIn) || 0));
        appendCell(row, money(Number(trade.PriceOut) || 0));
        appendCell(row, money(Number(trade.CommissionOut) || 0));
        appendCell(row, money(realizedPnl(trade)), realizedPnl(trade) >= 0 ? "positive" : "negative");
        body.appendChild(row);
    });
    if (body.children.length === 0) {
        const row = document.createElement("tr");
        const cell = appendCell(row, "No closed real-position lots yet.", "empty-cell");
        cell.colSpan = 9;
        body.appendChild(row);
    }
}

function render() {
    const asset = selectedAsset();
    const empty = !asset;
    byId("assetPanel").hidden = empty;
    byId("emptyState").hidden = !empty;
    if (empty) return;

    const assetName = asset.name || currentTicker;
    byId("assetHeading").textContent = assetName.includes(`(${currentTicker})`)
        ? assetName
        : `${assetName} (${currentTicker})`;
    byId("dividendInput").value = String(Number(asset.Div) || 0);
    byId("periodicityInput").value = asset.Periodicity || "M";
    const warning = byId("legacyPlannerWarning");
    warning.hidden = !assetHasLegacyPlannerRows(asset);
    const blocked = assetHasLegacyPlannerRows(asset);
    byId("openTradeButton").disabled = blocked;
    byId("closeTradeButton").disabled = blocked;
    if (blocked) {
        warning.textContent = `This ticker contains DCA_Planner rows. Move them to a dot-prefixed planner ticker before recording real positions.`;
    }

    try {
        const summary = PositionCore.summarize(asset);
        byId("positionDirection").textContent = summary.quantity > 0 ? summary.direction : "Flat";
        byId("positionQuantity").textContent = quantity(summary.quantity);
        byId("positionAverage").textContent = money(summary.averagePrice);
        byId("positionInvested").textContent = money(summary.invested);
        byId("positionDividend").textContent = money(summary.quantity * (Number(asset.Div) || 0));
        byId("positionDividendUnit").textContent = `per ${asset.Periodicity || "M"} payout`;
        const direction = byId("tradeDirection");
        [...direction.options].forEach(option => {
            option.disabled = summary.quantity > 0 && option.value !== summary.direction;
        });
        if (summary.quantity > 0) direction.value = summary.direction;
    } catch (error) {
        setStatus(error.message, true);
    }
    renderOpenLots(asset);
    renderClosedLots(asset);
    updateCloseNow();
}

function handleAddTicker(event) {
    event.preventDefault();
    const ticker = byId("newTickerInput").value.trim().toUpperCase();
    if (!ticker || ticker.startsWith(".")) {
        setStatus("Enter a real ticker symbol without a leading dot.", true);
        return;
    }
    if (portfolioData[ticker]) {
        currentTicker = ticker;
        byId("assetDropdown").value = ticker;
        render();
        setStatus(`${ticker} already exists; selected it instead.`);
        return;
    }
    try {
        const asset = PositionCore.createAsset(ticker, {
            name: byId("newNameInput").value,
            dividend: byId("newDividendInput").value,
            periodicity: byId("newPeriodicityInput").value
        });
        portfolioData[ticker] = asset;
        byId("newTickerInput").value = "";
        byId("newNameInput").value = "";
        populateTickerDropdown();
        currentTicker = ticker;
        byId("assetDropdown").value = ticker;
        render();
        setStatus(`Created ${ticker} in memory. Export the portfolio to save it.`);
    } catch (error) {
        setStatus(error.message, true);
    }
}

function handleOpenTrade(event) {
    event.preventDefault();
    const asset = selectedAsset();
    if (!asset) return;
    try {
        const result = PositionCore.openPosition(asset, currentTicker, {
            direction: byId("tradeDirection").value,
            strategy: byId("strategyInput").value,
            quantity: byId("entryQuantity").value,
            price: byId("entryPrice").value,
            commission: byId("entryCommission").value,
            dateIn: byId("entryDate").value
        });
        portfolioData[currentTicker] = result.asset;
        byId("entryQuantity").value = "";
        byId("entryPrice").value = "";
        byId("entryCommission").value = "0";
        render();
        setStatus(`${result.summary.direction} position updated. Export to save the trade.`);
    } catch (error) {
        setStatus(error.message, true);
    }
}

function handleCloseTrade(event) {
    event.preventDefault();
    const asset = selectedAsset();
    if (!asset) return;
    const selections = [...document.querySelectorAll("[data-lot-index]:checked")].map(checkbox => {
        const index = Number(checkbox.dataset.lotIndex);
        return { index, quantity: document.querySelector(`[data-close-quantity="${index}"]`).value };
    });
    try {
        const result = PositionCore.closePosition(asset, currentTicker, {
            selections,
            price: byId("closePrice").value,
            commissionOut: byId("closeCommission").value,
            dateOut: byId("closeDate").value
        });
        portfolioData[currentTicker] = result.asset;
        render();
        setStatus(`Closed selected quantity. Realized P&L: ${money(result.realizedPnl)}. Export to save.`);
    } catch (error) {
        setStatus(error.message, true);
    }
}

function updateCloseNow() {
    const asset = selectedAsset();
    const price = byId("currentPriceInput").value;
    if (!asset || price === "") {
        byId("closeNowResult").textContent = "Enter a current price to estimate unrealized P&L.";
        return;
    }
    try {
        const estimate = PositionCore.estimateCloseNow(asset, price);
        if (estimate.quantity === 0) {
            byId("closeNowResult").textContent = "There is no open position to value.";
            return;
        }
        byId("closeNowResult").textContent = `${money(estimate.unrealizedPnl)} before any closing commission`;
        byId("closeNowResult").className = estimate.unrealizedPnl >= 0 ? "positive" : "negative";
    } catch (error) {
        byId("closeNowResult").textContent = error.message;
    }
}

function updateTickerMetadata() {
    const asset = selectedAsset();
    if (!asset) return;
    try {
        const dividend = Number(byId("dividendInput").value);
        if (!Number.isFinite(dividend) || dividend < 0) throw new Error("Dividend per cycle must be nonnegative.");
        const periodicity = byId("periodicityInput").value;
        if (!Object.hasOwn({ M: true, Q: true, S: true, A: true }, periodicity)) {
            throw new Error("Choose a supported dividend period.");
        }
        const updatedAsset = JSON.parse(JSON.stringify(asset));
        updatedAsset.Div = dividend;
        updatedAsset.Periodicity = periodicity;
        PositionCore.syncSummary(updatedAsset);
        portfolioData[currentTicker] = updatedAsset;
        render();
        setStatus("Dividend metadata updated in memory. Export to save.");
    } catch (error) {
        setStatus(error.message, true);
    }
}

byId("portfolioFile").addEventListener("change", handleFileUpload);
byId("exportButton").addEventListener("click", exportJSONFile);
byId("assetDropdown").addEventListener("change", event => {
    currentTicker = event.target.value;
    render();
});
byId("newTickerForm").addEventListener("submit", handleAddTicker);
byId("openTradeForm").addEventListener("submit", handleOpenTrade);
byId("closeTradeForm").addEventListener("submit", handleCloseTrade);
byId("metadataForm").addEventListener("change", updateTickerMetadata);
byId("currentPriceInput").addEventListener("input", updateCloseNow);
byId("entryDate").value = today();
byId("closeDate").value = today();
populateTickerDropdown();