
Using the version 200 as code base implement the following changes 


Strategy Goal
Used a single indicator constructing around it  exits (Profit takers and stop losses ) and entries points maximizing profitability
This strategy shall consider and adjust calculation in the following intervals
•	30 Minutes
•	1 Hour
•	4 Hours
•	1 Day
•	1 Week 
Criteria:

1.	Establish the trend direction
	a.	If more than 4 out of the last 9 candles have closed above EMA 9 is bullish 
	b.	If more than 4 out of the last 9 candles have closed below EMA 9 is bearish 
	c.	If none of the above conditions are true, then is sideway pattern.
	d.	Important: these conditions are determined every time a candle opens.
2.	The first trade direction will be determined by the trend.
	a.	If Bullish starts with Long
	b.	If Bearish starts with Short
3.	Entry signal
	a.	Long
		i.	Bullish trend or 
			1.	Last 2 candles are green and have closed above EMA9 
	b.	Short
		i.	Bearish trend or
			1.	Last 2 candles are red and have closed below EMA9 
			
4.	Close or reduce a position.
4. Close position 
	a. Long	
		i.   If last 2 candles open and close are below EMA9
		ii.  Price below ATRPx1.5
		iii. If when the candle opens the price is 5% above entry price
		iv.  if when the candle opens the price is below EMA9 and the last 2 candles open > close (red)
		v.   if by one minute before the currtent candle closes is lower then last candle and 3 out of the last 4 candles are reaching lower lows 
	b. Short
		i. if last 2 candles open and close are above EMA9 
		ii. Price Above ATRPx1.5




Please 
Change  the stop to 1.5–2× ATR(4H) (≈3.6–4.8%)
Add commision = 1 USD per trade
and determine why the profit takers are not been trigger