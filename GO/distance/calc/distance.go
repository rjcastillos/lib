package calc

import (
	"encoding/json"
	"fmt"
)

// Result holds the result of the distance calculation
type Result struct {
	Value1     float64 `json:"value1"`
	Value2     float64 `json:"value2"`
	Percentage float64 `json:"percentage"`
}

// Calculate computes the percentage distance between two values.
// The formula is: (value2/value1)*100 - 100
// This represents the percentage change from value1 to value2.
// This is the main exported function that other modules can use.
func Calculate(value1, value2 float64) *Result {
	percentage := value2/value1*100 - 100
	return &Result{
		Value1:     value1,
		Value2:     value2,
		Percentage: percentage,
	}
}

// FormatLegacy returns the result in legacy text format (percentage with %)
func (r *Result) FormatLegacy() string {
	return fmt.Sprintf("read line: %.2f %.2f\nresult: %.2f%%\n", r.Value1, r.Value2, r.Percentage)
}

// FormatJSON returns the result in JSON format
func (r *Result) FormatJSON() (string, error) {
	jsonBytes, err := json.MarshalIndent(r, "", "  ")
	if err != nil {
		return "", err
	}
	return string(jsonBytes), nil
}
