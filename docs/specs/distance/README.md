>This function is implemented in the `distance` package, specifically in the `calc/distance.go` file. It calculates the distancte the percentage distance between two values. The formula is: (value2/value1)*100 - 100  . link [distance.go](../../../../lib/GO/distance/calc/distance.go)

## 1. Objective
The objective of this task is to port the `distance` function from Go to JavaScript which would be used in different ways the most inmediate one would be intgrating it within a wepage to calculate the diastance given two values as part of the same page and display the result dynamically.

For example, if you have two values, `value1` and `value2`, the distance can be calculated as follows:

## 2. Implementation in JavaScript (ES6)

```javascript
function calculateDistance(value1, value2) {
    if (value1 === 0) {
        throw new Error("value1 cannot be zero to avoid division by zero.");
    }
    return (value2 / value1) * 100 - 100;
}
## 3. Rules

This function should be standalone and not depend on any other function or package. It should be able to be used in any context where two values are provided, and the distance between them needs to be calculated.

<IMPORTANT> The implementation should be efficient and easy to interact with a webpage, allowing for dynamic updates based on user input or other events. The output format should be the one implemented in the Go version: JSON or text according to the case and how is requested by the consumer app.
---

Should be strafightforward and easy to use, with clear documentation on how to call the function and what parameters it expects.

The default value for value1 is ##AvgPrice## and for value 2 would be `ProfitTakerZone1`  (If known) or `StopLossZone1` (If known) or any other value that is relevant to the context of the calculation. Or the user can input any two values to calculate the distance between them. Other values can be used as well, but the most common ones are AvgPrice and `ProfitTakerZone1` or `StopLossZone1`.

##AvgPrice## is the default  value1 when the calculation is based in an existent position loaded from the portfolio json file. If there is not file loaded then value1 should be inputed by the user. In most cases `ProfitTakerZone1` and `StopLossZone1` are calculated dinamically based in the user plan. Otherwise the user can input any two values to calculate the distance between them. 


