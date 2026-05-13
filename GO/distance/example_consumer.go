package main

import (
"fmt"
"log"

"distance/calc"
)

// Example: How to use the distance library from another Go program
// This demonstrates importing and calling the exported Calculate function
func exampleUsage() {
// Example 1: Basic usage
result := calc.Calculate(27, 50)
fmt.Printf("Distance from 27 to 50: %.2f%%\n", result.Percentage)

// Example 2: Get JSON output
jsonOutput, err := result.FormatJSON()
if err != nil {
log.Fatalf("Error formatting JSON: %v", err)
}
fmt.Println("JSON output:", jsonOutput)

// Example 3: Get legacy format output
legacyOutput := result.FormatLegacy()
fmt.Println("Legacy output:", legacyOutput)

// Example 4: Working with the Result struct fields directly
fmt.Printf("Value 1: %.2f, Value 2: %.2f, Percentage Change: %.2f%%\n",
result.Value1, result.Value2, result.Percentage)
}

// Uncomment the main() below and comment out the one in main.go to run this example
// func main() {
//exampleUsage()
// }
