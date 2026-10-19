# Technical Specification: Exponential Moving Average (EMA) Calculation

This document outlines the technical specification, algorithmic rules, and smoothing mechanics for implementing an Exponential Moving Average (EMA), focusing on a 9-period window (EMA9) typically used for short-term momentum and trigger signals.

---

## 1. Mathematical Formula

The Exponential Moving Average applies a weighting factor (smoothing multiplier) to the most recent price. The formula is recursive:

\[\text{EMA}_t = \left( P_t \times \alpha \right) + \left( \text{EMA}_{t-1} \times (1 - \alpha) \right)\]

Where:
* **\(\text{EMA}_t\)** = The Exponential Moving Average value for the current period.
* **\(P_t\)** = The closing price for the current period.
* **\(\text{EMA}_{t-1}\)** = The Exponential Moving Average value from the previous period.
* **\(\alpha\)** = The smoothing multiplier, calculated using the period window (\(n\)):
  \[\alpha = \frac{2}{n + 1}\]

### Multiplier for EMA9
For a 9-period window (\(n = 9\)), the smoothing multiplier is:
\[\alpha = \frac{2}{9 + 1} = \frac{2}{10} = 0.2 \quad (20\%)\]

---

## 2. Calculation Rules & Edge Cases

* **The Seed Value (Initial EMA):** Because the formula requires a previous EMA value (\(\text{EMA}_{t-1}\)), you must seed the calculation. The standard industry practice is to use the **Simple Moving Average (SMA)** of the first \(n\) periods as the first EMA data point.
* **Data Prerequisite:** A calculation requires a minimum of \(n\) historical data points to establish the seed. For an EMA9, the first value is generated on the close of the **9th period**.
* **Memory Depth:** Because every new calculation embeds the previous one, the accuracy of the current EMA increases as the length of the historical dataset grows.

---

## 3. Step-by-Step Example (EMA9)

To calculate an EMA9, first calculate the multiplier (\(\alpha = 0.2\)), seed the 9th day with an SMA9, and use the recursive formula moving forward.

### Data Input Table

| Period | Close (\$) | EMA9 (\$) | Calculation Notes |
| :--- | :--- | :--- | :--- |
| **Days 1–8** | *Various* | *NaN* | Insufficient data to form seed value |
| **Day 9** | 54.00 | **51.20** | **Seed Value:** SMA of Days 1 to 9 |
| **Day 10** | 56.50 | **52.26** | First true EMA calculation |
| **Day 11** | 55.00 | **52.81** | Second true EMA calculation |

### Example Walkthrough

#### Step 1: Calculate the Day 9 Seed (SMA)
* **Sum of Closing Prices (Days 1–9):** \$460.80
* **Initial Seed (\(\text{EMA}_9\)):** 
  \[\text{EMA}_9 = \frac{460.80}{9} = 51.20\]

#### Step 2: Calculate Day 10 EMA
* **Inputs:** \(P_{10} = 56.50\), \(\text{EMA}_9 = 51.20\), \(\alpha = 0.2\)
* **Formula application:**
  \[\text{EMA}_{10} = (56.50 \times 0.2) + (51.20 \times 0.8)\]
  \[\text{EMA}_{10} = 11.30 + 40.96 = 52.26\]

#### Step 3: Calculate Day 11 EMA
* **Inputs:** \(P_{11} = 55.00\), \(\text{EMA}_{10} = 52.26\), \(\alpha = 0.2\)
* **Formula application:**
  \[\text{EMA}_{11} = (55.00 \times 0.2) + (52.26 \times 0.8)\]
  \[\text{EMA}_{11} = 11.00 + 41.808 = 52.808 \rightarrow 52.81\]

---

## 4. Pseudo-Code Implementation

```python
def calculate_ema(prices: list, window: int = 9) -> list:
    """
    Calculates the Exponential Moving Average for a list of prices.
    
    :param prices: List of float values representing closing prices.
    :param window: The moving window size (default 9).
    :return: A list of EMA values (padded with None for early periods).
    """
    if len(prices) < window:
        return [None] * len(prices)
        
    ema_values = [None] * (window - 1)
    alpha = 2 / (window + 1)
    
    # Step 1: Seed the first value using a Simple Moving Average (SMA)
    seed_sma = sum(prices[:window]) / window
    ema_values.append(round(seed_sma, 4))
    
    # Step 2: Run the recursive EMA formula for remaining periods
    current_ema = seed_sma
    for price in prices[window:]:
        current_ema = (price * alpha) + (current_ema * (1 - alpha))
        ema_values.append(round(current_ema, 4))
        
    return list(ema_values)
```
