## Technical Specification: Average True Range (ATR) Calculation
The Average True Range (ATR) is a technical analysis indicator that measures market volatility by decomposing the entire range of an asset price for a given period. It was introduced by J. Welles Wilder Jr. in his 1978 book, New Concepts in Technical Trading Systems.
------------------------------

>Current working implementation in Python is located in /Users/ramon/Documents/DocsandMisc/github/projects/localbranching/Py/invesments/trader/tools/getAtr.py
or in GitHub at https://github.com/rjcastillos/Py/blob/master/invesments/trader/tools/getAtr.py
also copied to this repo at lib/python/getAtr.py
                

## 1. Mathematical Formulas
The ATR calculation consists of two primary steps: calculating the True Range (TR) for each period, and then calculating a smoothed moving average of those TR values over a specified lookback period ($n$).
## Step 1: True Range (TR)
The True Range is the greatest of the following three values:

   1. HLD - Current High minus Current Low
   2. Absolute value of Current High minus Previous Close
   3. Absolute value of Current Low minus Previous Close

$$\text{TR}_t = \max \left( (H_t - L_t), \vert{}H_t - C_{t-1}\vert{}, \vert{}L_t - C_{t-1}\vert{} \right)$$ 
Where:

* 
* $H_t$: High price of the current period
* $L_t$: Low price of the current period
* $C_{t-1}$: Close price of the previous period
* 

## Step 2: Average True Range (ATR)
The initial ATR value for the first $n$ periods is typically calculated as a simple arithmetic mean of the TR values:
$$\text{ATR}_n = \frac{1}{n} \sum_{i=1}^{n} \text{TR}_i$$ 
Subsequent ATR values are smoothed using Wilder’s smoothing technique (equivalent to a modified Exponential Moving Average):
$$\text{ATR}_t = \frac{\text{ATR}_{t-1} \times (n - 1) + \text{TR}_t}{n}$$ 
------------------------------
## 2. Implementation in Python
This implementation uses standard lists of dictionaries to avoid external library dependencies (like pandas or numpy), making it universally applicable.

def calculate_atr(data, period=14):
    """
    Calculates the Average True Range (ATR).
    
    :param data: List of dicts containing 'high', 'low', and 'close' prices.
    :param period: The lookback period (default: 14).
    :return: List of ATR values corresponding to the input data indices.
    """
    if len(data) < period:
        return [None] * len(data)
        
    tr_values = []
    atr_values = [None] * len(data)
    
    # Step 1: Calculate True Range (TR) for all periods
    for i in range(len(data)):
        if i == 0:
            # First element has no previous close
            tr = data[i]['high'] - data[i]['low']
        else:
            prev_close = data[i-1]['close']
            tr1 = data[i]['high'] - data[i]['low']
            tr2 = abs(data[i]['high'] - prev_close)
            tr3 = abs(data[i]['low'] - prev_close)
            tr = max(tr1, tr2, tr3)
        tr_values.append(tr)
        
    # Step 2: Calculate Initial ATR (Simple Moving Average of TR)
    initial_atr = sum(tr_values[:period]) / period
    atr_values[period - 1] = initial_atr
    
    # Step 3: Calculate Wilder's Smoothed ATR for subsequent periods
    for i in range(period, len(data)):
        prev_atr = atr_values[i - 1]
        current_tr = tr_values[i]
        atr_values[i] = ((prev_atr * (period - 1)) + current_tr) / period
        
    return atr_values
# --- Example Usage ---sample_prices = [
    {"high": 50, "low": 45, "close": 48},
    {"high": 52, "low": 47, "close": 51},
    {"high": 53, "low": 49, "close": 50},
    {"high": 55, "low": 51, "close": 54},
    {"high": 56, "low": 52, "close": 53}
]
# Calculate with a period of 3 for demo purposes
print("ATR Values:", calculate_atr(sample_prices, period=3))

------------------------------
## 3. Implementation in JavaScript (ES6)
This functional approach processes data arrays cleanly using native arrays.

/**
 * Calculates the Average True Range (ATR).
 * 
 * @param {Array<Object>} data - Array of objects containing high, low, and close.
 * @param {number} period - The lookback window (default: 14).
 * @returns {Array<number|null>} Array of ATR values matching the input index mapping.
 */function calculateATR(data, period = 14) {
    if (data.length < period) {
        return new Array(data.length).fill(null);
    }

    const trValues = [];
    const atrValues = new Array(data.length).fill(null);

    // Step 1: Calculate True Range (TR)
    for (let i = 0; i < data.length; i++) {
        if (i === 0) {
            trValues.push(data[i].high - data[i].low);
        } else {
            const prevClose = data[i - 1].close;
            const tr1 = data[i].high - data[i].low;
            const tr2 = Math.abs(data[i].high - prevClose);
            const tr3 = Math.abs(data[i].low - prevClose);
            trValues.push(Math.max(tr1, tr2, tr3));
        }
    }

    // Step 2: Calculate first ATR instance
    let sumTR = 0;
    for (let i = 0; i < period; i++) {
        sumTR += trValues[i];
    }
    let currentATR = sumTR / period;
    atrValues[period - 1] = currentATR;

    // Step 3: Wilder's smoothing algorithm
    for (let i = period; i < data.length; i++) {
        currentATR = ((currentATR * (period - 1)) + trValues[i]) / period;
        atrValues[i] = currentATR;
    }

    return atrValues;
}
// --- Example Usage ---const marketData = [
    { high: 105, low: 100, close: 102 },
    { high: 108, low: 103, close: 107 },
    { high: 110, low: 106, close: 109 },
    { high: 112, low: 108, close: 111 },
    { high: 115, low: 110, close: 113 }
];

console.log("ATR Results:", calculateATR(marketData, 3));


## Key Applications for Day Trading & Investing

* Stop-Loss Placement: Day traders typically use a multiple of the ATR (e.g., 1.5x or 2x ATR) to set trailing stop-losses. This ensures that normal market noise doesn't prematurely trigger an exit. Based on the current ATR, a 1.5x stop-loss requires a room of about $14.50 from your entry.
* Intraday Profit Targets: With a daily expected movement of around $10.00, setting a single-session profit target much wider than this value requires an unusual, catalyst-driven breakout. [5] 
* Position Sizing: High ATR values mean higher volatility. When the ATR expands, traders typically scale down their total share size to keep their dollar risk constant across trades.
