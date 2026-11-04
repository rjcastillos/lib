const test = require("node:test");
const assert = require("node:assert/strict");
const PositionCore = require("./positions-core.js");
const Core = require("./trade-planner-core.js");
global.PositionCore = PositionCore;

function draft(overrides = {}) {
    return {
        ...Core.createDefaultDraft("NVDA", "USD"),
        entryPrice: 571,
        ...overrides
    };
}

test("sizes the ideal stop with fees and funding constraints", () => {
    const result = Core.calculatePlan(draft({
        profitTargets: [{ id: "pt2", label: "Realistic target", price: 582, source: "manual" }]
    }));
    const stop = result.stopScenarios[0];
    assert.equal(result.riskBudget, 25);
    assert.equal(result.idealStopPrice, 565.29);
    assert.equal(result.idealTargetPrice, 582.42);
    assert.ok(Math.abs(result.quantity - 4.203152364273205) < 1e-12);
    assert.ok(Math.abs(stop.targets[1].pnl - 45.234) < 0.01);
    assert.ok(Math.abs(stop.stopPnl + 25) < 1e-10);
});

test("zero fees retain fractional sizing and whole-share mode rounds down", () => {
    const fractional = Core.calculatePlan(draft({ exitFee: 0 }));
    assert.ok(Math.abs(fractional.quantity - 4.378283712784683) < 1e-12);
    const whole = Core.calculatePlan(draft({ quantityMode: "whole" }));
    assert.equal(whole.quantity, 4);
    assert.ok(whole.quantity * 571 + 1 <= 2500);
    assert.ok(Math.abs(whole.stopScenarios[0].stopPnl) <= 25);
});

test("alternative stops size independently without changing the selected stop", () => {
    const result = Core.calculatePlan(draft({
        entryPrice: 100,
        stopLosses: [{ id: "sl2", label: "Support", price: 95, source: "support" }]
    }));
    assert.equal(result.selectedStopId, "sl1");
    assert.ok(Math.abs(result.stopScenarios[1].quantity - 4.8) < 1e-12);
});

test("rejects malformed financial inputs and unavailable risk", () => {
    assert.throws(() => Core.calculatePlan(draft({ funding: 0 })), /Funding must be greater than 0/);
    assert.throws(() => Core.calculatePlan(draft({ riskTolerancePercent: 101 })), /between 0 and 100/);
    assert.throws(() => Core.calculatePlan(draft({ entryPrice: 0 })), /Entry price must be greater than 0/);
    assert.throws(() => Core.calculatePlan(draft({ exitFee: 25 })), /Selected stop is unavailable/);
});

test("calculates specified Fibonacci extension and retracement levels", () => {
    assert.deepEqual(
        Core.calculateFibonacciExtension(100, 120, 110).map(level => Number(level.price.toFixed(2))),
        [114.72, 117.64, 120, 122.36, 123, 125.72, 130, 134]
    );
    assert.deepEqual(
        Core.calculateFibonacciRetracement(100, 120).map(level => Number(level.price.toFixed(2))),
        [115.28, 112.36, 110, 107.64, 107, 104.28, 100, 96]
    );
    const downwardExtension = Core.calculateFibonacciExtension(329.73, 162.86, 301.20);
    const upwardExtension = Core.calculateFibonacciExtension(162.78, 329.73, 162.86);
    assert.equal(
        Number(downwardExtension.find(level => level.ratio === 0.786).price.toFixed(2)),
        170.04
    );
    assert.equal(
        Number(upwardExtension.find(level => level.ratio === 0.786).price.toFixed(2)),
        294.08
    );
    assert.throws(
        () => Core.calculateFibonacciExtension(100, 120, 120),
        /C must lie strictly between points A and B/
    );
    assert.throws(
        () => Core.calculateFibonacciExtension(120, 100, 125),
        /C must lie strictly between points A and B/
    );
    assert.throws(() => Core.calculateFibonacciRetracement(120, 100), /A < B/);
});

test("calculates fee-inclusive snapshot outcomes and YOC", () => {
    const snapshot = Core.scenarioOutcomes(110, 4.43, 3, 5.3, 0, 1.01);
    assert.ok(Math.abs(snapshot.investment - 487.3) < 1e-10);
    assert.ok(Math.abs(snapshot.stopPnl + 158.31) < 1e-10);
    assert.ok(Math.abs(snapshot.targetPnl - 94.69) < 1e-10);
    assert.ok(Math.abs(snapshot.rewardRisk - 94.69 / 158.31) < 1e-12);
    assert.ok(Math.abs(snapshot.targetRoi - 94.69 / 487.3 * 100) < 1e-12);
    assert.ok(Math.abs(Core.calculateYoc({ Div: 0.12, Periodicity: "M" }, 10) - 14.4) < 1e-12);
    assert.equal(Core.calculateYoc({ Div: 0, Periodicity: "Q" }, 10), 0);
    assert.equal(Core.calculateYoc({ Div: 0.12, Periodicity: "N/A" }, 10), null);
    assert.equal(Core.calculateYoc({ Div: 0.12, Periodicity: "M" }, 10, "Short"), null);
    assert.equal(Core.calculateYoc({ Periodicity: "M" }, 10), null);
    assert.equal(Core.calculateYoc({ Div: "", Periodicity: "M" }, 10), null);
});

test("canonical JSON and CSV number formatting preserve stable representations", () => {
    assert.equal(Core.canonicalJson({ z: 1, a: { y: 2, x: 3 } }), '{"a":{"x":3,"y":2},"z":1}');
    assert.equal(Core.formatCsvNumber(100), "100");
    assert.equal(Core.formatCsvNumber(1.25), "1.25");
    assert.equal(Core.csvEscape('=SUM("a")'), "\"'=SUM(\"\"a\"\")\"");
});

test("strategy allocation keeps missing dividend data visibly unavailable", () => {
    const asset = PositionCore.createAsset("MIS", { periodicity: "M" });
    delete asset.Div;
    const openAsset = PositionCore.openPosition(asset, "MIS", {
        direction: "Long",
        strategy: "SniperNine",
        quantity: 1,
        price: 10,
        commission: 0,
        dateIn: "2026-09-28"
    }).asset;

    const [allocation] = Core.summarizeStrategyAllocations({ MIS: openAsset });

    assert.equal(allocation.positionCount, 1);
    assert.equal(allocation.dividendAvailable, false);
});
