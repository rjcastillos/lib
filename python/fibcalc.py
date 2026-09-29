#!/usr/local/bin/python3.6
#on Mac /usr/local/bin/python3.6
#Or Native /usr/bin/python
##################
#RC Oct 2018
#Program_name: Fib
#
#Usage :   fib
#       Fibonacci Calculator
#       Calculates Retracements and Extensions in UP and DOWN trends
#   https://www.investing.com/tools/fibonacci-calculator
#lastest ver. 1.00
#2025 01 30
#changed to ba a  simpler function accepting 2 params
# 2018 11 29 ver 0.02
#       adapts DecPlaces() from q_buycal_00_08.py
#
#2018 10 26
# 01    Implements simple Up trend Fibonacci:
#       given a Low number (Low=A_) and a high (high=B_) one returns:
#   Fib levels (Fib)
#1) 23.6%
#2) 38.2%
#3) 50%
#4) 61.8%
#5) 65%
#6) 76.4%
###      Formula high-(high-Low)*Fib
#
#
####################
#   Import section #
####################
#Import
import sys
import json
from pprint import pprint
from TradeGoals_9 import *
from decnum import *
DEBUG=False
#
#Functions
#
def Usage():
        print ("Usage : {Num A} -- Mandatory")
        print ("      : {Num B} -- Mandatory")
        print ("      : {Num C} -- If Extention")
        quit()

FibRet = {
        'aHundred':{"Multiplier":0,"value":0},
        'TwoThreeSix':{"Multiplier":0.236,"value":0},
        'ThreeEightyTwo':{"Multiplier":0.382,"value":0},
        'Fifty':{"Multiplier":0.5,"value":0},
        'SixOneEight':{"Multiplier":0.618,"value":0},
        'GoldenPocket':{"Multiplier":0.65,"value":0},
        'Seven86':{"Multiplier":0.786,"value":0},
        'Zero':{"Multiplier":1,"value":0}
        }

FibExt = {
        'OnepointSixtyFive':{"Multiplier":1.65,"value":0},
        'OnepointSixOneEight':{"Multiplier":1.618,"value":0},
        'OnepointThreeEighttwo':{"Multiplier":1.382,"value":0},
        'OneTwentySeven':{"Multiplier":1.272,"value":0},
        'aHundred':{"Multiplier":1,"value":0},
        'Seven86':{"Multiplier":0.786,"value":0},
        'ZeroSixtyFive':{"Multiplier":0.650,"value":0},
        'SixOneEight':{"Multiplier":0.618,"value":0},
        'Fifty':{"Multiplier":0.50,"value":0},
        'ThreeEightyTwo':{"Multiplier":0.382,"value":0},
        'TwoThreeSix':{"Multiplier":0.236,"value":0}
        }
FibDown={}
#    print("Price received =",price)
A_=5755
B_=8506.7
#
#
#   PROGRAM
#
#Analizing sys.argv to set variables according with program's options
#
def FibCalc(_Low,_High,_C=0):
    A_=_Low
    B_=_High
    
    Myinfo={'Retracement':{}}

    if __name__ == "__main__":
        print(f'Fib Retracements upTrend from  ${_Low} to ${_High}')
        print('='*50)
    for k in FibRet.keys():
        # ### high-(high-Low)*Fib
        FibRet[k]["value"]=B_-(B_-A_)*FibRet[k]["Multiplier"]
        Myinfo['Retracement'][k]=FibRet[k]['value']
        if __name__ == "__main__":
            print(f'{k:>25}{FibRet[k]["value"]:>25.2f}')

    if _C != 0:
        Myinfo.update({"Extention":{}})
        for k in FibExt.keys():
            # ### high+(high-Low)*Fib
            if DEBUG: print(f'{B_=}  {A_=} {B_-A_} equals {_C+(B_-A_)} Multiply by {FibExt[k]["Multiplier"]}')
            SwingRange=B_-A_ ##Calculated just to keep track of where the numbers are coming from
            FibExt[k]["value"]=_C+SwingRange*FibExt[k]["Multiplier"]
            Myinfo['Extention'][k]=FibExt[k]['value']
    if __name__ == "__main__":
        print('-'*50)
        print (json.dumps(Myinfo,indent=4))
    return json.dumps(Myinfo)

def main():
    C_=0
    if len(sys.argv) < 3:
        Usage()
    else:
        A_=float(sys.argv[1])
        B_=float(sys.argv[2])
        if len(sys.argv) > 3:
            C_= float(sys.argv[3])
        FibCalc(A_,B_,C_)

#
####
# MAIN
###      
if __name__ == "__main__":
    main()
