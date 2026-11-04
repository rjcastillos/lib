(function attachExecutionHistory(root) {
    const HEADER = [
        "ExecutionID", "LedgerSeq", "Ticker", "ExecutionDate", "Action", "PositionEffect", "Side",
        "Quantity", "Price", "Commission", "Currency", "Strategy", "PlanID", "PlanRevisionID",
        "ReleasedBasis", "RealizedPnL", "OpenQtyAfter", "AccountingMethod", "Source", "RecordedAt"
    ];
    const LOCK_NAME = "lib-execution-history-csv";

    function parseCsv(text) {
        const rows = [];
        let row = [];
        let field = "";
        let quoted = false;
        for (let index = 0; index < text.length; index++) {
            const character = text[index];
            if (quoted) {
                if (character === '"' && text[index + 1] === '"') {
                    field += '"';
                    index++;
                } else if (character === '"') {
                    quoted = false;
                } else {
                    field += character;
                }
            } else if (character === '"' && field === "") {
                quoted = true;
            } else if (character === ",") {
                row.push(field);
                field = "";
            } else if (character === "\n") {
                row.push(field.replace(/\r$/, ""));
                if (row.some(value => value !== "")) rows.push(row);
                row = [];
                field = "";
            } else {
                field += character;
            }
        }
        if (quoted) throw new Error("Execution history CSV contains an unterminated quoted field.");
        if (field !== "" || row.length) {
            row.push(field.replace(/\r$/, ""));
            if (row.some(value => value !== "")) rows.push(row);
        }
        return rows;
    }

    function rowToCsv(row) {
        return HEADER.map((key, index) => {
            const value = row[index];
            return root.TradePlannerCore.csvEscape(value);
        }).join(",");
    }

    function validateCsvHeader(rows) {
        if (!rows.length) return false;
        const header = rows[0].map((value, index) => index === 0 ? value.replace(/^\uFEFF/, "") : value);
        if (header.length !== HEADER.length || header.some((value, index) => value !== HEADER[index])) {
            throw new Error("Selected CSV does not use the execution-history schema. It was not changed.");
        }
        const ids = new Set();
        rows.slice(1).forEach((row, index) => {
            if (row.length !== HEADER.length) {
                throw new Error(`Execution history CSV row ${index + 2} has an unexpected number of columns.`);
            }
            if (!row[0]) throw new Error(`Execution history CSV row ${index + 2} is missing ExecutionID.`);
            if (ids.has(row[0])) throw new Error(`Execution history CSV contains duplicate ExecutionID ${row[0]}.`);
            ids.add(row[0]);
        });
        return true;
    }

    function getPositionEffect(before, after, trade) {
        const sideBefore = before.quantity ? before.direction : null;
        const sideAfter = after.quantity ? after.direction : null;
        const executionSide = trade.Action === "Buy" ? "Long" : "Short";
        const side = sideBefore || sideAfter || executionSide;
        const increases = !sideBefore || sideBefore === executionSide;
        const positionEffect = increases
            ? (sideBefore ? "Increase" : "Open")
            : (sideAfter ? "Reduce" : "Close");
        return { side, positionEffect };
    }

    function buildCsvRow(ticker, trade, ledgerSeq, before, after, source, executionID, recordedAt, fallbackCurrency = "USD") {
        const { side, positionEffect } = getPositionEffect(before, after, trade);
        const releasedBasis = positionEffect === "Reduce" || positionEffect === "Close"
            ? before.invested - after.invested
            : null;
        const realizedPnl = positionEffect === "Reduce" || positionEffect === "Close"
            ? after.realizedPnl - before.realizedPnl
            : null;
        const currency = trade.Currency || fallbackCurrency;
        return [
            executionID,
            String(ledgerSeq),
            ticker,
            trade.Date,
            trade.Action,
            positionEffect,
            side,
            root.TradePlannerCore.formatCsvNumber(trade.Qty),
            root.TradePlannerCore.formatCsvNumber(trade.Price),
            root.TradePlannerCore.formatCsvNumber(trade.Commission ?? 0),
            currency,
            trade.Strategy,
            trade.PlanID || "",
            trade.PlanRevisionID || "",
            root.TradePlannerCore.formatCsvNumber(releasedBasis),
            root.TradePlannerCore.formatCsvNumber(realizedPnl),
            root.TradePlannerCore.formatCsvNumber(after.quantity),
            "FIFO",
            source,
            recordedAt
        ];
    }

    async function ledgerRows(portfolio) {
        const result = [];
        for (const [ticker, asset] of Object.entries(portfolio)) {
            if (ticker.startsWith(".")) continue;
            const trades = asset.Trades || [];
            for (let index = 0; index < trades.length; index++) {
                const trade = trades[index];
                if (!trade.Action) continue;
                const canonical = root.TradePlannerCore.canonicalJson(trade);
                const hash = (await root.TradePlannerCore.sha256(canonical)).slice(0, 8);
                const executionID = trade.ExecutionID || `legacy:${ticker}:${index + 1}:${hash}`;
                const beforeAsset = { ...asset, Trades: trades.slice(0, index) };
                const afterAsset = { ...asset, Trades: trades.slice(0, index + 1) };
                const before = root.PositionCore.summarize(beforeAsset);
                const after = root.PositionCore.summarize(afterAsset);
                result.push({
                    executionID,
                    ticker,
                    trade,
                    ledgerSeq: index + 1,
                    row: buildCsvRow(
                        ticker,
                        trade,
                        index + 1,
                        before,
                        after,
                        trade.ExecutionID ? "new" : "migrated",
                        executionID,
                        trade.RecordedAt || `${trade.Date}T00:00:00.000Z`,
                        asset.Currency || "USD"
                    ),
                    hash
                });
            }
        }
        const ids = new Set();
        for (const row of result) {
            if (ids.has(row.executionID)) throw new Error(`Duplicate execution identity ${row.executionID} in loaded portfolio.`);
            ids.add(row.executionID);
        }
        return result;
    }

    async function getFileHandle(store) {
        return store.getSetting("executionCsvHandle");
    }

    async function requestWritableHandle(handle) {
        if (!handle) throw new Error("No execution-history CSV is configured.");
        if (typeof handle.queryPermission !== "function" || typeof handle.requestPermission !== "function") {
            throw new Error("Selected file handle does not support read/write permission checks.");
        }
        const permission = await handle.queryPermission({ mode: "readwrite" });
        if (permission !== "granted") {
            const requested = await handle.requestPermission({ mode: "readwrite" });
            if (requested !== "granted") throw new Error("CSV write permission was not granted.");
        }
        return handle;
    }

    async function readCsv(handle) {
        const file = await handle.getFile();
        const text = await file.text();
        if (!text.trim()) return { text, rows: [] };
        const rows = parseCsv(text);
        validateCsvHeader(rows);
        return { text, rows };
    }

    async function appendCsvRows(handle, rowsToAppend) {
        const { text, rows } = await readCsv(handle);
        const existingIDs = new Set(rows.slice(1).map(row => row[0]).filter(Boolean));
        const missingRows = rowsToAppend.filter(row => !existingIDs.has(row[0]));
        const isEmpty = !text.trim();
        if (!missingRows.length && !isEmpty) return { appended: 0, existingIDs };
        const prefix = isEmpty
            ? `\uFEFF${HEADER.join(",")}\r\n`
            : (text.endsWith("\n") ? "" : "\r\n");
        const content = prefix + (missingRows.length ? `${missingRows.map(rowToCsv).join("\r\n")}\r\n` : "");
        const writable = await handle.createWritable({ keepExistingData: true });
        try {
            const file = await handle.getFile();
            await writable.seek(file.size);
            await writable.write(content);
            await writable.close();
        } catch (error) {
            await writable.abort().catch(() => {});
            throw new Error(`Execution CSV write failed: ${error.message}`);
        }
        return { appended: missingRows.length, existingIDs };
    }

    async function withWriteLock(callback) {
        if (!root.navigator?.locks?.request) {
            throw new Error("Web Locks are unavailable; CSV writes are disabled to prevent cross-tab duplicates.");
        }
        return root.navigator.locks.request(LOCK_NAME, { mode: "exclusive" }, callback);
    }

    async function selectOrCreateFile(store) {
        if (!root.showSaveFilePicker) {
            throw new Error("Persistent CSV file access is unavailable in this browser. Use a supported Chromium browser over localhost or HTTPS.");
        }
        const handle = await root.showSaveFilePicker({
            suggestedName: "execution-history.csv",
            types: [{ description: "CSV files", accept: { "text/csv": [".csv"] } }]
        });
        await requestWritableHandle(handle);
        await withWriteLock(() => appendCsvRows(handle, []));
        await store.setSetting("executionCsvHandle", handle);
        return handle;
    }

    async function appendQueueItem(store, item) {
        const handle = await getFileHandle(store);
        if (!handle) return { configured: false, appended: 0 };
        return withWriteLock(async () => {
            await requestWritableHandle(handle);
            const result = await appendCsvRows(handle, [item.csvRow]);
            const updated = {
                ...item,
                csvWritten: true,
                status: item.jsonExported ? "json-exported" : "csv-written",
                csvWrittenAt: new Date().toISOString()
            };
            if (updated.jsonExported) await store.deleteQueueItem(item.executionID);
            else await store.putQueueItem(updated);
            return { configured: true, appended: result.appended };
        });
    }

    async function retryQueue(store) {
        const queue = await store.getQueueItems();
        const pending = queue.filter(item => !item.csvWritten);
        const results = [];
        for (const item of pending) results.push(await appendQueueItem(store, item));
        return results;
    }

    async function markJsonExported(store, executionIDs) {
        const idSet = new Set(executionIDs);
        const queue = await store.getQueueItems();
        for (const item of queue) {
            if (!idSet.has(item.executionID)) continue;
            const updated = { ...item, jsonExported: true, jsonExportedAt: new Date().toISOString() };
            if (updated.csvWritten) await store.deleteQueueItem(item.executionID);
            else {
                updated.status = "recorded";
                await store.putQueueItem(updated);
            }
        }
    }

    async function reconcile(store, portfolio) {
        const handle = await getFileHandle(store);
        const queue = await store.getQueueItems();
        const ledger = await ledgerRows(portfolio);
        if (!handle) {
            return {
                configured: false,
                ledgerCount: ledger.length,
                queuedCount: queue.length,
                unresolved: [],
                missingLedgerRows: []
            };
        }
        return withWriteLock(async () => {
            await requestWritableHandle(handle);
            const file = await readCsv(handle);
            const csvRowsByID = new Map(file.rows.slice(1).map(row => [row[0], row]).filter(([id]) => id));
            const csvIDs = new Set(csvRowsByID.keys());
            const queueByID = new Map(queue.map(item => [item.executionID, item]));
            const ledgerIDs = new Set(ledger.map(item => item.executionID));
            const missingLedgerRows = ledger.filter(item => !csvIDs.has(item.executionID));
            const queuedWithoutLedger = queue.filter(item =>
                !ledgerIDs.has(item.executionID) && csvIDs.has(item.executionID));
            const unresolved = file.rows.slice(1)
                .filter(row => row[0] && !ledgerIDs.has(row[0]) && !queueByID.has(row[0]))
                .map(row => ({
                    executionID: row[0],
                    ticker: row[2] || "unknown",
                    reason: "CSV execution is absent from the loaded portfolio and local queue."
                }));
            const csvConflicts = ledger.filter(item => {
                const csvRow = csvRowsByID.get(item.executionID);
                return csvRow && csvRow.some((value, index) =>
                    index !== 18 && index !== 19 && value !== item.row[index]);
            }).map(item => ({
                executionID: item.executionID,
                ticker: item.ticker,
                reason: "CSV row differs from the loaded execution ledger."
            }));
            const queueConflicts = queue.filter(item => {
                const csvRow = csvRowsByID.get(item.executionID);
                return !ledgerIDs.has(item.executionID) && csvRow && item.csvRow?.some((value, index) =>
                    index !== 18 && index !== 19 && value !== csvRow[index]);
            }).map(item => ({
                executionID: item.executionID,
                ticker: item.ticker,
                reason: "CSV row differs from the queued execution."
            }));
            unresolved.push(...csvConflicts, ...queueConflicts);
            const conflictIDs = new Set(unresolved.map(item => item.executionID));
            const safeQueuedWithoutLedger = queuedWithoutLedger.filter(item => !conflictIDs.has(item.executionID));
            const queuedRows = missingLedgerRows.map(item => {
                const queuedItem = queueByID.get(item.executionID);
                return queuedItem?.csvRow || item.row;
            });
            const appended = queuedRows.length ? await appendCsvRows(handle, queuedRows) : { appended: 0 };
            const durableCSVIDs = new Set([...csvIDs, ...missingLedgerRows.map(item => item.executionID)]);
            for (const item of queue) {
                if (!durableCSVIDs.has(item.executionID) || conflictIDs.has(item.executionID)) continue;
                const updated = {
                    ...item,
                    csvWritten: true,
                    status: item.jsonExported ? "json-exported" : "csv-written",
                    csvWrittenAt: item.csvWrittenAt || new Date().toISOString()
                };
                if (updated.jsonExported) await store.deleteQueueItem(updated.executionID);
                else await store.putQueueItem(updated);
            }
            return {
                configured: true,
                ledgerCount: ledger.length,
                queuedCount: queue.length,
                appended: appended.appended,
                missingLedgerRows: missingLedgerRows.map(item => ({
                    ticker: item.ticker,
                    executionID: item.executionID,
                    source: item.trade.ExecutionID ? "identified" : "legacy"
                })),
                queuedWithoutLedger: safeQueuedWithoutLedger.map(item => ({
                    executionID: item.executionID,
                    ticker: item.ticker,
                    ledgerSeq: Number(item.csvRow[1])
                })),
                unresolved
            };
        });
    }

    async function makeQueueItem(store, portfolioBefore, portfolioAfter, ticker, executionID) {
        const afterAsset = portfolioAfter[ticker];
        const tradeIndex = afterAsset.Trades.length - 1;
        const trade = afterAsset.Trades[tradeIndex];
        const before = root.PositionCore.summarize(portfolioBefore[ticker]);
        const after = root.PositionCore.summarize(afterAsset);
        const row = buildCsvRow(
            ticker,
            trade,
            tradeIndex + 1,
            before,
            after,
            "new",
            executionID,
            new Date().toISOString(),
            afterAsset.Currency || "USD"
        );
        return {
            executionID,
            ticker,
            row: trade,
            csvRow: row,
            assetMetadata: Object.fromEntries(Object.entries(afterAsset).filter(([key]) =>
                !["Trades", "Positions", "Price", "Qty", "Invested", "DivAmnt"].includes(key))),
            source: "new",
            recordedAt: new Date().toISOString(),
            csvWritten: false,
            jsonExported: false,
            status: "recorded"
        };
    }

    root.ExecutionHistory = {
        HEADER,
        appendQueueItem,
        getFileHandle,
        ledgerRows,
        makeQueueItem,
        markJsonExported,
        parseCsv,
        reconcile,
        retryQueue,
        selectOrCreateFile
    };
})(typeof globalThis === "undefined" ? this : globalThis);
