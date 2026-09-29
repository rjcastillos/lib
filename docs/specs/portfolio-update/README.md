This task is to code a html version of the python script [addPosition.py][../../../python/addPosition.py] but not ti reuse it , it is in this repo only as part of an oold version is not intended to be used anymore

This is a new and separate page the existent DCA only should be updated to reflect the rules and filtering defined here.



This nee module main requirement is to update the json file portfolio allowing the following operations.
- Add position 
    there are 2 main ways to add a position :
        * ## Long ##  position we buy a Qty. of an asset if we did not previously own it , means that we are opening a new position and if we already owned it then we are adding more Qty. with a new price to the position.

            If this is a new ticker we need to fill out all the needed data to create a new ticker in the json file.

        * ## short ##  position we sale Qty. of an asset if these are the first Qty. of this particular asset we are opening a short position on the contrary we are adding to the short posiiton.
    The Trades.Strategy posibles are:
        - "SniperNine" as default
        - "Daytrade"
        - "SwingTrade"
        - "LongtimeInvestment"
- Reduce position
    there are 2 main ways to reduce a position:
        * ## Long ##  position we sale an existent Qty. of an asset that we already own but not all of them leaving some Qty. <> 0 
        * ## Short ##  position we buy an spefic Qty. of an asset that we already have sold (or have a open postion) but not all of them leaving the position with Qty. <> 0 

- Close position
    same as reduce position but using the full Qty. active of a specific ticker

- Display position
    Shows all the active transactions per ticker existent in the portfolio file.
    calculates the following fields and its current value
      The dividend payable per cycle is the total held shares **Qty** multiplied by the per-share-per-cycle dividend **Div**. Do not divide this amount by **Periodicity**. For an annual projection, multiply the per-cycle amount by the payouts per year: M=12, Q=4, S=2, A=1.

- What if
    Close now 
        with an specific ticker current value , calculates the P&L showing the unrealized amount but does not actually close the position.
    move (not yet to implement - leave for a future release)
        executes the move function in GO and applies the close now with the result.

    distance (not yet to implement - leave for a future release)
        executes the distance function in GO between the **AvgPrice** of the selected ticker and the ticker current value
- Display ticker history.
    TBD
- Graph/chart distance and move
    TBD

In all the actions the integrity of the data is a priority any update might changes other values and these need to be calculated and checked.

Keep in mind that these numbers are used to take financial decisions and the accuracy is key

Rules:
A ticker can have active only one direction at the time. 
Example : You can not start a short position before closing a long position and viceversa 
Comissions are included in the **AvgPrice**
**DivAmnt** is the per-cycle dividend amount: **Qty** multiplied by **Div**. Annualized dividend is derived separately using **Periodicity** and is not stored in **DivAmnt**.
The memtioned modules are in GO in case these are not callable we need to do them in js (for a future release)
- move
- distance 


The Trades.On=true flag means that this trade is part of an open position , therefore Trades.DateIn and Trades.PriceIn shall be valid values (a date in the past and a numeric value of the asset)

The Trades.On=false means that the trade was completly closed therefore
Trades.DateOut and Trades.PriceOut shall contain valid numbers.

For real position trades, `Commission` is the entry commission and `CommissionOut` is the commission paid to close the quantity recorded on that trade. `CommissionOut` is zero for an open trade and for DCA planner rows. Older records without `CommissionOut` are treated as having no recorded close commission.

DCA planner transaction filtering.
If the ticker does not exist create the entry in the json file with Trades.Strategy="DCA_Planner".
This strategy is only for planning and not a real position to avoid duplicity the ticker shall contain a "." as a prefix.

Therefore the Trades.On in the case of Trades.Strategy="DCA_Planner" are just a toggle at the visual level to include or not the row in the calculations which is the current behaviour.


If in the dropdown the selected ticker is a real one hence does not start with an "." example .APPL

DCA should only include for view in the html interface transactions with Trades.On=true , otherwise just display the ticker data and the transactions empty.
In this case DCA shall consider Trades.On=false  as a future posible transaction to perform any calculations in the html interface as in planning mode but should not be stored/updated in the portfolio json file.
These rules leave us with a posible scenario of having planned ticker .APPL and real position with ticker APPL 


```json
{
  "TICKER": {
    "name": "Company Name Inc. (TICKER)",
    "Ticker": "TICKER",
    "Div": 0.00,
    "Price": 0.00,
    "Periodicity": "M",
    "Qty": 0,
    "NextExDate": "",
    "Positions": [
      {
        "Direction": "Long",
        "Size": 0.0,
        "AvgPrice": 0.00
      }
    ],
    "Trades": [
      {
        "On": true,
        "Strategy": "DCA_Planner",
        "Qty": 0.0,
        "Direction": "Long",
        "DateIn": "",
        "PriceIn": 0.00,
        "Commission": 0.00,
        "DateOut": "",
        "PriceOut": 0.00,
        "CommissionOut": 0.00
      }
    ],
    "Invested": 0.00,
    "DivAmnt": 0.00
  }
}
```
## Position and Trade Accounting

`Qty` is the nonnegative magnitude of the open position; `Positions[0].Direction` identifies whether it is long or short. Trade quantities are also positive magnitudes. A short sale increases `Qty`; a buy to cover decreases it. Reject a close larger than the selected open quantity and reject opening the opposite direction until the current position is fully closed.

`Trades.PriceIn` is the entry execution price for both long buys and short sales. `Trades.Commission` is the entry commission. `Trades.PriceOut` and `Trades.CommissionOut` describe the closing execution and its commission. Entry commission is included in the open basis and `AvgPrice`; closing commission is charged to realized P&L and is not added to the remaining position's basis.

`Invested` is the total basis of the still-open quantity. For a long it is entry cost including allocated entry commissions. For a short it is net opening sale proceeds after allocated entry commissions. `Positions[0].AvgPrice` is `Invested / Qty` when `Qty > 0`; it is zero when no position is open. Do not subtract exit proceeds or closing commissions from `Invested` as a substitute for removing the closed quantity's entry basis.

| Operation | Quantity update | Open `Invested` update |
| --- | --- | --- |
| Long buy | `Qty += q` | `Invested += q * PriceIn + Commission` |
| Long sale | `Qty -= q` | Subtract the entry basis allocated to the sold quantity: `q * PriceIn + allocated entry Commission` |
| Short sale | `Qty += q` | `Invested += q * PriceIn - Commission` |
| Short buy to cover | `Qty -= q` | Subtract the net opening proceeds allocated to the covered quantity: `q * PriceIn - allocated entry Commission` |

For a long sale, realized P&L is `q * PriceOut - CommissionOut - (q * PriceIn + allocated entry Commission)`. For a short cover, realized P&L is `(q * PriceIn - allocated entry Commission) - (q * PriceOut + CommissionOut)`. A sale commission or cover commission is therefore a cost of closing in either direction.

## Partial Closes

- The user must select the open trade lot or lots to close. Do not silently apply FIFO, LIFO, or another lot-selection rule.
- When only part of one open lot is closed, split it into a closed record and a remaining open record. Both retain the original `DateIn` and `PriceIn`.
- Allocate the original entry `Commission` between the closed and remaining quantities in proportion to quantity. The closed record gets its allocated entry commission; the open record retains the remainder.
- If one close execution affects multiple selected lots, allocate its `CommissionOut` among the closed records in proportion to the quantity closed from each lot. Store the allocated exit commission on each closed record.
- The closed record has `On: false`, the closed quantity, valid `DateOut` and `PriceOut`, and its allocated `CommissionOut`. The remaining record has `On: true`, the remaining quantity, blank `DateOut`, `PriceOut: 0`, and `CommissionOut: 0`.
- A full close uses the same calculation with the entire selected lot quantity. Once all lots are closed, `Qty`, `Invested`, and `AvgPrice` are zero, and a new position may be opened in either direction.

### Partial-Close Examples

**Long:** Buy 10 units at `$100` with `$1` entry commission. Sell 4 at `$120` with `$0.50` close commission. Allocate `$0.40` of entry commission to the closed quantity. Realized P&L is `$79.10`; the remaining position is 6 units with `$600.60` `Invested` and `$100.10` `AvgPrice`.

**Short:** Sell short 10 units at `$100` with `$1` entry commission. Buy to cover 4 at `$80` with `$0.50` close commission. Allocate `$0.40` of entry commission to the covered quantity. Realized P&L is `$79.10`; the remaining position is 6 units with `$599.40` net opening proceeds in `Invested` and `$99.90` `AvgPrice`.



Glosary :
        -Qty. = means a number of units of a particular asset , could be stocks, currency , crypto units  or ounces in the case of metals