    Bullish candle: C > O
    Bearish candle: C < O
    Neutral Doji: C = O
    Neutral flat: H = L

#Pseudocode

```text
IF H == L THEN
    CLASSIFY AS flat_neutral_candle
ELSE IF C == O THEN
    CLASSIFY AS doji_neutral_candle
ELSE IF C > O THEN
    CLASSIFY AS bullish_candle
ELSE
    CLASSIFY AS bearish_candle
END IF
```

## Functions

🐍 Python 
 
python
def classify_candle(O: float, H: float, L: float, C: float) -> str:
    """
    Classifies a candlestick based on OHLC prices.
    O = Open, H = High, L = Low, C = Close
    """
    if H == L:
        return "flat_neutral_candle"
    elif C == O:
        return "doji_neutral_candle"
    elif C > O:
        return "bullish_candle"
    else:
        return "bearish_candle"
Use code with caution.
 
🌲 Pine Script (v6)
 
pinescript
//@version=6
// O = Open, H = High, L = Low, C = Close
 
// Define the classification function
classify_candle(float o, float h, float l, float c) =>
    string classification = na
    if h == l
        classification := "flat_neutral_candle"
    else if c == o
        classification := "doji_neutral_candle"
    else if c > o
        classification := "bullish_candle"
    else
        classification := "bearish_candle"
    classification
 
// Example usage using built-in OHLC data:
// current_candle_type = classify_candle(open, high, low, close)
Use code with caution.
 
🦏 JavaScript
 
javascript
/**
 * Classifies a candlestick based on OHLC prices.
 * @param {number} O - Open price
 * @param {number} H - High price
 * @param {number} L - Low price
 * @param {number} C - Close price
 * @returns {string} The candle classification
 */
function classifyCandle(O, H, L, C) {
    if (H === L) {
        return "flat_neutral_candle";
    } else if (C === O) {
        return "doji_neutral_candle";
    } else if (C > O) {
        return "bullish_candle";
    } else {
        return "bearish_candle";
    }
}
