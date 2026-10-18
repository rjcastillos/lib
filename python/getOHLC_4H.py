import yfinance as yf
import pandas as pd

def get_resampled_nvda_data():
    print("Downloading 1-hour NVDA data from Yahoo Finance...")
    # 1. Download 1-hour interval data (Yahoo Finance caps 1h data at the last 60 days)
    df = yf.download("NVDA", period="60d", interval="1h")
    
    if df.empty:
        print("No data retrieved. Please check your internet connection or ticker symbol.")
        return

    print("Resampling data to 4-hour intervals aligned with market open...")
    # 2. Resample the data into 4-hour bars ('4h')
    # The offset='30min' aligns the bins with the 9:30 AM market open 
    # instead of cutting off mid-bar at standard 4-hour block edges.
    df_4h = df.resample('4h', offset='30min').agg({
        'Open': 'first',    # First opening price of the 4-hour block
        'High': 'max',      # Highest price hit during the 4-hour block
        'Low': 'min',       # Lowest price hit during the 4-hour block
        'Close': 'last',    # Final closing price of the 4-hour block
        'Volume': 'sum'     # Total volume traded within the 4-hour block
    })

    # 3. Drop rows for times the market was closed (e.g., nights and weekends)
    df_4h = df_4h.dropna(subset=['Open'])

    # 4. Display the first few rows of the aligned data
    print("\nFirst 5 rows of aligned 4-Hour NVDA OHLC Data:")
    print(df_4h.head())

    # 5. Save the final data to a CSV file
    output_filename = "nvda_4h_market_aligned.csv"
    df_4h.to_csv(output_filename)
    print(f"\nData successfully saved to {output_filename}")

if __name__ == "__main__":
    get_resampled_nvda_data()
