## create an indicator , name it Slope9-i.01

### rules of engagement 
- Do not use the prompt window to write out anything , with exception of task summary or an specific needed feedback , keep the goal of saving tokens comsumption by not writting unecessary output while reasoning or thinking.

- Provide terse answers.

- If a zoom in or more details are needed I will explicitly request them.

### The indicator to be created:

- Formula to calculate SLOPE9 :

```
SLOPE9 = ((EMA9[t] - EMA9[t-9]) / EMA9[t-9]) * 100

```


### Draw the indicator in the chart connecting the highs of each candle with a line colored according to the slope interpretation , using the following criteria:

- Color green after is greater than +2%
- Color yellow after is greater than or equal to -2% and up to +2%
- Color red after is greater than or equal to -4% and less than -2%

### Write the percentage value in bold without the percentage sign inside the candle when is > 3.99% or < -3.99& 

#### Slope interpretation

The following thresholds provide a descriptive interpretation of the calculated slope. They do not alter the underlying calculation.

| Slope percentage                               | Interpretation      |
| ---------------------------------------------- | ------------------- |
| Greater than +4%                               | `strong_bull_trend` |
| Greater than +2% and up to +4%                 | `bull_trend`        |
| Greater than or equal to -2% and up to +2%     | `sideways`          |
| Greater than or equal to -4% and less than -2% | `bear_trend`        |
| Less than -4%                                  | `strong_bear_trend` |

