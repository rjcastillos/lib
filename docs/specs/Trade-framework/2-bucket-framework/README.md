### 2-bucket-framework for building a trading system.###

. Profit Taking Signals (Take Profit / Sell Winners)

These answer:

"Where should I sell because the price has reached my objective?"

Examples:

Next resistance
Daily/Weekly resistance
Fibonacci extensions (1.272, 1.618, 2.618)
Previous swing high
Supply zone
Risk/Reward target (2R, 3R, 5R)
Upper Bollinger Band
Measured move target

Examples:

TP = Next Daily Resistance
TP = Fibonacci 1.618 Extension
TP = 3R Risk/Reward

2. Loss Protection Signals (Stop Loss / Sell Losers)

These answer:

"Where should I sell because the trade idea is invalidated?"

Examples:

2 × ATR below entry
Swing low break
Support break
Structure invalidation
Chandelier Exit
Trailing stop
EMA loss (e.g. close below 20 EMA)
Volatility stop

Examples:

SL = Entry - 2 × ATR
SL = Below Swing Low
SL = Below Key Support

Simple Mental Model
Group	Purpose	ExamplesProfit Taking Signals	Sell because target reached	Resistance, Fibonacci 1.618, 3R, Supply Zone
Loss Protection Signals	Sell because trade is wrong	2×ATR, Swing Low, Support Break, Trailing Stop

Example:

Next resistance on 1D chart → Profit Taking Signal
Fibonacci extension 1.618 → Profit Taking Signal
2 × ATR stop loss → Loss Protection Signal



## 2-bucket-framework parms 

- PTFW = Profit Taking Signals (Take Profit / Sell Winners)
Stop Loss 

- SLFW = Loss Protection Signals (Stop Loss / Sell Losers)

For example:
ATR:
       Lenght:14
       PTFW:
                x:2.00
                 Weight: 0.3  ///Weight to sale to take profits if the price reaches ATRx2.00
      SLFW:
               x:-1.00
               Weight: 0.6  ///Weight to sale to cut losses if the price reaches ATRx2.0
Fib:
       Lenght:all
       PTFW:
                x:1.61
                 Weight: 0.9
      SLFW:
               x:-0.618
               Weight: 0.9
EMA:
       Lenght:9
       PTFW:
                x:
                 Weight: 0.0
      SLFW:
               x:
               Weight: 0.9
      