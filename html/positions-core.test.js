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

test("partially closes a long lot and allocates both commissions", () => {
    const asset = openLot(longAsset, "Long", 10, 100, 1);
    const result = PositionCore.closePosition(asset, "EXM", {
        price: 120,
        commissionOut: 0.5,
        dateOut: "2026-09-29",
        selections: [{ index: 0, quantity: 4 }]
    });

    assertClose(result.realizedPnl, 79.1);
    assert.equal(result.summary.quantity, 6);
    assert.equal(result.summary.invested, 600.6);
    assertClose(result.summary.averagePrice, 100.1);
    assert.equal(result.asset.Trades[0].On, false);
    assert.equal(result.asset.Trades[0].Commission, 0.4);
    assert.equal(result.asset.Trades[0].CommissionOut, 0.5);
    assert.equal(result.asset.Trades[1].On, true);
    assert.equal(result.asset.Trades[1].Commission, 0.6);
});

test("partially covers a short lot and computes realized profit", () => {
    const asset = openLot(longAsset, "Short", 10, 100, 1);
    const result = PositionCore.closePosition(asset, "EXM", {
        price: 80,
        commissionOut: 0.5,
        dateOut: "2026-09-29",
        selections: [{ index: 0, quantity: 4 }]
    });

    assertClose(result.realizedPnl, 79.1);
    assert.equal(result.summary.quantity, 6);
    assert.equal(result.summary.invested, 599.4);
    assertClose(result.summary.averagePrice, 99.9);
});

test("full close clears the open summary and permits a new direction", () => {
    const asset = openLot(longAsset, "Long", 2, 10, 0.2);
    const closed = PositionCore.closePosition(asset, "EXM", {
        price: 12,
        commissionOut: 0.1,
        dateOut: "2026-09-29",
        selections: [{ index: 0, quantity: 2 }]
    });

    assert.equal(closed.summary.quantity, 0);
    assert.equal(closed.summary.invested, 0);
    assert.equal(closed.asset.Trades[0].On, false);
    const reopened = openLot(closed.asset, "Short", 1, 12);
    assert.equal(reopened.Positions[0].Direction, "Short");
});

test("rejects closing more than the selected lot quantity", () => {
    const asset = openLot(longAsset, "Long", 2, 10);
    assert.throws(() => PositionCore.closePosition(asset, "EXM", {
        price: 12,
        commissionOut: 0,
        dateOut: "2026-09-29",
        selections: [{ index: 0, quantity: 3 }]
    }), /no greater than the selected lot quantity/);
});

test("conserves a close commission split across several lots", () => {
    let asset = longAsset;
    for (let index = 0; index < 4; index += 1) {
        asset = openLot(asset, "Long", 1, 10);
    }
    const result = PositionCore.closePosition(asset, "EXM", {
        price: 11,
        commissionOut: 0.02,
        dateOut: "2026-09-29",
        selections: [0, 1, 2, 3].map(index => ({ index, quantity: 1 }))
    });

    const allocatedFees = result.closedLots.reduce((total, lot) => total + lot.CommissionOut, 0);
    assertClose(allocatedFees, 0.02);
    assert.ok(result.closedLots.every(lot => lot.CommissionOut >= 0));
});

test("accepts legacy trades without CommissionOut and validates imported structure", () => {
    assert.equal(PositionCore.validatePortfolio({
        EXM: { Trades: [{ On: true, Qty: 1, Direction: "Long", PriceIn: 10, Commission: 0 }] }
    }).EXM.Trades[0].CommissionOut, undefined);
    assert.throws(() => PositionCore.validatePortfolio({ EXM: { Trades: "invalid" } }), /must be an array/);
    assert.throws(() => PositionCore.validatePortfolio({ EXM: { Div: -1 } }), /Div must be a finite, nonnegative number/);
    assert.throws(() => PositionCore.validatePortfolio({ EXM: { Periodicity: "weekly" } }), /Periodicity must be M, Q, S, or A/);
    assert.throws(() => PositionCore.createAsset("__PROTO__"), /Ticker symbols must start/);
});