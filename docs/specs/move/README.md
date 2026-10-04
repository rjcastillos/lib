>This function is implemented in the `move` package, specifically in the `calc/move.go` file. It calculates a move in a  percentage between two values. The formula is: (value2/value1)*100 - 100  . link [move.go](../../../../lib/GO/move/calc/move.go)

## 1. Objective
The objective of this task is to port the `move` function from Go to JavaScript which would be used in different ways the most inmediate one would be intgrating it within a wepage to calculate the move given two values as part of the same page and display the result dynamically.

For example, if you have two values, `percentage` and `price`, the move can be calculated as follows:

## 2. Formula

```
move := price * (1 + percentage/100)
```

## 3. Rules

This function should be standalone and not depend on any other function or package. It should be able to be used in any context where two values are provided, and the distance between them needs to be calculated.

<IMPORTANT> The implementation should be efficient and easy to interact with a webpage, allowing for dynamic updates based on user input or other events. The output format should be the one implemented in the Go version: JSON or text according to the case and how is requested by the consumer app.

Should be strafightforward and easy to use, with clear documentation on how to call the function and what parameters it expects.

The default price is #AvgPrice# and percentage when the calculation is for profits would be the `ProfitTakerPercentage` (2%) and when is to calculate loss it would be `LossTolerance` (1%). Or the user can input a percentage and price to calculate the move between them. 

#AvgPrice# is the default  price when the calculation is based in an existent position loaded from the portfolio json file. If there is not file loaded then value1 should be inputed by the user.


