package main

import (
	"fmt"
	"strings"
)

func main() {
	var stringA = "ncv1.all.sst2799.marktspezifisches-layout.v3"
	var stringB = "ncv1.all.ac1577.sf-sink-ac1577-ncv1-all-sst2799-marktspezifisches-layout-v3-dev-deadletter"

	if stringA == stringB {
		fmt.Println("A short is = that B long")
	} else {
		fmt.Println("A short  isn't B long")
	}

	result := strings.Compare(stringA, stringB)

	fmt.Println("A short compares with B long  is =", result)

	fmt.Println("Checking Contains")
	// Result: A isn't  B
	if strings.Contains(stringB, stringA) {
		fmt.Println("String MATCHES")
	}
	fmt.Println("Contains checked")
	fmt.Println("Forcing Contains")
	fmt.Println(strings.Contains("ncv1.all.ac1577.sf-sink-ac1577-ncv1-all-sst2799-marktspezifisches-layout-v3-dev-deadletter", "ncv1.all.sst2799.marktspezifisches-layout.v3"))
	stringA = "ncv1.all.sst2799.marktspezifisches-layout.v3"
	stringB = "ncv1.all.sst2799.marktspezifisches-layout.v3"
	if stringA == stringB {
		fmt.Println("A is B")
	} else {
		fmt.Println("A isn't B")
	}
	// Result: John isn't john

	stringA = "NCV1.all.sst2799.marktspezifisches-layout.v3"
	stringB = "ncv1.all.sst2799.marktspezifisches-layout.v3"
	if strings.ToLower(stringA) == strings.ToLower(stringB) {
		fmt.Println("A is B when converted to lowercase")
	} else {
		fmt.Println("A isn't B when converted to lowercase")
	}
	// Result: a is b when converted to lowercase
	result = strings.Compare(stringA, stringB)
	fmt.Println("A mixed characters compared with lower B  is =", result)
	result = strings.Compare(strings.ToLower(stringA), stringB)
	fmt.Println("A lower compared with lower B  is =", result)

	stringA = "Luke"
	stringB = "Luke Skywalker"
	if len(stringA) == len(stringB) {
		if stringA != stringB {
			fmt.Println("The sizes are the same, but Luke isn't Luke Skeywalker")
		} else {
			fmt.Println("The sizes are the same, and Luke is Luke Skywalker")
		}
	} else {
		fmt.Println("The sizes are different")
	}
	// Result: The sizes are different

}
