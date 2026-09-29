(function attachPositionCore(root) {
    const EPSILON = 1e-9;
    const STRATEGIES = ["SniperNine", "Daytrade", "SwingTrade", "LongtimeInvestment"];

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
            if (asset.Periodicity !== undefined && !["M", "Q", "S", "A"].includes(asset.Periodicity)) {
                fail(`${ticker}.Periodicity must be M, Q, S, or A.`);
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
                for (const field of ["Qty", "PriceIn", "PriceOut", "Commission", "CommissionOut"]) {
                    if (trade[field] !== undefined && trade[field] !== "") {
                        asNonnegativeNumber(trade[field], `${ticker}.Trades[${index}].${field}`);
                    }
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

    function activeLots(asset) {
        return (asset.Trades || []).filter(trade => trade.On === true && trade.Strategy !== "DCA_Planner");
    }

    function assertRealTicker(ticker, asset) {
        if (ticker.startsWith(".")) {
            fail("Dot-prefixed tickers are reserved for DCA planning, not real positions.");
        }
        if ((asset.Trades || []).some(trade => trade.Strategy === "DCA_Planner")) {
            fail(`Move ${ticker}'s legacy DCA_Planner rows to a dot-prefixed planner ticker before recording real trades.`);
        }
    }

    function summarize(asset) {
        const lots = activeLots(asset);
        const directions = new Set(lots.map(lot => lot.Direction));
        if (directions.size > 1) {
            fail("A ticker cannot have open Long and Short lots at the same time.");
        }

        const direction = directions.values().next().value || asset.Positions?.[0]?.Direction || "Long";
        let quantity = 0;
        let invested = 0;
        for (const lot of lots) {
            const lotQuantity = asNonnegativeNumber(lot.Qty, "Open trade quantity");
            const entryPrice = asNonnegativeNumber(lot.PriceIn, "Open trade entry price");
            const commission = asNonnegativeNumber(lot.Commission ?? 0, "Entry commission");
            if (lotQuantity <= 0) fail("Open trade quantity must be greater than zero.");
            quantity += lotQuantity;
            invested += direction === "Long"
                ? lotQuantity * entryPrice + commission
                : lotQuantity * entryPrice - commission;
        }
        if (invested < -EPSILON) fail("Short entry commissions cannot exceed the opening proceeds.");
        invested = Math.max(invested, 0);
        return {
            direction,
            quantity,
            invested,
            averagePrice: quantity > 0 ? invested / quantity : 0
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
        asset.DivAmnt = summary.quantity * asNonnegativeNumber(asset.Div ?? 0, "Dividend per cycle");
        return summary;
    }

    function createAsset(ticker, details = {}) {
        if (typeof ticker !== "string" || !/^[A-Z0-9][A-Z0-9.-]{0,15}$/.test(ticker)) {
            fail("Ticker symbols must start with a letter or number and contain only letters, numbers, dots, or hyphens.");
        }
        const periodicity = details.periodicity || "M";
        if (!["M", "Q", "S", "A"].includes(periodicity)) fail("Choose a supported dividend period.");
        return {
            name: details.name?.trim() || `${ticker} Corporation`,
            Ticker: ticker,
            Div: asNonnegativeNumber(details.dividend ?? 0, "Dividend per cycle"),
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

        const next = cloneAsset(asset);
        const current = summarize(next);
        if (current.quantity > 0 && current.direction !== input.direction) {
            fail(`Close the open ${current.direction} position before opening a ${input.direction} position.`);
        }
        next.Trades ||= [];
        next.Trades.push({
            On: true,
            Strategy: input.strategy,
            Qty: quantity,
            Direction: input.direction,
            DateIn: dateIn,
            PriceIn: price,
            Commission: commission,
            DateOut: "",
            PriceOut: 0,
            CommissionOut: 0
        });
        const summary = syncSummary(next);
        return { asset: next, summary };
    }

    function cents(value) {
        return Math.round(value * 100);
    }

    function amountFromCents(value) {
        return value / 100;
    }

    function closePosition(asset, ticker, input) {
        assertRealTicker(ticker, asset);
        const price = asNonnegativeNumber(input.price, "Close price");
        const commissionOut = asNonnegativeNumber(input.commissionOut, "Close commission");
        const dateOut = parseIsoDate(input.dateOut, "Close date");
        if (!Array.isArray(input.selections) || input.selections.length === 0) {
            fail("Select at least one open lot to close.");
        }

        const current = summarize(asset);
        if (current.quantity <= 0) fail("There is no open position to close.");
        const open = asset.Trades || [];
        const selections = new Map();
        let totalClosed = 0;
        for (const selection of input.selections) {
            if (!Number.isInteger(selection.index) || selections.has(selection.index)) {
                fail("Each selected open lot must be unique.");
            }
            const lot = open[selection.index];
            if (!lot || lot.On !== true || lot.Strategy === "DCA_Planner") {
                fail("A selected trade is not an open real-position lot.");
            }
            if (lot.Direction !== current.direction) fail("Selected lots must match the active position direction.");
            const lotQuantity = asNonnegativeNumber(lot.Qty, "Open trade quantity");
            const quantity = asNonnegativeNumber(selection.quantity, "Close quantity");
            if (quantity <= 0 || quantity - lotQuantity > EPSILON) {
                fail("Close quantity must be greater than zero and no greater than the selected lot quantity.");
            }
            selections.set(selection.index, quantity);
            totalClosed += quantity;
        }
        if (totalClosed - current.quantity > EPSILON) fail("Close quantity exceeds the open position.");

        const selectedEntries = [...selections.entries()];
        const exitCents = cents(commissionOut);
        const closeFeeByIndex = new Map();
        const feeShares = selectedEntries.map(([index, quantity], position) => {
            const exactCents = exitCents * quantity / totalClosed;
            return { index, position, cents: Math.floor(exactCents), remainder: exactCents % 1 };
        });
        let remainingCents = exitCents - feeShares.reduce((total, item) => total + item.cents, 0);
        [...feeShares]
            .sort((left, right) => right.remainder - left.remainder || left.position - right.position)
            .slice(0, remainingCents)
            .forEach(item => { item.cents += 1; });
        feeShares.forEach(item => closeFeeByIndex.set(item.index, amountFromCents(item.cents)));

        const next = cloneAsset(asset);
        const newTrades = [];
        let realizedPnl = 0;
        const closedLots = [];
        const remainingLots = [];
        next.Trades.forEach((lot, index) => {
            if (!selections.has(index)) {
                newTrades.push(lot);
                return;
            }

            const lotQuantity = Number(lot.Qty);
            const closeQuantity = selections.get(index);
            const originalFeeCents = cents(Number(lot.Commission || 0));
            const isFullClose = Math.abs(closeQuantity - lotQuantity) <= EPSILON;
            const entryFeeClosedCents = isFullClose
                ? originalFeeCents
                : Math.round(originalFeeCents * closeQuantity / lotQuantity);
            const entryFeeClosed = amountFromCents(entryFeeClosedCents);
            const entryFeeRemaining = amountFromCents(originalFeeCents - entryFeeClosedCents);
            const closeFee = closeFeeByIndex.get(index);
            const entryPrice = Number(lot.PriceIn);
            const basisClosed = current.direction === "Long"
                ? closeQuantity * entryPrice + entryFeeClosed
                : closeQuantity * entryPrice - entryFeeClosed;
            const proceedsOrCoverCost = closeQuantity * price;
            realizedPnl += current.direction === "Long"
                ? proceedsOrCoverCost - closeFee - basisClosed
                : basisClosed - proceedsOrCoverCost - closeFee;

            const closed = {
                ...lot,
                On: false,
                Qty: closeQuantity,
                Commission: entryFeeClosed,
                DateOut: dateOut,
                PriceOut: price,
                CommissionOut: closeFee
            };
            closedLots.push(closed);
            newTrades.push(closed);

            const remainingQuantity = lotQuantity - closeQuantity;
            if (remainingQuantity > EPSILON) {
                const remaining = {
                    ...lot,
                    On: true,
                    Qty: remainingQuantity,
                    Commission: entryFeeRemaining,
                    DateOut: "",
                    PriceOut: 0,
                    CommissionOut: 0
                };
                remainingLots.push(remaining);
                newTrades.push(remaining);
            }
        });

        next.Trades = newTrades;
        const summary = syncSummary(next);
        return { asset: next, summary, realizedPnl, closedLots, remainingLots };
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
        estimateCloseNow
    };
    if (typeof module !== "undefined" && module.exports) module.exports = api;
    root.PositionCore = api;
})(globalThis);