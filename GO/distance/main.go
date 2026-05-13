package main

import (
	"flag"
	"fmt"
	"os"
	"strconv"

	"distance/calc"
)

func main() {
	// Define flags
	legacyFlag := flag.Bool("L", false, "Output in legacy text format (default is JSON)")
	flag.Parse()

	// Get positional arguments after flags
	args := flag.Args()

	// Validate arguments
	if len(args) < 2 {
		fmt.Fprintf(os.Stderr, "Usage: distance [flags] <value1> <value2>\n")
		fmt.Fprintf(os.Stderr, "Flags:\n")
		flag.PrintDefaults()
		os.Exit(1)
	}

	// Parse input values
	value1, err := strconv.ParseFloat(args[0], 64)
	if err != nil {
		fmt.Fprintf(os.Stderr, "Error parsing first value: %v\n", err)
		os.Exit(1)
	}

	value2, err := strconv.ParseFloat(args[1], 64)
	if err != nil {
		fmt.Fprintf(os.Stderr, "Error parsing second value: %v\n", err)
		os.Exit(1)
	}

	// Call the distance library function
	result := calc.Calculate(value1, value2)

	// Output based on flag
	if *legacyFlag {
		fmt.Print(result.FormatLegacy())
	} else {
		jsonOutput, err := result.FormatJSON()
		if err != nil {
			fmt.Fprintf(os.Stderr, "Error formatting JSON: %v\n", err)
			os.Exit(1)
		}
		fmt.Println(jsonOutput)
	}
}
