package main

import (
	"encoding/json"
	"fmt"
	"os"
	"text/tabwriter"

	"github.com/agentrix/backend/internal/graph"
	"github.com/agentrix/backend/internal/fare"
)

func main() {
	g := graph.NewDefaultGraph()

	fmt.Println("╔══════════════════════════════════════════════════════════╗")
	fmt.Println("║     AGENTRIX — ROUTE GRAPH DATA LAYER VERIFICATION     ║")
	fmt.Println("╚══════════════════════════════════════════════════════════╝")
	fmt.Printf("\nTotal routes: %d\n", g.RouteCount())
	fmt.Printf("Total stops:  %d\n", g.StopCount())

	var totalDist float64
	for _, r := range g.Routes {
		totalDist += r.TotalLengthM
	}
	fmt.Printf("Network distance: %.1f km\n\n", totalDist/1000)

	fmt.Println("─── ROUTES ────────────────────────────────────────────────")
	w := tabwriter.NewWriter(os.Stdout, 0, 0, 3, ' ', 0)
	fmt.Fprintf(w, "ID\tName\tType\tStops\tLength(km)\tCapacity\n")
	fmt.Fprintf(w, "──\t────\t────\t─────\t──────────\t────────\n")
	for _, r := range g.Routes {
		fmt.Fprintf(w, "%s\t%s\t%s\t%d\t%.1f\t%d\n",
			r.ID, r.Name, r.VehicleType, len(r.Stops), r.TotalLengthM/1000, r.Capacity)
	}
	w.Flush()

	fmt.Println("\n─── STOP DETAILS ─────────────────────────────────────────")
	for _, r := range g.Routes {
		fmt.Printf("\nRoute %s (%s) — %s\n", r.ID, r.VehicleType, r.Name)
		for i, s := range r.Stops {
			fmt.Printf("  %2d. %s (%.4f, %.4f) — %.0f m\n",
				i+1, s.Name, s.Lat, s.Lng, s.DistanceAlongM)
		}
	}

	fmt.Println("\n─── FARE SAMPLES ─────────────────────────────────────────")
	testKms := []float64{1, 2, 5, 10, 20, 50}
	for _, km := range testKms {
		normal := fare.Calculate(km, fare.Normal)
		semi := fare.Calculate(km, fare.SemiLuxury)
		luxury := fare.Calculate(km, fare.Luxury)
		super := fare.Calculate(km, fare.SuperLuxury)
		tw := fare.ThreeWheeler(km)
		fmt.Printf("  %5.0f km: Normal=Rs.%d Semi=Rs.%d Luxury=Rs.%d Super=Rs.%d 3wh=Rs.%d\n",
			km, normal, semi, luxury, super, tw)
	}

	fmt.Println("\n─── ROUTE INTEGRITY CHECKS ──────────────────────────────")
	ok := 0
	fail := 0
	for _, r := range g.Routes {
		if len(r.Polyline) < 2 {
			fmt.Printf("  FAIL: Route %s has <2 polyline points\n", r.ID)
			fail++
			continue
		}
		if len(r.Stops) < 2 {
			fmt.Printf("  FAIL: Route %s has <2 stops\n", r.ID)
			fail++
			continue
		}
		if r.TotalLengthM < 100 {
			fmt.Printf("  FAIL: Route %s total length <100m (%.0f)\n", r.ID, r.TotalLengthM)
			fail++
			continue
		}

		for i, s := range r.Stops {
			if s.DistanceAlongM < 0 {
				fmt.Printf("  FAIL: Route %s stop %d (%s) has negative distance\n", r.ID, i, s.Name)
				fail++
			}
		}

		for i := 1; i < len(r.Stops); i++ {
			if r.Stops[i].DistanceAlongM < r.Stops[i-1].DistanceAlongM-50 {
				fmt.Printf("  FAIL: Route %s stops out of order: %s (%.0f) → %s (%.0f)\n",
					r.ID, r.Stops[i-1].Name, r.Stops[i-1].DistanceAlongM,
					r.Stops[i].Name, r.Stops[i].DistanceAlongM)
				fail++
			}
		}
		ok++
	}
	fmt.Printf("  %d passed, %d failed\n", ok, fail)

	if fail == 0 {
		fmt.Println("\n✓ DATA LAYER INTEGRITY: ALL CHECKS PASSED")
	} else {
		fmt.Printf("\n✗ DATA LAYER INTEGRITY: %d CHECKS FAILED\n", fail)
		os.Exit(1)
	}

	jsonBytes, err := json.MarshalIndent(g, "", "  ")
	if err != nil {
		fmt.Printf("Error marshalling graph to JSON: %v\n", err)
		os.Exit(1)
	}
	if err := os.WriteFile("data/route-graph.json", jsonBytes, 0644); err != nil {
		fmt.Printf("Error writing JSON file: %v\n", err)
		os.Exit(1)
	}
	fmt.Printf("\n✓ Route graph exported to data/route-graph.json (%d bytes)\n", len(jsonBytes))

	fareBytes, _ := json.MarshalIndent(map[string]interface{}{
		"normal":         fareSamples(fare.Normal),
		"semi_luxury":    fareSamples(fare.SemiLuxury),
		"luxury":         fareSamples(fare.Luxury),
		"super_luxury":   fareSamples(fare.SuperLuxury),
		"three_wheeler":  twSamples(),
	}, "", "  ")
	if err := os.WriteFile("data/fare-table.json", fareBytes, 0644); err != nil {
		fmt.Printf("Error writing fare JSON file: %v\n", err)
		os.Exit(1)
	}
	fmt.Printf("✓ Fare table exported to data/fare-table.json (%d bytes)\n", len(fareBytes))
}

func fareSamples(st fare.ServiceType) []map[string]interface{} {
	samples := []float64{1, 2, 3, 5, 10, 15, 20, 30, 50}
	res := make([]map[string]interface{}, len(samples))
	for i, km := range samples {
		res[i] = map[string]interface{}{
			"km":   km,
			"fare": fare.Calculate(km, st),
		}
	}
	return res
}

func twSamples() []map[string]interface{} {
	samples := []float64{0.5, 1, 2, 3, 5, 10}
	res := make([]map[string]interface{}, len(samples))
	for i, km := range samples {
		res[i] = map[string]interface{}{
			"km":   km,
			"fare": fare.ThreeWheeler(km),
		}
	}
	return res
}
