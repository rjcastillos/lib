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
    try {
        Object.entries(portfolioData).forEach(([ticker, asset]) => {
            if (ticker.startsWith(".") || assetHasLegacyPlannerRows(asset)) return;
            PositionCore.syncSummary(asset);
        });
    } catch (error) {
        setStatus(`Portfolio was not exported: ${error.message}`, true);
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

function appendCell(row, text, className = "") {
    const cell = document.createElement("td");
    cell.textContent = text;
    if (className) cell.className = className;
    row.appendChild(cell);
    return cell;
}

function legacyRealizedPnl(trade) {
    const quantityValue = Number(trade.Qty) || 0;
    const entryPrice = Number(trade.PriceIn) || 0;
    const exitPrice = Number(trade.PriceOut) || 0;
    const entryFee = Number(trade.Commission) || 0;
    const exitFee = Number(trade.CommissionOut) || 0;
    return trade.Direction === "Short"
        ? quantityValue * entryPrice - entryFee - quantityValue * exitPrice - exitFee
        : quantityValue * exitPrice - exitFee - quantityValue * entryPrice - entryFee;
}

function renderTradeHistory(asset, summary) {
    const body = byId("tradeHistoryBody");
    const realizedByIndex = new Map((summary?.realizedTrades || []).map(item => [item.index, item.realizedPnl]));
    body.replaceChildren();
    (asset.Trades || []).forEach((trade, index) => {
        if (trade.Strategy === "DCA_Planner") return;
        let action;
        let date;
        let price;
        let commission;
        let tradePnl;
        if (trade.Action) {
            action = trade.Action;
            date = trade.Date;
            price = trade.Price;
            commission = trade.Commission;
            tradePnl = realizedByIndex.get(index);
        } else if (trade.On === true) {
            action = `${trade.Direction || "Long"} entry`;
            date = trade.DateIn;
            price = trade.PriceIn;
            commission = trade.Commission;
        } else if (trade.On === false) {
            action = `${trade.Direction || "Long"} close`;
            date = trade.DateOut;
            price = trade.PriceOut;
            commission = trade.CommissionOut;
            tradePnl = legacyRealizedPnl(trade);
        } else {
            return;
        }
        const row = document.createElement("tr");
        appendCell(row, action || "");
        appendCell(row, trade.Strategy || "");
        appendCell(row, date || "");
        appendCell(row, quantity(Number(trade.Qty) || 0));
        appendCell(row, money(Number(price) || 0));
        appendCell(row, money(Number(commission) || 0));
        appendCell(row, tradePnl === undefined
            ? "—"
            : money(tradePnl), tradePnl === undefined ? "" : tradePnl >= 0 ? "positive" : "negative");
        body.appendChild(row);
    });
    if (body.children.length === 0) {
        const row = document.createElement("tr");
        const cell = appendCell(row, "No real-position executions yet.", "empty-cell");
        cell.colSpan = 7;
        body.appendChild(row);
    }
}

function formatHistoryDate(value) {
    if (!value) return "—";
    return new Intl.DateTimeFormat("en-US", {
        month: "short",
        day: "numeric",
        year: "numeric",
        timeZone: "UTC"
    }).format(new Date(`${value}T00:00:00Z`));
}

function historyRows() {
    const asset = selectedAsset();
    if (!asset) return [];
    return PositionCore.getTradeHistory(asset, {
        filter: byId("tradeHistoryFilter").value,
        startDate: byId("tradeHistoryFrom").value,
        endDate: byId("tradeHistoryTo").value
    });
}

function renderTradeHistoryDialog() {
    const body = byId("tradeHistoryDialogBody");
    body.replaceChildren();
    try {
        const rows = historyRows();
        rows.forEach(trade => {
            const row = document.createElement("tr");
            const values = [
                trade.action,
                trade.status,
                trade.on === null ? "—" : String(trade.on),
                trade.strategy || "—",
                quantity(trade.quantity),
                trade.direction,
                formatHistoryDate(trade.dateIn),
                trade.priceIn === "" ? "—" : money(Number(trade.priceIn)),
                trade.commissionIn === "" ? "—" : money(Number(trade.commissionIn)),
                formatHistoryDate(trade.dateOut),
                trade.priceOut === "" ? "—" : money(Number(trade.priceOut)),
                trade.commissionOut === "" ? "—" : money(Number(trade.commissionOut))
            ];
            values.forEach(value => appendCell(row, value));
            body.appendChild(row);
        });
        if (rows.length === 0) {
            const row = document.createElement("tr");
            const cell = appendCell(row, "No trades match these filters.", "empty-cell");
            cell.colSpan = 12;
            body.appendChild(row);
        }
        byId("tradeHistoryCount").textContent = `${rows.length} ${rows.length === 1 ? "trade" : "trades"}`;
        return rows;
    } catch (error) {
        const row = document.createElement("tr");
        const cell = appendCell(row, error.message, "empty-cell");
        cell.colSpan = 12;
        body.appendChild(row);
        byId("tradeHistoryCount").textContent = "Filters could not be applied.";
        return [];
    }
}

function openTradeHistory() {
    const asset = selectedAsset();
    if (!asset) return;
    const hasExecutionLedger = (asset.Trades || []).some(trade => trade.Action === "Buy" || trade.Action === "Sell");
    byId("tradeHistoryFilter").value = hasExecutionLedger ? "all" : "open";
    byId("tradeHistoryFrom").value = "";
    byId("tradeHistoryTo").value = "";
    byId("tradesDialogHeading").textContent = `Trade history · ${currentTicker}`;
    renderTradeHistoryDialog();
    byId("tradesDialog").showModal();
}

function downloadTradeHistory() {
    const rows = renderTradeHistoryDialog();
    const csv = `\uFEFF${PositionCore.tradeHistoryToCsv(rows)}`;
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    const safeTicker = currentTicker.replace(/[^A-Z0-9.-]/g, "_");
    link.href = url;
    link.download = `${safeTicker}-trades-${today()}.csv`;
    link.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
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
    const exDate = PositionCore.formatNextExDate(asset.NextExDate);
    byId("nextExDateField").hidden = !exDate;
    byId("nextExDate").textContent = exDate;
    byId("nextExDate").dateTime = /^\d{8}$/.test(asset.NextExDate || "")
        ? `${asset.NextExDate.slice(0, 4)}-${asset.NextExDate.slice(4, 6)}-${asset.NextExDate.slice(6, 8)}`
        : "";
    byId("dividendInput").value = String(Number(asset.Div) || 0);
    byId("periodicityInput").value = asset.Periodicity || "M";
    const warning = byId("legacyPlannerWarning");
    warning.hidden = !assetHasLegacyPlannerRows(asset);
    const blocked = assetHasLegacyPlannerRows(asset);
    byId("openTradeButton").disabled = blocked;
    byId("closeTradeButton").disabled = blocked;
    byId("closePositionButton").disabled = blocked;
    if (blocked) {
        warning.textContent = `This ticker contains DCA_Planner rows. Move them to a dot-prefixed planner ticker before recording real positions.`;
    }

    let summary;
    try {
        summary = PositionCore.summarize(asset);
        byId("positionDirection").textContent = summary.quantity > 0 ? summary.direction : "Flat";
        byId("positionQuantity").textContent = quantity(summary.quantity);
        byId("positionAverage").textContent = money(summary.averagePrice);
        byId("positionInvested").textContent = money(summary.invested);
        byId("positionDividend").textContent = money(summary.quantity * (Number(asset.Div) || 0));
        byId("positionDividendUnit").textContent = `per ${asset.Periodicity || "M"} payout`;
        byId("closeActionHint").textContent = summary.direction === "Short"
            ? "A reduction records a buy to cover; leave quantity blank to close the full position."
            : "A reduction records a sell; leave quantity blank to close the full position.";
        byId("closeQuantity").max = String(summary.quantity);
        byId("closeTradeButton").disabled = blocked || summary.quantity <= 0;
        byId("closePositionButton").disabled = blocked || summary.quantity <= 0;
        const direction = byId("tradeDirection");
        [...direction.options].forEach(option => {
            option.disabled = summary.quantity > 0 && option.value !== summary.direction;
        });
        if (summary.quantity > 0) direction.value = summary.direction;
    } catch (error) {
        setStatus(error.message, true);
    }
    renderTradeHistory(asset, summary);
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
    const closeMode = event.submitter?.value;
    const closeQuantity = byId("closeQuantity").value;
    if (closeMode !== "full" && closeQuantity === "") {
        setStatus("Enter a quantity to reduce, or choose Close full position.", true);
        return;
    }
    try {
        const result = PositionCore.closePosition(asset, currentTicker, {
            quantity: closeMode === "full" ? "" : closeQuantity,
            price: byId("closePrice").value,
            commissionOut: byId("closeCommission").value,
            dateOut: byId("closeDate").value,
            strategy: byId("strategyInput").value
        });
        portfolioData[currentTicker] = result.asset;
        byId("closeQuantity").value = "";
        byId("closePrice").value = "";
        byId("closeCommission").value = "0";
        render();
        setStatus(`Recorded ${result.trade.Action} of ${quantity(result.trade.Qty)}. Realized P&L: ${money(result.realizedPnl)}. Export to save.`);
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
byId("tradeHistoryButton").addEventListener("click", openTradeHistory);
byId("closeTradesDialog").addEventListener("click", () => byId("tradesDialog").close());
byId("tradesDialog").addEventListener("keydown", event => {
    if (event.key === "Escape") byId("tradesDialog").close();
});
byId("tradeHistoryFilter").addEventListener("change", renderTradeHistoryDialog);
byId("tradeHistoryFrom").addEventListener("input", renderTradeHistoryDialog);
byId("tradeHistoryTo").addEventListener("input", renderTradeHistoryDialog);
byId("downloadTradeHistory").addEventListener("click", downloadTradeHistory);
byId("entryDate").value = today();
byId("closeDate").value = today();
populateTickerDropdown();