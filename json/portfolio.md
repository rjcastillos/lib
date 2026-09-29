# Portfolio JSON Database Schema Documentation

This document defines the local database schema, key definitions, and operational constraints for managing the `portfolio.json` configuration ledger file.

---

## 📁 JSON Data Structure Overview

The root JSON object functions as a key-value dictionary. Each primary key represents a distinct stock ticker symbol, holding an object that contains metadata parameters, core positions, a transaction array, and active financial summaries.

---

## 🔑 Data Definition Dictionary

### Meta Parameter Metrics
* **`name`** *(String)*: Full commercial or corporate asset descriptor name (e.g., `"Pfizer Inc. (PFE)"`).
* **`Ticker`** *(String)*: Capitalized asset ticker benchmark identifier (e.g., `"PFE"`).
* **`Div`** *(Float)*: Dividend distribution layout pay rate per share for the assigned single cycle period.
* **`Price`** *(Float)*: Base market evaluation asset price value or targeted evaluation layer tracking mark.
* **`Periodicity`** *(String)*: Distribution interval for `Div`.
  * Valid inputs: `"M"` (Monthly), `"Q"` (Quarterly), `"S"` (Semi-Annual), `"A"` (Annual).
  * Payouts per year: `M` = 12, `Q` = 4, `S` = 2, `A` = 1.
* **`Qty`** *(Float)*: Nonnegative magnitude of the aggregate open position. `Positions[0].Direction` identifies long versus short.
* **`NextExDate`** *(String)*: Imminent system Ex-Dividend date calendar deadline tracking marker (`YYYYMMDD`).

### Complex Layout Components
* **`Positions`** *(Array of Objects)*: Structural block aggregating position details.
  * **`Direction`** *(String)*: Market path bias orientation parameter (e.g., `"Long"`).
  * **`Size`** *(Float)*: Collective active shared balance size volume matching entry level state.
  * **`AvgPrice`** *(Float)*: Direction-adjusted weighted entry basis per open unit, including allocated entry commissions. For longs it is entry cost per unit; for shorts it is net opening proceeds per unit after commission.
* **`Trades`** *(Array of Objects)*: Sequential layer data containing historical or simulated cost-reduction tranches.
  * **`On`** *(Boolean)*: System logical switch parameter flag (`true` / `false`) mapping calculation impacts.
  * **`Strategy`** *(String)*: System algorithmic designation strategy or tag trace note parameter text string.
  * **`Qty`** *(Float)*: Positive quantity magnitude for the entry lot or closed portion.
  * **`Direction`** *(String)*: Position side for the entry lot: `"Long"` or `"Short"`.
  * **`DateIn`** *(String)*: Date of the opening execution.
  * **`PriceIn`** *(Float)*: Entry execution price per unit; it is the buy price for a long and the sale price for a short.
  * **`Commission`** *(Float)*: Entry execution commission allocated to this lot quantity.
  * **`DateOut` / `PriceOut`**: Closing execution date and price per unit. Required for a fully or partially closed record (`On: false`); blank/zero while open.
  * **`CommissionOut`** *(Float)*: Closing execution commission allocated to this closed quantity. It is a cost in realized P&L and is zero while open. Treat it as zero when absent from legacy records.

### Aggregates
* **`Invested`** *(Float)*: Basis for the open quantity. For longs, sum of entry cost plus allocated entry commission. For shorts, net opening sale proceeds after allocated entry commission. Closing fees affect realized P&L, not the remaining open basis.
* **`DivAmnt`** *(Float)*: Gross dividend amount per payout cycle for the current quantity, calculated as `Qty * Div`. It is not annualized. Derive an annual projection separately as `DivAmnt * payouts per year` using `Periodicity`.

### Dividend Amount Example

For 300 shares with `Div` = `$0.12` per monthly cycle, `DivAmnt` is `$36` per cycle. The annual projection is `$432` (`$36 * 12`), but `DivAmnt` remains `$36`.

---

## 📋 Blank Structural Profile Template

Use this blueprint profile object schema setup parameters layer when appending new stock assets into the file registry structure layout frame manually:

```json
{
  "TICKER": {
    "name": "Company Name Inc. (TICKER)",
    "Ticker": "TICKER",
    "Div": 0.00,
    "Price": 0.00,
    "Periodicity": "M",
    "Qty": 0,
    "NextExDate": "",
    "Positions": [
      {
        "Direction": "Long",
        "Size": 0.0,
        "AvgPrice": 0.00
      }
    ],
    "Trades": [
      {
        "On": true,
        "Strategy": "DCA_Planner",
        "Qty": 0.0,
        "Direction": "Long",
        "DateIn": "",
        "PriceIn": 0.00,
        "Commission": 0.00,
        "DateOut": "",
        "PriceOut": 0.00,
        "CommissionOut": 0.00
      }
    ],
    "Invested": 0.00,
    "DivAmnt": 0.00
  }
}
```

---

## ⚙️ Maintenance & System Validation Constraints

1. **JSON Object Separators**: When inserting multiple ticker entries, a trailing comma **must** follow the closing curly brace (`}`) of the preceding ticker entry node block object.
2. **Sequential Array Nesting**: Individual trades logged inside the `Trades` brackets array line map framework `[ ... ]` must be organized sequentially and separated with commas.
3. **Boolean Syntax Requirements**: The layout parameter tracking element flag field `"On"` requires native JSON runtime system literal notations typed in exact lowercase (`true` or `false`) without quote marks.
