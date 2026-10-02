# Issue #4: Ticker Currency, Asset Type, and No-Dividend Period

- Date: 2026-10-02
- Status: Accepted; implemented locally, external issue resolution pending
- Type: New requirement and schema change
- Scope: Browser portfolio tools and portfolio JSON metadata
- Related issue: [GitHub issue #4](https://github.com/rjcastillos/lib/issues/4)
- Feature specification: [Portfolio update](../../docs/specs/portfolio-update/README.md)

## Request

Add ticker-level currency and asset type metadata, preserve currency on individual trades, support the listed asset classes, and allow a no-dividend value for assets such as commodities. Existing records may omit the new fields, which are initially informative.

## Decision

- `Currency` is an optional three-letter code on ticker metadata and may also be recorded on each new real-position execution. If an older ticker has no currency, display amounts as USD. If an execution has no currency, display it using its ticker currency, falling back to USD.
- Currency controls formatting and history only. The browser tools do not perform foreign-exchange conversion. Aggregate amounts and P&L are meaningful only when executions for a ticker share a currency.
- `AssetType` is optional for imported records and accepts `Stocks`, `ETF`, `Commodities`, `Crypto`, `Treasury Bonds`, `T-Bills`, `Corporate Bonds`, or `Other`. Missing types display as `Other`.
- `Periodicity: "N/A"` represents no dividend. Set `Div` and `DivAmnt` to zero, disable dividend-rate input, and display dividend amount, annual projection, payable amount, and yield on cost as `N/A`.
- Keep all three metadata fields optional when reading older portfolio records; adding the fields does not change existing position accounting or DCA cost-basis calculations.

## Rationale

Ticker currency and type answer what an asset represents and which currency its amounts use, while per-execution currency retains the currency reported with each trade. Recording and displaying currency without converting it avoids silently applying an exchange rate or combining amounts under an unsupported conversion rule. A distinct no-dividend period avoids presenting zero as a recurring dividend or yield projection for non-dividend assets.

## Local Resolution

The positions page now creates and edits ticker currency and asset type, stores currency on new executions, and displays each trade using its own currency with a legacy ticker-currency fallback. The DCA planner formats amounts in the selected ticker's currency. Both pages recognize `N/A` and show no-dividend projections accordingly. The XAU sample is tagged as EUR/Commodities.

The linked GitHub issue was not updated because the available GitHub issue tools are read-only. It remains open pending an external resolution note or closure.

## Validation

- All 18 tests in `html/positions-core.test.js` passed, including new metadata, no-dividend, execution-currency, and legacy-fallback cases.
- `node --check` passed for the three browser scripts, and both portfolio JSON examples parsed and passed portfolio validation.
- Browser checks exercised creating an EUR gold commodity with no dividend, recording an EUR trade, viewing currency-formatted history, and confirming `N/A` DCA outputs.
- `git diff --check` passed.

## Affected Files

- `html/positions.html`
- `html/positions-app.js`
- `html/positions-core.js`
- `html/positions-core.test.js`
- `html/index.html`
- `html/app.js`
- `html/portfolio.json`
- `json/portfolio-template.json`
- `json/portfolio.md`
- `docs/specs/portfolio-update/README.md`
- `docs/specs/Dollar-cost-average-planning/README.md`
