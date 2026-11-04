const test = require("node:test");
const assert = require("node:assert/strict");
const PositionCore = require("./positions-core.js");
const TradePlannerCore = require("./trade-planner-core.js");

global.crypto ||= require("node:crypto").webcrypto;
global.PositionCore = PositionCore;
global.TradePlannerCore = TradePlannerCore;

require("./execution-history.js");
const ExecutionHistory = global.ExecutionHistory;

test("parses quoted CSV fields and escaped quotes", () => {
    assert.deepEqual(ExecutionHistory.parseCsv('A,B\r\n"one,two","a ""quote"""\r\n'), [
        ["A", "B"],
        ["one,two", 'a "quote"']
    ]);
});

test("legacy sidecar IDs are stable and do not mutate portfolio rows", async () => {
    const firstTrade = {
        Action: "Buy",
        Strategy: "SniperNine",
        Qty: 2,
        Date: "2026-09-28",
        Price: 10,
        Commission: 1
    };
    const portfolio = {
        EXM: {
            Currency: "USD",
            Trades: [
                firstTrade,
                {
                    Action: "Sell",
                    Strategy: "SniperNine",
                    Qty: 1,
                    Date: "2026-09-29",
                    Price: 12,
                    Commission: 0.5,
                    ExecutionID: "execution-2"
                }
            ]
        }
    };
    const originalTrades = structuredClone(portfolio.EXM.Trades);

    const firstRead = await ExecutionHistory.ledgerRows(portfolio);
    const secondRead = await ExecutionHistory.ledgerRows(portfolio);

    assert.match(firstRead[0].executionID, /^legacy:EXM:1:[0-9a-f]{8}$/);
    assert.equal(firstRead[0].executionID, secondRead[0].executionID);
    assert.equal(firstRead[1].executionID, "execution-2");
    assert.equal(firstRead[1].row[17], "FIFO");
    assert.deepEqual(portfolio.EXM.Trades, originalTrades);
});

test("new queue rows retain asset metadata needed for explicit JSON recovery", async () => {
    const before = {
        EXM: PositionCore.createAsset("EXM", {
            name: "Example Corporation",
            dividend: 0.2,
            periodicity: "Q",
            currency: "EUR",
            assetType: "Stocks"
        })
    };
    const after = structuredClone(before);
    after.EXM = PositionCore.openPosition(before.EXM, "EXM", {
        direction: "Long",
        strategy: "SniperNine",
        quantity: 2,
        price: 10,
        commission: 1,
        dateIn: "2026-09-28",
        executionID: "execution-1"
    }).asset;

    const item = await ExecutionHistory.makeQueueItem(null, before, after, "EXM", "execution-1");

    assert.equal(item.assetMetadata.name, "Example Corporation");
    assert.equal(item.assetMetadata.Currency, "EUR");
    assert.equal(item.assetMetadata.Periodicity, "Q");
    assert.equal(item.row.ExecutionID, "execution-1");
    assert.equal(item.csvRow[1], "1");
});
