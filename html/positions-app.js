const PositionCore = window.PositionCore;
const PlannerCore = window.TradePlannerCore;
const PlannerStore = window.TradePlannerStore;
const ExecutionHistory = window.ExecutionHistory;
let portfolioData = {};
let currentTicker = "";
let statusTimer;
let portfolioDirty = false;
let plannerRecords = [];
let portfolioChannel = null;
let pendingPlanOpening = null;
let lastAppliedPlanOpeningRequestID = null;
let snapshotPlanKey = "";
const tabID = `${Date.now()}-${Math.random()}`;
let latestReconciliation = null;

const byId = id => document.getElementById(id);
const today = () => new Date().toISOString().slice(0, 10);
const money = (value, currency = "USD") => new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: currency.trim().toUpperCase(),
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
}).format(value);
const quantity = value => new Intl.NumberFormat("en-US", {
    maximumFractionDigits: 8
}).format(value);

function setStatus(message, isError = false, persistent = false) {
    const status = byId("statusMessage");
    status.textContent = message;
    status.dataset.kind = isError ? "error" : "success";
    clearTimeout(statusTimer);
    if (!persistent) {
        statusTimer = setTimeout(() => {
            status.textContent = "";
            status.dataset.kind = "";
        }, 7000);
    }
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
            portfolioDirty = false;
            populateTickerDropdown();
            setStatus(`Loaded ${file.name}. Changes remain in this page until you export.`);
            broadcastPortfolio("portfolio-updated");
            reconcileExecutionHistory();
        } catch (error) {
            setStatus(`Portfolio was not loaded: ${error.message}`, true);
        } finally {
            event.target.value = "";
        }
    };
    reader.onerror = () => setStatus("Could not read the selected file.", true);
    reader.readAsText(file);
}

async function exportJSONFile() {
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
    const confirmed = window.confirm("The JSON download was started. Did your browser complete the download? Confirming marks these executions as JSON-exported; you must still replace your working source file yourself.");
    if (!confirmed) {
        setStatus("JSON download was started but not confirmed. Pending executions remain unexported.", true, true);
        return;
    }
    try {
        const executionIDs = Object.values(portfolioData).flatMap(asset => asset.Trades || [])
            .map(trade => trade.ExecutionID).filter(Boolean);
        await ExecutionHistory.markJsonExported(PlannerStore, executionIDs);
        portfolioDirty = false;
        broadcastPortfolio("portfolio-updated");
        await updateExecutionSyncStatus();
        setStatus("JSON download confirmed. Replace the source JSON file yourself; this page cannot write it back.");
    } catch (error) {
        setStatus(`Portfolio download completed, but execution export state could not be updated: ${error.message}`, true, true);
    }
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
        renderAllocation();
        return;
    }
    dropdown.add(new Option("Select a ticker", ""));
    tickers.sort().forEach(ticker => dropdown.add(new Option(portfolioData[ticker].name || ticker, ticker)));
    if (!tickers.includes(currentTicker)) currentTicker = tickers[0];
    dropdown.value = currentTicker;
    render();
    renderAllocation();
    refreshPlanSelectors();
}

function selectedAsset() {
    return currentTicker ? portfolioData[currentTicker] : null;
}

function broadcastPortfolio(type) {
    if (!portfolioChannel || !Object.keys(portfolioData).length) return;
    portfolioChannel.postMessage({
        type,
        portfolio: portfolioData,
        selectedTicker: currentTicker,
        dirty: portfolioDirty,
        sourceTab: tabID
    });
}

function markPortfolioDirty() {
    portfolioDirty = true;
    broadcastPortfolio("portfolio-updated");
}

async function reconcilePositionPlanLifecycles() {
    if (!Object.keys(portfolioData).length) return false;
    let updated = false;
    for (const plan of plannerRecords) {
        if (!plan.openingExecutionID) continue;
        const linkedAsset = Object.values(portfolioData).find(asset =>
            (asset.Trades || []).some(trade => trade.ExecutionID === plan.openingExecutionID));
        const lifecycle = linkedAsset
            ? PositionCore.linkedExecutionLifecycle(
                linkedAsset,
                plan.openingExecutionID,
                plan.id,
                plan.openingRevisionID
            )
            : "mismatch";
        if (plan.lifecycle === lifecycle) continue;
        await PlannerStore.setPlanLifecycle(plan.id, lifecycle, {
            lifecycleMismatch: lifecycle === "mismatch"
        });
        updated = true;
    }
    if (updated) {
        plannerRecords = await PlannerStore.getAllPlansWithRevisions();
        broadcastPortfolio("plan-lifecycle-changed");
    }
    return updated;
}

function renderAllocation() {
    const section = byId("allocationSection");
    const body = byId("allocationBody");
    body.replaceChildren();
    if (!Object.keys(portfolioData).length) {
        section.hidden = true;
        return;
    }
    try {
        const groups = PlannerCore.summarizeStrategyAllocations(portfolioData);
        groups.forEach(group => {
            const row = document.createElement("tr");
            appendCell(row, group.currency);
            appendCell(row, group.strategy);
            appendCell(row, group.direction);
            appendCell(row, group.periodicity);
            appendCell(row, String(group.positionCount));
            appendCell(row, money(group.remainingBasis, group.currency));
            appendCell(row, !group.dividendAvailable
                ? "N/A"
                : money(group.perCycleDividend, group.currency));
            appendCell(row, !group.dividendAvailable
                ? "N/A"
                : money(group.annualDividend, group.currency));
            body.appendChild(row);
        });
        if (!groups.length) {
            const row = document.createElement("tr");
            const cell = appendCell(row, "No open real positions.", "empty-cell");
            cell.colSpan = 8;
            body.appendChild(row);
        }
        section.hidden = false;
    } catch (error) {
        const row = document.createElement("tr");
        const cell = appendCell(row, `Allocation could not be calculated: ${error.message}`, "empty-cell");
        cell.colSpan = 8;
        body.appendChild(row);
        section.hidden = false;
    }
}

async function refreshPlanSelectors() {
    try {
        plannerRecords = await PlannerStore.getAllPlansWithRevisions();
        await reconcilePositionPlanLifecycles();
        const planSelect = byId("planLinkSelect");
        const asset = selectedAsset();
        const summary = asset ? PositionCore.summarize(asset) : { quantity: 0 };
        planSelect.replaceChildren(new Option("No plan link", ""));
        if (asset && summary.quantity === 0) {
            plannerRecords.filter(plan => !plan.archived && !plan.hasLinkedExecution
                && plan.ticker === currentTicker
                && plan.currency === (asset.Currency || "USD").toUpperCase())
                .forEach(plan => planSelect.add(new Option(`${plan.ticker} · ${plan.revisionCount} revisions`, plan.id)));
        }
        planSelect.disabled = !asset || summary.quantity > 0;
        const mismatchedPlans = plannerRecords.filter(plan =>
            plan.ticker === currentTicker && plan.lifecycle === "mismatch");
        const lifecycleWarning = byId("planLifecycleWarning");
        lifecycleWarning.hidden = mismatchedPlans.length === 0;
        lifecycleWarning.textContent = mismatchedPlans.length
            ? `Plan link mismatch for ${currentTicker} (${mismatchedPlans.map(plan => plan.id).join(", ")}). Review the opening execution in Trade Planner; a missing ledger link does not mean the position was closed.`
            : "";
        if (pendingPlanOpening) applyPendingPlanOpening();
        updatePlanRevisionSelector();
        renderPositionSnapshot();
    } catch (error) {
        setStatus(`Saved plans could not be loaded: ${error.message}`, true);
    }
}

function updatePlanRevisionSelector(selectedRevisionID = "") {
    const plan = plannerRecords.find(item => item.id === byId("planLinkSelect").value);
    const revisionSelect = byId("planRevisionSelect");
    revisionSelect.replaceChildren();
    if (!plan) {
        revisionSelect.disabled = true;
        return;
    }
    plan.revisions.forEach(revision => {
        revisionSelect.add(new Option(`Revision ${revision.revisionNumber}`, revision.id));
    });
    revisionSelect.value = selectedRevisionID || plan.currentRevisionID;
    revisionSelect.disabled = false;
}

function positionPlanLink(asset) {
    if (!asset) return null;
    const lifecycle = PositionCore.currentExecutionLifecycle(asset);
    if (!lifecycle?.planID || !lifecycle.planRevisionID) return null;
    return {
        ...lifecycle,
        plan: plannerRecords.find(plan => plan.id === lifecycle.planID) || null
    };
}

function offsetDateTimeToLocal(value) {
    if (!value) return "";
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return "";
    const pad = number => String(number).padStart(2, "0");
    return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

function localDateTimeToOffset(value) {
    if (!value) return "";
    const date = new Date(value);
    const offsetMinutes = -date.getTimezoneOffset();
    const sign = offsetMinutes >= 0 ? "+" : "-";
    const absolute = Math.abs(offsetMinutes);
    return `${value}:00${sign}${String(Math.floor(absolute / 60)).padStart(2, "0")}:${String(absolute % 60).padStart(2, "0")}`;
}

function loadScenarioFromRevision(plan, revisionID, openingRevisionID) {
    const revision = plan?.revisions.find(item => item.id === revisionID);
    if (!revision) return;
    const planDraft = PlannerCore.validateDraft(revision.draft);
    const stop = planDraft.selectedStopId === "sl1"
        ? {
            id: "sl1",
            label: "SL1 · ideal stop",
            price: planDraft.entryPrice * (1 - planDraft.riskTolerancePercent / 100),
            source: "risk-tolerance"
        }
        : planDraft.stopLosses.find(item => item.id === planDraft.selectedStopId);
    const target = {
        id: "pt1",
        label: "PT1 · ideal target",
        price: planDraft.entryPrice * (1 + planDraft.ptPercent / 100),
        source: "pt-percent"
    };
    byId("scenarioStop").value = stop?.price ?? "";
    byId("scenarioStopSource").value = stop?.source || "";
    byId("scenarioTarget").value = target.price ?? "";
    byId("scenarioTargetSource").value = target.source;
    const observation = stop?.observedAt ? stop : target;
    if (observation?.chartInterval) byId("scenarioInterval").value = observation.chartInterval;
    byId("scenarioObservedAt").value = offsetDateTimeToLocal(observation?.observedAt);
    byId("scenarioPlanStatus").textContent = revisionID === openingRevisionID
        ? `Opening execution's exact plan revision: ${revision.revisionNumber}.`
        : `Comparison only · revision ${revision.revisionNumber}; not the revision used to open.`;
    renderScenarioPlanCandidates(revision);
}

function renderScenarioPlanCandidates(revision) {
    const planDraft = PlannerCore.validateDraft(revision.draft);
    const candidates = [
        {
            kind: "stop",
            id: "sl1",
            label: "SL1 · ideal stop",
            source: "risk-tolerance",
            price: planDraft.entryPrice * (1 - planDraft.riskTolerancePercent / 100)
        },
        ...planDraft.stopLosses.map(candidate => ({ kind: "stop", ...candidate })),
        {
            kind: "target",
            id: "pt1",
            label: "PT1 · ideal target",
            source: "pt-percent",
            price: planDraft.entryPrice * (1 + planDraft.ptPercent / 100)
        },
        ...planDraft.profitTargets.map(candidate => ({ kind: "target", ...candidate }))
    ];
    const stopList = byId("scenarioStopCandidates");
    const targetList = byId("scenarioTargetCandidates");
    stopList.replaceChildren();
    targetList.replaceChildren();
    candidates.forEach(candidate => {
        const item = document.createElement("li");
        const details = document.createElement("span");
        details.textContent = `${candidate.label} · ${money(candidate.price, planDraft.currency)}${candidate.chartInterval ? ` · ${candidate.chartInterval}` : ""}`;
        const button = document.createElement("button");
        button.type = "button";
        button.className = "button tertiary";
        button.dataset.scenarioKind = candidate.kind;
        button.dataset.candidateID = candidate.id;
        button.textContent = `Use ${candidate.kind}: ${candidate.label}`;
        item.append(details, button);
        (candidate.kind === "stop" ? stopList : targetList).appendChild(item);
    });
    byId("scenarioPlanCandidates").hidden = false;
}

function selectScenarioPlanCandidate(event) {
    const button = event.target.closest("button[data-scenario-kind]");
    if (!button) return;
    const linked = positionPlanLink(selectedAsset());
    const revision = linked?.plan?.revisions.find(item => item.id === byId("scenarioRevision").value);
    if (!revision) return;
    const planDraft = PlannerCore.validateDraft(revision.draft);
    const isStop = button.dataset.scenarioKind === "stop";
    const candidate = isStop
        ? button.dataset.candidateID === "sl1"
            ? {
                label: "SL1 · ideal stop",
                source: "risk-tolerance",
                price: planDraft.entryPrice * (1 - planDraft.riskTolerancePercent / 100)
            }
            : planDraft.stopLosses.find(item => item.id === button.dataset.candidateID)
        : button.dataset.candidateID === "pt1"
            ? {
                label: "PT1 · ideal target",
                source: "pt-percent",
                price: planDraft.entryPrice * (1 + planDraft.ptPercent / 100)
            }
            : planDraft.profitTargets.find(item => item.id === button.dataset.candidateID);
    if (!candidate) return;
    byId(isStop ? "scenarioStop" : "scenarioTarget").value = String(candidate.price);
    byId(isStop ? "scenarioStopSource" : "scenarioTargetSource").value = candidate.source || candidate.label;
    if (candidate.chartInterval) byId("scenarioInterval").value = candidate.chartInterval;
    byId("scenarioObservedAt").value = offsetDateTimeToLocal(candidate.observedAt);
    updateSnapshotEstimate();
}

function renderPositionSnapshot() {
    const asset = selectedAsset();
    const section = byId("positionScenarioSection");
    if (!asset) {
        section.hidden = true;
        return;
    }
    let summary;
    try {
        summary = PositionCore.summarize(asset);
    } catch (error) {
        byId("scenarioEstimate").textContent = `Snapshot unavailable: ${error.message}`;
        return;
    }
    if (summary.direction === "Short" && summary.quantity > 0) {
        section.hidden = false;
        byId("scenarioInputFields").hidden = true;
        byId("scenarioPlanCandidates").hidden = true;
        byId("scenarioEstimate").textContent = "Long-only stop/target estimates are unavailable for a short position. Realized P&L remains in the ledger summary.";
        return;
    }
    section.hidden = false;
    byId("scenarioInputFields").hidden = false;
    const linked = positionPlanLink(asset);
    const tickerCurrency = (asset.Currency || "USD").toUpperCase();
    if (linked?.plan && linked.plan.currency !== tickerCurrency) {
        byId("scenarioInputFields").hidden = true;
        byId("scenarioPlanCandidates").hidden = true;
        byId("scenarioRevisionField").hidden = true;
        byId("scenarioPlanStatus").textContent = `Plan currency ${linked.plan.currency} does not match ${currentTicker} currency ${tickerCurrency}; plan scenarios are unavailable.`;
        byId("scenarioEstimate").textContent = "Correct the portfolio currency metadata or review the plan separately before estimating.";
        return;
    }
    if (linked?.plan && (linked.plan.openingExecutionID !== linked.openingExecutionID
        || linked.plan.openingRevisionID !== linked.planRevisionID
        || linked.plan.lifecycle === "mismatch")) {
        byId("scenarioInputFields").hidden = true;
        byId("scenarioPlanCandidates").hidden = true;
        byId("scenarioRevisionField").hidden = true;
        byId("scenarioPlanStatus").textContent = "Plan link mismatch. Review the opening execution and saved revision in Trade Planner.";
        byId("scenarioEstimate").textContent = "Plan-linked snapshot estimates are unavailable until the link is reconciled.";
        return;
    }
    const key = `${currentTicker}|${linked?.plan?.id || ""}|${linked?.openingExecutionID || ""}`;
    if (key !== snapshotPlanKey) {
        snapshotPlanKey = key;
        if (linked?.plan) {
            const selector = byId("scenarioRevision");
            selector.replaceChildren(...linked.plan.revisions.map(revision =>
                new Option(`Revision ${revision.revisionNumber}${revision.id === linked.planRevisionID ? " · opening revision" : ""}`, revision.id)));
            selector.value = linked.planRevisionID;
            byId("scenarioRevisionField").hidden = false;
            loadScenarioFromRevision(linked.plan, linked.planRevisionID, linked.planRevisionID);
        } else {
            byId("scenarioRevisionField").hidden = true;
            byId("scenarioPlanCandidates").hidden = true;
            byId("scenarioPlanStatus").textContent = "No linked plan. Ad-hoc levels stay in memory only.";
            byId("scenarioStop").value = "";
            byId("scenarioStopSource").value = "";
            byId("scenarioTarget").value = "";
            byId("scenarioTargetSource").value = "";
            byId("scenarioObservedAt").value = "";
        }
    }
    byId("scenarioExitFee").value = byId("scenarioExitFee").value || "1";
    byId("scenarioExitFee").dataset.currency = tickerCurrency;
    updateSnapshotEstimate(asset, summary);
}

function updateSnapshotEstimate(asset = selectedAsset(), summary = asset ? PositionCore.summarize(asset) : null) {
    const output = byId("scenarioEstimate");
    if (!asset || !summary || summary.quantity <= 0) {
        output.textContent = "A non-zero open long position is required for a snapshot estimate.";
        return;
    }
    calculateSnapshotEstimate(asset, summary);
}

async function updateExecutionSyncStatus() {
        try {
            const [handle, queue] = await Promise.all([
                ExecutionHistory.getFileHandle(PlannerStore),
                PlannerStore.getQueueItems()
            ]);
            const banner = byId("executionSyncBanner");
            const pending = queue.length;
            const unresolved = latestReconciliation?.unresolved || [];
            banner.hidden = Boolean(handle) && pending === 0 && unresolved.length === 0;
            const queuedWithoutLedger = latestReconciliation?.queuedWithoutLedger || [];
            byId("includeQueuedExecutions").hidden = queuedWithoutLedger.length === 0;
            byId("configureExecutionCsv").textContent = handle ? "Change execution CSV" : "Create/select execution CSV";
            byId("retryExecutionCsv").disabled = pending === 0 || !handle;
            const parts = [];
            if (!handle) parts.push("No persistent execution CSV is configured; actual executions remain queued locally.");
            if (pending) {
                const csvPending = queue.filter(item => !item.csvWritten).length;
                const jsonPending = queue.filter(item => !item.jsonExported).length;
                parts.push(`${pending} execution(s) queued · ${csvPending} CSV append(s) pending · ${jsonPending} JSON download confirmation(s) pending.`);
            }
            if (latestReconciliation?.missingLedgerRows?.length) {
                parts.push(`${latestReconciliation.missingLedgerRows.length} ledger execution(s) were appended to the CSV during reconciliation.`);
            }
            if (unresolved.length) {
                parts.push(`Unresolved CSV/ledger mismatches: ${unresolved.map(item =>
                    `${item.ticker} ${item.executionID} (${item.reason})`).join("; ")} No records were changed.`);
            }
            if (queuedWithoutLedger.length) {
                parts.push(`${queuedWithoutLedger.length} CSV-written execution(s) are missing from the loaded JSON. Choose whether to include them in the in-memory portfolio before export.`);
            }
            byId("executionSyncStatus").textContent = parts.join(" ");
        } catch (error) {
            byId("executionSyncStatus").textContent = `Execution synchronization status unavailable: ${error.message}`;
            byId("executionSyncBanner").hidden = false;
        }
    }

async function reconcileExecutionHistory() {
        if (!Object.keys(portfolioData).length) return updateExecutionSyncStatus();
        try {
            latestReconciliation = await ExecutionHistory.reconcile(PlannerStore, portfolioData);
            if (latestReconciliation.missingLedgerRows?.length) {
                setStatus(`Reconciliation appended ${latestReconciliation.missingLedgerRows.length} ledger execution(s) to the persistent CSV.`, false, true);
            }
            await updateExecutionSyncStatus();
        } catch (error) {
            setStatus(`Execution-history reconciliation needs attention: ${error.message}`, true, true);
            await updateExecutionSyncStatus();
        }
    }

async function configureExecutionCsv() {
        try {
            await ExecutionHistory.selectOrCreateFile(PlannerStore);
            setStatus("Persistent execution-history CSV selected. It is separate from the filtered history download.", false, true);
            await reconcileExecutionHistory();
        } catch (error) {
            setStatus(`Execution-history CSV was not configured: ${error.message}`, true, true);
            await updateExecutionSyncStatus();
        }
    }

async function retryExecutionCsv() {
        try {
            await ExecutionHistory.retryQueue(PlannerStore);
            await reconcileExecutionHistory();
            setStatus("Pending CSV retry completed. JSON export confirmation may still be pending.", false, true);
        } catch (error) {
            setStatus(`Pending CSV writes were retained for retry: ${error.message}`, true, true);
        }
        await updateExecutionSyncStatus();
    }

async function includeQueuedExecutions() {
    const queuedIDs = new Set((latestReconciliation?.queuedWithoutLedger || []).map(item => item.executionID));
    if (!queuedIDs.size) return;
    if (!window.confirm(`Add ${queuedIDs.size} CSV-written execution(s) to the in-memory portfolio in their recorded ledger order? The source JSON file will not be changed until you export a copy.`)) return;
    try {
        const queue = (await PlannerStore.getQueueItems())
            .filter(item => queuedIDs.has(item.executionID))
            .sort((left, right) => left.ticker.localeCompare(right.ticker)
                || Number(left.csvRow[1]) - Number(right.csvRow[1]));
        if (queue.length !== queuedIDs.size) {
            throw new Error("One or more queued execution rows are no longer available. Reload the synchronization status.");
        }
        const nextPortfolio = JSON.parse(JSON.stringify(portfolioData));
        for (const item of queue) {
            let asset = nextPortfolio[item.ticker];
            if (!asset) {
                if (!item.assetMetadata) {
                    throw new Error(`${item.ticker} is missing from the loaded portfolio and the queue has no asset metadata to restore it.`);
                }
                const metadata = item.assetMetadata;
                asset = {
                    ...PositionCore.createAsset(item.ticker, {
                        name: metadata.name,
                        dividend: metadata.Div,
                        periodicity: metadata.Periodicity,
                        currency: metadata.Currency || item.csvRow[10],
                        assetType: metadata.AssetType
                    }),
                    ...metadata,
                    Trades: []
                };
                nextPortfolio[item.ticker] = asset;
            }
            const trades = asset.Trades || (asset.Trades = []);
            const existingIndex = trades.findIndex(trade => trade.ExecutionID === item.executionID);
            if (existingIndex >= 0) {
                if (PlannerCore.canonicalJson(trades[existingIndex]) !== PlannerCore.canonicalJson(item.row)) {
                    throw new Error(`${item.executionID} already exists in ${item.ticker} with different row data.`);
                }
                continue;
            }
            const ledgerSeq = Number(item.csvRow[1]);
            if (!Number.isInteger(ledgerSeq) || ledgerSeq < 1 || ledgerSeq > trades.length + 1) {
                throw new Error(`${item.executionID} cannot be restored at ledger sequence ${item.csvRow[1]}; review the loaded ledger before continuing.`);
            }
            trades.splice(ledgerSeq - 1, 0, JSON.parse(JSON.stringify(item.row)));
        }
        for (const ticker of new Set(queue.map(item => item.ticker))) {
            PositionCore.syncSummary(nextPortfolio[ticker]);
        }
        PositionCore.validatePortfolio(nextPortfolio);
        portfolioData = nextPortfolio;
        markPortfolioDirty();
        populateTickerDropdown();
        await reconcileExecutionHistory();
        setStatus("Queued executions were added to the in-memory portfolio in ledger order. Export a JSON copy to complete synchronization.", false, true);
    } catch (error) {
        setStatus(`Queued executions were not added to the portfolio: ${error.message}`, true, true);
    }
}

function applyPendingPlanOpening() {
        const request = pendingPlanOpening;
        if (!request || !portfolioData[request.ticker]) return;
        const plan = plannerRecords.find(item => item.id === request.planID);
        const revision = plan?.revisions.find(item => item.id === request.planRevisionID);
        if (!plan || !revision) return;
        const revisionDraft = PlannerCore.validateDraft(revision.draft);
        const planned = PlannerCore.calculatePlan(revisionDraft);
        if (request.ticker !== plan.ticker || request.currency !== plan.currency
            || request.currency !== revisionDraft.currency
            || Number(request.price) !== revisionDraft.entryPrice
            || Number(request.commission) !== revisionDraft.entryFee
            || Number(request.quantity) !== planned.quantity
            || !Number.isFinite(Number(request.quantity)) || Number(request.quantity) <= 0) {
            setStatus("The proposed opening values do not match the saved plan revision. No execution was recorded.", true, true);
            pendingPlanOpening = null;
            return;
        }
        if (plan.openingExecutionID || plan.hasLinkedExecution || plan.lifecycle !== "saved" || plan.archived) {
            setStatus("This plan is already linked, closed, mismatched, or archived. It cannot start another position lifecycle.", true, true);
            pendingPlanOpening = null;
            return;
        }
        currentTicker = request.ticker;
        byId("assetDropdown").value = currentTicker;
        render();
        const summary = PositionCore.summarize(selectedAsset());
        if (summary.quantity > 0 && !plan.openingExecutionID) {
            setStatus("The proposed plan cannot be attached to a position that was already open. No execution was recorded.", true, true);
            pendingPlanOpening = null;
            return;
        }
        byId("tradeDirection").value = "Long";
        byId("strategyInput").value = request.strategy || "SniperNine";
        byId("entryQuantity").value = String(request.quantity);
        byId("entryPrice").value = String(request.price);
        byId("entryCommission").value = String(request.commission);
        byId("entryDate").value = request.date || today();
        byId("entryCurrency").value = request.currency;
        if (summary.quantity === 0) {
            byId("planLinkSelect").value = plan.id;
            updatePlanRevisionSelector(revision.id);
        }
        lastAppliedPlanOpeningRequestID = request.requestID || null;
        pendingPlanOpening = null;
        setStatus(`Proposed ${request.ticker} values are prefilled. Review actual fill details and submit to record; no order was placed.`, false, true);
    }

function setupPortfolioChannel() {
        if (!("BroadcastChannel" in window)) {
            setStatus("Cross-tab portfolio sharing is unavailable; load the portfolio JSON in each tab.", true, true);
            return;
        }
        portfolioChannel = new BroadcastChannel("lib-portfolio-state");
        portfolioChannel.onmessage = async event => {
            const message = event.data;
            if (!message || message.sourceTab === tabID) return;
            if (message.type === "portfolio-request") {
                if (Object.keys(portfolioData).length) broadcastPortfolio("portfolio-snapshot");
                return;
            }
            if (message.type === "portfolio-snapshot" || message.type === "portfolio-updated") {
                if (!message.portfolio) return;
                try {
                    PositionCore.validatePortfolio(message.portfolio);
                    const incoming = JSON.stringify(message.portfolio);
                    const current = JSON.stringify(portfolioData);
                    if (portfolioDirty && current && current !== "{}" && incoming !== current) {
                        setStatus("Another tab has a different portfolio snapshot while this page has unexported changes. No data was replaced; export or reload and reconcile manually.", true, true);
                        return;
                    }
                    portfolioData = JSON.parse(incoming);
                    currentTicker = message.selectedTicker && portfolioData[message.selectedTicker]
                        ? message.selectedTicker
                        : currentTicker;
                    portfolioDirty = message.type === "portfolio-updated" || Boolean(message.dirty);
                    populateTickerDropdown();
                    if (message.type === "portfolio-updated") {
                        setStatus("Portfolio context refreshed from another tab. Export the JSON copy; channel messages do not save files.", false, true);
                        reconcileExecutionHistory();
                    }
                    applyPendingPlanOpening();
                } catch (error) {
                    setStatus(`Portfolio update was ignored: ${error.message}`, true, true);
                }
                return;
            }
            if (message.type === "prepare-plan-opening") {
                if (message.requestID && (message.requestID === lastAppliedPlanOpeningRequestID
                    || message.requestID === pendingPlanOpening?.requestID)) return;
                pendingPlanOpening = message;
                if (message.portfolio) {
                    try {
                        PositionCore.validatePortfolio(message.portfolio);
                        if (!portfolioDirty) {
                            portfolioData = JSON.parse(JSON.stringify(message.portfolio));
                            populateTickerDropdown();
                        }
                    } catch (error) {
                        setStatus(`Plan opening context was rejected: ${error.message}`, true);
                        pendingPlanOpening = null;
                        return;
                    }
                }
                await refreshPlanSelectors();
                applyPendingPlanOpening();
                return;
            }
            if (["plan-saved", "plan-lifecycle-changed", "planner-refresh-request"].includes(message.type)) {
                await refreshPlanSelectors();
                return;
            }
        };
        portfolioChannel.postMessage({ type: "portfolio-request", sourceTab: tabID });
    }

function calculateSnapshotEstimate(asset, summary) {
    const output = byId("scenarioEstimate");
    const linked = positionPlanLink(asset);
    if (linked?.openingExecutionID && !linked.plan) {
        output.textContent = `Plan link ${linked.planID} is not available in this browser profile. Open or restore the planner backup to review its saved revision.`;
        return;
    }
    const stop = Number(byId("scenarioStop").value);
    const target = Number(byId("scenarioTarget").value);
    const exitFee = Number(byId("scenarioExitFee").value);
    if (!Number.isFinite(stop) || stop <= 0
        || !Number.isFinite(target) || target <= 0
        || !Number.isFinite(exitFee) || exitFee < 0) {
        output.textContent = "Enter positive stop and target prices and a nonnegative exit fee.";
        return;
    }
    const observationTime = localDateTimeToOffset(byId("scenarioObservedAt").value);
    const stopSource = byId("scenarioStopSource").value.trim();
    const targetSource = byId("scenarioTargetSource").value.trim();
    const calculatedSources = ["risk-tolerance", "pt-percent"];
    if ((!calculatedSources.includes(stopSource) || !calculatedSources.includes(targetSource))
        && (!stopSource || !targetSource || !observationTime || !byId("scenarioInterval").value)) {
        output.textContent = "Manual levels require a source, chart interval, and observation date/time with UTC offset.";
        return;
    }
    const result = PlannerCore.scenarioOutcomes(
        summary.quantity,
        summary.averagePrice,
        stop,
        target,
        0,
        exitFee
    );
    const rewardRisk = result.rewardRisk === null ? "Unavailable" : `${result.rewardRisk.toFixed(3)}:1`;
    const roi = result.targetRoi === null ? "N/A" : `${result.targetRoi.toFixed(2)}%`;
    const stopDistance = Math.abs(stop - summary.averagePrice) / summary.averagePrice * 100;
    const targetDistance = Math.abs(target - summary.averagePrice) / summary.averagePrice * 100;
    output.textContent = `Estimate only · ${quantity(summary.quantity)} units at fee-inclusive ${money(summary.averagePrice, asset.Currency || "USD")} basis · exit fee ${money(exitFee, asset.Currency || "USD")}. Stop ${money(stop, asset.Currency || "USD")} (${stopSource || "calculated"}, ${stopDistance.toFixed(2)}% from basis): Stop P&L ${money(result.stopPnl, asset.Currency || "USD")}. Target ${money(target, asset.Currency || "USD")} (${targetSource || "calculated"}, ${targetDistance.toFixed(2)}% from basis): Target P&L ${money(result.targetPnl, asset.Currency || "USD")}, Reward/Risk ${rewardRisk}, Target ROI ${roi}.${observationTime ? ` Levels observed ${observationTime} (${byId("scenarioInterval").value}).` : ""}`;
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
        const currency = (trade.Currency || asset.Currency || "USD").trim().toUpperCase();
        const row = document.createElement("tr");
        appendCell(row, action || "");
        appendCell(row, trade.Strategy || "");
        appendCell(row, date || "");
        appendCell(row, currency);
        appendCell(row, quantity(Number(trade.Qty) || 0));
        appendCell(row, money(Number(price) || 0, currency));
        appendCell(row, money(Number(commission) || 0, currency));
        appendCell(row, tradePnl === undefined
            ? "—"
            : money(tradePnl, currency), tradePnl === undefined ? "" : tradePnl >= 0 ? "positive" : "negative");
        body.appendChild(row);
    });
    if (body.children.length === 0) {
        const row = document.createElement("tr");
        const cell = appendCell(row, "No real-position executions yet.", "empty-cell");
        cell.colSpan = 8;
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
                trade.currency.toUpperCase(),
                formatHistoryDate(trade.dateIn),
                trade.priceIn === "" ? "—" : money(Number(trade.priceIn), trade.currency),
                trade.commissionIn === "" ? "—" : money(Number(trade.commissionIn), trade.currency),
                formatHistoryDate(trade.dateOut),
                trade.priceOut === "" ? "—" : money(Number(trade.priceOut), trade.currency),
                trade.commissionOut === "" ? "—" : money(Number(trade.commissionOut), trade.currency)
            ];
            values.forEach(value => appendCell(row, value));
            body.appendChild(row);
        });
        if (rows.length === 0) {
            const row = document.createElement("tr");
            const cell = appendCell(row, "No trades match these filters.", "empty-cell");
            cell.colSpan = 13;
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
    byId("dividendInput").value = asset.Div === undefined || asset.Div === null || asset.Div === ""
        ? ""
        : String(asset.Periodicity === "N/A" ? 0 : Number(asset.Div));
    byId("assetCurrencyInput").value = asset.Currency || "USD";
    byId("assetTypeInput").value = asset.AssetType || "Other";
    byId("periodicityInput").value = asset.Periodicity || "M";
    byId("dividendInput").disabled = byId("periodicityInput").value === "N/A";
    const tickerCurrency = asset.Currency || "USD";
    byId("entryCurrency").value = tickerCurrency;
    byId("closeCurrency").value = tickerCurrency;
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
        byId("positionAverage").textContent = money(summary.averagePrice, tickerCurrency);
        byId("positionInvested").textContent = money(summary.invested, tickerCurrency);
        const periodicity = asset.Periodicity ?? "M";
        const dividend = asset.Div;
        const validDividend = dividend !== undefined && dividend !== null && dividend !== ""
            && Number.isFinite(Number(dividend)) && Number(dividend) >= 0;
        const dividendProjectionAvailable = summary.quantity > 0 && summary.direction === "Long"
            && periodicity !== "N/A" && validDividend;
        byId("positionDividend").textContent = dividendProjectionAvailable
            ? money(summary.quantity * Number(dividend), tickerCurrency)
            : "N/A";
        byId("positionDividendUnit").textContent = periodicity === "N/A"
            ? "no dividend"
            : `per ${periodicity} payout`;
        byId("positionRealizedPnl").textContent = money(summary.realizedPnl, tickerCurrency);
        byId("positionRealizedPnl").className = summary.realizedPnl >= 0 ? "positive" : "negative";
        const yoc = PlannerCore.calculateYoc(asset, summary.averagePrice, summary.direction);
        byId("positionYoc").textContent = yoc === null ? "N/A" : `${yoc.toFixed(2)}%`;
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
        const lifecycle = PositionCore.currentExecutionLifecycle(asset);
        const strategy = byId("strategyInput");
        strategy.value = lifecycle?.strategy || strategy.value || "SniperNine";
        strategy.disabled = summary.quantity > 0 && Boolean(lifecycle?.strategy);
        byId("clearPlanLinkOpen").disabled = !lifecycle?.planID;
        byId("clearPlanLink").disabled = !lifecycle?.planID;
        byId("scenarioExitFee").dataset.currency = tickerCurrency;
        byId("scenarioExitFee").previousElementSibling.textContent = `Estimated exit fee (${tickerCurrency})`;
        byId("entryCurrency").value = tickerCurrency;
        byId("closeCurrency").value = tickerCurrency;
        renderPositionSnapshot();
    } catch (error) {
        setStatus(error.message, true);
    }
    renderTradeHistory(asset, summary);
    updateCloseNow();
    renderAllocation();
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
            periodicity: byId("newPeriodicityInput").value,
            currency: byId("newCurrencyInput").value,
            assetType: byId("newAssetTypeInput").value
        });
        portfolioData[ticker] = asset;
        markPortfolioDirty();
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

async function commitExecution(nextAsset, executionID, openingPlan = null) {
    const nextPortfolio = JSON.parse(JSON.stringify(portfolioData));
    nextPortfolio[currentTicker] = nextAsset;
    PositionCore.validatePortfolio(nextPortfolio);
    const queueItem = await ExecutionHistory.makeQueueItem(
        PlannerStore,
        portfolioData,
        nextPortfolio,
        currentTicker,
        executionID
    );
    if (openingPlan) {
        await PlannerStore.recordPlanOpening(
            openingPlan.plan.id,
            executionID,
            openingPlan.revision.id,
            queueItem
        );
    } else {
        await PlannerStore.putQueueItem(queueItem);
    }
    portfolioData = nextPortfolio;
    markPortfolioDirty();
    populateTickerDropdown();
    try {
        const appendResult = await ExecutionHistory.appendQueueItem(PlannerStore, queueItem);
        if (!appendResult.configured) {
            setStatus("Execution recorded in memory and queued locally. Configure the persistent execution CSV; JSON export is still pending.", false, true);
        } else {
            setStatus("Execution recorded and CSV append confirmed. JSON download is still pending; export and confirm it before reporting Saved.", false, true);
        }
    } catch (error) {
        setStatus(`Execution recorded and queued, but CSV append is pending: ${error.message}`, true, true);
    }
    if (openingPlan) {
        await refreshPlanSelectors();
        broadcastPortfolio("plan-lifecycle-changed");
    }
    await updateExecutionSyncStatus();
}

async function handleOpenTrade(event) {
    event.preventDefault();
    const asset = selectedAsset();
    if (!asset) return;
    try {
        const current = PositionCore.summarize(asset);
        const direction = byId("tradeDirection").value;
        const planID = current.quantity === 0 ? byId("planLinkSelect").value : "";
        let openingPlan = null;
        let planIDValue;
        let planRevisionValue;
        if (planID) {
            const plan = plannerRecords.find(item => item.id === planID);
            const revision = plan?.revisions.find(item => item.id === byId("planRevisionSelect").value);
            if (!plan || !revision) throw new Error("Choose an available saved plan revision.");
            if (plan.ticker !== currentTicker || plan.currency !== (asset.Currency || "USD").toUpperCase()) {
                throw new Error("Plan ticker and currency must match the selected portfolio asset.");
            }
            if (plan.hasLinkedExecution || plan.openingExecutionID || plan.lifecycle === "closed") {
                throw new Error("This plan has already been linked and cannot start another position lifecycle.");
            }
            if (direction !== "Long") throw new Error("The new planner can only link long openings.");
            planIDValue = plan.id;
            planRevisionValue = revision.id;
            openingPlan = { plan, revision };
        }
        const executionID = PlannerCore.createUlid();
        const actualDetails = `Record actual ${direction === "Long" ? "Buy" : "Sell"} of ${byId("entryQuantity").value} ${currentTicker} at ${byId("entryPrice").value}? This confirms an execution record; it does not place an order.`;
        if (!window.confirm(actualDetails)) return;
        const result = PositionCore.openPosition(asset, currentTicker, {
            direction,
            strategy: byId("strategyInput").value,
            quantity: byId("entryQuantity").value,
            price: byId("entryPrice").value,
            commission: byId("entryCommission").value,
            dateIn: byId("entryDate").value,
            currency: byId("entryCurrency").value,
            executionID,
            planID: planIDValue,
            planRevisionID: planRevisionValue,
            clearPlanLink: byId("clearPlanLinkOpen").checked
        });
        await commitExecution(result.asset, executionID, openingPlan);
        byId("entryQuantity").value = "";
        byId("entryPrice").value = "";
        byId("entryCommission").value = "0";
        render();
    } catch (error) {
        setStatus(`Execution was not recorded: ${error.message}`, true, true);
    }
}

async function handleCloseTrade(event) {
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
        const executionID = PlannerCore.createUlid();
        const action = PositionCore.summarize(asset).direction === "Long" ? "Sell" : "Buy";
        const requestedQuantity = closeMode === "full" ? "full position" : closeQuantity;
        if (!window.confirm(`Record an actual ${action} of ${requestedQuantity} ${currentTicker} at ${byId("closePrice").value}? This records an execution; it does not place an order.`)) return;
        const result = PositionCore.closePosition(asset, currentTicker, {
            quantity: closeMode === "full" ? "" : closeQuantity,
            price: byId("closePrice").value,
            commissionOut: byId("closeCommission").value,
            dateOut: byId("closeDate").value,
            strategy: byId("strategyInput").value,
            currency: byId("closeCurrency").value,
            executionID,
            clearPlanLink: byId("clearPlanLink").checked
        });
        await commitExecution(result.asset, executionID);
        byId("closeQuantity").value = "";
        byId("closePrice").value = "";
        byId("closeCommission").value = "0";
        render();
        setStatus(`Recorded ${result.trade.Action} of ${quantity(result.trade.Qty)}. Realized P&L ${money(result.realizedPnl, result.trade.Currency || asset.Currency || "USD")} is distinct from estimates; CSV/JSON synchronization remains pending until confirmed.`, false, true);
    } catch (error) {
        setStatus(`Execution was not recorded: ${error.message}`, true, true);
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
        byId("closeNowResult").textContent = `${money(estimate.unrealizedPnl, asset.Currency || "USD")} before any closing commission`;
        byId("closeNowResult").className = estimate.unrealizedPnl >= 0 ? "positive" : "negative";
    } catch (error) {
        byId("closeNowResult").textContent = error.message;
    }
}

function updateTickerMetadata() {
    const asset = selectedAsset();
    if (!asset) return;
    try {
        const periodicity = byId("periodicityInput").value;
        const dividend = periodicity === "N/A" ? 0 : Number(byId("dividendInput").value);
        if (!Number.isFinite(dividend) || dividend < 0) throw new Error("Dividend per cycle must be nonnegative.");
        if (!Object.hasOwn({ M: true, Q: true, S: true, A: true, "N/A": true }, periodicity)) {
            throw new Error("Choose a supported dividend period.");
        }
        const currency = byId("assetCurrencyInput").value.trim().toUpperCase();
        const assetType = byId("assetTypeInput").value;
        const updatedAsset = JSON.parse(JSON.stringify(asset));
        updatedAsset.Div = dividend;
        updatedAsset.Periodicity = periodicity;
        updatedAsset.Currency = currency;
        updatedAsset.AssetType = assetType;
        PositionCore.validatePortfolio({ [currentTicker]: updatedAsset });
        PositionCore.syncSummary(updatedAsset);
        portfolioData[currentTicker] = updatedAsset;
        markPortfolioDirty();
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
    renderAllocation();
    refreshPlanSelectors();
});
byId("newTickerForm").addEventListener("submit", handleAddTicker);
byId("openTradeForm").addEventListener("submit", handleOpenTrade);
byId("closeTradeForm").addEventListener("submit", handleCloseTrade);
byId("metadataForm").addEventListener("change", updateTickerMetadata);
byId("newPeriodicityInput").addEventListener("change", () => {
    const noDividend = byId("newPeriodicityInput").value === "N/A";
    byId("newDividendInput").disabled = noDividend;
    if (noDividend) byId("newDividendInput").value = "0";
});
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
byId("planLinkSelect").addEventListener("change", () => updatePlanRevisionSelector());
byId("configureExecutionCsv").addEventListener("click", configureExecutionCsv);
byId("retryExecutionCsv").addEventListener("click", retryExecutionCsv);
byId("includeQueuedExecutions").addEventListener("click", includeQueuedExecutions);
byId("scenarioRevision").addEventListener("change", () => {
    const linked = positionPlanLink(selectedAsset());
    if (!linked?.plan) return;
    loadScenarioFromRevision(linked.plan, byId("scenarioRevision").value, linked.planRevisionID);
    updateSnapshotEstimate();
});
byId("scenarioPlanCandidates").addEventListener("click", selectScenarioPlanCandidate);
["scenarioExitFee", "scenarioStop", "scenarioStopSource", "scenarioTarget", "scenarioTargetSource", "scenarioInterval", "scenarioObservedAt"]
    .forEach(id => byId(id).addEventListener("input", () => updateSnapshotEstimate()));
byId("scenarioInterval").addEventListener("change", () => updateSnapshotEstimate());
byId("entryDate").value = today();
byId("closeDate").value = today();
setupPortfolioChannel();
populateTickerDropdown();
refreshPlanSelectors();
updateExecutionSyncStatus();
window.addEventListener("beforeunload", event => {
    if (!portfolioDirty) return;
    event.preventDefault();
    event.returnValue = "";
});