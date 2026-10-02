(function attachPositionCore(root) {
    const EPSILON = 1e-9;
    const STRATEGIES = ["SniperNine", "Daytrade", "SwingTrade", "LongtimeInvestment"];
    const ASSET_TYPES = ["Stocks", "ETF", "Commodities", "Crypto", "Treasury Bonds", "T-Bills", "Corporate Bonds", "Other"];

    function fail(message) {
        throw new Error(message);
    }

    function asNonnegativeNumber(value, label) {
        if (value === "" || value === null || value === undefined) {
            fail(`${label} is required.`);
        }
        const number = Number(value);
        if (!Number.isFinite(number) || number < 0) {
            fail(`${label} must be a finite, nonnegative number.`);
        }
        return number;
    }

    function asCurrencyCode(value, label) {
        if (typeof value !== "string" || !/^[A-Z]{3}$/i.test(value.trim())) {
            fail(`${label} must be a three-letter currency code.`);
        }
        return value.trim().toUpperCase();
    }

    function validatePortfolio(portfolio) {
        if (!portfolio || typeof portfolio !== "object" || Array.isArray(portfolio)) {
            fail("Portfolio JSON must be an object keyed by ticker.");
        }

        for (const [ticker, asset] of Object.entries(portfolio)) {
            if (!asset || typeof asset !== "object" || Array.isArray(asset)) {
                fail(`${ticker} must contain an asset object.`);
            }
            for (const field of ["Div", "Price", "Qty", "Invested", "DivAmnt"]) {
                if (asset[field] !== undefined && asset[field] !== "") {
                    asNonnegativeNumber(asset[field], `${ticker}.${field}`);
                }
            }
            if (asset.Currency !== undefined) {
                asCurrencyCode(asset.Currency, `${ticker}.Currency`);
            }
            if (asset.AssetType !== undefined && !ASSET_TYPES.includes(asset.AssetType)) {
                fail(`${ticker}.AssetType must be a supported asset type.`);
            }
            if (asset.Periodicity !== undefined && !["M", "Q", "S", "A", "N/A"].includes(asset.Periodicity)) {
                fail(`${ticker}.Periodicity must be M, Q, S, A, or N/A.`);
            }
            if (asset.Positions !== undefined && !Array.isArray(asset.Positions)) {
                fail(`${ticker}.Positions must be an array.`);
            }
            if (asset.Trades !== undefined && !Array.isArray(asset.Trades)) {
                fail(`${ticker}.Trades must be an array.`);
            }
            for (const [index, trade] of (asset.Trades || []).entries()) {
                if (!trade || typeof trade !== "object" || Array.isArray(trade)) {
                    fail(`${ticker}.Trades[${index}] must be an object.`);
                }
                if (trade.On !== undefined && typeof trade.On !== "boolean") {
                    fail(`${ticker}.Trades[${index}].On must be a boolean.`);
                }
                if (trade.Action !== undefined && !["Buy", "Sell"].includes(trade.Action)) {
                    fail(`${ticker}.Trades[${index}].Action must be Buy or Sell.`);
                }
                if (trade.Currency !== undefined) {
                    asCurrencyCode(trade.Currency, `${ticker}.Trades[${index}].Currency`);
                }
                for (const field of ["Qty", "PriceIn", "PriceOut", "Commission", "CommissionOut"]) {
                    if (trade[field] !== undefined && trade[field] !== "") {
                        asNonnegativeNumber(trade[field], `${ticker}.Trades[${index}].${field}`);
                    }
                }
                for (const field of ["Price", "Commission"]) {
                    if (trade.Action && trade[field] !== undefined && trade[field] !== "") {
                        asNonnegativeNumber(trade[field], `${ticker}.Trades[${index}].${field}`);
                    }
                }
                if (trade.Action) {
                    if (!STRATEGIES.includes(trade.Strategy)) {
                        fail(`${ticker}.Trades[${index}].Strategy must be a supported real-position strategy.`);
                    }
                    if (asNonnegativeNumber(trade.Qty, `${ticker}.Trades[${index}].Qty`) <= 0) {
                        fail(`${ticker}.Trades[${index}].Qty must be greater than zero.`);
                    }
                    asNonnegativeNumber(trade.Price, `${ticker}.Trades[${index}].Price`);
                    asNonnegativeNumber(trade.Commission ?? 0, `${ticker}.Trades[${index}].Commission`);
                    parseIsoDate(trade.Date, `${ticker}.Trades[${index}].Date`);
                }
                if (trade.Direction !== undefined && !["Long", "Short"].includes(trade.Direction)) {
                    fail(`${ticker}.Trades[${index}].Direction must be Long or Short.`);
                }
            }
        }
        return portfolio;
    }

    function cloneAsset(asset) {
        return JSON.parse(JSON.stringify(asset));
    }

    function parseIsoDate(value, label) {
        if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) {
            fail(`${label} must use YYYY-MM-DD.`);
        }
        const date = new Date(`${value}T00:00:00Z`);
        if (Number.isNaN(date.getTime()) || date.toISOString().slice(0, 10) !== value) {
            fail(`${label} is not a valid calendar date.`);
        }
        if (value > new Date().toISOString().slice(0, 10)) {
            fail(`${label} cannot be in the future.`);
        }
        return value;
    }

    function normalizeHistoryDate(value) {
        if (typeof value !== "string") return "";
        let normalized = value;
        if (/^\d{8}$/.test(normalized)) {
            normalized = `${normalized.slice(0, 4)}-${normalized.slice(4, 6)}-${normalized.slice(6, 8)}`;
        } else if (/^\d{4}\.\d{2}\.\d{2}$/.test(normalized)) {
            normalized = normalized.replaceAll(".", "-");
        }
        if (!/^\d{4}-\d{2}-\d{2}$/.test(normalized)) return "";
        const date = new Date(`${normalized}T00:00:00Z`);
        return !Number.isNaN(date.getTime()) && date.toISOString().slice(0, 10) === normalized
            ? normalized
            : "";
    }

    function formatNextExDate(value) {
        if (typeof value !== "string" || !/^\d{8}$/.test(value)) return "";
        const normalized = normalizeHistoryDate(value);
        if (!normalized) return "";
        return new Intl.DateTimeFormat("en-US", {
            month: "short",
            day: "numeric",
            year: "numeric",
            timeZone: "UTC"
        }).format(new Date(`${normalized}T00:00:00Z`));
    }

    function getTradeHistory(asset, options = {}) {
        const filter = options.filter || "all";
        if (!["open", "closed", "all"].includes(filter)) fail("Choose a supported trade-history filter.");
        const events = [];
        const trades = asset.Trades || [];
        trades.forEach((trade, index) => {
            if (trade.Strategy === "DCA_Planner") return;
            if (trade.Action) {
                events.push({
                    index,
                    phase: 1,
                    eventDate: normalizeHistoryDate(trade.Date),
                    signedQuantity: (trade.Action === "Buy" ? 1 : -1) * Number(trade.Qty),
                    kind: "execution",
                    trade
                });
                return;
            }

            const directionSign = trade.Direction === "Short" ? -1 : 1;
            const entryDate = normalizeHistoryDate(trade.DateIn);
            const isOpen = trade.On === true;
            const displayDate = normalizeHistoryDate(isOpen ? trade.DateIn : trade.DateOut);
            const row = {
                index,
                status: isOpen ? "Open" : trade.On === false ? "Closed" : "Unknown",
                on: typeof trade.On === "boolean" ? trade.On : null,
                strategy: trade.Strategy || "",
                quantity: Number(trade.Qty) || 0,
                direction: trade.Direction || "Long",
                currency: trade.Currency || asset.Currency || "USD",
                dateIn: normalizeHistoryDate(trade.DateIn),
                priceIn: trade.PriceIn ?? "",
                commissionIn: trade.Commission ?? "",
                dateOut: normalizeHistoryDate(trade.DateOut),
                priceOut: trade.PriceOut ?? "",
                commissionOut: trade.CommissionOut ?? "",
                displayDate,
                action: isOpen
                    ? trade.Direction === "Short" ? "Sell to open/increase Short" : "Buy to open/increase Long"
                    : trade.On === false
                        ? trade.Direction === "Short" ? "Buy to cover Short" : "Sell to reduce/close Long"
                        : "Unknown"
            };
            events.push({
                index,
                phase: 0,
                eventDate: entryDate,
                signedQuantity: directionSign * row.quantity,
                kind: "legacy-entry",
                row
            });
            if (trade.On === false) {
                events.push({
                    index,
                    phase: 2,
                    eventDate: row.dateOut,
                    signedQuantity: -directionSign * row.quantity,
                    kind: "legacy-exit",
                    row
                });
            } else if (isOpen) {
                events[events.length - 1].kind = "legacy-open";
                events[events.length - 1].row = row;
            } else {
                events.pop();
            }
        });

        events.sort((left, right) => {
            const leftDate = left.eventDate || "9999-99-99";
            const rightDate = right.eventDate || "9999-99-99";
            return leftDate.localeCompare(rightDate) || left.index - right.index || left.phase - right.phase;
        });

        let signedPosition = 0;
        const rows = [];
        for (const event of events) {
            if (event.kind === "legacy-entry") {
                signedPosition += event.signedQuantity;
                continue;
            }
            if (event.kind === "legacy-exit") {
                signedPosition += event.signedQuantity;
                rows.push(event.row);
                continue;
            }
            if (event.kind === "legacy-open") {
                signedPosition += event.signedQuantity;
                rows.push(event.row);
                continue;
            }

            const trade = event.trade;
            const actionSign = Math.sign(event.signedQuantity);
            const positionBefore = Math.sign(signedPosition);
            const isOpening = positionBefore === 0 || positionBefore === actionSign;
            const direction = (positionBefore || actionSign) < 0 ? "Short" : "Long";
            const date = event.eventDate;
            const actionName = trade.Action === "Buy"
                ? direction === "Short" && !isOpening ? "Buy to cover Short" : `Buy to ${isOpening ? "open/increase" : "reduce/close"} Long`
                : direction === "Long" && !isOpening ? "Sell to reduce/close Long" : `Sell to ${isOpening ? "open/increase" : "reduce/close"} Short`;
            const row = {
                index: event.index,
                status: "Execution",
                on: null,
                strategy: trade.Strategy || "",
                quantity: Number(trade.Qty) || 0,
                direction,
                currency: trade.Currency || asset.Currency || "USD",
                dateIn: isOpening ? date : "",
                priceIn: isOpening ? trade.Price : "",
                commissionIn: isOpening ? trade.Commission ?? 0 : "",
                dateOut: isOpening ? "" : date,
                priceOut: isOpening ? "" : trade.Price,
                commissionOut: isOpening ? "" : trade.Commission ?? 0,
                displayDate: date,
                action: actionName
            };
            rows.push(row);
            signedPosition += event.signedQuantity;
        }

        const startDate = options.startDate ? normalizeHistoryDate(options.startDate) : "";
        const endDate = options.endDate ? normalizeHistoryDate(options.endDate) : "";
        return rows
            .filter(row => filter === "all"
                || (filter === "open" && row.status === "Open")
                || (filter === "closed" && row.status === "Closed"))
            .filter(row => {
                if ((startDate || endDate) && !row.displayDate) return false;
                return (!startDate || row.displayDate >= startDate) && (!endDate || row.displayDate <= endDate);
            })
            .sort((left, right) => (left.displayDate || "9999-99-99").localeCompare(right.displayDate || "9999-99-99")
                || left.index - right.index);
    }

    function tradeHistoryToCsv(rows) {
        const columns = [
            ["Action", "action"], ["Status", "status"], ["On", "on"], ["Strategy", "strategy"],
            ["Qty", "quantity"], ["Direction", "direction"], ["Currency", "currency"],
            ["DateIn", "dateIn"], ["PriceIn", "priceIn"],
            ["Commission", "commissionIn"], ["DateOut", "dateOut"], ["PriceOut", "priceOut"],
            ["CommissionOut", "commissionOut"]
        ];
        const escape = value => {
            let text = value === null || value === undefined ? "" : String(value);
            if (/^[\s]*[=+@]/.test(text) || /^[\s]*-[A-Za-z]/.test(text)) text = `'${text}`;
            return /[",\r\n]/.test(text) ? `"${text.replaceAll('"', '""')}"` : text;
        };
        return [columns.map(([heading]) => escape(heading)).join(","),
            ...rows.map(row => columns.map(([, key]) => escape(row[key])).join(","))].join("\r\n");
    }

    function assertRealTicker(ticker, asset) {
        if (ticker.startsWith(".")) {
            fail("Dot-prefixed tickers are reserved for DCA planning, not real positions.");
        }
        if ((asset.Trades || []).some(trade => trade.Strategy === "DCA_Planner")) {
            fail(`Move ${ticker}'s legacy DCA_Planner rows to a dot-prefixed planner ticker before recording real trades.`);
        }
    }

    function summarizeExecutionLedger(asset) {
        const openLots = [];
        let realizedPnl = 0;
        const realizedTrades = [];

        for (const [index, trade] of (asset.Trades || []).entries()) {
            if (!trade.Action) continue;
            if (!["Buy", "Sell"].includes(trade.Action)) fail(`Trade ${index + 1} action must be Buy or Sell.`);
            const tradeQuantity = asNonnegativeNumber(trade.Qty, `Trade ${index + 1} quantity`);
            const price = asNonnegativeNumber(trade.Price, `Trade ${index + 1} price`);
            const commission = asNonnegativeNumber(trade.Commission ?? 0, `Trade ${index + 1} commission`);
            if (tradeQuantity <= 0) fail("Trade quantity must be greater than zero.");
            parseIsoDate(trade.Date, `Trade ${index + 1} date`);

            const actionDirection = trade.Action === "Buy" ? "Long" : "Short";
            const openQuantity = openLots.reduce((total, lot) => total + lot.quantity, 0);
            const currentDirection = openLots[0]?.direction;
            if (!currentDirection || currentDirection === actionDirection) {
                const unitBasis = actionDirection === "Long"
                    ? price + commission / tradeQuantity
                    : price - commission / tradeQuantity;
                if (actionDirection === "Short" && unitBasis < -EPSILON) {
                    fail("Short entry commissions cannot exceed the opening proceeds.");
                }
                openLots.push({ direction: actionDirection, quantity: tradeQuantity, unitBasis: Math.max(unitBasis, 0) });
                continue;
            }

            if (tradeQuantity - openQuantity > EPSILON) {
                fail("A trade cannot reverse a position; close the open quantity first.");
            }
            let quantityToClose = Math.min(tradeQuantity, openQuantity);
            let tradeRealizedPnl = 0;
            while (quantityToClose > EPSILON) {
                const lot = openLots[0];
                const closedQuantity = Math.min(quantityToClose, lot.quantity);
                const releasedBasis = closedQuantity * lot.unitBasis;
                const allocatedExitCommission = commission * closedQuantity / tradeQuantity;
                tradeRealizedPnl += currentDirection === "Long"
                    ? closedQuantity * price - allocatedExitCommission - releasedBasis
                    : releasedBasis - closedQuantity * price - allocatedExitCommission;
                lot.quantity -= closedQuantity;
                quantityToClose -= closedQuantity;
                if (lot.quantity <= EPSILON) openLots.shift();
            }
            realizedPnl += tradeRealizedPnl;
            realizedTrades.push({ index, realizedPnl: tradeRealizedPnl });
        }

        const quantity = openLots.reduce((total, lot) => total + lot.quantity, 0);
        const invested = openLots.reduce((total, lot) => total + lot.quantity * lot.unitBasis, 0);
        const direction = openLots[0]?.direction || asset.Positions?.[0]?.Direction || "Long";
        if (invested < -EPSILON) fail("Short entry commissions cannot exceed the opening proceeds.");
        return {
            direction,
            quantity,
            invested: Math.max(invested, 0),
            averagePrice: quantity > 0 ? invested / quantity : 0,
            realizedPnl,
            realizedTrades
        };
    }

    function summarize(asset) {
        const trades = asset.Trades || [];
        const executions = trades.some(trade => Boolean(trade.Action));
        if (executions) {
            if (trades.some(trade => !trade.Action && trade.On === true && trade.Strategy !== "DCA_Planner")) {
                fail("Migrate open legacy lots before adding append-only executions for the same ticker.");
            }
            return summarizeExecutionLedger(asset);
        }

        let signedQuantity = 0;
        let invested = 0;
        let realizedPnl = 0;
        const realizedTrades = [];
        for (const [index, lot] of (asset.Trades || []).entries()) {
            if (lot.Action || lot.On !== true || lot.Strategy === "DCA_Planner") continue;
            const lotQuantity = asNonnegativeNumber(lot.Qty, "Open trade quantity");
            const entryPrice = asNonnegativeNumber(lot.PriceIn, "Open trade entry price");
            const commission = asNonnegativeNumber(lot.Commission ?? 0, "Entry commission");
            if (lotQuantity <= 0) fail("Open trade quantity must be greater than zero.");
            const direction = lot.Direction || "Long";
            if (signedQuantity !== 0 && Math.sign(signedQuantity) !== (direction === "Long" ? 1 : -1)) {
                fail("A ticker cannot have open Long and Short positions at the same time.");
            }
            signedQuantity += direction === "Long" ? lotQuantity : -lotQuantity;
            invested += direction === "Long"
                ? lotQuantity * entryPrice + commission
                : lotQuantity * entryPrice - commission;
        }

        if (invested < -EPSILON) fail("Short entry commissions cannot exceed the opening proceeds.");
        invested = Math.max(invested, 0);
        const quantity = Math.abs(signedQuantity);
        const direction = signedQuantity === 0
            ? asset.Positions?.[0]?.Direction || "Long"
            : signedQuantity > 0 ? "Long" : "Short";
        return {
            direction,
            quantity,
            invested,
            averagePrice: quantity > 0 ? invested / quantity : 0,
            realizedPnl,
            realizedTrades
        };
    }

    function syncSummary(asset) {
        const summary = summarize(asset);
        asset.Qty = summary.quantity;
        asset.Invested = summary.invested;
        asset.Positions = [{
            Direction: summary.direction,
            Size: summary.quantity,
            AvgPrice: summary.averagePrice
        }];
        const dividend = asset.Periodicity === "N/A"
            ? 0
            : asNonnegativeNumber(asset.Div ?? 0, "Dividend per cycle");
        if (asset.Periodicity === "N/A") asset.Div = 0;
        asset.DivAmnt = summary.quantity * dividend;
        return summary;
    }

    function createAsset(ticker, details = {}) {
        if (typeof ticker !== "string" || !/^[A-Z0-9][A-Z0-9.-]{0,15}$/.test(ticker)) {
            fail("Ticker symbols must start with a letter or number and contain only letters, numbers, dots, or hyphens.");
        }
        const periodicity = details.periodicity || "M";
        if (!["M", "Q", "S", "A", "N/A"].includes(periodicity)) fail("Choose a supported dividend period.");
        const dividend = asNonnegativeNumber(details.dividend ?? 0, "Dividend per cycle");
        if (periodicity === "N/A" && dividend !== 0) fail("Dividend per cycle must be zero when the payout period is N/A.");
        const assetType = details.assetType || "Other";
        if (!ASSET_TYPES.includes(assetType)) fail("Choose a supported asset type.");
        return {
            name: details.name?.trim() || `${ticker} Corporation`,
            Ticker: ticker,
            Currency: asCurrencyCode(details.currency ?? "USD", "Currency"),
            AssetType: assetType,
            Div: dividend,
            Price: 0,
            Periodicity: periodicity,
            Qty: 0,
            NextExDate: "",
            Positions: [{ Direction: "Long", Size: 0, AvgPrice: 0 }],
            Trades: [],
            Invested: 0,
            DivAmnt: 0
        };
    }

    function openPosition(asset, ticker, input) {
        if (!ticker || typeof ticker !== "string") fail("Choose or create a ticker first.");
        assertRealTicker(ticker, asset);
        if (!STRATEGIES.includes(input.strategy)) fail("Choose a supported strategy.");
        if (!["Long", "Short"].includes(input.direction)) fail("Choose Long or Short.");

        const quantity = asNonnegativeNumber(input.quantity, "Quantity");
        const price = asNonnegativeNumber(input.price, "Entry price");
        const commission = asNonnegativeNumber(input.commission, "Entry commission");
        if (quantity <= 0) fail("Quantity must be greater than zero.");
        const dateIn = parseIsoDate(input.dateIn, "Entry date");
        const currency = input.currency === undefined ? undefined : asCurrencyCode(input.currency, "Trade currency");

        const next = cloneAsset(asset);
        const current = summarize(next);
        if (current.quantity > 0 && current.direction !== input.direction) {
            fail(`Close the open ${current.direction} position before opening a ${input.direction} position.`);
        }
        next.Trades ||= [];
        next.Trades.push({
            Action: input.direction === "Long" ? "Buy" : "Sell",
            Strategy: input.strategy,
            Qty: quantity,
            Date: dateIn,
            Price: price,
            Commission: commission,
            ...(currency ? { Currency: currency } : {})
        });
        const summary = syncSummary(next);
        return { asset: next, summary };
    }

    function closePosition(asset, ticker, input) {
        assertRealTicker(ticker, asset);
        const price = asNonnegativeNumber(input.price, "Close price");
        const commissionOut = asNonnegativeNumber(input.commissionOut, "Close commission");
        const dateOut = parseIsoDate(input.dateOut, "Close date");
        const currency = input.currency === undefined ? undefined : asCurrencyCode(input.currency, "Trade currency");
        const current = summarize(asset);
        if (current.quantity <= 0) fail("There is no open position to close.");
        const requestedQuantity = input.quantity === "" || input.quantity === null || input.quantity === undefined
            ? current.quantity
            : asNonnegativeNumber(input.quantity, "Close quantity");
        if (requestedQuantity <= 0) fail("Close quantity must be greater than zero.");
        if (requestedQuantity - current.quantity > EPSILON) fail("Close quantity exceeds the open position.");
        const quantity = Math.min(requestedQuantity, current.quantity);
        const next = cloneAsset(asset);
        const trade = {
            Action: current.direction === "Long" ? "Sell" : "Buy",
            Strategy: input.strategy || "SniperNine",
            Qty: quantity,
            Date: dateOut,
            Price: price,
            Commission: commissionOut,
            ...(currency ? { Currency: currency } : {})
        };
        if (!STRATEGIES.includes(trade.Strategy)) fail("Choose a supported strategy.");
        next.Trades ||= [];
        next.Trades.push(trade);
        const summary = syncSummary(next);
        const realizedTrade = summary.realizedTrades.find(item => item.index === next.Trades.length - 1);
        return { asset: next, summary, realizedPnl: realizedTrade?.realizedPnl ?? 0, trade };
    }

    function estimateCloseNow(asset, currentPrice) {
        const price = asNonnegativeNumber(currentPrice, "Current price");
        const summary = summarize(asset);
        const pnl = summary.direction === "Long"
            ? summary.quantity * price - summary.invested
            : summary.invested - summary.quantity * price;
        return { ...summary, currentPrice: price, unrealizedPnl: pnl };
    }

    const api = {
        STRATEGIES,
        validatePortfolio,
        createAsset,
        summarize,
        syncSummary,
        openPosition,
        closePosition,
        estimateCloseNow,
        getTradeHistory,
        tradeHistoryToCsv,
        formatNextExDate
    };
    if (typeof module !== "undefined" && module.exports) module.exports = api;
    root.PositionCore = api;
})(globalThis);