(function attachTradePlannerStore(root) {
    const DATABASE_NAME = "lib-trade-planner";
    const DATABASE_VERSION = 1;
    const STORE_NAMES = ["plans", "revisions", "executionQueue", "settings"];
    let databasePromise;

    function openDatabase() {
        if (!root.indexedDB) return Promise.reject(new Error("IndexedDB is unavailable in this browser."));
        if (databasePromise) return databasePromise;
        databasePromise = new Promise((resolve, reject) => {
            const request = root.indexedDB.open(DATABASE_NAME, DATABASE_VERSION);
            request.onupgradeneeded = () => {
                const database = request.result;
                if (!database.objectStoreNames.contains("plans")) {
                    database.createObjectStore("plans", { keyPath: "id" });
                }

                if (!database.objectStoreNames.contains("revisions")) {
                    const revisions = database.createObjectStore("revisions", { keyPath: "id" });
                    revisions.createIndex("planID", "planID", { unique: false });
                }
                if (!database.objectStoreNames.contains("executionQueue")) {
                    database.createObjectStore("executionQueue", { keyPath: "executionID" });
                }
                if (!database.objectStoreNames.contains("settings")) {
                    database.createObjectStore("settings", { keyPath: "key" });
                }
            };
            request.onsuccess = () => {
                const database = request.result;
                database.onversionchange = () => {
                    database.close();
                    databasePromise = null;
                };
                resolve(database);
            };
            request.onerror = () => {
                databasePromise = null;
                reject(request.error || new Error("Could not open planner storage."));
            };
            request.onblocked = () => {
                databasePromise = null;
                reject(new Error("Planner storage upgrade is blocked by another open tab."));
            };
        });
        return databasePromise;
    }

    function transaction(database, stores, mode, action) {
        return new Promise((resolve, reject) => {
            const tx = database.transaction(stores, mode);
            let result;
            let actionError;
            tx.oncomplete = () => resolve(result);
            tx.onabort = () => reject(actionError || tx.error || new Error("Planner storage transaction was aborted."));
            tx.onerror = () => {
                actionError ||= tx.error || new Error("Planner storage transaction failed.");
            };
            try {
                action(tx, value => { result = value; }, error => {
                    actionError = error;
                    tx.abort();
                });
            } catch (error) {
                actionError = error;
                tx.abort();
            }
        });
    }

    function requestResult(request) {
        return new Promise((resolve, reject) => {
            request.onsuccess = () => resolve(request.result);
            request.onerror = () => reject(request.error || new Error("Planner storage request failed."));
        });
    }

    async function readAll(storeName) {
        const db = await openDatabase();
        const tx = db.transaction(storeName, "readonly");
        const values = await requestResult(tx.objectStore(storeName).getAll());
        await new Promise((resolve, reject) => {
            tx.oncomplete = resolve;
            tx.onabort = () => reject(tx.error || new Error(`Could not read ${storeName}.`));
            tx.onerror = () => reject(tx.error || new Error(`Could not read ${storeName}.`));
        });
        return values;
    }

    async function getPlan(planID) {
        const db = await openDatabase();
        const tx = db.transaction("plans", "readonly");
        const result = await requestResult(tx.objectStore("plans").get(planID));
        await new Promise((resolve, reject) => {
            tx.oncomplete = resolve;
            tx.onabort = () => reject(tx.error || new Error("Could not read planner records."));
            tx.onerror = () => reject(tx.error || new Error("Could not read planner records."));
        });
        return result || null;
    }

    async function getPlanRevisions(planID) {
        const db = await openDatabase();
        const tx = db.transaction("revisions", "readonly");
        const result = await requestResult(tx.objectStore("revisions").index("planID").getAll(planID));
        await new Promise((resolve, reject) => {
            tx.oncomplete = resolve;
            tx.onabort = () => reject(tx.error || new Error("Could not read plan revisions."));
            tx.onerror = () => reject(tx.error || new Error("Could not read plan revisions."));
        });
        return result.sort((left, right) => left.revisionNumber - right.revisionNumber);
    }

    async function saveNewPlan(plan, revision) {
        const db = await openDatabase();
        return transaction(db, ["plans", "revisions"], "readwrite", (tx, setResult, abort) => {
            const plans = tx.objectStore("plans");
            const request = plans.get(plan.id);
            request.onsuccess = () => {
                if (request.result) {
                    abort(new Error("This Plan ID already exists. Reload the plan list before saving."));
                    return;
                }
                const savedPlan = {
                    ...plan,
                    revisionCount: 1,
                    currentRevisionID: revision.id,
                    lifecycle: "saved",
                    archived: false,
                    openingExecutionID: null,
                    hasLinkedExecution: false
                };
                plans.add(savedPlan);
                tx.objectStore("revisions").add({ ...revision, planID: plan.id, revisionNumber: 1 });
                setResult(savedPlan);
            };
            request.onerror = () => abort(request.error || new Error("Could not check for an existing Plan ID."));
        });
    }

    async function saveRevision(planID, expectedRevisionCount, revision) {
        const db = await openDatabase();
        return transaction(db, ["plans", "revisions"], "readwrite", (tx, setResult, abort) => {
            const plans = tx.objectStore("plans");
            const request = plans.get(planID);
            request.onsuccess = () => {
                const plan = request.result;
                if (!plan) {
                    abort(new Error("Plan no longer exists. Reload the plan list before saving."));
                    return;
                }
                if (plan.revisionCount !== expectedRevisionCount) {
                    abort(new Error("This plan changed in another tab. Your draft is preserved; reload or reconcile before saving."));
                    return;
                }
                if (plan.lifecycle === "closed" || plan.lifecycle === "mismatch" || plan.archived) {
                    abort(new Error("Closed, mismatched, or archived plans are read-only. Duplicate a closed plan or unarchive it before editing."));
                    return;
                }
                const revisionNumber = plan.revisionCount + 1;
                const updated = {
                    ...plan,
                    ticker: revision.draft.ticker,
                    currency: revision.draft.currency,
                    revisionCount: revisionNumber,
                    currentRevisionID: revision.id,
                    updatedAt: revision.createdAt
                };
                plans.put(updated);
                tx.objectStore("revisions").add({ ...revision, planID, revisionNumber });
                setResult(updated);
            };
            request.onerror = () => abort(request.error || new Error("Could not check the current plan revision."));
        });
    }

    async function setPlanLifecycle(planID, lifecycle, details = {}) {
        if (!["saved", "linked-open", "closed", "mismatch"].includes(lifecycle)) {
            throw new Error("Unsupported plan lifecycle state.");
        }
        const db = await openDatabase();
        return transaction(db, "plans", "readwrite", (tx, setResult, abort) => {
            const store = tx.objectStore("plans");
            const request = store.get(planID);
            request.onsuccess = () => {
                const plan = request.result;
                if (!plan) {
                    abort(new Error("Plan no longer exists."));
                    return;
                }
                const updated = { ...plan, lifecycle, lifecycleCheckedAt: new Date().toISOString(), ...details };
                store.put(updated);
                setResult(updated);
            };
            request.onerror = () => abort(request.error || new Error("Could not update plan lifecycle."));
        });
    }

    async function associateOpeningExecution(planID, executionID, revisionID) {
        const db = await openDatabase();
        return transaction(db, ["plans", "revisions"], "readwrite", (tx, setResult, abort) => {
            const plans = tx.objectStore("plans");
            const request = plans.get(planID);
            request.onsuccess = () => {
                const plan = request.result;
                if (!plan) {
                    abort(new Error("Selected plan no longer exists."));
                    return;
                }
                if (plan.openingExecutionID || plan.hasLinkedExecution || plan.archived || plan.lifecycle !== "saved") {
                    abort(new Error("Only an active, unlinked saved plan can start a position lifecycle."));
                    return;
                }
                const revisionRequest = tx.objectStore("revisions").get(revisionID);
                revisionRequest.onsuccess = () => {
                    const revision = revisionRequest.result;
                    if (!revision || revision.planID !== planID) {
                        abort(new Error("Selected revision does not belong to this plan."));
                        return;
                    }
                    const updated = {
                        ...plan,
                        openingExecutionID: executionID,
                        openingRevisionID: revisionID,
                        lifecycle: "linked-open",
                        hasLinkedExecution: true,
                        lifecycleCheckedAt: new Date().toISOString()
                    };
                    plans.put(updated);
                    setResult(updated);
                };
                revisionRequest.onerror = () => abort(revisionRequest.error || new Error("Could not verify the selected revision."));
            };
            request.onerror = () => abort(request.error || new Error("Could not verify the selected plan."));
        });
    }

    async function recordPlanOpening(planID, executionID, revisionID, queueItem) {
        const db = await openDatabase();
        return transaction(db, ["plans", "revisions", "executionQueue"], "readwrite", (tx, setResult, abort) => {
            const plans = tx.objectStore("plans");
            const request = plans.get(planID);
            request.onsuccess = () => {
                const plan = request.result;
                if (!plan) {
                    abort(new Error("Selected plan no longer exists."));
                    return;
                }
                if (plan.openingExecutionID || plan.hasLinkedExecution || plan.archived || plan.lifecycle !== "saved") {
                    abort(new Error("Only an active, unlinked saved plan can start a position lifecycle."));
                    return;
                }
                const revisionRequest = tx.objectStore("revisions").get(revisionID);
                revisionRequest.onsuccess = () => {
                    const revision = revisionRequest.result;
                    if (!revision || revision.planID !== planID) {
                        abort(new Error("Selected revision does not belong to this plan."));
                        return;
                    }
                    if (queueItem.executionID !== executionID || queueItem.row.PlanID !== planID
                        || queueItem.row.PlanRevisionID !== revisionID
                        || queueItem.ticker !== plan.ticker || queueItem.row.Action !== "Buy"
                        || revision.draft.ticker !== plan.ticker || revision.draft.currency !== plan.currency
                        || (queueItem.row.Currency && queueItem.row.Currency !== plan.currency)) {
                        abort(new Error("Execution queue row does not match the selected plan and revision."));
                        return;
                    }
                    plans.put({
                        ...plan,
                        openingExecutionID: executionID,
                        openingRevisionID: revisionID,
                        lifecycle: "linked-open",
                        hasLinkedExecution: true,
                        lifecycleCheckedAt: new Date().toISOString()
                    });
                    tx.objectStore("executionQueue").add(queueItem);
                    setResult(true);
                };
                revisionRequest.onerror = () => abort(revisionRequest.error || new Error("Could not verify the selected revision."));
            };
            request.onerror = () => abort(request.error || new Error("Could not verify the selected plan."));
        });
    }

    async function archivePlan(planID, archived) {
        const plan = await getPlan(planID);
        if (!plan) throw new Error("Plan no longer exists.");
        if (plan.openingExecutionID || plan.hasLinkedExecution) {
            throw new Error("A plan linked to an execution cannot be archived or unarchived.");
        }
        const db = await openDatabase();
        return transaction(db, "plans", "readwrite", (tx, setResult, abort) => {
            const store = tx.objectStore("plans");
            const request = store.get(planID);
            request.onsuccess = () => {
                if (!request.result || request.result.revisionCount !== plan.revisionCount) {
                    abort(new Error("Plan changed in another tab. Reload before changing its archive state."));
                    return;
                }
                const updated = { ...request.result, archived: Boolean(archived), updatedAt: new Date().toISOString() };
                store.put(updated);
                setResult(updated);
            };
            request.onerror = () => abort(request.error || new Error("Could not update plan archive state."));
        });
    }

    async function releaseStalePlanLink(planID, openingExecutionID) {
        const db = await openDatabase();
        return transaction(db, "plans", "readwrite", (tx, setResult, abort) => {
            const store = tx.objectStore("plans");
            const request = store.get(planID);
            request.onsuccess = () => {
                const plan = request.result;
                if (!plan || plan.openingExecutionID !== openingExecutionID) {
                    abort(new Error("Plan link changed in another tab. Reload before recovery."));
                    return;
                }
                const updated = {
                    ...plan,
                    openingExecutionID: null,
                    lifecycle: "mismatch",
                    hasLinkedExecution: true,
                    releasedOpeningExecutionID: openingExecutionID,
                    linkReleasedAt: new Date().toISOString()
                };
                store.put(updated);
                setResult(updated);
            };
            request.onerror = () => abort(request.error || new Error("Could not verify the stale plan link."));
        });
    }

    async function deletePlan(planID) {
        const db = await openDatabase();
        return transaction(db, ["plans", "revisions"], "readwrite", (tx, setResult, abort) => {
            const plans = tx.objectStore("plans");
            const request = plans.get(planID);
            request.onsuccess = () => {
                const plan = request.result;
                if (!plan) {
                    setResult(false);
                    return;
                }
                if (plan.openingExecutionID || plan.hasLinkedExecution) {
                    abort(new Error("A plan linked to an execution cannot be deleted, including after closure."));
                    return;
                }
                plans.delete(planID);
                const revisions = tx.objectStore("revisions").index("planID");
                const revisionRequest = revisions.getAllKeys(planID);
                revisionRequest.onsuccess = () => {
                    revisionRequest.result.forEach(key => tx.objectStore("revisions").delete(key));
                    setResult(true);
                };
                revisionRequest.onerror = () => abort(revisionRequest.error || new Error("Could not remove plan revisions."));
            };
            request.onerror = () => abort(request.error || new Error("Could not verify the plan before deletion."));
        });
    }

    async function getAllPlansWithRevisions() {
        const [plans, revisions] = await Promise.all([readAll("plans"), readAll("revisions")]);
        const revisionsByPlan = new Map();
        revisions.forEach(revision => {
            const existing = revisionsByPlan.get(revision.planID) || [];
            existing.push(revision);
            revisionsByPlan.set(revision.planID, existing);
        });
        return plans.sort((left, right) => (left.order ?? 0) - (right.order ?? 0))
            .map(plan => ({
                ...plan,
                revisions: (revisionsByPlan.get(plan.id) || [])
                    .sort((left, right) => left.revisionNumber - right.revisionNumber)
            }));
    }

    async function putQueueItem(item) {
        const db = await openDatabase();
        return transaction(db, "executionQueue", "readwrite", (tx, setResult) => {
            tx.objectStore("executionQueue").put(item);
            setResult(item);
        });
    }

    async function getQueueItems() {
        return readAll("executionQueue");
    }

    async function deleteQueueItem(executionID) {
        const db = await openDatabase();
        return transaction(db, "executionQueue", "readwrite", (tx, setResult) => {
            tx.objectStore("executionQueue").delete(executionID);
            setResult(true);
        });
    }

    async function getSetting(key) {
        const db = await openDatabase();
        const tx = db.transaction("settings", "readonly");
        const value = await requestResult(tx.objectStore("settings").get(key));
        await new Promise((resolve, reject) => {
            tx.oncomplete = resolve;
            tx.onabort = () => reject(tx.error || new Error("Could not read planner settings."));
            tx.onerror = () => reject(tx.error || new Error("Could not read planner settings."));
        });
        return value?.value ?? null;
    }

    async function setSetting(key, value) {
        const db = await openDatabase();
        return transaction(db, "settings", "readwrite", (tx, setResult) => {
            tx.objectStore("settings").put({ key, value });
            setResult(value);
        });
    }

    function validateBackupPlan(plan) {
        if (!plan || typeof plan !== "object" || typeof plan.id !== "string" || !plan.id
            || typeof plan.ticker !== "string" || !plan.ticker
            || !Number.isInteger(plan.revisionCount) || plan.revisionCount < 1
            || !["saved", "linked-open", "closed", "mismatch"].includes(plan.lifecycle)
            || typeof plan.archived !== "boolean"
            || typeof plan.currentRevisionID !== "string"
            || !Array.isArray(plan.revisions)) {
            throw new Error("Backup contains an invalid plan record.");
        }
        const revisionIDs = new Set();
        const revisionNumbers = new Set();
        for (const revision of plan.revisions) {
            if (!revision || revision.planID !== plan.id || typeof revision.id !== "string"
                || !revision.id || revisionIDs.has(revision.id)
                || !Number.isInteger(revision.revisionNumber) || revision.revisionNumber < 1
                || revisionNumbers.has(revision.revisionNumber) || !revision.draft) {
                throw new Error(`Backup contains an invalid revision for ${plan.ticker}.`);
            }
            root.TradePlannerCore.validateDraft(revision.draft);
            revisionIDs.add(revision.id);
            revisionNumbers.add(revision.revisionNumber);
        }
        if (revisionIDs.size !== plan.revisionCount) {
            throw new Error(`Backup revision count does not match ${plan.ticker}.`);
        }
        if (!revisionIDs.has(plan.currentRevisionID)
            || !revisionNumbers.has(plan.revisionCount)
            || (plan.openingExecutionID && (!plan.openingRevisionID
                || !revisionIDs.has(plan.openingRevisionID) || !plan.hasLinkedExecution))) {
            throw new Error(`Backup lifecycle or current revision is inconsistent for ${plan.ticker}.`);
        }
    }

    async function createBackupEnvelope() {
        const plans = await getAllPlansWithRevisions();
        const core = root.TradePlannerCore;
        const checksum = await core.sha256(plans);
        return {
            format: "trade-planner-backup",
            schemaVersion: 1,
            exportedAt: new Date().toISOString(),
            plans,
            checksum: `sha256:${checksum}`
        };
    }

    async function validateBackupEnvelope(envelope) {
        if (!envelope || typeof envelope !== "object"
            || envelope.format !== "trade-planner-backup"
            || !Number.isInteger(envelope.schemaVersion)
            || envelope.schemaVersion !== 1
            || !Array.isArray(envelope.plans)
            || typeof envelope.checksum !== "string") {
            throw new Error("Unsupported or malformed planner backup.");
        }
        for (const plan of envelope.plans) validateBackupPlan(plan);
        const expected = `sha256:${await root.TradePlannerCore.sha256(envelope.plans)}`;
        if (envelope.checksum !== expected) throw new Error("Backup checksum does not match its plan data.");
        return envelope.plans;
    }

    async function restorePlansAtomically(plans) {
        const db = await openDatabase();
        return transaction(db, ["plans", "revisions"], "readwrite", (tx, setResult) => {
            const planStore = tx.objectStore("plans");
            const revisionStore = tx.objectStore("revisions");
            planStore.clear();
            revisionStore.clear();
            for (const item of plans) {
                const { revisions, ...plan } = item;
                planStore.put(plan);
                revisions.forEach(revision => revisionStore.put(revision));
            }
            setResult(plans.length);
        });
    }

    const api = {
        archivePlan,
        associateOpeningExecution,
        createBackupEnvelope,
        deletePlan,
        deleteQueueItem,
        getAllPlansWithRevisions,
        getPlan,
        getPlanRevisions,
        getQueueItems,
        getSetting,
        openDatabase,
        putQueueItem,
        readAll,
        recordPlanOpening,
        releaseStalePlanLink,
        restorePlansAtomically,
        saveNewPlan,
        saveRevision,
        setPlanLifecycle,
        setSetting,
        validateBackupEnvelope
    };
    if (typeof module !== "undefined" && module.exports) module.exports = api;
    root.TradePlannerStore = api;
})(typeof globalThis === "undefined" ? this : globalThis);
