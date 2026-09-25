package calc

import (
	"encoding/json"
	"fmt"
)

// Result contains the inputs and calculated moved price.
type Result struct {
	Percentage float64 `json:"percentage"`
	Price      float64 `json:"price"`
	Move       float64 `json:"result"`
}

// Move applies a percentage change to a price.
func Move(percentage, price float64) *Result {
	result := price * (1 + percentage/100)
	return &Result{
		Percentage: percentage,
		Price:      price,
		Move:       result,
	}
}

// FormatLegacy returns the result in human-readable text format.
func (r *Result) FormatLegacy() string {
	return fmt.Sprintf("move: %.2f%% %.2f\nresult: %.2f\n", r.Percentage, r.Price, r.Move)
}

// FormatJSON returns the result in indented JSON format.
func (r *Result) FormatJSON() (string, error) {
	formatted := struct {
		Percentage json.Number `json:"percentage"`
		Price      json.Number `json:"price"`
		Move       json.Number `json:"result"`
	}{
		Percentage: json.Number(fmt.Sprintf("%.2f", r.Percentage)),
		Price:      json.Number(fmt.Sprintf("%.2f", r.Price)),
		Move:       json.Number(fmt.Sprintf("%.2f", r.Move)),
	}

	jsonBytes, err := json.MarshalIndent(formatted, "", "  ")
	if err != nil {
		return "", err
	}
	return string(jsonBytes), nil
}
