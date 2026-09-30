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
    assert.equal(result.summary.invested, 600.6);
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
    assert.equal(result.summary.invested, 599.4);
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
    assertClose(result.realizedPnl, -38.928571428571445);
    assert.equal(result.summary.quantity, 5);
    assertClose(result.summary.invested, 1982.3714285714286);
    assertClose(result.summary.averagePrice, 396.4742857142857);
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