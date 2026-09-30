## New non editable view of trades per Ticker ##
off positions.html next to the Ticker.name add a button where we shall be able to view and review all the past trades , this is similar to the 'Trade History' but as a Pop-up window on demand.

The goals of this window is to make a review of what has been loaded and exist in the portofolio.json file historically for this particular asset

Also the window's data should be in a friedly format easy to either copy and paste in a spreadsheet or download the displayed data as csv file.


The default filter afert the button is clicked should be 
    Trades.On=true
    sorted ascendent by Trades.Datein


Additional filters
    Trades.On=false
    sorted ascendent by Trades.DateOut

All trades in an specfic time period
 Trades.On (true and false)
 sorted chronolically by dates
 Trades.DateIn for Trades.On = true
 Trades.DateOut or Trades.On = false

 Examle:

 If there was buy  at 2026.09.28 for 10 shares
 and a sale on 2026.09.29 of 5 shares
 and then another buy at 2026.09.30 for 6 shares
That is the order should show in the window


Diplayable fields:
     "Trades": [
      {
        "On":boolean,
        "Strategy": characters ,
        "Qty": numeric ,
        "Direction": characters,
        "DateIn": Date,
        "PriceIn": Currency,
        "Commission": Currency,
        "DateOut": date,
        "PriceOut": Currency,
        "CommissionOut": Currency
      }
With the information above derive if it was a buy or a sell in Long or short direction / position 


Along with this new feature also address GitHub issue:
https://github.com/rjcastillos/lib/issues/3

## Behavior and Compatibility Rules

- Open the dialog from a button beside the selected ticker name. The dialog is read-only and always shows trades for that ticker only.
- For legacy trade rows, the initial filter is `On=true`, sorted by `DateIn` ascending. The closed filter shows `On=false` rows sorted by `DateOut` ascending. All legacy rows are ordered by the applicable event date: `DateIn` for open rows and `DateOut` for closed rows.
- Date range bounds are inclusive. A row's history date is `DateIn` when open and `DateOut` when closed. Rows without a valid date are excluded when a date bound is active.
- New append-only execution rows use `Action`, `Date`, `Qty`, `Price`, and `Commission`, and have no `On` state. For these portfolios, default to All history and show chronological Buy/Sell executions. Derive each action's Long/Short meaning from the signed position immediately before that execution; do not infer a lot-level open/closed status.
- The table and CSV contain the same filtered rows and display the execution fields in a spreadsheet-friendly column order. CSV values must be escaped correctly, and the downloaded filename includes the ticker and export date.
- Display a valid `NextExDate` beside the selected ticker name in a readable date format. The stored value remains `YYYYMMDD`; empty or invalid dates are not displayed.

## Acceptance Checks

- Legacy open, closed, and all-history filters select the appropriate records and use their respective dates for ordering.
- Mixed legacy history sorts open rows by entry date and closed rows by exit date; inclusive date bounds return only matching rows.
- Append-only Buy/Sell rows appear chronologically with correctly derived Long/Short action labels, including short sales and buy-to-cover events.
- CSV export matches the visible filtered table, including headers, commas, quotes, and line breaks in values.
- `NextExDate` renders only when it is a valid compact calendar date.
- The dialog remains keyboard-operable and usable on narrow screens; wide history tables scroll within the dialog without widening the page.








