#https://ranaroussi.github.io/yfinance/index.html
import yfinance as yf
import datetime
import sys
import json
Print=False
f_date=datetime.datetime.now().strftime("%Y-%m-%d:%H")
tickersList="Tickers_owned.json"
if len(sys.argv) > 1:
     ARG=sys.argv[1]
     Tickers=ARG.split(",")
else:
     print("If no ARG working with ",tickersList)
     with open (tickersList,'r') as f:
          Tickers = json.load(f)
     
#data = yf.download('OXLC')
#print(data.info)
#for k,v in data.info.items():
#   k,v


for Ticker in Tickers:
     print ("Sys Arg",Ticker)
     data = yf.Ticker(Ticker)
     Myinfo={}
     Myinfo['symbol']=data.info['symbol']
     Myinfo['shortName']=data.info['shortName']
     Myinfo['Date']=f_date
     Myinfo['open']=data.info['open']
     Myinfo['dayLow']=data.info['dayLow']
     Myinfo['dayHigh']=data.info['dayHigh']
     HLD=Myinfo['dayHigh']-Myinfo['dayLow']
     Myinfo['HLD']=f"{HLD:.2f}"
     print("Symbol", Myinfo['symbol'])
     print("shortName", Myinfo['shortName'])
     #print("currentPrice = ",data.info['currentPrice'])
     if data.info.get('currentPrice') == None:
          print ("taking net asset value nav instead of price")
          Myinfo['currentPrice']=data.info['navPrice']
     else:
          Myinfo['currentPrice']=data.info['currentPrice']
     #print("currentPrice = ",Myinfo['currentPrice'])
     if data.info.get('previousClose') == None:
          Myinfo['previousClose']=None
     else:
          Myinfo['previousClose']=data.info['previousClose']
          pClose=Myinfo['previousClose']
     Vol=float(data.info['volume'])
     Myinfo['volume']=data.info['volume']
     Avgvol=float(data.info['averageVolume'])
     Myinfo['averageVolume']=data.info['averageVolume']
     HPC=abs(Myinfo['dayHigh']-pClose)
     LPC=abs(Myinfo['dayLow']-pClose)
     #sorting values to get the grater of HLD,HPC and LPC
     values=[HLD,HPC,LPC]
     values.sort()
     #assigning the greater to new column tr
     Myinfo['tr']=f"{values[2]:.2f}"
     Rvol=float(Vol/Avgvol)
     Myinfo['Rvol']=Rvol
     if data.info.get('exDividendDate') == None:
          print ("MISSING exDividendDate")
          datetime1="None"
     else:
          Myinfo['exDividendDate']=data.info['exDividendDate']
          #print("exDividendDate = ",Myinfo['exDividendDate'])
          datetime1 = datetime.datetime.fromtimestamp(data.info['exDividendDate'])
          Myinfo['exDivFormatted']=datetime1.strftime("%m/%d/%Y")
          #print("exDiv from utc = ",Myinfo['exDivFormatted'])
     if data.info.get('lastDividendValue') == None:
          print ("MISSING lastDividendValue")
     else:
          Myinfo['lastDividendValue']=data.info['lastDividendValue']
     #print("lastDividendValue = ",Myinfo['lastDividendValue'])
     #print("Vol    = ",f"{Vol:>15,.0f}")
     #print("Avgvol = ",f"{Avgvol:>15,.0f}")
     #print("Rvol   = ",f"{Rvol:>2,.2f}")
     # print(type(Myinfo))
     fData=json.dumps(Myinfo,indent=4)
     print(fData)
     with open("FetchTicker.log","a") as f_log:
               f_log.write(fData)
     #print ("Day TR =", f"{Myinfo['dayHigh']-Myinfo['dayLow']:.2f}")
if Print:
    for k,v in data.info.items():
        print("[",k,"]","[",v,"]")