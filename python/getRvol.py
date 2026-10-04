
#https://www.geeksforgeeks.org/different-ways-to-iterate-over-rows-in-pandas-dataframe/
#from getAtr import *
#For now only supports one TIcker at the time.
import json
import datetime
DEBUG=False
Print=False
OutputFile=False
Period=14
tickersList="../Tickers_owned.json"
DAYSBACK=20
FromDateSearch=(datetime.date.today()-datetime.timedelta(DAYSBACK)).strftime("%Y-%m-%d")
f_date=datetime.datetime.now().strftime("%Y-%m-%d:%H")

def jSonPrint(Myinfo):
    fData=json.dumps(Myinfo,indent=4)
    print(fData)

def gRVOL(Tickers):
    if DEBUG: print("received ARGS",Tickers)
    Tickers=[Tickers]
    for Ticker in Tickers:
        import yfinance as yf
        Myinfo={}
        data = yf.Ticker(Ticker)
        if DEBUG: print("Symbol",data.info['symbol'] )
        Vol=float(data.info['volume'])
        Myinfo['Ticker']=Ticker
        Myinfo['Date']=f_date
        Myinfo['volume']=data.info['volume']
        Avgvol=float(data.info['averageVolume'])
        Myinfo['averageVolume']=data.info['averageVolume']
        Rvol=float(Vol/Avgvol)
        Myinfo['Rvol']=Rvol
        RVOL=f"{Myinfo['Rvol']:.2f}"
        if DEBUG: print ("Rvol = ",RVOL)
        if __name__ == "__main__":
            jSonPrint(Myinfo)
            
        return RVOL

def main():
    import sys
    if len(sys.argv) > 1:
        ARG=sys.argv[1]
        #Tickers=ARG.split(",")
        gRVOL(ARG)

if __name__ == "__main__":
    main()