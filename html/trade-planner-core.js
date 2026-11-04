(function attachTradePlannerCore(root) {
    const INTERVALS = ["1 Week", "1 Day", "4 Hours", "1 Hour", "30 min", "5 min"];
    const FIBONACCI_RATIOS = [0.236, 0.382, 0.5, 0.618, 0.65, 0.786, 1, 1.2];
    const PAYOUTS_PER_YEAR = { M: 12, Q: 4, S: 2, A: 1 };
    const STRATEGIES = ["SniperNine", "Daytrade", "SwingTrade", "LongtimeInvestment"];

    function fail(message) {
        throw new Error(message);
    }

    function finiteNumber(value, label, { minimum = -Infinity, exclusiveMinimum = false } = {}) {
        if (value === "" || value === null || value === undefined) {
            fail(`${label} is required.`);
        }
        const number = Number(value);
        if (!Number.isFinite(number)
            || (exclusiveMinimum ? number <= minimum : number < minimum)) {
            const comparison = exclusiveMinimum ? "greater than" : "at least";
            fail(`${label} must be ${comparison} ${minimum}.`);
        }
        return number;
    }

    function currencyCode(value) {
        if (typeof value !== "string" || !/^[A-Z]{3}$/i.test(value.trim())) {
            fail("Currency must be a three-letter code.");
        }
        return value.trim().toUpperCase();
    }

    function validateObservation(interval, observedAt, label) {
        if (!INTERVALS.includes(interval)) {
            fail(`${label} must use a supported chart interval.`);
        }
        if (typeof observedAt !== "string"
            || !/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}(?::\d{2}(?:\.\d{1,3})?)?(?:Z|[+-]\d{2}:\d{2})$/.test(observedAt)
            || Number.isNaN(Date.parse(observedAt))) {
            fail(`${label} observation time must be an ISO 8601 date-time with a UTC offset.`);
        }
    }

    function createDefaultDraft(ticker = "", currency = "USD") {
        return {
            ticker: String(ticker).trim().toUpperCase(),
            currency: currencyCode(currency),
            funding: 2500,
            riskTolerancePercent: 1,
            ptPercent: 2,
            entryPrice: "",
            entryFee: 0,
            exitFee: 1,
            quantityMode: "fractional",
            selectedStopId: "sl1",
            profitTargets: [],
            stopLosses: [],
            indicators: { rsi: null, ema: [], vwap: null },
            atr: null,
            atrp: null,
            notes: ""
        };
    }

    function validateDraft(draft) {
        if (!draft || typeof draft !== "object" || Array.isArray(draft)) {
            fail("Plan data must be an object.");
        }
        const ticker = typeof draft.ticker === "string" ? draft.ticker.trim().toUpperCase() : "";
        if (!ticker) fail("Ticker is required.");
        if (!/^[A-Z0-9][A-Z0-9.-]{0,15}$/.test(ticker)) {
            fail("Ticker must contain 1–16 letters, numbers, dots, or hyphens.");
        }
        const currency = currencyCode(draft.currency);
        const funding = finiteNumber(draft.funding, "Funding", { minimum: 0, exclusiveMinimum: true });
        const riskTolerancePercent = finiteNumber(draft.riskTolerancePercent, "Risk tolerance", { minimum: 0 });
        if (riskTolerancePercent > 100) fail("Risk tolerance must be between 0 and 100 percent.");
        const ptPercent = finiteNumber(draft.ptPercent, "PT1 percentage", { minimum: 0 });
        const entryFee = finiteNumber(draft.entryFee, "Entry fee", { minimum: 0 });
        const exitFee = finiteNumber(draft.exitFee, "Estimated exit fee", { minimum: 0 });
        const entryPrice = finiteNumber(draft.entryPrice, "Entry price", { minimum: 0, exclusiveMinimum: true });
        if (!["fractional", "whole"].includes(draft.quantityMode)) {
            fail("Choose fractional quantity or whole shares rounded down.");
        }
        if (!Array.isArray(draft.profitTargets) || !Array.isArray(draft.stopLosses)) {
            fail("Profit and stop candidates must be lists.");
        }
        if (draft.profitTargets.length + 1 > 10 || draft.stopLosses.length + 1 > 10) {
            fail("A plan can contain at most 10 profit targets and 10 stop losses, including PT1 and SL1.");
        }
        return {
            ...draft,
            ticker,
            currency,
            funding,
            riskTolerancePercent,
            ptPercent,
            entryFee,
            exitFee,
            entryPrice
        };
    }

    function validateCandidate(candidate, kind, entryPrice) {
        if (!candidate || typeof candidate !== "object" || Array.isArray(candidate)) {
            fail(`${kind} candidate must be an object.`);
        }
        const price = finiteNumber(candidate.price, `${kind} price`, { minimum: 0, exclusiveMinimum: true });
        if (kind === "stop" && price >= entryPrice) {
            fail("Every stop candidate must be below entry price.");
        }
        if (kind === "target" && price <= entryPrice) {
            fail("Every profit target must be above entry price for a long plan.");
        }
        if (candidate.chartInterval || candidate.observedAt) {
            validateObservation(candidate.chartInterval, candidate.observedAt, `${kind} candidate`);
        }
        return { ...candidate, price };
    }

    function calculateScenario(quantity, entryPrice, exitPrice, entryFee, exitFee) {
        const investment = quantity * entryPrice + entryFee;
        const pnl = quantity * exitPrice - exitFee - investment;
        return {
            investment,
            pnl,
            roi: investment > 0 ? pnl / investment * 100 : null
        };
    }

    function calculatePlan(draft) {
        const plan = validateDraft(draft);
        const riskBudget = plan.funding * plan.riskTolerancePercent / 100;
        const idealStopPrice = plan.entryPrice * (1 - plan.riskTolerancePercent / 100);
        const idealTargetPrice = plan.entryPrice * (1 + plan.ptPercent / 100);
        const stops = [
            { id: "sl1", label: "SL1 · ideal stop", source: "risk-tolerance", price: idealStopPrice },
            ...plan.stopLosses.map(candidate => validateCandidate(candidate, "stop", plan.entryPrice))
        ];
        const targets = [
            { id: "pt1", label: "PT1 · ideal target", source: "pt-percent", price: idealTargetPrice },
            ...plan.profitTargets.map(candidate => validateCandidate(candidate, "target", plan.entryPrice))
        ];
        if (stops.some(stop => !Number.isFinite(stop.price) || stop.price <= 0)) {
            fail("Risk tolerance produces an invalid stop price.");
        }
        if (targets.some(target => !Number.isFinite(target.price) || target.price <= plan.entryPrice)) {
            fail("PT1 must be above the entry price.");
        }

        const fundingQuantity = (plan.funding - plan.entryFee) / plan.entryPrice;
        if (fundingQuantity <= 0) fail("Entry fee exhausts the available funding.");
        const stopScenarios = stops.map(stop => {
            const riskDistance = plan.entryPrice - stop.price;
            const riskAvailable = riskBudget - plan.entryFee - plan.exitFee;
            if (riskDistance <= 0) {
                return { ...stop, error: "Stop must be below entry." };
            }
            if (riskAvailable <= 0) {
                return { ...stop, error: "Fees exhaust the risk budget." };
            }
            const riskQuantity = riskAvailable / riskDistance;
            const allowedRaw = Math.min(riskQuantity, fundingQuantity);
            const quantity = plan.quantityMode === "whole" ? Math.floor(allowedRaw) : allowedRaw;
            if (!(quantity > 0)) {
                return { ...stop, riskQuantity, fundingQuantity, quantity: null, error: "Allowed quantity is zero." };
            }
            const stopOutcome = calculateScenario(
                quantity,
                plan.entryPrice,
                stop.price,
                plan.entryFee,
                plan.exitFee
            );
            const targetOutcomes = targets.map(target => {
                const outcome = calculateScenario(
                    quantity,
                    plan.entryPrice,
                    target.price,
                    plan.entryFee,
                    plan.exitFee
                );
                const rewardRisk = outcome.pnl > 0 && stopOutcome.pnl < 0
                    ? outcome.pnl / Math.abs(stopOutcome.pnl)
                    : null;
                return {
                    ...target,
                    ...outcome,
                    rewardRisk,
                    distancePercent: Math.abs(target.price - plan.entryPrice) / plan.entryPrice * 100
                };
            });
            return {
                ...stop,
                riskDistance,
                riskQuantity,
                fundingQuantity,
                quantity,
                stopPnl: stopOutcome.pnl,
                investment: stopOutcome.investment,
                targets: targetOutcomes,
                distancePercent: Math.abs(stop.price - plan.entryPrice) / plan.entryPrice * 100
            };
        });
        const selectedStop = stopScenarios.find(stop => stop.id === plan.selectedStopId);
        if (!selectedStop) fail("Select a valid stop scenario to size the plan.");
        if (selectedStop.error) fail(`Selected stop is unavailable: ${selectedStop.error}`);

        return {
            riskBudget,
            idealStopPrice,
            idealTargetPrice,
            selectedStopId: selectedStop.id,
            quantity: selectedStop.quantity,
            fundingQuantity,
            stopScenarios
        };
    }

    function calculateFibonacciExtension(pointA, pointB, pointC) {
        const a = finiteNumber(pointA, "Point A", { minimum: 0, exclusiveMinimum: true });
        const b = finiteNumber(pointB, "Point B", { minimum: 0, exclusiveMinimum: true });
        const c = finiteNumber(pointC, "Point C", { minimum: 0, exclusiveMinimum: true });
        if (!(c > Math.min(a, b) && c < Math.max(a, b))) {
            fail("Extension point C must lie strictly between points A and B.");
        }
        return FIBONACCI_RATIOS.map(ratio => ({
            ratio,
            percentage: ratio * 100,
            price: c + (b - a) * ratio
        }));
    }

    function calculateFibonacciRetracement(pointA, pointB) {
        const a = finiteNumber(pointA, "Point A", { minimum: 0, exclusiveMinimum: true });
        const b = finiteNumber(pointB, "Point B", { minimum: 0, exclusiveMinimum: true });
        if (!(a < b)) fail("Retracement points must satisfy A < B.");
        return FIBONACCI_RATIOS.map(ratio => ({
            ratio,
            percentage: ratio * 100,
            price: b - (b - a) * ratio
        }));
    }

    function calculateYoc(asset, averageBasis, direction = "Long") {
        if (direction !== "Long" || !(Number(averageBasis) > 0)) return null;
        if (!asset || asset.Periodicity === "N/A") return null;
        if (asset.Div === undefined || asset.Div === null || asset.Div === "") return null;
        const periodicity = asset.Periodicity ?? "M";
        const payoutCount = PAYOUTS_PER_YEAR[periodicity];
        if (!payoutCount) return null;
        const dividend = Number(asset.Div);
        if (!Number.isFinite(dividend) || dividend < 0) return null;
        return dividend * payoutCount / Number(averageBasis) * 100;
    }

    function scenarioOutcomes(quantity, entryPrice, stopPrice, targetPrice, entryFee, exitFee) {
        const investment = quantity * entryPrice + entryFee;
        const stopPnl = quantity * stopPrice - exitFee - investment;
        const targetPnl = quantity * targetPrice - exitFee - investment;
        return {
            investment,
            stopPnl,
            targetPnl,
            rewardRisk: targetPnl > 0 && stopPnl < 0 ? targetPnl / Math.abs(stopPnl) : null,
            targetRoi: investment > 0 ? targetPnl / investment * 100 : null
        };
    }

    function canonicalJson(value) {
        if (Array.isArray(value)) return `[${value.map(canonicalJson).join(",")}]`;
        if (value && typeof value === "object") {
            return `{${Object.keys(value).sort().map(key => `${JSON.stringify(key)}:${canonicalJson(value[key])}`).join(",")}}`;
        }
        return JSON.stringify(value);
    }

    async function sha256(value) {
        if (!root.crypto?.subtle) fail("SHA-256 is unavailable in this browser context.");
        const bytes = new TextEncoder().encode(typeof value === "string" ? value : canonicalJson(value));
        const digest = await root.crypto.subtle.digest("SHA-256", bytes);
        return [...new Uint8Array(digest)].map(byte => byte.toString(16).padStart(2, "0")).join("");
    }

    function createUlid(now = Date.now(), cryptoApi = root.crypto) {
        const alphabet = "0123456789ABCDEFGHJKMNPQRSTVWXYZ";
        if (!cryptoApi?.getRandomValues) fail("Secure random IDs are unavailable in this browser.");
        let timestamp = now;
        let timePart = "";
        for (let index = 0; index < 10; index++) {
            timePart = alphabet[timestamp % 32] + timePart;
            timestamp = Math.floor(timestamp / 32);
        }
        const random = new Uint8Array(10);
        cryptoApi.getRandomValues(random);
        let randomBits = 0;
        let bitCount = 0;
        let randomPart = "";
        for (const byte of random) {
            randomBits = (randomBits << 8) | byte;
            bitCount += 8;
            while (bitCount >= 5) {
                bitCount -= 5;
                randomPart += alphabet[(randomBits >> bitCount) & 31];
            }
        }
        return timePart + randomPart;
    }

    function csvEscape(value) {
        let text = value === null || value === undefined ? "" : String(value);
        if (/^[\s]*[=+@]/.test(text) || /^[\s]*-[A-Za-z]/.test(text)) text = `'${text}`;
        return /[",\r\n]/.test(text) ? `"${text.replaceAll('"', '""')}"` : text;
    }

    function formatCsvNumber(value) {
        if (value === null || value === undefined || value === "") return "";
        const number = Number(value);
        if (!Number.isFinite(number)) fail("CSV numeric values must be finite.");
        return number.toFixed(8).replace(/(\.\d*?)0+$/, "$1").replace(/\.$/, "");
    }

    function summarizeStrategyAllocations(portfolio) {
        const groups = new Map();
        for (const [ticker, asset] of Object.entries(portfolio || {})) {
            if (ticker.startsWith(".")) continue;
            const summary = root.PositionCore.summarize(asset);
            if (summary.quantity <= 0) continue;
            const lifecycle = root.PositionCore.currentExecutionLifecycle(asset);
            const openingStrategy = lifecycle?.strategy || "Unknown";
            const currency = currencyCode(asset.Currency || "USD");
            const periodicity = asset.Periodicity || "M";
            const key = `${currency}|${openingStrategy}|${summary.direction}|${periodicity}`;
            const group = groups.get(key) || {
                currency,
                strategy: openingStrategy,
                direction: summary.direction,
                periodicity,
                positionCount: 0,
                remainingBasis: 0,
                perCycleDividend: 0,
                annualDividend: 0,
                dividendAvailable: summary.direction === "Long" && periodicity !== "N/A"
            };
            group.positionCount += 1;
            group.remainingBasis += summary.invested;
            const dividendAvailable = asset.Div !== undefined && asset.Div !== null && asset.Div !== ""
                && Number.isFinite(Number(asset.Div)) && Number(asset.Div) >= 0;
            if (summary.direction === "Long" && periodicity !== "N/A" && PAYOUTS_PER_YEAR[periodicity]
                && dividendAvailable) {
                group.perCycleDividend += summary.quantity * Number(asset.Div);
                group.annualDividend += summary.quantity * Number(asset.Div) * PAYOUTS_PER_YEAR[periodicity];
            } else if (summary.direction === "Long" && periodicity !== "N/A") {
                group.dividendAvailable = false;
            }
            groups.set(key, group);
        }
        return [...groups.values()].sort((left, right) =>
            left.currency.localeCompare(right.currency)
            || left.strategy.localeCompare(right.strategy)
            || left.direction.localeCompare(right.direction)
            || left.periodicity.localeCompare(right.periodicity));
    }

    const api = {
        INTERVALS,
        FIBONACCI_RATIOS,
        PAYOUTS_PER_YEAR,
        STRATEGIES,
        calculateFibonacciExtension,
        calculateFibonacciRetracement,
        calculatePlan,
        calculateYoc,
        canonicalJson,
        createDefaultDraft,
        createUlid,
        currencyCode,
        csvEscape,
        formatCsvNumber,
        scenarioOutcomes,
        sha256,
        summarizeStrategyAllocations,
        validateDraft
    };
    if (typeof module !== "undefined" && module.exports) module.exports = api;
    root.TradePlannerCore = api;
})(typeof globalThis === "undefined" ? this : globalThis);
