package calc

import (
	"math"
	"strings"
	"testing"
)

func almostEqual(left, right float64) bool {
	return math.Abs(left-right) < 1e-9
}

func TestMove(t *testing.T) {
	result := Move(10, 100)

	if !almostEqual(result.Percentage, 10) {
		t.Fatalf("expected percentage 10, got %v", result.Percentage)
	}
	if !almostEqual(result.Price, 100) {
		t.Fatalf("expected price 100, got %v", result.Price)
	}
	if !almostEqual(result.Move, 110) {
		t.Fatalf("expected result 110, got %v", result.Move)
	}
}

func TestMoveDecimalValues(t *testing.T) {
	result := Move(2.5, 19.99)

	if !almostEqual(result.Move, 20.48975) {
		t.Fatalf("expected result 20.48975, got %v", result.Move)
	}
}

func TestFormatJSONUsesTwoDecimalPlaces(t *testing.T) {
	result := Move(3, 7)
	formatted, err := result.FormatJSON()
	if err != nil {
		t.Fatalf("unexpected JSON error: %v", err)
	}

	expected := "{\n  \"percentage\": 3.00,\n  \"price\": 7.00,\n  \"result\": 7.21\n}"
	if formatted != expected {
		t.Fatalf("expected JSON %q, got %q", expected, formatted)
	}
}

func TestFormatLegacyUsesTwoDecimalPlaces(t *testing.T) {
	legacy := Move(3, 7).FormatLegacy()
	expected := "move: 3.00% 7.00\nresult: 7.21\n"
	if !strings.Contains(legacy, expected) {
		t.Fatalf("expected legacy output %q, got %q", expected, legacy)
	}
}
