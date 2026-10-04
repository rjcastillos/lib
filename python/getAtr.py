
#https://www.geeksforgeeks.org/different-ways-to-iterate-over-rows-in-pandas-dataframe/
#from getAtr import *
#For now only supports one TIcker at the time.
#https://www.bajajfinserv.in/average-true-range-atr#:~:text=Average%20True%20Range%20(ATR)%3A,%2B%20TR14)%20%2F%2014
import datetime

DEBUG=False
Print=False
OutputFile=False
DAYSBACK=20
f_date=datetime.datetime.now().strftime("%Y-%m-%d:%H")
FromDateSearch=(datetime.date.today()-datetime.timedelta(DAYSBACK)).strftime("%Y-%m-%d")
Period=14
tickersList="../Tickers_owned.json"


def gATR(Tickers):
    if DEBUG: print("received ARGS",Tickers)
    Tickers=[Tickers]
    #print("Tickers len =",len(Tickers))
    for Ticker in Tickers:
        if DEBUG: print("->",Ticker)
        import yfinance as yf
        data=yf.download(Ticker,start=FromDateSearch)
        df=data.tail(Period+1)
        #print(df) at this point the DataFrame (df) is the one output if Print=True
        import pandas as pd
        import numpy as py
        if OutputFile:
            df.to_csv('ATR_tmpout.csv')
        for i in range(len(df)):
            if i == 0:
                #print("First Row",df.iloc[i])
                High=float(0)
                Low=float(0)
                pClose=float(0)
                pC=0
                ######Adding new columns at the end of the df
                #To insert the following calculations
                #HLD = High - Low of the Day
                #      HLD=High-Low
                #HPC =  The Absolute value of the High of the Day - Previous close
                #       HPC=abs(High-pClose)
                
                df.insert((len(df.columns)) , "HLD" , [py.nan]*len(df))
                df.insert((len(df.columns)) , "HPC" , [py.nan]*len(df))
                df.insert((len(df.columns)) , "LPC" , [py.nan]*len(df))
                df.insert((len(df.columns)) , "tr" , [py.nan]*len(df))
            while i > 0:
                
                High=df.iat[i,1]
                Low=df.iat[i,2]
                pC=i-1
                pClose=df.iat[pC,0]
                HLD=High-Low
                #assigning values to new columns
                df.iat[i,5]=HLD
                HPC=abs(High-pClose)
                df.iat[i,6]=HPC
                LPC=abs(Low-pClose)
                df.iat[i,7]=LPC
                #sorting values to get the grater of HLD,HPC and LPC
                values=[HLD,HPC,LPC]
                values.sort()
                #assigning the greater to new column tr
                df.iat[i,8]=values[2]
                _High=f"{High:.2f}"
                _Low=f"{Low:.2f}"
                _pClose=f"{High:.2f}"
                _HLD=f"{HLD:.2f}"
                _HPC=f"{HPC:.2f}"
                _LPC=f"{LPC:.2f}"
                #print("High :",_High,"Low :",_Low,"pClose =",_pClose,"HLD = ",_HLD,"HPC =",_HPC,"LPC = ",_LPC)
                break
        #df.drop([0,1])
        #df['tr']=df[['HLD','HPC','LPC']].max(axis=1)
        #print("DATA FRAME with NEW COLS")
        #print(df)
        fATR=df['tr'].sum()
        ATR=f"{fATR/(len(df)-1):.2f}"
        if Print: print("<<<<< ATR >>>>> =",ATR)
                
                
        
    return ATR
    
    


#
#  Main
#
def main():
    import sys
    if len(sys.argv) > 1:
     ARG=sys.argv[1]
     Tickers=ARG.split(",")
    else:
        print("If no ARG working with ",tickersList)
        import json
        with open (tickersList,'r') as f:
            Tickers = json.load(f)
    gATR(Tickers)
if __name__ == "__main__":
    Print=True
    main()