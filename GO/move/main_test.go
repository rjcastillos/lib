package main

import "testing"

func TestParseArgumentsAllowsNegativePercentage(t *testing.T) {
	legacy, arguments, err := parseArguments([]string{"-3", "10"})
	if err != nil {
		t.Fatalf("unexpected parsing error: %v", err)
	}
	if legacy {
		t.Fatal("expected JSON output mode")
	}
	if len(arguments) != 2 || arguments[0] != "-3" || arguments[1] != "10" {
		t.Fatalf("unexpected arguments: %v", arguments)
	}
}

func TestParseArgumentsRecognizesLegacyFlag(t *testing.T) {
	legacy, arguments, err := parseArguments([]string{"-L", "-3", "10"})
	if err != nil {
		t.Fatalf("unexpected parsing error: %v", err)
	}
	if !legacy {
		t.Fatal("expected legacy output mode")
	}
	if len(arguments) != 2 || arguments[0] != "-3" || arguments[1] != "10" {
		t.Fatalf("unexpected arguments: %v", arguments)
	}
}
