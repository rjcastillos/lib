import yfinance as yf
##df = yf.download("NVDA", start="2020-01-01")
df = yf.download("NVDA", start="2026-11-03")
df.to_csv("nvda_ohlc_data_append_new.csv")