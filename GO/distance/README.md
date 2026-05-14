# Distance Calculator

A Go project demonstrating a refactored architecture that serves dual purposes:
1. **CLI Executable** - Command-line tool for calculating percentage distance
2. **Library Package** - Reusable package for external Go programs

## Project Structure

```
distance/
├── calc/
│   └── distance.go      # Core library package with calculation logic
├── main.go              # CLI executable entry point
├── example_consumer.go  # Usage example for importing as a package
├── go.mod              # Go module definition
├── go.sum              # (not shown, auto-generated)
├── build.sh            # Build script
└── distance            # Compiled binary
```

## Architecture Overview

### Dual-Purpose Design

The project is structured to support two usage patterns:

#### 1. Command-Line Interface (CLI)
Run the compiled executable directly:
```bash
./distance 27 50              # Output in JSON format (default)
./distance -L 27 50           # Output in legacy text format
```

**Flags:**
- `-L` : Output in legacy text format (default is JSON)

**Exit Codes:**
- `0` : Success
- `1` : Error (invalid arguments, parsing errors, etc.)

#### 2. Library Package
Import and use in other Go programs:
```go
import "distance/calc"

result := calc.Calculate(27, 50)
fmt.Printf("Distance: %.2f%%\n", result.Percentage)
```

## API Reference

### `calc.Calculate(value1, value2 float64) *Result`
Calculates the percentage change from value1 to value2.

**Formula:** `(value2/value1)*100 - 100`

**Parameters:**
- `value1` : Initial value
- `value2` : Final value

**Returns:** Pointer to `Result` struct containing:
- `Value1` : The first input value
- `Value2` : The second input value
- `Percentage` : The calculated percentage change

### `Result.FormatJSON() (string, error)`
Returns the result in JSON format with 2-space indentation.

### `Result.FormatLegacy() string`
Returns the result in legacy text format.

## Building

### Using the build script:
```bash
chmod +x build.sh
./build.sh
```

### Using Go directly:
```bash
go build -o distance .
```

## Usage Examples

### As CLI Tool
```bash
# Basic usage - outputs JSON
$ ./distance 100 150
{
  "value1": 100,
  "value2": 150,
  "percentage": 50
}

# Legacy format
$ ./distance -L 100 150
read line: 100.00 150.00
result: 50.00%
```

### As Library Package
See `example_consumer.go` for complete examples of:
- Basic calculation
- JSON formatting
- Legacy formatting
- Direct struct field access

## Implementation Details

### Package Organization
- **`calc` package**: Contains pure calculation logic and result formatting
  - Exported functions: `Calculate()`
  - Exported type: `Result` with JSON struct tags
  - Methods: `FormatLegacy()`, `FormatJSON()`

- **`main` package**: Contains CLI logic
  - Argument parsing with `flag` package
  - Error handling with appropriate exit codes
  - Delegates to `calc` package for calculations

### Key Design Decisions

1. **Pointer Return**: `Calculate()` returns `*Result` for consistency with Go conventions
2. **JSON Tags**: Struct fields have `json` tags for serialization
3. **Error Handling**: CLI validates inputs and handles errors gracefully
4. **Format Flexibility**: Two output format options (JSON and legacy)
5. **Separation of Concerns**: Core logic in `calc` package, CLI logic in `main`

## Dependencies

- Go 1.24.8 or later
- Standard library only (no external dependencies)

## Future Improvements

See `IMPROVEMENTS.md` for planned enhancements and refactoring opportunities.

## Testing

Currently no automated tests. Recommended additions:
- Unit tests in `calc/` package for calculation logic
- Integration tests for CLI
- Edge case handling (zero division, negative values)

## License

[Add your license here]

## Author

Ramon Castillo 

## Version

1.0.0
