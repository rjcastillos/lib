# Move Calculator

A Go library and CLI for applying a percentage change to a price.

## Formula

```text
price * (1 + percentage / 100)
```

## CLI

From `GO/move`:

```bash
go run . 10 100
# JSON output

go run . -L 10 100
# Legacy text output
```

The default JSON output contains the input percentage, input price, and calculated result. The `-L` flag selects the human-readable legacy format.

All output values are formatted with exactly two decimal places. Negative
percentages are accepted as positional arguments. For example:

```bash
go run . -3 10
```

```json
{
	"percentage": -3.00,
	"price": 10.00,
	"result": 9.70
}
```

The same calculation in legacy mode:

```bash
go run . -L -3 10
```

```text
move: -3.00% 10.00
result: 9.70
```

## Library

```go
import "move/calc"

result := calc.Move(10, 100)
```
