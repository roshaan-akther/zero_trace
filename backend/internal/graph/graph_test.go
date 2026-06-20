package graph_test

import (
	"testing"

	"github.com/agentrix/backend/internal/graph"
)

func TestNewDefaultGraph(t *testing.T) {
	g := graph.NewDefaultGraph()

	if g.RouteCount() != 6 {
		t.Errorf("expected 6 routes, got %d", g.RouteCount())
	}
	if g.StopCount() != 44 {
		t.Errorf("expected 44 stops, got %d", g.StopCount())
	}

	for id, r := range g.Routes {
		if len(r.Polyline) < 2 {
			t.Errorf("route %s: polyline has %d points (need ≥2)", id, len(r.Polyline))
		}
		if len(r.Stops) < 2 {
			t.Errorf("route %s: has %d stops (need ≥2)", id, len(r.Stops))
		}
		if r.TotalLengthM < 100 {
			t.Errorf("route %s: total length %.0f m (need ≥100)", id, r.TotalLengthM)
		}
		if r.AvgSpeedMPS <= 0 {
			t.Errorf("route %s: avg speed %.1f (need >0)", id, r.AvgSpeedMPS)
		}
		if r.Capacity <= 0 {
			t.Errorf("route %s: capacity %d (need >0)", id, r.Capacity)
		}
	}

	routeTypes := make(map[graph.VehicleType]int)
	for _, r := range g.Routes {
		routeTypes[r.VehicleType]++

		for i := range r.Stops {
			s := &r.Stops[i]
			if s.DistanceAlongM < 0 {
				t.Errorf("route %s stop %d (%s): negative distance", r.ID, i, s.Name)
			}
		}

		for i := 1; i < len(r.Stops); i++ {
			prev := r.Stops[i-1].DistanceAlongM
			cur := r.Stops[i].DistanceAlongM
			if cur < prev-50 {
				t.Errorf("route %s: stops out of order at %d→%d (%.0f→%.0f)",
					r.ID, i-1, i, prev, cur)
			}
		}

		stop := g.GetStop(r.Stops[0].ID)
		if stop == nil {
			t.Errorf("route %s: GetStop(%s) returned nil", r.ID, r.Stops[0].ID)
		}
	}

	if routeTypes[graph.VehicleBus] != 3 {
		t.Errorf("expected 3 bus routes, got %d", routeTypes[graph.VehicleBus])
	}
	if routeTypes[graph.VehicleTrain] != 1 {
		t.Errorf("expected 1 train route, got %d", routeTypes[graph.VehicleTrain])
	}
	if routeTypes[graph.VehicleThreeWheeler] != 2 {
		t.Errorf("expected 2 three-wheeler routes, got %d", routeTypes[graph.VehicleThreeWheeler])
	}
}

func TestGetRoute(t *testing.T) {
	g := graph.NewDefaultGraph()

	r := g.GetRoute("138")
	if r == nil {
		t.Fatal("expected route 138 to exist")
	}
	if r.ID != "138" {
		t.Errorf("expected ID '138', got '%s'", r.ID)
	}
	if r.VehicleType != graph.VehicleBus {
		t.Errorf("expected bus, got %s", r.VehicleType)
	}

	r = g.GetRoute("nonexistent")
	if r != nil {
		t.Errorf("expected nil for nonexistent route, got %v", r)
	}
}

func TestETAForStop(t *testing.T) {
	g := graph.NewDefaultGraph()
	r := g.GetRoute("138")
	if r == nil {
		t.Fatal("route 138 not found")
	}

	eta := r.ETAForStop(4, 5000, 10.0)
	if eta < 0 {
		t.Errorf("expected positive ETA, got %f", eta)
	}

	eta = r.ETAForStop(0, 1000, 0.1)
	if !isInf(eta) {
		t.Errorf("expected Inf for stopped vehicle, got %f", eta)
	}

	eta = r.ETAForStop(0, 1000, 10.0)
	if eta != 0 {
		t.Errorf("expected 0 ETA when past stop, got %f", eta)
	}
}

func TestStopsForRoute(t *testing.T) {
	g := graph.NewDefaultGraph()
	stops := g.StopsForRoute("100")
	if len(stops) != 10 {
		t.Errorf("expected 10 stops for route 100, got %d", len(stops))
	}
	if stops[0].Name != "Pettah Bus Stand" {
		t.Errorf("expected first stop 'Pettah Bus Stand', got '%s'", stops[0].Name)
	}

	stops = g.StopsForRoute("nonexistent")
	if stops != nil {
		t.Errorf("expected nil for nonexistent route")
	}
}

func isInf(v float64) bool {
	return v > 1e308 || v < -1e308
}
