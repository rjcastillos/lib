# Technical Specification: Calculating Swing Lows



Draft version 0.1
Date: 2026-11-24
Still not challenged nor review 

## 1. Purpose

Define a deterministic method for identifying **confirmed swing lows** from an asset’s OHLCV bar series. The method is asset-agnostic and applies to equities, futures, FX, crypto, and other instruments with valid bar data.

A swing low is a local price pivot under a specified lookback rule. It is a **descriptive technical-analysis feature**, not by itself a prediction or trade signal.

## 2. Inputs

- **Bars:** Chronologically ordered OHLCV records with at least `timestamp` and `low`.
- **Interval:** The bar timeframe, such as 5-minute, 1-hour, or daily.
- **Lookback `L`:** A positive integer specifying the number of bars required on each side of a candidate pivot.
- **Session policy:** Whether the series includes regular-session bars only or also extended/overnight trading, as applicable.
- **Tie policy:** The rule used when neighboring bars have equal lows.

The interval, lookback, session policy, and tie policy must be recorded with each result.

## 3. Pivot definition

For a candidate bar at index `i`, with low price `low[i]`, classify it as a **confirmed swing low** when:

```text
low[i] < low[j] for every j in [i - L, i - 1] and [i + 1, i + L]
```

In other words, the candidate bar’s low must be strictly lower than the lows of the `L` bars immediately before and after it.

## 4. Confirmation and timestamp

A candidate at index `i` cannot be confirmed until all `L` bars to its right have closed and their data is available.

- **Pivot timestamp:** The timestamp of bar `i`.
- **Confirmation timestamp:** The close time of bar `i + L`.
- **Confirmation delay:** `L` bars after the pivot bar.

Do not report an unconfirmed candidate at the end of the series as a confirmed swing low.

## 5. Tie handling

The default rule uses strict inequality, so equal lows disqualify a candidate.

If equal-low plateaus should qualify, choose and document a deterministic alternative. For example:

- Treat an equal-low plateau as one pivot.
- Select the **earliest** bar in the plateau.
- Require all lows in the `L`-bar windows outside that plateau to be higher.

Use the same policy consistently across the series; do not switch policies to select a preferred pivot.

## 6. Reference pseudocode

```text
function confirmed_swing_lows(bars, L):
    require L >= 1
    results = []

    for i from L to length(bars) - L - 1:
        candidate = bars[i].low
        is_swing_low = true

        for j from i - L to i - 1:
            if bars[j].low <= candidate:
                is_swing_low = false
                break

        if is_swing_low:
            for j from i + 1 to i + L:
                if bars[j].low <= candidate:
                    is_swing_low = false
                    break

        if is_swing_low:
            results.append({
                pivot_timestamp: bars[i].timestamp,
                pivot_low: candidate,
                confirmation_timestamp: close_time(bars[i + L]),
                lookback_bars: L
            })

    return results
```

This pseudocode implements the default strict-tie policy. `close_time` must follow the data source’s timestamp convention and the selected bar interval.

## 7. Data validation and edge cases

- **Insufficient history:** The first `L` bars and last `L` bars cannot be evaluated by this rule. Do not treat missing neighboring bars as confirmation.
- **Missing or invalid bars:** Reject or flag records with missing timestamps or invalid lows. Do not silently fill gaps with invented values.
- **Ordering and duplicates:** Sort by timestamp and apply a documented policy for duplicate timestamps before calculation.
- **Session gaps:** Preserve the chosen session policy. A gap between sessions is not itself a bar and must not be counted as one.
- **Price adjustments:** For instruments subject to splits or other corporate actions, use a consistent adjusted or unadjusted series and record which was used.
- **Later lows:** A lower low in a later window may form a newer swing low; it does not change the rule used to evaluate the earlier pivot.

## 8. Parameter selection and reporting

`L` controls the scale of the pivots: a larger value generally identifies fewer, broader swings, while a smaller value detects more local turns. The same `L` on different intervals represents different elapsed time. Choose it based on the intended analysis horizon; there is no single universally correct setting.

For reproducibility, report each result with:

| Field | Description |
|---|---|
| Asset | Instrument identifier |
| Pivot low | Low price of the candidate bar |
| Pivot timestamp | Time of the pivot bar |
| Confirmation timestamp | Time the pivot became confirmable |
| Interval | Bar timeframe |
| Lookback `L` | Bars required on each side |
| Session policy | Included trading sessions |
| Tie policy | Strict or specified plateau rule |
| Data source | Source and adjustment convention, if applicable |

## 9. Interpretation

A confirmed swing low is a local pivot under the chosen parameters. It may serve as a reference for market-structure analysis, but it does not guarantee that price will hold there or reverse.