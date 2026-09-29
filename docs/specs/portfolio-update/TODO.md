# Portfolio Update TODO

Items intentionally deferred from the first positions-page release:

- [ ] **Move and distance calculations:** Decide whether to expose the Go libraries through WebAssembly or implement equivalent browser formulas with parity tests. Until then, these controls are not available in the UI.
- [ ] **Charts:** Add distance and move visualizations after the calculations and time-series inputs are defined.
- [ ] **Richer ticker history:** Add search, filtering, and export for closed lots; the current page only lists closed-lot records and realized P&L.
- [ ] **Legacy planner migration:** Provide a previewable migration for `DCA_Planner` trades stored under non-dot-prefixed tickers. The positions page currently blocks real-trade edits for those tickers rather than guessing whether the rows are real or planned.
- [ ] **Browser workflow automation:** Add repeatable browser tests for import/export, ticker switching, DCA planner persistence, and position open/close flows.

The first release includes long and short opens, lot-selected partial/full closes, commission allocation, position summaries, realized P&L, close-now estimates, and the DCA planner filtering rules in the feature spec.