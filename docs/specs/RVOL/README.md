## Technical Specification: Relative Volume (RVOL) Calculation
Relative Volume (RVOL) is a trading indicator that measures how current trading volume compares to the historical average volume for the same time frame. It is primarily used to identify institutional activity, breakout confirmations, and surges in market liquidity.
------------------------------

>Current working implementation in Python is located in /Users/ramon/Documents/DocsandMisc/github/projects/localbranching/Py/invesments/trader/tools/getRvol.py
or in GitHub at https://github.com/rjcastillos/Py/blob/master/invesments/trader/tools/getRvol.py
also copied to this repo at lib/python/getRvol.py


## 1. Mathematical Formulas
There are two primary methods used to calculate RVOL. The standard method compares the full daily volume against a baseline, while the intraday-adjusted method compares volume up to the current time of day.
## Method A: Standard Daily RVOL
This method compares the total volume of the current day against a simple moving average of total daily volumes over a chosen lookback period ($n$).
$$\text{RVOL}_{\text{Standard}} = \frac{\text{Volume}_{\text{Current}}}{\frac{1}{n} \sum_{i=1}^{n} \text{Volume}_{t-i}}$$ 

* RVOL > 1.0: The asset is trading on higher-than-normal volume.
* RVOL < 1.0: The asset is trading on lower-than-normal volume.

## Method B: Intraday-Adjusted RVOL (Time-of-Day RVOL)
To avoid comparing morning volume (which is historically high) to full-day historical volumes, this method compares cumulative volume up to the exact current time ($m$) against the historical average cumulative volume up to that same time ($m$) over $n$ days.
$$\text{RVOL}_{\text{Intraday}} = \frac{\text{Cumulative Volume}_{\text{Today}}(m)}{\frac{1}{n} \sum_{i=1}^{n} \text{Cumulative Volume}_{\text{Day } i}(m)}$$ 
------------------------------
## 2. Implementation in Python
This code calculates Standard Daily RVOL. It relies on vanilla Python structures, removing external dependencies so it can be deployed seamlessly across environments.

def calculate_rvol(volume_history, current_volume, period=20):
    """
    Calculates Standard Relative Volume (RVOL).
    
    :param volume_history: List of historical daily volumes (excluding today).
    :param current_volume: Float or Int representing today's current volume.
    :param period: Lookback window for historical average (default: 20).
    :return: Float representing RVOL value, or None if history is insufficient.
    """
    if len(volume_history) < period:
        return None
        
    # Take the most recent 'period' days from history
    relevant_history = volume_history[-period:]
    
    # Calculate Simple Moving Average (SMA) of historical volume
    historical_avg_volume = sum(relevant_history) / period
    
    if historical_avg_volume == 0:
        return 0.0
        
    # Calculate RVOL
    rvol = current_volume / historical_avg_volume
    return round(rvol, 2)
# --- Example Usage ---# Historical daily volume for the past 5 dayspast_volumes = [120000, 150000, 110000, 130000, 145000]today_volume = 260000
rvol_result = calculate_rvol(past_volumes, today_volume, period=5)
print(f"Current Daily RVOL: {rvol_result}") # Output will be 2.0 (Today's volume is double the average)

------------------------------
## 3. Implementation in JavaScript (ES6)
This implementation uses clean, modern array operations to process trading volumes.

/**
 * Calculates Standard Relative Volume (RVOL).
 * 
 * @param {Array<number>} volumeHistory - Array of historical daily volumes.
 * @param {number} currentVolume - Today's current cumulative volume.
 * @param {number} period - Lookback window for historical baseline (default: 20).
 * @returns {number|null} Relative Volume ratio, or null if insufficient history.
 */function calculateRVOL(volumeHistory, currentVolume, period = 20) {
    if (volumeHistory.length < period) {
        return null;
    }

    # Slice the last 'n' periods from historical data
    const relevantHistory = volumeHistory.slice(-period);
    
    # Calculate average historical volume
    const sumHistory = relevantHistory.reduce((acc, vol) => acc + vol, 0);
    const historicalAvgVolume = sumHistory / period;

    if (historicalAvgVolume === 0) {
        return 0.0;
    }

    # Calculate RVOL ratio
    const rvol = currentVolume / historicalAvgVolume;
    return parseFloat(rvol.toFixed(2));
}
// --- Example Usage ---const historicalVolumeData =;const currentVolumeToday = 750000;
const rvolValue = calculateRVOL(historicalVolumeData, currentVolumeToday, 5);
console.log(`Current Daily RVOL: ${rvolValue}`);// Output: 1.5


