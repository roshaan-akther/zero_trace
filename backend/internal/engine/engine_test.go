package engine_test

import (
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"
	"time"

	"github.com/agentrix/backend/internal/engine"
	"github.com/agentrix/backend/internal/graph"
)

func newTestEngine() *engine.Engine {
	return engine.New(graph.NewDefaultGraph())
}

var (
	// Pettah — first stop on route 138
	pettahLat  = 6.933211
	pettahLng  = 79.855435
	// Town Hall — 5th stop on route 138 (PID 27)
	townHallLat  = 6.916799
	townHallLng  = 79.863364
	// Maharagama — 28th stop on route 138 (PID 53)
	maharagamaLat  = 6.846083
	maharagamaLng  = 79.928144
	// Kottawa — 32nd stop on route 138 (PID 252)
	kottawaLat = 6.841673
	kottawaLng = 79.963989
)

func TestTelemetryValid(t *testing.T) {
	e := newTestEngine()
	resp, err := e.ProcessTelemetry(&engine.Telemetry{
		VehicleID: "bus-138-01",
		RouteID:   "138",
		Lat:       pettahLat,
		Lng:       pettahLng,
		SpeedMPS:  9.0,
		Timestamp: time.Now(),
	})
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if resp.Status != "ok" {
		t.Errorf("expected status ok, got %s", resp.Status)
	}
	if resp.VehicleID != "bus-138-01" {
		t.Errorf("expected vehicle bus-138-01, got %s", resp.VehicleID)
	}
	if resp.Confidence < 0.9 {
		t.Errorf("expected high confidence, got %.2f", resp.Confidence)
	}
	if resp.ETASeconds < 0 {
		t.Errorf("expected positive ETA, got %.1f", resp.ETASeconds)
	}
}

func TestTelemetryOutlierSpeed(t *testing.T) {
	e := newTestEngine()
	_, err := e.ProcessTelemetry(&engine.Telemetry{
		VehicleID: "bus-138-01",
		RouteID:   "138",
		Lat:       pettahLat,
		Lng:       pettahLng,
		SpeedMPS:  50.0,
		Timestamp: time.Now(),
	})
	if err == nil {
		t.Fatal("expected error for excessive speed")
	}
	if !strings.Contains(err.Error(), "outlier") {
		t.Errorf("expected outlier error, got: %v", err)
	}
}

func TestTelemetryOutlierCoords(t *testing.T) {
	e := newTestEngine()
	_, err := e.ProcessTelemetry(&engine.Telemetry{
		VehicleID: "bus-138-01",
		RouteID:   "138",
		Lat:       51.5,
		Lng:       -0.12,
		SpeedMPS:  9.0,
		Timestamp: time.Now(),
	})
	if err == nil {
		t.Fatal("expected error for coordinates outside Sri Lanka")
	}
	if !strings.Contains(err.Error(), "outlier") {
		t.Errorf("expected outlier error, got: %v", err)
	}
}

func TestTelemetryUnknownRoute(t *testing.T) {
	e := newTestEngine()
	_, err := e.ProcessTelemetry(&engine.Telemetry{
		VehicleID: "bus-999-01",
		RouteID:   "999",
		Lat:       pettahLat,
		Lng:       pettahLng,
		SpeedMPS:  9.0,
		Timestamp: time.Now(),
	})
	if err == nil {
		t.Fatal("expected error for unknown route")
	}
}

func TestETAComputation(t *testing.T) {
	e := newTestEngine()

	e.ProcessTelemetry(&engine.Telemetry{
		VehicleID: "bus-138-01",
		RouteID:   "138",
		Lat:       townHallLat,
		Lng:       townHallLng,
		SpeedMPS:  9.0,
		Timestamp: time.Now(),
	})

	results := e.GetETA("138", "138-s28")
	if results == nil {
		t.Fatal("expected ETA results")
	}
	if len(results) == 0 {
		t.Fatal("expected at least one ETA result")
	}
	if results[0].VehicleID != "bus-138-01" {
		t.Errorf("expected bus-138-01, got %s", results[0].VehicleID)
	}
	if results[0].ETASeconds <= 0 {
		t.Errorf("expected positive ETA, got %.1f", results[0].ETASeconds)
	}
}

func TestETACompletedJourney(t *testing.T) {
	e := newTestEngine()

	e.ProcessTelemetry(&engine.Telemetry{
		VehicleID: "bus-138-01",
		RouteID:   "138",
		Lat:       kottawaLat,
		Lng:       kottawaLng,
		SpeedMPS:  9.0,
		Timestamp: time.Now(),
	})

	result := e.GetJourney("138", "138-s1", "138-s28")
	if result == nil {
		t.Fatal("expected journey result")
	}
	if len(result.Options) > 0 {
		t.Errorf("expected no options for vehicle already past both stops, got %d", len(result.Options))
	}
}

func TestHeadway(t *testing.T) {
	e := newTestEngine()

	e.ProcessTelemetry(&engine.Telemetry{
		VehicleID: "bus-138-01",
		RouteID:   "138",
		Lat:       pettahLat,
		Lng:       pettahLng,
		SpeedMPS:  9.0,
		Timestamp: time.Now(),
	})

	e.ProcessTelemetry(&engine.Telemetry{
		VehicleID: "bus-138-02",
		RouteID:   "138",
		Lat:       townHallLat,
		Lng:       townHallLng,
		SpeedMPS:  8.5,
		Timestamp: time.Now(),
	})

	results := e.GetHeadway("138")
	if results == nil {
		t.Fatal("expected headway results")
	}
	if len(results) != 1 {
		t.Fatalf("expected 1 headway entry, got %d", len(results))
	}
	if results[0].GapM <= 0 {
		t.Errorf("expected positive gap, got %.1f", results[0].GapM)
	}
}

func TestStateVectorCleanup(t *testing.T) {
	sv := engine.NewStateVector()

	sv.Update("bus-138-01", "138", 1000, 9.0, 0, pettahLat, pettahLng, 0.95, time.Now().Add(-10*time.Minute), 0)

	sv.Cleanup(5 * time.Minute)

	if sv.Get("bus-138-01") != nil {
		t.Error("expected vehicle to be cleaned up")
	}
}

func TestStateVectorUpdateChangesRoute(t *testing.T) {
	sv := engine.NewStateVector()

	sv.Update("bus-138-01", "138", 1000, 9.0, 0, pettahLat, pettahLng, 0.95, time.Now(), 0)
	sv.Update("bus-138-01", "100", 2000, 8.0, 0, pettahLat, pettahLng, 0.95, time.Now(), 0)

	byOldRoute := sv.GetByRoute("138")
	if len(byOldRoute) != 0 {
		t.Errorf("expected 0 vehicles on old route 138, got %d", len(byOldRoute))
	}

	byNewRoute := sv.GetByRoute("100")
	if len(byNewRoute) != 1 {
		t.Errorf("expected 1 vehicle on new route 100, got %d", len(byNewRoute))
	}
}

func TestJourneyPlanning(t *testing.T) {
	e := newTestEngine()

	e.ProcessTelemetry(&engine.Telemetry{
		VehicleID: "bus-138-01",
		RouteID:   "138",
		Lat:       pettahLat,
		Lng:       pettahLng,
		SpeedMPS:  9.0,
		Timestamp: time.Now(),
	})

	result := e.GetJourney("138", "138-s5", "138-s28")
	if result == nil {
		t.Fatal("expected journey result")
	}
	if result.FromStop.ID != "138-s5" {
		t.Errorf("expected from stop 138-s5, got %s", result.FromStop.ID)
	}
	if result.ToStop.ID != "138-s28" {
		t.Errorf("expected to stop 138-s28, got %s", result.ToStop.ID)
	}
	if result.DistanceKM <= 0 {
		t.Errorf("expected positive distance, got %.2f", result.DistanceKM)
	}
	if result.Fare["normal"] <= 0 {
		t.Errorf("expected positive fare, got %d", result.Fare["normal"])
	}
	if len(result.Options) == 0 {
		t.Fatal("expected at least one journey option")
	}
}

func TestJourneyInvalidStops(t *testing.T) {
	e := newTestEngine()
	result := e.GetJourney("138", "138-s32", "138-s1")
	if result != nil {
		t.Error("expected nil for from_stop after to_stop")
	}
}

func TestAPITelemetry(t *testing.T) {
	e := newTestEngine()
	srv := engine.NewServer(e)
	ts := httptest.NewServer(srv)
	defer ts.Close()

	body := `{"vehicle_id":"bus-138-01","route_id":"138","lat":6.933211,"lng":79.855435,"speed_mps":9.0}`
	resp, err := http.Post(ts.URL+"/api/v1/telemetry", "application/json", strings.NewReader(body))
	if err != nil {
		t.Fatalf("request failed: %v", err)
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		t.Errorf("expected 200, got %d", resp.StatusCode)
	}

	var result map[string]interface{}
	if err := json.NewDecoder(resp.Body).Decode(&result); err != nil {
		t.Fatalf("decode failed: %v", err)
	}
	if result["status"] != "ok" {
		t.Errorf("expected status ok, got %v", result["status"])
	}
}

func TestAPIETA(t *testing.T) {
	e := newTestEngine()
	srv := engine.NewServer(e)
	ts := httptest.NewServer(srv)
	defer ts.Close()

	e.ProcessTelemetry(&engine.Telemetry{
		VehicleID: "bus-138-01",
		RouteID:   "138",
		Lat:       pettahLat,
		Lng:       pettahLng,
		SpeedMPS:  9.0,
		Timestamp: time.Now(),
	})

	resp, err := http.Get(ts.URL + "/api/v1/eta?route_id=138&stop_id=138-s28")
	if err != nil {
		t.Fatalf("request failed: %v", err)
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		t.Errorf("expected 200, got %d", resp.StatusCode)
	}

	var result map[string]interface{}
	if err := json.NewDecoder(resp.Body).Decode(&result); err != nil {
		t.Fatalf("decode failed: %v", err)
	}
	if result["route_id"] != "138" {
		t.Errorf("expected route 138, got %v", result["route_id"])
	}
}

func TestAPIRoutes(t *testing.T) {
	e := newTestEngine()
	srv := engine.NewServer(e)
	ts := httptest.NewServer(srv)
	defer ts.Close()

	resp, err := http.Get(ts.URL + "/api/v1/routes")
	if err != nil {
		t.Fatalf("request failed: %v", err)
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		t.Errorf("expected 200, got %d", resp.StatusCode)
	}

	var result map[string]interface{}
	if err := json.NewDecoder(resp.Body).Decode(&result); err != nil {
		t.Fatalf("decode failed: %v", err)
	}
	routes := result["routes"].([]interface{})
	if len(routes) < 60 {
		t.Errorf("expected >=60 routes, got %d", len(routes))
	}
}

func TestAPIStatus(t *testing.T) {
	e := newTestEngine()
	srv := engine.NewServer(e)
	ts := httptest.NewServer(srv)
	defer ts.Close()

	e.ProcessTelemetry(&engine.Telemetry{
		VehicleID: "test-vehicle",
		RouteID:   "138",
		Lat:       pettahLat,
		Lng:       pettahLng,
		SpeedMPS:  9.0,
		Timestamp: time.Now(),
	})

	resp, err := http.Get(ts.URL + "/api/v1/status")
	if err != nil {
		t.Fatalf("request failed: %v", err)
	}
	defer resp.Body.Close()

	var result map[string]interface{}
	if err := json.NewDecoder(resp.Body).Decode(&result); err != nil {
		t.Fatalf("decode failed: %v", err)
	}
	if result["vehicles_tracked"].(float64) != 1 {
		t.Errorf("expected 1 vehicle tracked, got %v", result["vehicles_tracked"])
	}
}
