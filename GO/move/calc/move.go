package calc

import (
	"encoding/json"
	"fmt"
)

// Result contains the inputs and calculated moved price.
type Result struct {
	Percentage float64 `json:"percentage"`
	Price      float64 `json:"price"`
	Move       float64 `json:"move"`
}

// Move applies a percentage change to a price.
func Move(percentage, price float64) *Result {
	move := price * (1 + percentage/100)
	return &Result{
		Percentage: percentage,
		Price:      price,
		Move:       move,
	}
}

// FormatLegacy returns the result in human-readable text format.
func (r *Result) FormatLegacy() string {
	return fmt.Sprintf("Move: %.2f%% over %.2f\nTarget Price: %.2f\n", r.Percentage, r.Price, r.Move)
}

// FormatJSON returns the result in indented JSON format.
func (r *Result) FormatJSON() (string, error) {
	formatted := struct {
		Percentage json.Number `json:"percentage"`
		Price      json.Number `json:"price"`
		Move       json.Number `json:"move"`
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
