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
* **`Periodicity`** *(String)*: Operational key identifying distribution interval cycles. 
  * Valid inputs: `"M"` (Monthly), `"Q"` (Quarterly), `"S"` (Semi-Annual), `"A"` (Annual).
* **`Qty`** *(Float)*: Absolute aggregate current share volume inventory holding count across positions.
* **`NextExDate`** *(String)*: Imminent system Ex-Dividend date calendar deadline tracking marker (`YYYYMMDD`).

### Complex Layout Components
* **`Positions`** *(Array of Objects)*: Structural block aggregating position details.
  * **`Direction`** *(String)*: Market path bias orientation parameter (e.g., `"Long"`).
  * **`Size`** *(Float)*: Collective active shared balance size volume matching entry level state.
  * **`AvgPrice`** *(Float)*: Historical weighted absolute entry cost calculation average layer benchmark price.
* **`Trades`** *(Array of Objects)*: Sequential layer data containing historical or simulated cost-reduction tranches.
  * **`On`** *(Boolean)*: System logical switch parameter flag (`true` / `false`) mapping calculation impacts.
  * **`Strategy`** *(String)*: System algorithmic designation strategy or tag trace note parameter text string.
  * **`Qty`** *(Float/String)*: Layer shared volume purchase amount sizing for the specific trade block.
  * **`Direction`** *(String)*: Transaction path positioning type definition setting indicator.
  * **`DateIn`** *(String)*: Entry execution transaction calendar layout datetime snapshot reference timestamp.
  * **`PriceIn`** *(Float/String)*: Purchase price target metrics matching the original entry layout state.
  * **`Commission`** *(Float)*: Execution overhead cost allocation price matching broker parameters.
  * **`DateOut` / `PriceOut`**: Historical close path variables for managing full trade lifecycles.

### Aggregates
* **`Invested`** *(Float)*: Gross cumulative net monetary currency cash liquidity value deployed to asset holdings.
* **`DivAmnt`** *(Float)*: Gross annual profile dividend layout passive cash generation total projections.

---

## 📋 Blank Structural Profile Template

Use this blueprint profile object schema setup parameters layer when appending new stock assets into the file registry structure layout frame manually:

```json
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
        "PriceOut": 0.00
      }
    ],
    "Invested": 0.00,
    "DivAmnt": 0.00
  }
```

---

## ⚙️ Maintenance & System Validation Constraints

1. **JSON Object Separators**: When inserting multiple ticker entries, a trailing comma **must** follow the closing curly brace (`}`) of the preceding ticker entry node block object.
2. **Sequential Array Nesting**: Individual trades logged inside the `Trades` brackets array line map framework `[ ... ]` must be organized sequentially and separated with commas.
3. **Boolean Syntax Requirements**: The layout parameter tracking element flag field `"On"` requires native JSON runtime system literal notations typed in exact lowercase (`true` or `false`) without quote marks.
