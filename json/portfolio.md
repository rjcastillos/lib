# Portfolio JSON Database Schema Documentation

This document defines the portfolio JSON fields and the trade formats supported by the browser tools. The canonical starter file includes a blank planner profile and worked real-position examples in [`portfolio-template.json`](portfolio-template.json).

---

## 📁 JSON Data Structure Overview

The root JSON object is keyed by ticker symbol. Each value contains asset metadata, a `Trades` history, and aggregate position fields. The aggregate fields for real positions are derived from the trade history by the positions tool.

---

## 🔑 Data Definition Dictionary

### Meta Parameter Metrics
* **`name`** *(String)*: Human-readable asset name.
* **`Ticker`** *(String)*: Asset ticker value. Planner tickers are conventionally dot-prefixed in the root key.
* **`Currency`** *(String, optional for existing records)*: Three-letter currency code for the ticker, such as `USD` or `EUR`. Older records without this field continue to load and are displayed as USD by the browser tools. The DCA planner and positions page can edit this ticker-level value; the DCA planner normalizes it to uppercase.
* **`AssetType`** *(String, optional for existing records)*: One of `Stocks`, `ETF`, `Commodities`, `Crypto`, `Treasury Bonds`, `T-Bills`, `Corporate Bonds`, or `Other`. Older records without this field continue to load and are shown as `Other` by the positions UI.
* **`Div`** *(Number)*: Dividend per share for one payout cycle.
* **`Price`** *(Number)*: Stored price/mark field; it is not used to derive trade basis.
* **`Periodicity`** *(String)*: Payout interval for `Div`: `M` (monthly), `Q` (quarterly), `S` (semi-annual), `A` (annual), or `N/A` (no dividend). The first four correspond to 12, 4, 2, and 1 payouts per year. `N/A` requires `Div` to be zero; dividend projections are displayed as `N/A`.
* **`Qty`** *(Number)*: Nonnegative magnitude of the aggregate open position. `Positions[0].Direction` determines its side.
* **`NextExDate`** *(String)*: Next ex-dividend date. The positions page displays valid compact dates in `YYYYMMDD` format; other formats are currently hidden.

### Complex Layout Components
* **`Positions`** *(Array of Objects)*: Derived position summary. The positions page writes one entry with `Direction` (`Long` or `Short`), open `Size`, and `AvgPrice`. For append-only executions, `AvgPrice` is the remaining FIFO basis divided by open quantity, including opening commissions for longs and net of opening commissions for shorts. It can change after a reduction and is zero when flat.

### Trade Record Formats

`Trades` is an ordered array and currently supports planner rows, legacy lot-shaped rows, and append-only real-position executions. Do not mix the two real-position formats for the same ticker unless migrating its history deliberately.

#### DCA Planner Row

Planner rows use `Strategy: "DCA_Planner"` and are conventionally stored under dot-prefixed ticker keys such as `.AAPL`. `On` is a visual inclusion toggle in the planner, not a real-position open/closed state. A planner row commonly has `Qty`, `Direction`, `DateIn`, `PriceIn`, `Commission`, `DateOut`, `PriceOut`, and `CommissionOut`.

#### Legacy Lot-Shaped Real-Position Row

Older real-position portfolios use `On`, `Direction`, `DateIn`, `PriceIn`, `Commission`, `DateOut`, `PriceOut`, and optionally `CommissionOut`. `On: true` marks an open row; `On: false` is a historical closed row. Missing legacy `CommissionOut` is treated as zero. These rows remain readable by the positions page and trade-history view.

#### Append-Only Real-Position Execution

New real-position trades append one row per executed buy or sell and never rewrite earlier executions. They are processed in `Trades` array order, which defines FIFO order:

| Field | Format and meaning |
| --- | --- |
| `Action` | Required string: `Buy` or `Sell`. |
| `Strategy` | Required string: `SniperNine`, `Daytrade`, `SwingTrade`, or `LongtimeInvestment`. |
| `Qty` | Required positive number representing the execution quantity magnitude. |
| `Date` | Required valid calendar date in `YYYY-MM-DD` format; future dates are rejected. |
| `Price` | Required nonnegative execution price per unit. |
| `Commission` | Nonnegative fee for this execution; defaults to zero if omitted by an imported row. |
| `Currency` | Optional three-letter currency code for this execution. New positions-page trades store it; legacy trades without it use the ticker currency for display. |

New execution rows do not have `On`, `Direction`, `DateIn`, `PriceIn`, `DateOut`, or `PriceOut`. Direction is inferred by processing the executions in order: a buy increases long quantity or covers a short; a sell increases short quantity or reduces a long. Reductions consume the oldest open lot first, including part of a lot or quantities spanning multiple lots. A single execution cannot reverse an open position; close it first. Do not combine new execution rows with open legacy lot-shaped rows on the same ticker.

Currency and asset type are informational metadata. The browser tools use the ticker currency for display and record each positions-page execution's currency, but do not convert currencies or adjust position, basis, dividend, or P&L calculations. Keep executions for one ticker in the same currency if their aggregate values are to be meaningful.

### Aggregates
* **`Invested`** *(Number)*: FIFO basis of the remaining open quantity. For longs, sum the acquisition cost and remaining allocated entry commission for open lots. For shorts, sum net opening sale proceeds after remaining allocated entry commissions. A sale or cover releases basis from the oldest lot(s); closing commissions affect realized P&L, not remaining basis.
* **`DivAmnt`** *(Number)*: Gross dividend amount for one payout cycle, calculated as `Qty * Div`. It is not annualized. Derive an annual projection separately as `DivAmnt * payouts per year` using `Periodicity`.

### Dividend Amount Example

For 300 shares with `Div` = `$0.12` per monthly cycle, `DivAmnt` is `$36` per cycle. The annual projection is `$432` (`$36 * 12`), but `DivAmnt` remains `$36`.

When `Periodicity` is `N/A`, set `Div` and `DivAmnt` to zero; the browser tools show dividend projections as `N/A` instead of treating them as a payout.

---

## Examples

See [`portfolio-template.json`](portfolio-template.json) for the blank DCA planner profile and complete real-position examples covering a partially reduced long, a partially covered short, and a fully closed long. The example aggregate `Qty`, `Invested`, `Positions[0].AvgPrice`, and `DivAmnt` values are consistent with the recorded trades.

---

## ⚙️ Maintenance & System Validation Constraints

1. **Valid JSON**: Separate object members and array elements with commas, but do not add a trailing comma after the final member or element. Validate edited portfolio data with a JSON parser.
2. **Trade Order**: Preserve execution order in `Trades`; the positions page processes append-only executions in array order.
3. **Boolean Values**: Legacy and DCA planner `On` fields, when present, must use JSON booleans `true` or `false`, not quoted strings. New append-only real-position rows omit `On`.
