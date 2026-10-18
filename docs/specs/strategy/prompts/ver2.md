Strategy Goal
Use a single indicator constructing around it  exits (Profit takers and stop losses ) and entries points maximizing profitability
This strategy shall consider and adjust calculation in the following intervals
•	30 Minutes
•	1 Hour
•	4 Hours
•	1 Day
•	1 Week 

Parameters:
Initial Capital 3000 USD
Commission : 1 USD per trade
slippage=1 


Criteria:

1.	Establish the trend direction
	a.	If at least 4 out of the last 9 candles have closed above EMA9 and at least the last 3 candles open price < close is bullish 
	b.	If at least 4 out of the last 9 candles have closed below EMA9 and at least the last 3 candles open price > close is bearish 
	c.	If none of the above conditions are true, then is sideway pattern.
	d.	Important: these conditions are determined every time a candle opens.
2.	The first trade direction will be determined by the trend.
	a.	If Bullish starts with Long
	b.	If Bearish starts with Short
3.	Entry signal
	a.	Long
		i.	Bullish trend is on
		ii. last 2 candles open price < close price and both above EMA9
		iii. Confirmation in level up EMA9 above
				30Min → 4H
				1H → 1D
				4H → 1D
				1D → 1Week
				1W → 1Month
	b. Short
		i.  Bearish trend is on
		ii. last 2 candles open  price >  close price and both below EMA9 
4. Close position 
	a. Long	
		i.   When last 2 candles open and close are below EMA9 (before 		i. If last candle high and low are below EMA9)
		ii.  When Price below ATRx1.5
		iii. When the candle opens the price is below EMA9 and the last 2 candles open > close (red)
		iv.  When by one minute before the current candle closes is lower then last candle and 3 out of the last 4 candles are reaching lower lows
	b. Short
		i. If last candle high and low are above EMA9
		
5. Plot the trend without overlaying it in the chart


EMA200 today = 100
EMA200 20 bars ago = 95

Slope % = ((100-95)/95)*100
        = 5.26%

Slope % = ((EMA200[t] - EMA200[t-n]) / EMA200[t-n]) × 100
Slope % = ((EMA[t] − EMA[t−n]) / EMA[t−n]) × 100        n = 9
slopePct = (emaSlopeSrc - emaSlopeSrc[slopeLookback]) / emaSlopeSrc[slopeLookback] * 100.0

> +4%  = Strong Bull Trend
+2% to +4% = Bull Trend
-2% to +2% = Sideways
-4% to -2% = Bear Trend
< -4% = Strong Bear Trend

		
Buy-side trend confirmed when:

Price > EMA50
EMA50  > EMA200 
ADX > 25


 rides trends and reliably scalps reversals.
 
 Please add a new exit criteria that could be also considered as a stop loss based on SMA20 for all the intervals now available in the script and the trigger would be when the price opens a percentage below the SMA20 , we can start with 1.2% and test a sweep later 