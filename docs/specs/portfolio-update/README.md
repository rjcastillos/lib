This task is to code a html version of the python script [addPosition.py][../../../python/addPosition.py] but not to reuse it , it is in this repo only as part of an oold version is not intended to be used anymore

This is a new and separate page , the existent DCA only should be updated to reflect the rules and filtering defined here.


This new  module main requirement is to update the json file portfolio allowing the following operations.
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

Each ticker can also carry `Currency` and `AssetType` metadata. The positions page supports `Stocks`, `ETF`, `Commodities`, `Crypto`, `Treasury Bonds`, `T-Bills`, `Corporate Bonds`, and `Other`; currencies use three-letter codes such as `USD` or `EUR`. These fields are optional when reading older portfolio records. Each new real-position execution stores its own `Currency`; older executions without it display using the ticker currency, or `USD` when the ticker has no currency.

Currency and asset type are informative only. The positions page does not perform currency conversion, so position totals and P&L should only be interpreted together when executions for that ticker use a common currency. Dividend period `N/A` means no dividend: keep `Div` at zero and show dividend projections as `N/A`.

Keep in mind that these numbers are used to take financial decisions and the accuracy is key

Rules:
A ticker can have active only one direction at the time. 
Example : You can not start a short position before closing a long position and viceversa 
Comissions are included in the **AvgPrice**
**DivAmnt** is the per-cycle dividend amount: **Qty** multiplied by **Div**. Annualized dividend is derived separately using **Periodicity** and is not stored in **DivAmnt**.
The memtioned modules are in GO in case these are not callable we need to do them in js (for a future release)
- move
- distance 


For legacy lot-shaped real-position rows, `Trades.On=true` means that the row contributes to the open position, and `DateIn` and `PriceIn` must be valid. New real-position executions use `Action`, `Date`, and `Price` instead and remain in history after a reduction.

For legacy lot-shaped rows, `Trades.On=false` means the lot was fully or partially closed, so `DateOut` and `PriceOut` must be valid.

For new real-position execution rows, `Commission` is the fee for that execution, whether it opens or reduces a position. Legacy rows use `Commission` for entry fees and `CommissionOut` for the closing fee; missing legacy `CommissionOut` is treated as zero. DCA planner rows continue to use `On` as a visual inclusion toggle.

DCA planner transaction filtering.
If the ticker does not exist create the entry in the json file with Trades.Strategy="DCA_Planner".
This strategy is only for planning and not a real position to avoid duplicity the ticker shall contain a "." as a prefix.

Therefore the Trades.On in the case of Trades.Strategy="DCA_Planner" are just a toggle at the visual level to include or not the row in the calculations which is the current behaviour.


If the selected ticker is a real one (does not start with a dot), legacy lot-shaped rows with `On=true` remain view-only in DCA; legacy `On=false` rows remain future-only and are not saved from DCA. For tickers using the new `Action` execution ledger, DCA displays the current aggregate open quantity and average basis as a read-only position row so historical buys are not incorrectly counted as still open after a sale. Planner rows remain under a separate dot-prefixed ticker such as `.AAPL`.


```json
{
  "TICKER": {
    "name": "Company Name Inc. (TICKER)",
    "Ticker": "TICKER",
    "Currency": "USD",
    "AssetType": "Stocks",
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

New real-position trades are immutable execution records. Each purchase or sale appends one row; reducing or closing a position never edits or splits earlier executions. New records use this shape:

```json
{
  "Action": "Buy",
  "Strategy": "SniperNine",
  "Qty": 2,
  "Date": "2026-09-30",
  "Price": 377.01,
  "Commission": 0.5,
  "Currency": "USD"
}
```

`Action` is `Buy` or `Sell`; `Qty` is a positive magnitude; `Date` is the execution date; `Price`, `Commission`, and `Currency` belong to that execution. `Currency` is optional for older records and uses the ticker currency for display when omitted. It is not used to convert calculations. `Direction` is derived from the signed net executions: buys increase signed quantity and sells decrease it. A buy while flat opens long; a sell while flat opens short. An opposite-side execution reduces the current position. Reject an execution larger than the remaining position so one trade cannot reverse direction.

Legacy rows using `On`, `Direction`, `DateIn`, `PriceIn`, `DateOut`, and `PriceOut` remain readable. New execution rows do not use `On`; the flag remains a planner-row inclusion toggle and a legacy position field.

`Qty` is the absolute net open quantity and `Positions[0].Direction` is its side. New `Action` execution rows use FIFO basis: process `Trades` in array order and reduce the oldest remaining opening execution first. For a long lot, unit basis is `Price + Commission / Qty`; for a short lot, unit basis is `Price - Commission / Qty`. If a reduction closes only part of a lot, the remaining quantity keeps the same unit basis and its opening commission is allocated in proportion to quantity. Do not edit the original execution row.

`Invested` is the sum of the basis of all remaining FIFO lot quantities. For long positions it is acquisition cost plus the remaining allocated opening commissions; for shorts it is opening sale proceeds less the remaining allocated opening commissions. `Positions[0].AvgPrice` is `Invested / Qty` while open and zero when flat. Since FIFO may remove higher- or lower-cost lots first, average basis can change after a reduction. Closing proceeds and closing commissions do not reduce `Invested`.

| Execution | Position effect | `Invested` update |
| --- | --- | --- |
| Buy while flat/long | Open a long FIFO lot | Add `q * Price + Commission` |
| Sell while long | Reduce/close oldest long lots | Subtract the FIFO basis released from those lots |
| Sell while flat/short | Open a short FIFO lot | Add `q * Price - Commission` |
| Buy while short | Cover oldest short lots | Subtract the FIFO proceeds basis released from those lots |

For a long sale, realized P&L is `q * sale Price - sale Commission - FIFO basis released`. For a short cover, it is `FIFO proceeds basis released - q * cover Price - cover Commission`. An exit commission is charged once to that execution's realized P&L and is not added to or subtracted from the remaining lots. Calculations retain full precision; the UI rounds for display using standard currency formatting.

The reduce form accepts any positive quantity up to the aggregate open quantity; it does not need to match a purchase quantity. One sale or cover may consume several FIFO lots. A quantity greater than the open position is rejected rather than reversing direction. A blank quantity with the full-close action closes the complete position. Both actions append exactly one execution. After the position reaches zero, an execution may open either direction.

FIFO uses the order of rows in `Trades` as the execution order; preserve that order when importing or editing a portfolio. Trades with the same date retain their array order. New append-only executions must not be mixed with open legacy lot-shaped rows for the same ticker; migrate the legacy open quantity before appending execution rows. Closed legacy rows can remain in history.

### Worked Examples

**Issue #2, MSFT:** Buy 5 at `$407.43` with no commission, 1 at `$367.79` with `$1` commission, and 1 at `$368.38` with `$1` commission. Selling 2 at `$377.01` consumes 2 shares from the first buy lot. FIFO basis released is `$814.86`, realized P&L is `-$60.84`, and 5 shares remain with `$1,960.46` invested at `$392.092` average basis.

**MSFT after three reductions:** The seven opening buys have total basis `$2,775.33`. The three one-share sells consume the first three buys, whose bases are `$430.50`, `$424.08`, and `$417.25`. The remaining four lots have basis `$1,503.50`; therefore `AvgPrice = $1,503.50 / 4 = $375.875`, displayed as `$375.88` with normal two-decimal currency rounding. Realized P&L across the three sells is `$162.49`.

**A reduction spanning unmatched lots:** Buy 2 units at `$10` with `$2` entry commission, then buy 3 units at `$20` with `$3` entry commission. Sell 3 at `$25` with `$1` exit commission. FIFO closes the first 2-unit lot (basis `$22`) and 1 unit from the second lot (basis `$21`). The sale releases `$43` basis and realizes `$31`; 2 units remain from the second lot with `$42` invested and `$21` average basis. The sale quantity need not match either opening quantity.

**Long:** Buy 10 units at `$100` with `$1` commission. Sell 4 at `$120` with `$0.50` commission. The sale releases `$400.40` of FIFO lot basis, realizes `$79.10`, and leaves 6 units with `$600.60` invested at `$100.10` average basis.

**Short:** Sell short 10 units at `$100` with `$1` commission. Buy to cover 4 at `$80` with `$0.50` commission. The cover releases `$399.60` of FIFO short-lot basis, realizes `$79.10`, and leaves 6 units with `$599.40` invested at `$99.90` average basis.

See [TODO.md](TODO.md) for features intentionally deferred from the first release.



Glosary :
        -Qty. = means a number of units of a particular asset , could be stocks, currency , crypto units  or ounces in the case of metals