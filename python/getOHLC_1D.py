import yfinance as yf
df = yf.download("NVDA", start="2020-01-01")
df.to_csv("nvda_ohlc_data.csv")