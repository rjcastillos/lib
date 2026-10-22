# Technical Specification: Simple Moving Average (SMA) Calculation

This document outlines the technical specification and formulaic rules for implementing a Simple Moving Average (SMA), focusing on a 20-period window (SMA20) typically used for short-to-medium-term trend identification.

---

## 1. Mathematical Formula

The Simple Moving Average is calculated by summing the closing prices of an asset over a defined number of periods (\(n\)) and dividing that sum by \(n\).

\[\text{SMA} = \frac{P_1 + P_2 + \dots + P_n}{n} = \frac{\sum_{i=1}^{n} P_i}{n}\]

Where:
* **\(P_i\)** = The closing price of the asset at period \(i\).
* **\(n\)** = The total number of periods in the moving window (for SMA20, \(n = 20\)).

---

## 2. Calculation Rules & Edge Cases

* **Data Prerequisite:** A calculation requires a minimum of \(n\) historical data points. For an SMA20, the indicator cannot generate a valid output until the **20th period** closes.
* **Rolling Window Mechanic:** As a new period closes (\(P_{t+1}\)), the oldest price point (\(P_{t-n+1}\)) is dropped from the calculation pool to maintain a strict window size of \(n\).
* **Handling Nulls:** If a dataset has fewer than \(n\) elements, the SMA output must return `Null`, `NaN`, or `None`.

---

## 3. Step-by-Step Example (SMA20)

To calculate the SMA20 for Day 20, look back at the most recent 20 closing prices (Days 1 through 20).

### Data Input Table

| Period | Close (\$) | SMA20 (\$) | Calculation Notes |
| :--- | :--- | :--- | :--- |
| **Day 1** | 100.00 | *NaN* | Insufficient historical data (\(t < 20\)) |
| **Days 2–19**| *Various*| *NaN* | Accumulating period data points |
| **Day 20**| 105.50 | **102.45**| First calculation: \(\frac{\sum(\text{Day 1 to 20})}{20}\) |
| **Day 21**| 106.20 | **102.76**| Second calculation: \(\frac{\sum(\text{Day 2 to 21})}{20}\) |

### Example Walkthrough

#### Step 1: Calculate Day 20 SMA
* **Sum of Closing Prices (Days 1–20):** \$2,049.00
* **Divide by Window (\(n=20\)):** 
  \[\text{SMA20}_{\text{Day 20}} = \frac{2049.00}{20} = 102.45\]

#### Step 2: Calculate Day 21 SMA (The Rolling Concept)
* **Drop Day 1 Close:** -\$100.00
* **Add Day 21 Close:** +\$106.20
* **New Sum (Days 2–21):** \(2,049.00 - 100.00 + 106.20 = 2,055.20\)
* **Divide by Window (\(n=20\)):**
  \[\text{SMA20}_{\text{Day 21}} = \frac{2055.20}{20} = 102.76\]

---

## 4. Pseudo-Code Implementation

```python
def calculate_sma(prices: list, window: int = 20) -> list:
    """
    Calculates the Simple Moving Average for a list of prices.
    
    :param prices: List of float values representing closing prices.
    :param window: The moving window size (default 20).
    :return: A list of SMA values (padded with None for early periods).
    """
    sma_values = []
    for i in range(len(prices)):
        if i < window - 1:
            sma_values.append(None)  # Not enough data points yet
        else:
            window_sum = sum(prices[i - window + 1 : i + 1])
            sma_values.append(round(window_sum / window, 4))
    return sma_values
```
