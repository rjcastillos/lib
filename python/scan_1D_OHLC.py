import pandas as pd

def scan_daily_nvda_file(filename="../data/nvda_ohlc_data.csv"):
    try:
        # 1. Load the file, skipping the multi-header/ticker metadata rows (Rows 1 and 2)
        # We manually map the correct headers to completely clear out the multi-index confusion
        df = pd.read_csv(
            filename, 
            skiprows=[1, 2],       # Skips 'Ticker,NVDA...' and 'Date,,,,'
            index_col=0, 
            parse_dates=True
        )
        
        # 2. Convert High and Low columns strictly to numbers just in case text slipped through
        df['High'] = pd.to_numeric(df['High'], errors='coerce')
        df['Low'] = pd.to_numeric(df['Low'], errors='coerce')
        
        # Drop rows where numbers couldn't be evaluated
        df = df.dropna(subset=['High', 'Low'])

        # 3. Calculate the Daily Range (High minus Low)
        df['Trading_Range'] = df['High'] - df['Low']
        
        # 4. Filter for trading days where the range is strictly greater than 13
        large_range_df = df[df['Trading_Range'] > 13]
        
        # 5. Print the results
        if large_range_df.empty:
            print("Scan complete. No trading days found with a daily range greater than $13.")
        else:
            print(f"--- Found {len(large_range_df)} days where Daily Range > $13 ---")
            print(f"{'Date':<15} | {'High':<8} | {'Low':<8} | {'Daily Range':<15}")
            print("-" * 55)
            
            for timestamp, row in large_range_df.iterrows():
                # Handles clean formatting whether the index parsed cleanly or fell back
                date_str = timestamp.strftime('%Y-%m-%d') if hasattr(timestamp, 'strftime') else str(timestamp)
                print(f"{date_str:<15} | ${row['High']:<7.2f} | ${row['Low']:<7.2f} | ${row['Trading_Range']:<14.2f}")
                
    except FileNotFoundError:
        print(f"Error: The file '{filename}' was not found. Please verify the name or file path.")
    except Exception as e:
        print(f"An unexpected error occurred: {e}")

if __name__ == "__main__":
    scan_daily_nvda_file()
