package main

import (
	"fmt"
	"os"
	"strconv"
	"strings"

	"move/calc"
)

func main() {
	legacy, args, err := parseArguments(os.Args[1:])
	if err != nil {
		fmt.Fprintf(os.Stderr, "Error: %v\n", err)
		printUsage()
		os.Exit(1)
	}

	if len(args) != 2 {
		printUsage()
		os.Exit(1)
	}

	percentage, err := strconv.ParseFloat(args[0], 64)
	if err != nil {
		fmt.Fprintf(os.Stderr, "Error parsing percentage: %v\n", err)
		os.Exit(1)
	}

	price, err := strconv.ParseFloat(args[1], 64)
	if err != nil {
		fmt.Fprintf(os.Stderr, "Error parsing price: %v\n", err)
		os.Exit(1)
	}

	result := calc.Move(percentage, price)
	if legacy {
		fmt.Print(result.FormatLegacy())
		return
	}

	jsonOutput, err := result.FormatJSON()
	if err != nil {
		fmt.Fprintf(os.Stderr, "Error formatting JSON: %v\n", err)
		os.Exit(1)
	}
	fmt.Println(jsonOutput)
}

func parseArguments(arguments []string) (bool, []string, error) {
	legacy := false
	values := make([]string, 0, len(arguments))

	for _, argument := range arguments {
		switch {
		case argument == "-L":
			legacy = true
		case argument == "--":
			continue
		case strings.HasPrefix(argument, "-"):
			if _, err := strconv.ParseFloat(argument, 64); err != nil {
				return false, nil, fmt.Errorf("unknown flag %q", argument)
			}
			values = append(values, argument)
		default:
			values = append(values, argument)
		}
	}

	return legacy, values, nil
}

func printUsage() {
	fmt.Fprintln(os.Stderr, "Usage: move [-L] <percentage> <price>")
	fmt.Fprintln(os.Stderr, "  -L    Output in legacy text format (default is JSON)")
}
