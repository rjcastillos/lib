const test = require("node:test");
const assert = require("node:assert/strict");
const PositionCore = require("./positions-core.js");
const assertClose = (actual, expected) => assert.ok(Math.abs(actual - expected) < 1e-9);

const longAsset = {
    name: "Example Corporation",
    Ticker: "EXM",
    Div: 0,
    Periodicity: "M",
    Trades: [],
    Positions: []
};

function openLot(asset, direction, quantity, price, commission = 0, dateIn = "2026-09-28") {
    return PositionCore.openPosition(asset, "EXM", {
        direction,
        quantity,
        price,
        commission,
        dateIn,
        strategy: "SniperNine"
    }).asset;
}

test("opens long and short positions with direction-adjusted basis", () => {
    const long = openLot(longAsset, "Long", 10, 100, 1);
    assert.equal(long.Qty, 10);
    assert.equal(long.Invested, 1001);
    assert.equal(long.Positions[0].AvgPrice, 100.1);

    const short = openLot(longAsset, "Short", 10, 100, 1);
    assert.equal(short.Qty, 10);
    assert.equal(short.Invested, 999);
    assert.equal(short.Positions[0].AvgPrice, 99.9);
});

test("rejects an opposite-direction open while a position remains open", () => {
    const asset = openLot(longAsset, "Long", 2, 10);
    assert.throws(
        () => PositionCore.openPosition(asset, "EXM", {
            direction: "Short", quantity: 1, price: 9, commission: 0,
            dateIn: "2026-09-28", strategy: "Daytrade"
        }),
        /Close the open Long position/
    );
});

test("reduces a long position with a new immutable sell execution", () => {
    const asset = openLot(longAsset, "Long", 10, 100, 1);
    const purchase = structuredClone(asset.Trades[0]);
    const result = PositionCore.closePosition(asset, "EXM", {
        price: 120,
        commissionOut: 0.5,
        dateOut: "2026-09-29",
        quantity: 4
    });

    assertClose(result.realizedPnl, 79.1);
    assert.equal(result.summary.quantity, 6);
    assertClose(result.summary.invested, 600.6);
    assertClose(result.summary.averagePrice, 100.1);
    assert.deepEqual(result.asset.Trades[0], purchase);
    assert.equal(result.asset.Trades.length, 2);
    assert.deepEqual(result.asset.Trades[1], {
        Action: "Sell",
        Strategy: "SniperNine",
        Qty: 4,
        Date: "2026-09-29",
        Price: 120,
        Commission: 0.5
    });
});

test("covers a short position with a new immutable buy execution", () => {
    const asset = openLot(longAsset, "Short", 10, 100, 1);
    const result = PositionCore.closePosition(asset, "EXM", {
        price: 80,
        commissionOut: 0.5,
        dateOut: "2026-09-29",
        quantity: 4
    });

    assertClose(result.realizedPnl, 79.1);
    assert.equal(result.summary.quantity, 6);
    assertClose(result.summary.invested, 599.4);
    assertClose(result.summary.averagePrice, 99.9);
    assert.equal(result.asset.Trades.length, 2);
    assert.equal(result.asset.Trades[1].Action, "Buy");
});

test("full close defaults to the full quantity and permits a new direction", () => {
    const asset = openLot(longAsset, "Long", 2, 10, 0.2);
    const closed = PositionCore.closePosition(asset, "EXM", {
        price: 12,
        commissionOut: 0.1,
        dateOut: "2026-09-29"
    });

    assert.equal(closed.summary.quantity, 0);
    assert.equal(closed.summary.invested, 0);
    assert.equal(closed.asset.Trades.length, 2);
    assert.equal(closed.asset.Trades[1].Qty, 2);
    const reopened = openLot(closed.asset, "Short", 1, 12);
    assert.equal(reopened.Positions[0].Direction, "Short");
});

test("rejects a reduce quantity greater than the aggregate position", () => {
    const asset = openLot(longAsset, "Long", 2, 10);
    assert.throws(() => PositionCore.closePosition(asset, "EXM", {
        price: 12,
        commissionOut: 0,
        dateOut: "2026-09-29",
        quantity: 3
    }), /exceeds the open position/);
});

test("uses FIFO when one long sale spans lots with unmatched quantities", () => {
    let asset = openLot(longAsset, "Long", 2, 10, 2);
    asset = openLot(asset, "Long", 3, 20, 3);
    const originalTrades = structuredClone(asset.Trades);

    const result = PositionCore.closePosition(asset, "EXM", {
        price: 25,
        commissionOut: 1.5,
        dateOut: "2026-09-29",
        quantity: 3
    });

    assertClose(result.realizedPnl, 30.5);
    assert.equal(result.summary.quantity, 2);
    assert.equal(result.summary.invested, 42);
    assert.equal(result.summary.averagePrice, 21);
    assert.deepEqual(result.asset.Trades.slice(0, 2), originalTrades);
});

test("uses FIFO when a short cover spans opening sale lots", () => {
    let asset = openLot(longAsset, "Short", 2, 100, 2);
    asset = openLot(asset, "Short", 3, 80, 3);

    const result = PositionCore.closePosition(asset, "EXM", {
        price: 70,
        commissionOut: 1,
        dateOut: "2026-09-29",
        quantity: 3
    });

    assertClose(result.realizedPnl, 66);
    assert.equal(result.summary.quantity, 2);
    assert.equal(result.summary.invested, 158);
    assert.equal(result.summary.averagePrice, 79);
});

test("matches the MSFT FIFO basis after three one-share reductions", () => {
    const asset = {
        Positions: [{ Direction: "Long", Size: 0, AvgPrice: 0 }],
        Trades: [
            { Action: "Buy", Strategy: "LongtimeInvestment", Qty: 1, Date: "2026-06-03", Price: 429.50, Commission: 1 },
            { Action: "Buy", Strategy: "LongtimeInvestment", Qty: 1, Date: "2026-06-05", Price: 423.08, Commission: 1 },
            { Action: "Buy", Strategy: "LongtimeInvestment", Qty: 1, Date: "2026-06-05", Price: 416.25, Commission: 1 },
            { Action: "Buy", Strategy: "LongtimeInvestment", Qty: 1, Date: "2026-06-11", Price: 384.56, Commission: 1 },
            { Action: "Buy", Strategy: "LongtimeInvestment", Qty: 1, Date: "2026-06-17", Price: 378.77, Commission: 1 },
            { Action: "Buy", Strategy: "LongtimeInvestment", Qty: 1, Date: "2026-06-22", Price: 367.79, Commission: 1 },
            { Action: "Buy", Strategy: "LongtimeInvestment", Qty: 1, Date: "2026-06-24", Price: 368.38, Commission: 1 },
            { Action: "Sell", Strategy: "SniperNine", Qty: 1, Date: "2026-07-30", Price: 447.91, Commission: 1 },
            { Action: "Sell", Strategy: "SniperNine", Qty: 1, Date: "2026-08-03", Price: 478.00, Commission: 1 },
            { Action: "Sell", Strategy: "SniperNine", Qty: 1, Date: "2026-08-31", Price: 511.41, Commission: 1 }
        ]
    };

    const summary = PositionCore.summarize(asset);

    assert.equal(summary.quantity, 4);
    assert.equal(summary.invested, 1503.5);
    assert.equal(summary.averagePrice, 375.875);
    assertClose(summary.realizedPnl, 162.49);
});

test("rejects execution-ledger reversals and ambiguous open legacy mixing", () => {
    assert.throws(() => PositionCore.summarize({ Trades: [
        { Action: "Buy", Strategy: "SniperNine", Qty: 2, Date: "2026-09-28", Price: 10, Commission: 0 },
        { Action: "Sell", Strategy: "Daytrade", Qty: 3, Date: "2026-09-29", Price: 11, Commission: 0 }
    ] }), /cannot reverse a position/);

    assert.throws(() => PositionCore.summarize({ Trades: [
        { On: true, Strategy: "SniperNine", Qty: 1, Direction: "Long", DateIn: "2026-09-28", PriceIn: 10, Commission: 0 },
        { Action: "Buy", Strategy: "Daytrade", Qty: 1, Date: "2026-09-29", Price: 11, Commission: 0 }
    ] }), /Migrate open legacy lots/);
});

test("matches the issue example while preserving every purchase execution", () => {
    let asset = openLot(longAsset, "Long", 5, 407.43);
    asset = openLot(asset, "Long", 1, 367.79, 1);
    asset = openLot(asset, "Long", 1, 368.38, 1);
    assertClose(asset.Positions[0].AvgPrice, 396.4742857142857);
    const purchases = structuredClone(asset.Trades);

    const result = PositionCore.closePosition(asset, "EXM", {
        price: 377.01,
        commissionOut: 0,
        dateOut: "2026-09-29",
        quantity: 2
    });

    assert.equal(result.asset.Trades.length, 4);
    assert.deepEqual(result.asset.Trades.slice(0, 3), purchases);
    assert.equal(result.asset.Trades[3].Action, "Sell");
    assert.equal(result.asset.Trades[3].Qty, 2);
    assertClose(result.realizedPnl, -60.84);
    assert.equal(result.summary.quantity, 5);
    assertClose(result.summary.invested, 1960.46);
    assertClose(result.summary.averagePrice, 392.092);
});

test("accepts legacy trades without CommissionOut and validates imported structure", () => {
    assert.equal(PositionCore.validatePortfolio({
        EXM: { Trades: [{ On: true, Qty: 1, Direction: "Long", PriceIn: 10, Commission: 0 }] }
    }).EXM.Trades[0].CommissionOut, undefined);
    assert.throws(() => PositionCore.validatePortfolio({ EXM: { Trades: "invalid" } }), /must be an array/);
    assert.throws(() => PositionCore.validatePortfolio({ EXM: { Div: -1 } }), /Div must be a finite, nonnegative number/);
    assert.throws(() => PositionCore.validatePortfolio({ EXM: { Periodicity: "weekly" } }), /Periodicity must be M, Q, S, or A/);
    assert.throws(() => PositionCore.validatePortfolio({ EXM: { Trades: [{
        Action: "Sell", Strategy: "SniperNine", Qty: 1, Date: "invalid", Price: 10, Commission: 0
    }] } }), /Date must use YYYY-MM-DD/);
    assert.throws(() => PositionCore.createAsset("__PROTO__"), /Ticker symbols must start/);
});

test("filters and dates legacy open and closed trades using their respective dates", () => {
    const asset = { Trades: [
        { On: false, Strategy: "SniperNine", Qty: 2, Direction: "Long", DateIn: "2026.09.28", PriceIn: 10, Commission: 0.1, DateOut: "2026-09-30", PriceOut: 12, CommissionOut: 0.2 },
        { On: true, Strategy: "Daytrade", Qty: 3, Direction: "Short", DateIn: "2026-09-29", PriceIn: 20, Commission: 0.3 },
        { On: true, Strategy: "DCA_Planner", Qty: 100, Direction: "Long", DateIn: "2026-09-28", PriceIn: 10, Commission: 0 }
    ] };

    assert.deepEqual(PositionCore.getTradeHistory(asset, { filter: "open" }).map(row => row.index), [1]);
    assert.deepEqual(PositionCore.getTradeHistory(asset, { filter: "closed" }).map(row => row.index), [0]);
    assert.deepEqual(PositionCore.getTradeHistory(asset, {
        filter: "all", startDate: "2026-09-29", endDate: "2026-09-30"
    }).map(row => row.index), [1, 0]);
    assert.equal(PositionCore.getTradeHistory(asset, { filter: "all" })[1].action, "Sell to reduce/close Long");
});

test("chronologically labels immutable Buy and Sell executions without lot status", () => {
    const asset = { Trades: [
        { Action: "Buy", Strategy: "SniperNine", Qty: 10, Date: "2026-09-28", Price: 10, Commission: 0 },
        { Action: "Sell", Strategy: "Daytrade", Qty: 5, Date: "2026-09-29", Price: 11, Commission: 0 },
        { Action: "Buy", Strategy: "SwingTrade", Qty: 6, Date: "2026-09-30", Price: 9, Commission: 0 }
    ] };
    const history = PositionCore.getTradeHistory(asset, { filter: "all" });

    assert.deepEqual(history.map(row => row.action), [
        "Buy to open/increase Long",
        "Sell to reduce/close Long",
        "Buy to open/increase Long"
    ]);
    assert.ok(history.every(row => row.status === "Execution" && row.on === null));
    assert.deepEqual(PositionCore.getTradeHistory(asset, { filter: "open" }), []);
    assert.deepEqual(PositionCore.getTradeHistory(asset, { filter: "all", startDate: "2026-09-29" }).map(row => row.index), [1, 2]);
});

test("derives short-entry and cover descriptions from immutable executions", () => {
    const asset = { Trades: [
        { Action: "Sell", Strategy: "SniperNine", Qty: 5, Date: "2026-09-28", Price: 20, Commission: 0 },
        { Action: "Buy", Strategy: "Daytrade", Qty: 2, Date: "2026-09-29", Price: 18, Commission: 0 }
    ] };

    assert.deepEqual(PositionCore.getTradeHistory(asset, { filter: "all" }).map(row => row.action), [
        "Sell to open/increase Short",
        "Buy to cover Short"
    ]);
});

test("formats valid compact Ex dates and exports quoted CSV", () => {
    assert.equal(PositionCore.formatNextExDate("20261015"), "Oct 15, 2026");
    assert.equal(PositionCore.formatNextExDate("20260230"), "");
    assert.equal(PositionCore.formatNextExDate(""), "");

    const csv = PositionCore.tradeHistoryToCsv([{
        action: "Buy to open Long", status: "Open", on: true, strategy: "Swing, trade",
        quantity: 1, direction: "Long", dateIn: "2026-09-30", priceIn: 10,
        commissionIn: 0.2, dateOut: "", priceOut: "", commissionOut: ""
    }]);
    assert.match(csv, /"Swing, trade"/);
    assert.ok(csv.startsWith("Action,Status,On,Strategy,Qty,Direction,DateIn,PriceIn,Commission,DateOut,PriceOut,CommissionOut\r\n"));
});