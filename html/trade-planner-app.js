const PlannerCore = window.TradePlannerCore;
const PlannerStore = window.TradePlannerStore;
const PositionCore = window.PositionCore;
const byId = id => document.getElementById(id);
const clone = value => JSON.parse(JSON.stringify(value));

let portfolioData = {};
let savedPlans = [];
let currentPlan = null;
let currentRevisions = [];
let currentRevision = null;
let draft = PlannerCore.createDefaultDraft();
let dirty = false;
let restorePending = null;
let portfolioChannel = null;
let executionCsvHandle = null;
let statusTimer;

function setStatus(message, isError = false, persistent = false) {
    const status = byId("statusMessage");
    status.textContent = message;
    status.dataset.kind = isError ? "error" : "success";
    clearTimeout(statusTimer);
    if (!persistent) statusTimer = setTimeout(() => {
        status.textContent = "";
        status.dataset.kind = "";
    }, 8000);
}

function renderCandidateLists() {
    for (const [kind, field, listID] of [
        ["target", "profitTargets", "targetCandidateList"],
        ["stop", "stopLosses", "stopCandidateList"]
    ]) {
        const list = byId(listID);
        list.replaceChildren();
        draft[field].forEach(candidate => {
            const item = document.createElement("li");
            item.appendChild(document.createTextNode(
                `${candidate.label} · ${money(Number(candidate.price))} · ${candidate.chartInterval || "manual"} · ${candidate.observedAt || "no observation time"} `
            ));
            const remove = document.createElement("button");
            remove.type = "button";
            remove.className = "button tertiary";
            remove.dataset.removeKind = kind;
            remove.dataset.removeId = candidate.id;
            remove.textContent = `Remove ${candidate.label}`;
            item.appendChild(remove);
            list.appendChild(item);
        });
    }
}

function numberValue(id) {
    const value = byId(id).value;
    return value === "" ? "" : Number(value);
}

function isOffsetDateTime(value) {
    return typeof value === "string"
        && /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}[+-]\d{2}:\d{2}$/.test(value)
        && !Number.isNaN(Date.parse(value));
}

function localDateTimeToOffset(value) {
    if (!value) return "";
    const date = new Date(value);
    const offsetMinutes = -date.getTimezoneOffset();
    const sign = offsetMinutes >= 0 ? "+" : "-";
    const absoluteOffset = Math.abs(offsetMinutes);
    const offset = `${sign}${String(Math.floor(absoluteOffset / 60)).padStart(2, "0")}:${String(absoluteOffset % 60).padStart(2, "0")}`;
    return `${value}:00${offset}`;
}

function offsetDateTimeToLocal(value) {
    if (!value) return "";
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return "";
    const pad = number => String(number).padStart(2, "0");
    return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

function money(value, currency = draft.currency) {
    return new Intl.NumberFormat("en-US", {
        style: "currency",
        currency: currency || "USD",
        minimumFractionDigits: 2,
        maximumFractionDigits: 2
    }).format(value);
}

function quantityText(value) {
    return new Intl.NumberFormat("en-US", { maximumFractionDigits: 8 }).format(value);
}

function setSelectOptions(select, values) {
    select.replaceChildren(...values.map(value => new Option(value, value)));
}

function populateIntervals() {
    document.querySelectorAll("#targetInterval, #stopInterval, #volatilityInterval, #rsiInterval, #emaInterval, #vwapInterval, #fibInterval")
        .forEach(select => {
            setSelectOptions(select, PlannerCore.INTERVALS);
        });
}

function selectedPortfolioAsset() {
    const ticker = byId("portfolioTicker").value;
    return ticker ? portfolioData[ticker] || null : null;
}

function updatePortfolioTickers(selectedTicker = "") {
    const select = byId("portfolioTicker");
    select.replaceChildren(new Option("Select portfolio ticker", ""));
    Object.keys(portfolioData)
        .filter(ticker => !ticker.startsWith("."))
        .sort()
        .forEach(ticker => select.add(new Option(`${portfolioData[ticker].name || ticker} (${ticker})`, ticker)));
    if (selectedTicker && portfolioData[selectedTicker] && !selectedTicker.startsWith(".")) {
        select.value = selectedTicker;
    } else if (draft.ticker && portfolioData[draft.ticker]) {
        select.value = draft.ticker;
    }
    updatePortfolioNotice();
}

function updatePortfolioNotice() {
    const notice = byId("portfolioNotice");
    const ticker = byId("portfolioTicker").value;
    const asset = ticker ? portfolioData[ticker] : null;
    if (!asset) {
        notice.hidden = true;
        byId("recordOpeningButton").disabled = true;
        return;
    }
    let summary;
    try {
        summary = PositionCore.summarize(asset);
    } catch (error) {
        notice.textContent = `Selected portfolio ticker cannot be used: ${error.message}`;
        notice.hidden = false;
        byId("recordOpeningButton").disabled = true;
        return;
    }
    const expectedCurrency = (asset.Currency || "USD").toUpperCase();
    const currencyMatches = draft.currency === expectedCurrency;
    const planMatches = currentPlan?.ticker === ticker;
    const state = summary.quantity > 0
        ? `${summary.direction} position open: ${quantityText(summary.quantity)} units at ${money(summary.averagePrice, expectedCurrency)} average basis.`
        : "No open position.";
    const mismatch = [
        !currencyMatches ? `Plan currency ${draft.currency} does not match ticker currency ${expectedCurrency}.` : "",
        !planMatches
            ? currentPlan
                ? `This saved plan belongs to ${currentPlan.ticker}, not ${ticker}.`
                : "Save this draft before linking it to a portfolio execution."
            : ""
    ].filter(Boolean);
    notice.textContent = `${ticker}: ${state} ${mismatch.join(" ")}`.trim();
    notice.hidden = false;
    const lifecycleMatches = !currentPlan?.openingExecutionID
        && summary.quantity === 0
        && currentPlan?.lifecycle === "saved"
        && !currentPlan.hasLinkedExecution;
    byId("recordOpeningButton").disabled = !currencyMatches || !planMatches
        || !currentPlan || !currentRevision || !lifecycleMatches || dirty || currentPlan.archived;
}

function readIndicator(valueId, intervalId, timeId, label) {
    const value = byId(valueId).value;
    if (value === "") return null;
    return {
        value: Number(value),
        chartInterval: byId(intervalId).value,
        observedAt: localDateTimeToOffset(byId(timeId).value),
        source: "user-observed"
    };
}

function readDraft() {
    const next = {
        ...draft,
        ticker: byId("tickerInput").value,
        currency: byId("currencyInput").value,
        funding: numberValue("fundingInput"),
        riskTolerancePercent: numberValue("riskInput"),
        ptPercent: numberValue("ptPercentInput"),
        entryPrice: numberValue("entryInput"),
        entryFee: numberValue("entryFeeInput"),
        exitFee: numberValue("exitFeeInput"),
        quantityMode: byId("quantityModeInput").value,
        indicators: {
            rsi: readIndicator("rsiInput", "rsiInterval", "rsiObservedAt", "RSI"),
            ema: [9, 100, 200].flatMap(period => {
                const value = byId(`ema${period}Input`).value;
                if (value === "") return [];
                return [{
                    period,
                    value: Number(value),
                    chartInterval: byId("emaInterval").value,
                    observedAt: localDateTimeToOffset(byId("emaObservedAt").value),
                    source: "user-observed"
                }];
            }),
            vwap: readIndicator("vwapInput", "vwapInterval", "vwapObservedAt", "VWAP")
        }
    };
    const atr = byId("atrInput").value;
    const atrp = byId("atrpInput").value;
    next.atr = atr === "" ? null : {
        value: Number(atr),
        chartInterval: byId("volatilityInterval").value,
        observedAt: localDateTimeToOffset(byId("volatilityObservedAt").value),
        source: "user-observed"
    };
    next.atrp = atrp === "" ? null : {
        value: Number(atrp),
        chartInterval: byId("volatilityInterval").value,
        observedAt: localDateTimeToOffset(byId("volatilityObservedAt").value),
        source: "user-observed"
    };
    return next;
}

function populateDraft(nextDraft) {
    draft = clone(nextDraft);
    byId("tickerInput").value = draft.ticker || "";
    byId("currencyInput").value = draft.currency || "USD";
    byId("fundingInput").value = draft.funding ?? 2500;
    byId("riskInput").value = draft.riskTolerancePercent ?? 1;
    byId("ptPercentInput").value = draft.ptPercent ?? 2;
    byId("entryInput").value = draft.entryPrice ?? "";
    byId("entryFeeInput").value = draft.entryFee ?? 0;
    byId("exitFeeInput").value = draft.exitFee ?? 1;
    byId("quantityModeInput").value = draft.quantityMode || "fractional";
    byId("atrInput").value = draft.atr?.value ?? "";
    byId("atrpInput").value = draft.atrp?.value ?? "";
    byId("volatilityInterval").value = draft.atr?.chartInterval || draft.atrp?.chartInterval || PlannerCore.INTERVALS[1];
    byId("volatilityObservedAt").value = offsetDateTimeToLocal(draft.atr?.observedAt || draft.atrp?.observedAt);
    byId("rsiInput").value = draft.indicators?.rsi?.value ?? "";
    byId("rsiInterval").value = draft.indicators?.rsi?.chartInterval || PlannerCore.INTERVALS[1];
    byId("rsiObservedAt").value = offsetDateTimeToLocal(draft.indicators?.rsi?.observedAt);
    for (const period of [9, 100, 200]) {
        const indicator = draft.indicators?.ema?.find(item => item.period === period);
        byId(`ema${period}Input`).value = indicator?.value ?? "";
    }
    const ema = draft.indicators?.ema?.[0];
    byId("emaInterval").value = ema?.chartInterval || PlannerCore.INTERVALS[1];
    byId("emaObservedAt").value = offsetDateTimeToLocal(ema?.observedAt);
    byId("vwapInput").value = draft.indicators?.vwap?.value ?? "";
    byId("vwapInterval").value = draft.indicators?.vwap?.chartInterval || PlannerCore.INTERVALS[1];
    byId("vwapObservedAt").value = offsetDateTimeToLocal(draft.indicators?.vwap?.observedAt);
    byId("notesInput").value = draft.notes || "";
    renderCandidates();
    updatePortfolioTickers();
    updateCalculations();
}

function setDirty() {
    dirty = true;
    updatePlanControls();
    updateCalculations();
}

function currentDraft() {
    draft = readDraft();
    return draft;
}

function appendCandidate(kind, candidate) {
    const key = kind === "target" ? "profitTargets" : "stopLosses";
    if (draft[key].length + 1 >= 10) {
        setStatus(`A plan can contain no more than 10 ${kind === "target" ? "PT" : "SL"} candidates including the ideal candidate.`, true);
        return false;
    }
    const id = `${kind === "target" ? "pt" : "sl"}-${PlannerCore.createUlid()}`;
    draft[key].push({ id, ...candidate });
    if (kind === "stop" && !draft.selectedStopId) draft.selectedStopId = id;
    renderCandidates();
    setDirty();
    return true;
}

function renderCandidates() {
    const body = byId("scenarioBody");
    body.replaceChildren();
    renderCandidateLists();
    let result;
    try {
        result = PlannerCore.calculatePlan(currentDraft());
    } catch (error) {
        const row = document.createElement("tr");
        const cell = document.createElement("td");
        cell.colSpan = 6;
        cell.textContent = error.message;
        row.appendChild(cell);
        body.appendChild(row);
        return;
    }

    result.stopScenarios.forEach(stop => {
        const row = document.createElement("tr");
        const selectCell = document.createElement("td");
        const select = document.createElement("input");
        select.type = "radio";
        select.name = "selectedStop";
        select.value = stop.id;
        select.checked = stop.id === draft.selectedStopId;
        select.setAttribute("aria-label", `Use ${stop.label} as primary quantity stop`);
        select.addEventListener("change", () => {
            draft.selectedStopId = stop.id;
            setDirty();
        });
        const label = document.createElement("label");
        label.append(select, document.createTextNode(` ${stop.label}`));
        selectCell.appendChild(label);
        row.appendChild(selectCell);

        const sourceCell = document.createElement("td");
        sourceCell.textContent = [stop.source, stop.chartInterval, stop.observedAt].filter(Boolean).join(" · ") || "Calculated from plan";
        row.appendChild(sourceCell);
        const priceCell = document.createElement("td");
        priceCell.textContent = `${money(stop.price)} · ${stop.distancePercent?.toFixed(2) ?? "—"}% from entry`;
        row.appendChild(priceCell);
        const quantityCell = document.createElement("td");
        quantityCell.textContent = stop.error ? stop.error : quantityText(stop.quantity);
        row.appendChild(quantityCell);
        const pnlCell = document.createElement("td");
        pnlCell.textContent = Number.isFinite(stop.stopPnl) ? money(stop.stopPnl) : "Unavailable";
        row.appendChild(pnlCell);
        const targetCell = document.createElement("td");
        targetCell.textContent = stop.error
            ? "Unavailable"
            : stop.targets.map(target => `${target.label}: ${money(target.pnl)} · ${target.rewardRisk === null ? "R/R unavailable" : `${target.rewardRisk.toFixed(3)}:1`} · ROI ${target.roi === null ? "N/A" : `${target.roi.toFixed(2)}%`}`).join("; ");
        row.appendChild(targetCell);
        body.appendChild(row);
    });

    byId("riskBudgetOutput").textContent = money(result.riskBudget);
    byId("idealStopOutput").textContent = money(result.idealStopPrice);
    byId("quantityOutput").textContent = quantityText(result.quantity);
    byId("idealTargetOutput").textContent = money(result.idealTargetPrice);
    updatePortfolioNotice();
}

function updateCalculations() {
    try {
        const result = PlannerCore.calculatePlan(currentDraft());
        byId("riskBudgetOutput").textContent = money(result.riskBudget);
        byId("idealStopOutput").textContent = money(result.idealStopPrice);
        byId("quantityOutput").textContent = quantityText(result.quantity);
        byId("idealTargetOutput").textContent = money(result.idealTargetPrice);
        renderCandidates();
    } catch (error) {
        byId("riskBudgetOutput").textContent = "Unavailable";
        byId("idealStopOutput").textContent = "Unavailable";
        byId("quantityOutput").textContent = "Unavailable";
        byId("idealTargetOutput").textContent = "Unavailable";
        const body = byId("scenarioBody");
        body.replaceChildren();
        const row = document.createElement("tr");
        const cell = document.createElement("td");
        cell.colSpan = 6;
        cell.textContent = error.message;
        row.appendChild(cell);
        body.appendChild(row);
    }
    updatePortfolioNotice();
}

function planStatusText() {
    if (!currentPlan) return dirty ? "Unsaved draft · changes are only in this page." : "Draft changes stay in this page until explicitly saved.";
    const revision = currentRevision?.revisionNumber || currentPlan.revisionCount;
    const mode = currentPlan.lifecycle === "closed" ? "Closed · read-only" : currentPlan.lifecycle === "mismatch" ? "Link mismatch · review required" : currentPlan.lifecycle;
    const archived = currentPlan.archived ? " · archived" : "";
    return `${currentPlan.ticker} · revision ${revision}/${currentPlan.revisionCount} · ${mode}${archived}${dirty ? " · unsaved changes" : ""}`;
}

function updatePlanControls() {
    byId("planState").textContent = planStatusText();
    const isSaved = Boolean(currentPlan);
    const readOnly = currentPlan?.lifecycle === "closed" || currentPlan?.lifecycle === "mismatch"
        || currentPlan?.archived
        || (currentRevision && currentRevision.id !== currentPlan?.currentRevisionID);
    byId("savePlanButton").hidden = isSaved;
    byId("saveRevisionButton").hidden = !isSaved || readOnly;
    const executionLinked = Boolean(currentPlan?.openingExecutionID || currentPlan?.hasLinkedExecution);
    byId("archivePlanButton").hidden = !isSaved || executionLinked;
    byId("archivePlanButton").textContent = currentPlan?.archived ? "Unarchive" : "Archive";
    byId("duplicatePlanButton").hidden = !isSaved || currentPlan?.lifecycle !== "closed";
    byId("deletePlanButton").hidden = !isSaved || executionLinked;
    const staleLink = currentPlan?.lifecycle === "mismatch" && currentPlan.openingExecutionID
        && !findExecution(currentPlan.openingExecutionID);
    byId("releasePlanLinkButton").hidden = !staleLink;
    const draftInputs = [
        "tickerInput", "currencyInput", "fundingInput", "riskInput", "ptPercentInput", "entryInput",
        "entryFeeInput", "exitFeeInput", "quantityModeInput", "targetLabel", "targetPrice",
        "targetInterval", "targetObservedAt", "stopLabel", "stopPrice", "stopInterval", "stopObservedAt",
        "atrInput", "atrpInput", "volatilityInterval", "volatilityObservedAt", "rsiInput",
        "rsiInterval", "rsiObservedAt", "ema9Input", "ema100Input", "ema200Input", "emaInterval",
        "emaObservedAt", "vwapInput", "vwapInterval", "vwapObservedAt"
    ];
    draftInputs.forEach(id => { byId(id).disabled = Boolean(readOnly); });
    byId("tickerInput").disabled = isSaved || Boolean(readOnly);
    byId("notesButton").disabled = Boolean(readOnly);
    byId("fibButton").disabled = Boolean(readOnly);
    byId("atrCandidateButton").disabled = Boolean(readOnly);
    byId("atrpCandidateButton").disabled = Boolean(readOnly);
    byId("targetForm").querySelector("button").disabled = Boolean(readOnly);
    byId("stopForm").querySelector("button").disabled = Boolean(readOnly);
    document.querySelectorAll("#targetCandidateList button, #stopCandidateList button")
        .forEach(button => { button.disabled = Boolean(readOnly); });
    byId("revisionField").hidden = !isSaved;
    byId("savedPlanSelect").value = currentPlan?.id || "";
    if (currentRevisions.length) {
        byId("revisionSelect").replaceChildren(...currentRevisions.map(revision =>
            new Option(`Revision ${revision.revisionNumber} · ${new Date(revision.createdAt).toLocaleString()}`, revision.id)));
        byId("revisionSelect").value = currentRevision?.id || currentPlan?.currentRevisionID || "";
    } else {
        byId("revisionSelect").replaceChildren();
    }
}

async function reloadPlans(selectPlanID = "") {
    savedPlans = await PlannerStore.getAllPlansWithRevisions();
    const select = byId("savedPlanSelect");
    select.replaceChildren(new Option("New unsaved plan", ""));
    savedPlans.forEach(plan => {
        const suffix = `${plan.archived ? " · archived" : ""}${plan.openingExecutionID ? ` · ${plan.lifecycle}` : ""}`;
        select.add(new Option(`${plan.ticker} · ${plan.revisionCount} revision${plan.revisionCount === 1 ? "" : "s"}${suffix}`, plan.id));
    });
    if (selectPlanID) select.value = selectPlanID;
    updateBackupStatus();
}

async function updateBackupStatus() {
    try {
        const lastBackup = await PlannerStore.getSetting("lastBackup");
        const totalRevisions = savedPlans.reduce((total, plan) => total + plan.revisionCount, 0);
        const baseline = lastBackup?.revisionCount || 0;
        byId("backupStatus").textContent = lastBackup
            ? `Last backup: ${new Date(lastBackup.at).toLocaleString()} · ${Math.max(0, totalRevisions - baseline)} plan revision(s) since backup.`
            : `${totalRevisions} saved plan revision(s) · no successful backup recorded.`;
    } catch (error) {
        byId("backupStatus").textContent = `Backup status unavailable: ${error.message}`;
    }
}

async function loadPlan(planID) {
    if (!planID) {
        currentPlan = null;
        currentRevisions = [];
        currentRevision = null;
        populateDraft(PlannerCore.createDefaultDraft());
        dirty = false;
        updatePlanControls();
        return;
    }
    const plan = savedPlans.find(item => item.id === planID);
    if (!plan) throw new Error("Selected plan could not be found. Reload the plan list.");
    currentPlan = plan;
    currentRevisions = plan.revisions;
    currentRevision = currentRevisions.find(item => item.id === plan.currentRevisionID) || currentRevisions.at(-1);
    if (!currentRevision) throw new Error("Selected plan has no saved revision.");
    populateDraft(currentRevision.draft);
    dirty = false;
    updatePlanControls();
    await reconcilePlanLifecycle(currentPlan);
}

function buildRevision() {
    const revisionDraft = clone(currentDraft());
    revisionDraft.notes = byId("notesInput").value;
    PlannerCore.validateDraft(revisionDraft);
    validateContextualReadings(revisionDraft);
    return {
        id: PlannerCore.createUlid(),
        createdAt: new Date().toISOString(),
        draft: revisionDraft
    };
}

function validateContextualReadings(planDraft) {
    const indicators = planDraft.indicators || {};
    for (const [label, indicator] of [["RSI", indicators.rsi], ["VWAP", indicators.vwap]]) {
        if (!indicator) continue;
        if (!Number.isFinite(indicator.value) || (label === "RSI" && (indicator.value < 0 || indicator.value > 100))
            || (label === "VWAP" && indicator.value <= 0)) {
            throw new Error(`${label} reading is outside its valid range.`);
        }
        if (!PlannerCore.INTERVALS.includes(indicator.chartInterval) || !isOffsetDateTime(indicator.observedAt)) {
            throw new Error(`${label} requires a chart interval and observation date/time with UTC offset.`);
        }
    }
    for (const ema of indicators.ema || []) {
        if (![9, 100, 200].includes(ema.period) || !Number.isFinite(ema.value) || ema.value <= 0
            || !PlannerCore.INTERVALS.includes(ema.chartInterval) || !isOffsetDateTime(ema.observedAt)) {
            throw new Error("Each EMA reading requires a positive price, supported chart interval, and observation time.");
        }
    }
    for (const volatility of [planDraft.atr, planDraft.atrp]) {
        if (!volatility) continue;
        if (!Number.isFinite(volatility.value) || volatility.value <= 0
            || !PlannerCore.INTERVALS.includes(volatility.chartInterval) || !isOffsetDateTime(volatility.observedAt)) {
            throw new Error("ATR and ATRP require a positive distance, supported chart interval, and observation time.");
        }
    }
}

async function savePlan() {
    try {
        const revision = buildRevision();
        const plan = {
            id: PlannerCore.createUlid(),
            ticker: revision.draft.ticker,
            currency: revision.draft.currency,
            createdAt: revision.createdAt,
            updatedAt: revision.createdAt,
            order: savedPlans.length ? Math.max(...savedPlans.map(item => item.order || 0)) + 1 : 1,
            openingExecutionID: null
        };
        const saved = await PlannerStore.saveNewPlan(plan, revision);
        currentPlan = saved;
        currentRevisions = [{ ...revision, planID: saved.id, revisionNumber: 1 }];
        currentRevision = currentRevisions[0];
        dirty = false;
        await reloadPlans(saved.id);
        updatePlanControls();
        setStatus("Plan and first revision saved to this browser profile.");
        broadcastPlanChange("plan-saved", { planID: saved.id });
        requestPersistentStorage();
    } catch (error) {
        setStatus(`Plan was not saved: ${error.message}`, true, true);
    }
}

async function saveRevision() {
    if (!currentPlan) return savePlan();
    try {
        const revision = buildRevision();
        const saved = await PlannerStore.saveRevision(currentPlan.id, currentPlan.revisionCount, revision);
        currentPlan = saved;
        currentRevisions = await PlannerStore.getPlanRevisions(saved.id);
        currentRevision = currentRevisions.at(-1);
        dirty = false;
        await reloadPlans(saved.id);
        updatePlanControls();
        setStatus("New immutable plan revision saved.");
        broadcastPlanChange("plan-saved", { planID: saved.id });
        requestPersistentStorage();
    } catch (error) {
        setStatus(`Revision was not saved: ${error.message}`, true, true);
    }
}

function requestPersistentStorage() {
    if (!navigator.storage?.persist) {
        setStatus("Plan saved. Persistent browser storage is unsupported; keep a portable backup.", false, true);
        return;
    }
    navigator.storage.persist().then(granted => {
        setStatus(granted
            ? "Plan saved. Browser persistent-storage protection was granted; it is not a backup."
            : "Plan saved. Browser persistent-storage protection was denied; make a portable backup.",
        !granted, true);
    }).catch(error => {
        setStatus(`Plan saved, but persistent-storage status failed: ${error.message}`, true, true);
    });
}

async function selectRevision(revisionID) {
    const revision = currentRevisions.find(item => item.id === revisionID);
    if (!revision) return;
    currentRevision = revision;
    populateDraft(revision.draft);
    dirty = false;
    updatePlanControls();
}

function renderFibResults(levels, kind, points) {
    const results = byId("fibResults");
    results.replaceChildren();
    levels.forEach(level => {
        const label = document.createElement("label");
        const checkbox = document.createElement("input");
        checkbox.type = "checkbox";
        checkbox.dataset.ratio = String(level.ratio);
        checkbox.dataset.price = String(level.price);
        checkbox.dataset.kind = kind;
        const text = document.createTextNode(`${level.percentage}% · ${money(level.price)} · A=${points.a}, B=${points.b}${points.c === undefined ? "" : `, C=${points.c}`}`);
        label.append(checkbox, text);
        results.appendChild(label);
    });
}

function calculateFib() {
    try {
        const kind = byId("fibKind").value;
        const a = numberValue("fibPointA");
        const b = numberValue("fibPointB");
        const c = numberValue("fibPointC");
        const levels = kind === "extension"
            ? PlannerCore.calculateFibonacciExtension(a, b, c)
            : PlannerCore.calculateFibonacciRetracement(a, b);
        const points = kind === "extension" ? { a, b, c } : { a, b };
        renderFibResults(levels, kind, points);
        byId("fibStatus").textContent = `${kind === "extension" ? "Extension" : "Retracement"} levels · ${byId("fibInterval").value} · ${localDateTimeToOffset(byId("fibObservedAt").value) || "observation time not yet set"}. Selecting a level only changes this unsaved draft.`;
    } catch (error) {
        byId("fibResults").replaceChildren();
        byId("fibStatus").textContent = error.message;
    }
}

function updateFibPointLabels() {
    const extension = byId("fibKind").value === "extension";
    const a = Number(byId("fibPointA").value);
    const b = Number(byId("fibPointB").value);
    const isDownward = extension && Number.isFinite(a) && Number.isFinite(b) && a > b;

    byId("fibPointALabel").textContent = `Point A · ${extension ? (isDownward ? "swing high" : "swing low") : "swing low"}`;
    byId("fibPointBLabel").textContent = `Point B · ${extension ? (isDownward ? "swing low" : "swing high") : "swing high"}`;
    byId("fibPointCLabel").textContent = `Point C · ${extension ? (isDownward ? "pullback high" : "pullback low") : "retracement point"}`;
}

function addSelectedFibLevels() {
    const kind = byId("fibKind").value;
    const selected = [...byId("fibResults").querySelectorAll("input:checked")];
    if (!selected.length) {
        setStatus("Select one or more Fibonacci levels first.", true);
        return;
    }
    const observedAt = localDateTimeToOffset(byId("fibObservedAt").value);
    if (!observedAt) {
        setStatus("Enter the Fibonacci observation date/time, including its local offset.", true);
        return;
    }
    let points;
    if (kind === "extension") {
        points = { pointA: numberValue("fibPointA"), pointB: numberValue("fibPointB"), pointC: numberValue("fibPointC") };
    } else {
        points = { pointA: numberValue("fibPointA"), pointB: numberValue("fibPointB") };
    }
    for (const level of selected) {
        appendCandidate(kind === "extension" ? "target" : "stop", {
            label: `Fibonacci ${kind} ${Number(level.dataset.ratio) * 100}%`,
            source: `fibonacci-${kind}`,
            price: Number(level.dataset.price),
            ratio: Number(level.dataset.ratio),
            ...points,
            chartInterval: byId("fibInterval").value,
            observedAt
        });
    }
    setStatus("Selected Fibonacci levels were added to the unsaved draft. Calculate again to add more.");
}

function renderPlanSummary() {
    const summary = currentPlan ? `${currentPlan.lifecycle || "saved"} · ${currentPlan.ticker}` : "Unsaved";
    byId("planState").textContent = `${summary} · ${planStatusText()}`;
}

function handleTargetSubmit(event) {
    event.preventDefault();
    const observedAt = localDateTimeToOffset(byId("targetObservedAt").value);
    appendCandidate("target", {
        label: byId("targetLabel").value.trim() || "Manual target",
        source: byId("targetLabel").value.trim() || "manual-observation",
        price: numberValue("targetPrice"),
        chartInterval: byId("targetInterval").value,
        observedAt
    });
    event.target.reset();
    byId("targetLabel").value = "Resistance";
}

function handleStopSubmit(event) {
    event.preventDefault();
    const observedAt = localDateTimeToOffset(byId("stopObservedAt").value);
    appendCandidate("stop", {
        label: byId("stopLabel").value.trim() || "Manual stop",
        source: byId("stopLabel").value.trim() || "manual-observation",
        price: numberValue("stopPrice"),
        chartInterval: byId("stopInterval").value,
        observedAt
    });
    event.target.reset();
    byId("stopLabel").value = "Support";
}

function removeCandidate(event) {
    const button = event.target.closest("button[data-remove-kind]");
    if (!button) return;
    const field = button.dataset.removeKind === "target" ? "profitTargets" : "stopLosses";
    draft[field] = draft[field].filter(candidate => candidate.id !== button.dataset.removeId);
    if (draft.selectedStopId === button.dataset.removeId) draft.selectedStopId = "sl1";
    renderCandidates();
    setDirty();
}

async function archiveCurrentPlan() {
    if (!currentPlan) return;
    const archived = !currentPlan.archived;
    if (!window.confirm(`${archived ? "Archive" : "Unarchive"} ${currentPlan.ticker}?`)) return;
    try {
        await PlannerStore.archivePlan(currentPlan.id, archived);
        await reloadPlans(currentPlan.id);
        currentPlan = savedPlans.find(plan => plan.id === currentPlan.id);
        updatePlanControls();
        setStatus(`Plan ${archived ? "archived" : "unarchived"}.`);
        broadcastPlanChange("plan-lifecycle-changed");
    } catch (error) {
        setStatus(`Plan archive state was not changed: ${error.message}`, true);
    }
}

async function deleteCurrentPlan() {
    if (!currentPlan || !window.confirm(`Permanently delete the unlinked plan for ${currentPlan.ticker}?`)) return;
    try {
        await PlannerStore.deletePlan(currentPlan.id);
        currentPlan = null;
        currentRevisions = [];
        currentRevision = null;
        dirty = false;
        await reloadPlans();
        await loadPlan("");
        setStatus("Unlinked plan and its revisions deleted.");
        broadcastPlanChange("plan-lifecycle-changed");
    } catch (error) {
        setStatus(`Plan was not deleted: ${error.message}`, true);
    }
}

async function duplicateClosedPlan() {
    if (!currentPlan || currentPlan.lifecycle !== "closed") return;
    const revision = buildRevision();
    const plan = {
        id: PlannerCore.createUlid(),
        ticker: revision.draft.ticker,
        currency: revision.draft.currency,
        createdAt: revision.createdAt,
        updatedAt: revision.createdAt,
        order: savedPlans.length ? Math.max(...savedPlans.map(item => item.order || 0)) + 1 : 1,
        openingExecutionID: null
    };
    const saved = await PlannerStore.saveNewPlan(plan, revision);
    currentPlan = saved;
    currentRevisions = [{ ...revision, planID: saved.id, revisionNumber: 1 }];
    currentRevision = currentRevisions[0];
    dirty = false;
    await reloadPlans(saved.id);
    updatePlanControls();
    setStatus("Closed plan duplicated as a new, unlinked plan.");
}

async function releaseStaleLink() {
    if (!currentPlan?.openingExecutionID || findExecution(currentPlan.openingExecutionID)) {
        setStatus("The opening execution is still present in the selected portfolio; the plan link cannot be released.", true);
        return;
    }
    if (!window.confirm(`Release the stale local association to ${currentPlan.openingExecutionID}? The portfolio JSON is unchanged, and this executed plan will remain ineligible for deletion, archive, or reuse.`)) return;
    try {
        await PlannerStore.releaseStalePlanLink(currentPlan.id, currentPlan.openingExecutionID);
        await reloadPlans(currentPlan.id);
        currentPlan = savedPlans.find(plan => plan.id === currentPlan.id);
        updatePlanControls();
        broadcastPlanChange("plan-lifecycle-changed", { planID: currentPlan.id });
        setStatus("Stale local plan association released. Its immutable execution references were not changed.");
    } catch (error) {
        setStatus(`Stale plan link was not released: ${error.message}`, true);
    }
}

async function reconcilePlanLifecycle(plan) {
    if (!plan.openingExecutionID) return;
    const opening = findExecution(plan.openingExecutionID);
    if (!opening) {
        currentPlan = await PlannerStore.setPlanLifecycle(plan.id, "mismatch", { lifecycleMismatch: true });
        setStatus(`Plan link mismatch: opening execution ${plan.openingExecutionID} is absent from the currently loaded portfolio.`, true, true);
        updatePlanControls();
        return;
    }
    const lifecycle = PositionCore.linkedExecutionLifecycle(
        portfolioData[opening.ticker],
        plan.openingExecutionID,
        plan.id,
        plan.openingRevisionID
    );
    if (plan.lifecycle !== lifecycle) {
        currentPlan = await PlannerStore.setPlanLifecycle(plan.id, lifecycle, {
            lifecycleMismatch: lifecycle === "mismatch"
        });
        await reloadPlans(plan.id);
    }
    if (lifecycle === "mismatch") {
        setStatus(`Plan link mismatch: opening execution ${plan.openingExecutionID} does not match the saved plan references.`, true, true);
    }
    updatePlanControls();
}

function findExecution(executionID) {
    for (const [ticker, asset] of Object.entries(portfolioData)) {
        const trade = (asset.Trades || []).find(item => item.ExecutionID === executionID);
        if (trade) return { ticker, trade };
    }
    return null;
}

function broadcastPlanChange(type, detail = {}) {
    portfolioChannel?.postMessage({ type, ...detail });
}

function downloadJson(filename, data) {
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = filename;
    link.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
}

async function exportBackup() {
    try {
        const envelope = await PlannerStore.createBackupEnvelope();
        downloadJson(`trade-planner-backup-${new Date().toISOString().slice(0, 10)}.json`, envelope);
        if (!window.confirm("The planner backup download was started. Did your browser complete it?")) {
            setStatus("Backup download was not confirmed. Last-backup status was not updated.", true, true);
            return;
        }
        const totalRevisions = savedPlans.reduce((total, plan) => total + plan.revisionCount, 0);
        await PlannerStore.setSetting("lastBackup", { at: envelope.exportedAt, revisionCount: totalRevisions });
        await updateBackupStatus();
        setStatus("Planner backup download confirmed. Keep the downloaded file in a safe location.");
    } catch (error) {
        setStatus(`Planner backup was not created: ${error.message}`, true);
    }
}

async function restoreFileChanged(event) {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;
    try {
        const envelope = JSON.parse(await file.text());
        const plans = await PlannerStore.validateBackupEnvelope(envelope);
        const queue = await PlannerStore.getQueueItems();
        const planIDs = new Set(plans.map(plan => plan.id));
        const missingPortfolioReferences = Object.values(portfolioData)
            .flatMap(asset => asset.Trades || [])
            .filter(trade => trade.PlanID && !planIDs.has(trade.PlanID));
        const missingQueueReferences = queue.filter(item => item.row?.PlanID && !planIDs.has(item.row.PlanID));
        const tickers = plans.map(plan => plan.ticker).join(", ") || "none";
        byId("restorePreview").textContent = `${plans.length} plan(s): ${tickers}. Restore replaces saved planner records. ${missingPortfolioReferences.length} loaded portfolio execution reference(s) and ${missingQueueReferences.length} queued reference(s) would point to Plan IDs absent after restore.`;
        restorePending = plans;
        byId("restoreDialog").showModal();
    } catch (error) {
        setStatus(`Backup was not restored: ${error.message}`, true);
    }
}

async function confirmRestore() {
    if (!restorePending) return;
    if (dirty && !window.confirm("The current draft has unsaved changes and will not be restored. Continue?")) return;
    try {
        await PlannerStore.restorePlansAtomically(restorePending);
        restorePending = null;
        byId("restoreDialog").close();
        currentPlan = null;
        currentRevisions = [];
        currentRevision = null;
        dirty = false;
        await reloadPlans();
        await loadPlan("");
        setStatus("Planner records restored atomically. Portfolio JSON and queued executions were not changed.");
        broadcastPlanChange("plan-lifecycle-changed", { restored: true });
    } catch (error) {
        setStatus(`Backup was not restored: ${error.message}`, true);
    }
}

async function downloadCurrentBackup() {
    await exportBackup();
}

async function openPortfolioFile(event) {
    const file = event.target.files?.[0];
    if (!file) return;
    try {
        const nextPortfolio = JSON.parse(await file.text());
        PositionCore.validatePortfolio(nextPortfolio);
        portfolioData = nextPortfolio;
        updatePortfolioTickers();
        await reconcileAllPlanLifecycles();
        setStatus(`Loaded and validated ${file.name}. This is a read-only planner context; Positions exports portfolio changes.`);
    } catch (error) {
        setStatus(`Portfolio was not loaded: ${error.message}`, true);
    } finally {
        event.target.value = "";
    }
}

async function reconcileAllPlanLifecycles() {
    for (const plan of savedPlans) {
        if (plan.openingExecutionID) await reconcilePlanLifecycle(plan);
    }
}

function setupPortfolioChannel() {
    if (!("BroadcastChannel" in window)) {
        byId("capabilityNotice").textContent = "BroadcastChannel is unavailable. Open a portfolio JSON here to use position context; cross-tab portfolio updates are disabled.";
        byId("capabilityNotice").hidden = false;
        return;
    }
    portfolioChannel = new BroadcastChannel("lib-portfolio-state");
    portfolioChannel.onmessage = async event => {
        const message = event.data;
        if (!message || typeof message.type !== "string") return;
        if (message.type === "portfolio-snapshot" || message.type === "portfolio-updated") {
            try {
                PositionCore.validatePortfolio(message.portfolio);
                portfolioData = clone(message.portfolio);
                updatePortfolioTickers(message.selectedTicker || "");
                await reconcileAllPlanLifecycles();
                if (message.type === "portfolio-updated") setStatus("Portfolio context refreshed from Positions. Channel data is not saved to the selected JSON file.");
            } catch (error) {
                setStatus(`Portfolio update was ignored: ${error.message}`, true);
            }
        } else if (message.type === "portfolio-request") {
            if (Object.keys(portfolioData).length) {
                portfolioChannel.postMessage({ type: "portfolio-snapshot", portfolio: portfolioData });
            }
        } else if (message.type === "planner-refresh-request" || message.type === "plan-lifecycle-changed") {
            await reloadPlans(currentPlan?.id || "");
            if (currentPlan?.openingExecutionID) await reconcilePlanLifecycle(currentPlan);
        }
    };
    portfolioChannel.postMessage({ type: "portfolio-request" });
}

async function addAtrStop(usePercent) {
    try {
        const value = usePercent ? numberValue("atrpInput") : numberValue("atrInput");
        if (value === "") throw new Error(`${usePercent ? "ATRP" : "ATR"} is required.`);
        const observedAt = localDateTimeToOffset(byId("volatilityObservedAt").value);
        if (!observedAt) throw new Error("Enter the reading's observation time.");
        const entryPrice = Number(currentDraft().entryPrice);
        const price = usePercent ? entryPrice * (1 - value / 100) : entryPrice - value;
        if (!(price > 0 && price < entryPrice)) throw new Error("ATR/ATRP distance must produce a positive stop below entry.");
        const reading = {
            value,
            source: "user-observed",
            chartInterval: byId("volatilityInterval").value,
            observedAt
        };
        if (usePercent) draft.atrp = reading;
        else draft.atr = reading;
        appendCandidate("stop", {
            label: usePercent ? "ATRP stop" : "ATR stop",
            source: usePercent ? "atrp-distance" : "atr-distance",
            price,
            chartInterval: reading.chartInterval,
            observedAt,
            volatility: reading
        });
    } catch (error) {
        setStatus(error.message, true);
    }
}

async function recordPlanOpening() {
    const asset = selectedPortfolioAsset();
    if (!asset || !currentPlan || !currentRevision) return;
    if (dirty || currentPlan.archived) {
        setStatus("Save the current revision and unarchive the plan before preparing an opening.", true);
        return;
    }
    if (currentPlan.openingExecutionID || currentPlan.hasLinkedExecution) {
        setStatus("This plan already belongs to a position lifecycle. Record further executions from Positions.", true);
        return;
    }
    if (currentPlan.lifecycle === "closed"
        || (currentPlan.hasLinkedExecution && !currentPlan.openingExecutionID)) {
        setStatus("An executed or closed plan cannot be reused for a new position lifecycle. Duplicate a closed plan as new.", true);
        return;
    }
    try {
        const planDraft = PlannerCore.validateDraft(currentRevision.draft);
        if (planDraft.currency !== (asset.Currency || "USD").toUpperCase()) {
            throw new Error("Plan currency must match the ticker currency before linking.");
        }
        const result = PlannerCore.calculatePlan(planDraft);
        const date = new Date().toISOString().slice(0, 10);
        const positionSummary = PositionCore.summarize(asset);
        if (positionSummary.quantity > 0 && !currentPlan.openingExecutionID) {
            throw new Error("A new plan cannot be linked to a position lifecycle that is already open.");
        }
        const message = {
            type: "prepare-plan-opening",
            requestID: PlannerCore.createUlid(),
            planID: currentPlan.id,
            planRevisionID: currentRevision.id,
            ticker: planDraft.ticker,
            currency: planDraft.currency,
            quantity: result.quantity,
            price: planDraft.entryPrice,
            commission: planDraft.entryFee,
            date,
            strategy: byId("openingStrategy").value
        };
        const positionsWindow = window.open("positions.html", "_blank");
        if (!positionsWindow) throw new Error("The new Positions tab was blocked. Allow pop-ups and try again.");
        portfolioChannel?.postMessage(message);
        let attempts = 0;
        const retryTimer = window.setInterval(() => {
            if (attempts++ >= 12) {
                window.clearInterval(retryTimer);
                return;
            }
            portfolioChannel?.postMessage(message);
        }, 250);
        setStatus("Positions opened in a new tab with proposed values. Review and explicitly confirm the actual execution there.", false, true);
    } catch (error) {
        setStatus(`Execution was not recorded: ${error.message}`, true, true);
    }
}

function bindEvents() {
    populateIntervals();
    document.querySelectorAll("#tickerInput,#currencyInput,#fundingInput,#riskInput,#ptPercentInput,#entryInput,#entryFeeInput,#exitFeeInput,#quantityModeInput,#atrInput,#atrpInput,#rsiInput,#ema9Input,#ema100Input,#ema200Input,#vwapInput")
        .forEach(input => input.addEventListener("input", () => {
            setDirty();
            if (input.id === "tickerInput" || input.id === "currencyInput") updatePortfolioTickers();
        }));
    document.querySelectorAll("#targetInterval,#stopInterval,#volatilityInterval,#rsiInterval,#emaInterval,#vwapInterval,#targetObservedAt,#stopObservedAt,#volatilityObservedAt,#rsiObservedAt,#emaObservedAt,#vwapObservedAt")
        .forEach(input => input.addEventListener("change", setDirty));
    byId("portfolioTicker").addEventListener("change", updatePortfolioNotice);
    byId("savedPlanSelect").addEventListener("change", event => loadPlan(event.target.value).catch(error => setStatus(error.message, true)));
    byId("revisionSelect").addEventListener("change", event => selectRevision(event.target.value));
    byId("newPlanButton").addEventListener("click", () => loadPlan("").catch(error => setStatus(error.message, true)));
    byId("savePlanButton").addEventListener("click", savePlan);
    byId("saveRevisionButton").addEventListener("click", saveRevision);
    byId("archivePlanButton").addEventListener("click", archiveCurrentPlan);
    byId("deletePlanButton").addEventListener("click", deleteCurrentPlan);
    byId("releasePlanLinkButton").addEventListener("click", releaseStaleLink);
    byId("duplicatePlanButton").addEventListener("click", () => duplicateClosedPlan().catch(error => setStatus(error.message, true)));
    byId("targetForm").addEventListener("submit", handleTargetSubmit);
    byId("stopForm").addEventListener("submit", handleStopSubmit);
    byId("targetCandidateList").addEventListener("click", removeCandidate);
    byId("stopCandidateList").addEventListener("click", removeCandidate);
    byId("notesButton").addEventListener("click", () => {
        byId("notesInput").value = draft.notes || "";
        byId("notesDialog").showModal();
    });
    byId("cancelNotes").addEventListener("click", () => byId("notesDialog").close());
    byId("applyNotes").addEventListener("click", () => {
        draft.notes = byId("notesInput").value;
        byId("notesDialog").close();
        setDirty();
    });
    byId("fibButton").addEventListener("click", () => byId("fibDialog").showModal());
    byId("fibKind").addEventListener("change", () => {
        byId("fibPointCField").hidden = byId("fibKind").value !== "extension";
        byId("fibResults").replaceChildren();
        updateFibPointLabels();
    });
    byId("fibPointA").addEventListener("input", updateFibPointLabels);
    byId("fibPointB").addEventListener("input", updateFibPointLabels);
    byId("calculateFib").addEventListener("click", calculateFib);
    byId("addFibLevels").addEventListener("click", addSelectedFibLevels);
    byId("closeFib").addEventListener("click", () => byId("fibDialog").close());
    byId("atrCandidateButton").addEventListener("click", () => addAtrStop(false));
    byId("atrpCandidateButton").addEventListener("click", () => addAtrStop(true));
    byId("backupButton").addEventListener("click", exportBackup);
    byId("restoreFile").addEventListener("change", restoreFileChanged);
    byId("cancelRestore").addEventListener("click", () => {
        restorePending = null;
        byId("restoreDialog").close();
    });
    byId("backupBeforeRestore").addEventListener("click", downloadCurrentBackup);
    byId("confirmRestore").addEventListener("click", confirmRestore);
    byId("portfolioFile").addEventListener("change", openPortfolioFile);
    byId("recordOpeningButton").addEventListener("click", recordPlanOpening);
    window.addEventListener("beforeunload", event => {
        if (!dirty) return;
        event.preventDefault();
        event.returnValue = "";
    });
}

async function initialize() {
    bindEvents();
    setupPortfolioChannel();
    try {
        await PlannerStore.openDatabase();
        await reloadPlans();
        await loadPlan("");
    } catch (error) {
        setStatus(`Planner storage is unavailable: ${error.message}`, true, true);
        byId("capabilityNotice").textContent = "Saved plans and revisions require IndexedDB. Draft calculations still work in this page, but cannot be saved.";
        byId("capabilityNotice").hidden = false;
    }
    if (!("showSaveFilePicker" in window) || !("showOpenFilePicker" in window) || !("locks" in navigator)) {
        byId("capabilityNotice").textContent = "Persistent execution CSV and cross-tab write locking require Chromium file-system access and Web Locks support. Portfolio JSON and saved plan workflows remain local; unavailable features will not be reported as saved.";
        byId("capabilityNotice").hidden = false;
    }
}

initialize();
