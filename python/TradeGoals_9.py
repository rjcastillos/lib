def Goals(price):
    Upgoals={'point20':1.0020,'point25':1.0025,'point40':1.0040,'point50':1.0050,'one20':1.0120,'three':1.030,'five':1.050}
    Downgoals={'point20':0.998,'point25':0.9975,'point40':0.996,'point50':0.995,'one20':0.988,'three':0.97,'five':0.95}
#    print("Price received =",price)
    DecIn=str(price)
#    print("Price str =",DecIn)
    Dec=DecIn.split('.')
    NumDec=2
    if len(Dec) ==1:  ## Passeed is 99 therefore  Default to .2f
        print("Price ${} does not contains decimals >> assiging .2f by Default".format(price))
    elif len(Dec) ==2:      ## Passed is 99.99 0r more 99.999999
        if len(Dec[1]) >2 : NumDec=len(Dec[1])  ## Passed is 99.9 also Default to .2f
        print("Price ${} contains {} decimals places".format(price,NumDec))
    price=float(price)
#    print ("Price = > ${0:,.{1}f} ".format(price,NumDec))
    print("\nUp goals from position ${0:,.{1}f}".format(price,NumDec))
    print("===============================")
    for k,v in Upgoals.items():
        print("{0} % Up ${1:,.{2}f}".format(k,price*v,NumDec))

    print("\nDown goals from position ${0:,.{1}f}".format(price,NumDec))
    print("===============================")
    for k,v in Downgoals.items():
        print("{0}% Down  ${1:,.{2}f}".format(k,price*v,NumDec))
#
## Finds the percentage distance between 2 given numbers
#
def Distance(num1,num2):
    Num=[num1,num2]
#    Num.sort() No need to sort the list
    return Num[1]/Num[0]*100-100
#
## Takes Investment and Desire number of coins and returns Price and coins needed accroding to the Exchange's fee
#
def MinPrice(_I , WishedCoins):
    nex={'fee':0.9990,'CoinsNeeded':0.00000000,'price':99.99}
    amp={'fee':0.9980,'CoinsNeeded':0.00000000,'price':99.99}
    nex.update({'CoinsNeeded':float(WishedCoins)/nex['fee']})
    amp.update({'CoinsNeeded':float(WishedCoins)/amp['fee']})
    nex.update({'price':float(_I)/nex['CoinsNeeded']})
    amp.update({'price':float(_I)/amp['CoinsNeeded']})
    return nex, amp
#
## Affordable coins
#
def aCoins(_I,price):
    if price :
        return float(_I)/float(price)
    else:
        return 0
#
#Market move
#
def mMove(percentage,price):
    return "{:.5f}".format(float(price)*(1+float(percentage)/100))
def aFterFee(gross,ExchangetypeOfFee,percentage=0):
    ###2018 06 22 Nex Market Maker = 0.100% , Market Taker = 0.200% Nex Default is MM, Amp flat fee 0.25% , Default = 0.2%
    ###2024 06 28 update on amp maker = 0.30
    Exchange={'fee':0.2,'nex':0.1,'nexmm':0.100,'nexmt':0.200,'amp':0.30}
    if not ExchangetypeOfFee:
        fee = float(Exchange['nex'])
    else:
        if ExchangetypeOfFee in Exchange:
            fee = float(Exchange[ExchangetypeOfFee])
        else:
            fee = float(percentage)
    if percentage :
        fee = float(percentage)
    _gross = float(gross)
    _percentage = float(fee)
    #print (" gross {} , type {}, perc ".format(_gross,ExchangetypeOfFee,_percentage))
    # As of ver. 09 returns (Net) and (fee)
    return _gross-(_gross*_percentage/100),(_gross*_percentage/100)
#
#  Main
#
def main():
    import sys
    Myprice=sys.argv[1]
    Goals(Myprice)
if __name__ == "__main__":
    main()
#Usage examples of aFterFee
#D:\src\Py\BTC>py
#Python 3.6.1 (v3.6.1:69c0db5, Mar 21 2017, 17:54:52) [MSC v.1900 32 bit (Intel)] on win32
#Type "help", "copyright", "credits" or "license" for more information.
#>>> from TradeGoals_8 import aFterFee
#>>> print(" After fee = {:.8f} ".format(aFterFee(0.00209050,'nex')))
# After fee = 0.00208841
#>>> print(" After fee = {:.8f} ".format(aFterFee(0.00209050,'')))
# After fee = 0.00208841
#>>> print(" After fee = {:.8f} ".format(aFterFee(0.00209050,'',0.100)))
# After fee = 0.00208841
#>>> print(" After fee = {:.8f} ".format(aFterFee(0.00209050,'')))
# After fee = 0.00208841
#>>> print(" After fee = {:.8f} ".format(aFterFee(0.00209050,'nexmt')))
# After fee = 0.00208632
#>>> print(" After fee = {:.8f} ".format(aFterFee(0.00209050,'amp')))
# After fee = 0.00208527
#>>> print(" After fee = {:.8f} ".format(aFterFee(0.00209050,'fee')))
# After fee = 0.00208632
#>>> print(" After fee = {:.8f} ".format(aFterFee(0.00209050,'kkk')))
# After fee = 0.00208841
