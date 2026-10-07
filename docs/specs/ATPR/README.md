# Functional Specifications: Percentage Average True Range (ATRP) Implementation Workflow

This document establishes the mathematical foundations, core logic, and production-ready code modules required to implement the Percentage Average True Range (ATRP) volatility metric within programmatic trading agents and automated LLM workflows.

---

## 1. Core Mathematical Model

The Percentage Average True Range (ATRP) standardizes structural asset price volatility by normalizing the traditional absolute Average True Range (ATR) as a relative percentage of an asset's current market value. This enables universal volatility comparisons across assets of vastly different price scales (e.g., a \$20 penny stock vs. a \$500 mega-cap stock).

### Step 1: True Range (TR)
For any given trading period \(t\), the True Range is the maximum absolute structural distance calculated across three distinct dimensions:
\[TR_t = \max \left( (High_t - Low_t), \, \vert{}High_t - Close_{t-1}\vert{}, \, \vert{}Low_t - Close_{t-1}\vert{} \right)\]

### Step 2: Absolute Average True Range (ATR)
The baseline ATR uses Wilder’s Moving Average smoothing technique over a specified lookback window \(n\) (standardly \(n = 14\)). 

*   **Initial Baseline Value (at \(t = n\)):**
    \[ATR_n = \frac{1}{n} \sum_{i=1}^{n} TR_i\]
*   **Subsequent Smoothed Values (at \(t > n\)):**
    \[ATR_t = \frac{(ATR_{t-1} \times (n - 1)) + TR_t}{n}\]

### Step 3: Percentage ATR Normalization (ATRP)
The scalar absolute value is converted into a universal percentage value relative to the asset's execution close price (\(Close_t\)):
\[ATRP_t = \left( \frac{ATR_t}{Close_t} \right) \times 100\]

---

## 2. Dynamic Risk Management Framework

By converting volatility to a percentage factor, risk engines can map automated stop-losses and trailing bounds uniformly based on standard multi-day profiles:

*   **Intraday Scalping Bound:** \(1.0 \times ATRP\) (Tight noise filter)
*   **Swing Trading Bound:** \(2.0 \times ATRP\) (Standard structural breathing room)
*   **Macro Position/Trend Bound:** \(3.0 \times ATRP\) (Strategic macro invalidation boundary)

---

## 3. Production References & Source Code

### Python Core (Pandas / NumPy Stack)
Engineered for quantitative backtesting data pipelines and asynchronous data science workflows.

```python
import numpy as np
import pandas as pd


def calculate_atrp(df: pd.DataFrame, period: int = 14) -> pd.DataFrame:
    """Calculates the Percentage Average True Range (ATRP) using Wilder's Smoothing.

    Parameters:
    df (pd.DataFrame): Input matrix containing 'High', 'Low', and 'Close'
    series.
    period (int): Smoothing lookback window size (n). Standard default is 14.

    Returns:
    pd.DataFrame: Original DataFrame populated with 'ATR' and 'ATRP' target
    metrics.
    """
    # Ensure working copy to prevent mutation warnings
    working_df = df.copy()

    # 1. Map absolute True Range boundaries
    high_low = working_df["High"] - working_df["Low"]
    high_prev_close = np.abs(working_df["High"] - working_df["Close"].shift(1))
    low_prev_close = np.abs(working_df["Low"] - working_df["Close"].shift(1))

    working_df["TR"] = np.max(
        np.column_stack((high_low, high_prev_close, low_prev_close)), axis=1
    )

    # 2. Compute Wilder's Smoothed Average Array
    atr = np.zeros(len(working_df))
    tr_array = working_df["TR"].values

    # Seed the first absolute value with a simple mean
    first_atr = np.mean(tr_array[1 : period + 1])
    atr[period] = first_atr

    # Smooth the remaining data arrays
    for i in range(period + 1, len(working_df)):
        atr[i] = (atr[i - 1] * (period - 1) + tr_array[i]) / period

    working_df["ATR"] = atr

    # 3. Calculate target ATRP percentage
    working_df["ATRP"] = (working_df["ATR"] / working_df["Close"]) * 100

    # Clean intermediate calculation fields
    working_df.drop(columns=["TR"], inplace=True)
    return working_df


# --- Verification Execution Block ---
if __name__ == "__main__":
    mock_market_data = {
        "High": [
            210,
            212,
            211,
            213,
            215,
            214,
            216,
            215,
            217,
            218,
            220,
            219,
            221,
            222,
            235,
        ],
        "Low": [
            205,
            206,
            207,
            208,
            209,
            210,
            211,
            212,
            211,
            213,
            214,
            215,
            216,
            217,
            218,
        ],
        "Close": [
            208,
            210,
            209,
            211,
            212,
            213,
            215,
            213,
            216,
            215,
            218,
            217,
            220,
            219,
            230,
        ],
    }

    df_test = pd.DataFrame(mock_market_data)
    results = calculate_atrp(df_test, period=5)
    latest_tick = results.iloc[-1]

    print(f"--- Python Verification Result ---")
    print(f"Close Price  : \${latest_tick['Close']:.2f}")
    print(f"Absolute ATR : \${latest_tick['ATR']:.2f}")
    print(f"Calculated % : {latest_tick['ATRP']:.2f}%")
```

### JavaScript Core (ES6 Vanilla Environment)
Optimized for real-time WebSocket ingestion feeds, Edge execution functions, and high-frequency Node.js runtimes without external dependency overhead.

```javascript
/**
 * Calculates Percentage Average True Range (ATRP) via Vanilla JavaScript loop arrays.
 * @param {Array<Object>} historicalData - Complete sequence array of objects: { high, low, close }
 * @param {number} period - Window length for the smoothing filter (n). Standard default is 14.
 * @returns {Array<Object>} Mutated source data sequence containing appended 'atr' and 'atrp' properties.
 */
function calculateATRP(historicalData, period = 14) {
    if (historicalData.length <= period) return historicalData;

    // 1. Process isolated True Range historical values starting at index 1
    const trueRangeValues =; 
    for (let i = 1; i < historicalData.length; i++) {
        const highLowDiff = historicalData[i].high - historicalData[i].low;
        const highCloseDiff = Math.abs(historicalData[i].high - historicalData[i - 1].close);
        const lowCloseDiff = Math.abs(historicalData[i].low - historicalData[i - 1].close);
        trueRangeValues.push(Math.max(highLowDiff, highCloseDiff, lowCloseDiff));
    }

    // 2. Establish basic scalar mean seed for baseline ATR positioning
    let absoluteATR = 0;
    let initialSum = 0;
    for (let i = 1; i <= period; i++) {
        initialSum += trueRangeValues[i];
    }
    absoluteATR = initialSum / period;
    
    historicalData[period].atr = absoluteATR;
    historicalData[period].atrp = (absoluteATR / historicalData[period].close) * 100;

    // 3. Smooth tracking arrays via Wilder's formula constraints
    for (let i = period + 1; i < historicalData.length; i++) {
        absoluteATR = ((absoluteATR * (period - 1)) + trueRangeValues[i]) / period;
        historicalData[i].atr = absoluteATR;
        historicalData[i].atrp = (absoluteATR / historicalData[i].close) * 100;
    }

    return historicalData;
}

// --- Verification Execution Block ---
const dataFeed = [
    { high: 210, low: 205, close: 208 },
    { high: 212, low: 206, close: 210 },
    { high: 211, low: 207, close: 209 },
    { high: 213, low: 208, close: 211 },
    { high: 215, low: 209, close: 212 },
    { high: 214, low: 210, close: 213 },
    { high: 216, low: 211, close: 215 },
    { high: 215, low: 212, close: 213 },
    { high: 217, low: 211, close: 216 },
    { high: 218, low: 213, close: 215 },
    { high: 220, low: 214, close: 218 },
    { high: 219, low: 215, close: 217 },
    { high: 221, low: 216, close: 220 },
    { high: 222, low: 217, close: 219 },
    { high: 235, low: 218, close: 230 }
];

const computationResult = calculateATRP(dataFeed, 5);
const currentTick = computationResult[computationResult.length - 1];

console.log("--- JavaScript Verification Result ---");
console.log(`Close Price  : $${currentTick.close.toFixed(2)}`);
console.log(`Absolute ATR : $${currentTick.atr.toFixed(2)}`);
console.log(`Calculated % : ${currentTick.atrp.toFixed(2)}%`);
```
