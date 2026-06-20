package engine

import (
	"fmt"
	"math"
	"sync"
	"time"

	"github.com/agentrix/backend/internal/fare"
	"github.com/agentrix/backend/internal/graph"
)

var SriLankaBounds = struct {
	MinLat, MaxLat float64
	MinLng, MaxLng float64
}{5.9, 9.9, 79.6, 81.9}

type Telemetry struct {
	VehicleID string    `json:"vehicle_id"`
	RouteID   string    `json:"route_id"`
	Lat       float64   `json:"lat"`
	Lng       float64   `json:"lng"`
	SpeedMPS  float64   `json:"speed_mps"`
	Heading   float64   `json:"heading"`
	Timestamp time.Time `json:"timestamp"`
}

type TelemetryResponse struct {
	Status       string  `json:"status"`
	VehicleID    string  `json:"vehicle_id"`
	DistanceM    float64 `json:"distance_m"`
	Confidence   float64 `json:"confidence"`
	NextStopID   string  `json:"next_stop_id,omitempty"`
	NextStopName string  `json:"next_stop_name,omitempty"`
	ETASeconds   float64 `json:"eta_s,omitempty"`
}

type VehicleState struct {
	VehicleID    string    `json:"vehicle_id"`
	RouteID      string    `json:"route_id"`
	DistanceM    float64   `json:"distance_m"`
	SpeedMPS     float64   `json:"speed_mps"`
	Heading      float64   `json:"heading"`
	Lat          float64   `json:"lat"`
	Lng          float64   `json:"lng"`
	Confidence   float64   `json:"confidence"`
	LastPingTime time.Time `json:"last_ping_time"`
	NextStopIdx  int       `json:"-"`
}

type ETAEntry struct {
	VehicleID  string  `json:"vehicle_id"`
	DistanceM  float64 `json:"distance_m"`
	SpeedMPS   float64 `json:"speed_mps"`
	ETASeconds float64 `json:"eta_s"`
	Confidence float64 `json:"confidence"`
}

type HeadwayEntry struct {
	VehicleID       string  `json:"vehicle_id"`
	DistanceM       float64 `json:"distance_m"`
	NextVehicleID   string  `json:"next_vehicle_id"`
	NextDistanceM   float64 `json:"next_distance_m"`
	GapM            float64 `json:"gap_m"`
	ForwardSpeedMPS float64 `json:"forward_speed_mps"`
	GapSeconds      float64 `json:"gap_s"`
}

type JourneyOption struct {
	VehicleID   string  `json:"vehicle_id"`
	ETAFromS    float64 `json:"eta_from_s"`
	TravelTimeS float64 `json:"travel_time_s"`
	TotalTimeS  float64 `json:"total_time_s"`
}

type Engine struct {
	Graph  *graph.RouteGraph
	states *StateVector
}

func New(g *graph.RouteGraph) *Engine {
	return &Engine{
		Graph:  g,
		states: NewStateVector(),
	}
}

func (e *Engine) States() *StateVector {
	return e.states
}

func (e *Engine) ProcessTelemetry(t *Telemetry) (*TelemetryResponse, error) {
	if t.SpeedMPS > 30.0 {
		return nil, fmt.Errorf("outlier: speed %.1f m/s exceeds max 30 m/s", t.SpeedMPS)
	}
	if t.Lat < SriLankaBounds.MinLat || t.Lat > SriLankaBounds.MaxLat ||
		t.Lng < SriLankaBounds.MinLng || t.Lng > SriLankaBounds.MaxLng {
		return nil, fmt.Errorf("outlier: coordinates (%.4f, %.4f) outside Sri Lanka", t.Lat, t.Lng)
	}

	route := e.Graph.GetRoute(t.RouteID)
	if route == nil {
		return nil, fmt.Errorf("unknown route: %s", t.RouteID)
	}

	distanceM, confidence := graph.MatchPoint(route.Polyline, graph.LatLng{t.Lat, t.Lng})

	if confidence < 0.2 {
		return nil, fmt.Errorf("low confidence: point too far from route (conf=%.2f)", confidence)
	}

	nextStopIdx := -1
	for i, s := range route.Stops {
		if s.DistanceAlongM > distanceM+20 {
			nextStopIdx = i
			break
		}
	}

	eta := math.Inf(1)
	if nextStopIdx >= 0 && t.SpeedMPS >= 0.5 {
		eta = route.ETAForStop(nextStopIdx, distanceM, t.SpeedMPS)
	}

	e.states.Update(t.VehicleID, t.RouteID, distanceM, t.SpeedMPS, t.Heading, t.Lat, t.Lng, confidence, t.Timestamp, nextStopIdx)

	resp := &TelemetryResponse{
		Status:     "ok",
		VehicleID:  t.VehicleID,
		DistanceM:  distanceM,
		Confidence: confidence,
	}

	if nextStopIdx >= 0 {
		resp.NextStopID = route.Stops[nextStopIdx].ID
		resp.NextStopName = route.Stops[nextStopIdx].Name
		resp.ETASeconds = eta
	}

	return resp, nil
}

func (e *Engine) GetETA(routeID, stopID string) []ETAEntry {
	route := e.Graph.GetRoute(routeID)
	if route == nil {
		return nil
	}

	stopIdx := -1
	for i, s := range route.Stops {
		if s.ID == stopID {
			stopIdx = i
			break
		}
	}
	if stopIdx < 0 {
		return nil
	}

	stopDist := route.Stops[stopIdx].DistanceAlongM
	vehicles := e.states.GetByRoute(routeID)

	var result []ETAEntry
	for _, v := range vehicles {
		if v.DistanceM >= stopDist-20 {
			continue
		}
		eta := route.ETAForStop(stopIdx, v.DistanceM, v.SpeedMPS)
		result = append(result, ETAEntry{
			VehicleID:  v.VehicleID,
			DistanceM:  v.DistanceM,
			SpeedMPS:   v.SpeedMPS,
			ETASeconds: eta,
			Confidence: v.Confidence,
		})
	}
	return result
}

type JourneyResult struct {
	FromStop   *graph.Stop      `json:"from_stop"`
	ToStop     *graph.Stop      `json:"to_stop"`
	DistanceKM float64          `json:"distance_km"`
	Fare       map[string]int   `json:"fare"`
	Options    []JourneyOption  `json:"options"`
}

func (e *Engine) GetJourney(routeID, fromStopID, toStopID string) *JourneyResult {
	route := e.Graph.GetRoute(routeID)
	if route == nil {
		return nil
	}

	var fromStop, toStop *graph.Stop
	fromIdx, toIdx := -1, -1
	for i, s := range route.Stops {
		if s.ID == fromStopID {
			fromStop = &route.Stops[i]
			fromIdx = i
		}
		if s.ID == toStopID {
			toStop = &route.Stops[i]
			toIdx = i
		}
	}
	if fromStop == nil || toStop == nil || fromIdx >= toIdx {
		return nil
	}

	distanceKM := (toStop.DistanceAlongM - fromStop.DistanceAlongM) / 1000.0
	vehicles := e.states.GetByRoute(routeID)

	var options []JourneyOption
	for _, v := range vehicles {
		if v.DistanceM >= fromStop.DistanceAlongM-20 {
			continue
		}
		etaFrom := route.ETAForStop(fromIdx, v.DistanceM, v.SpeedMPS)
		etaTo := route.ETAForStop(toIdx, v.DistanceM, v.SpeedMPS)
		if math.IsInf(etaFrom, 0) || math.IsInf(etaTo, 0) {
			continue
		}
		travelTime := etaTo - etaFrom
		if travelTime < 0 {
			travelTime = 0
		}
		options = append(options, JourneyOption{
			VehicleID:   v.VehicleID,
			ETAFromS:    etaFrom,
			TravelTimeS: travelTime,
			TotalTimeS:  etaTo,
		})
	}

	return &JourneyResult{
		FromStop:   fromStop,
		ToStop:     toStop,
		DistanceKM: distanceKM,
		Fare: map[string]int{
			"normal":        fare.Calculate(distanceKM, fare.Normal),
			"semi_luxury":   fare.Calculate(distanceKM, fare.SemiLuxury),
			"luxury":        fare.Calculate(distanceKM, fare.Luxury),
			"super_luxury":  fare.Calculate(distanceKM, fare.SuperLuxury),
			"three_wheeler": fare.ThreeWheeler(distanceKM),
		},
		Options: options,
	}
}

func (e *Engine) GetHeadway(routeID string) []HeadwayEntry {
	route := e.Graph.GetRoute(routeID)
	if route == nil {
		return nil
	}

	vehicles := e.states.GetByRoute(routeID)
	if len(vehicles) < 2 {
		return nil
	}

	for i := 0; i < len(vehicles); i++ {
		for j := i + 1; j < len(vehicles); j++ {
			if vehicles[j].DistanceM < vehicles[i].DistanceM {
				vehicles[i], vehicles[j] = vehicles[j], vehicles[i]
			}
		}
	}

	var result []HeadwayEntry
	for i := 0; i < len(vehicles)-1; i++ {
		gapM := vehicles[i+1].DistanceM - vehicles[i].DistanceM
		gapS := math.Inf(1)
		if vehicles[i].SpeedMPS >= 0.5 {
			gapS = gapM / vehicles[i].SpeedMPS
		}
		result = append(result, HeadwayEntry{
			VehicleID:       vehicles[i].VehicleID,
			DistanceM:       vehicles[i].DistanceM,
			NextVehicleID:   vehicles[i+1].VehicleID,
			NextDistanceM:   vehicles[i+1].DistanceM,
			GapM:            gapM,
			ForwardSpeedMPS: vehicles[i].SpeedMPS,
			GapSeconds:      gapS,
		})
	}
	return result
}

type StateVector struct {
	mu       sync.RWMutex
	vehicles map[string]*VehicleState
	byRoute  map[string]map[string]*VehicleState
}

func NewStateVector() *StateVector {
	return &StateVector{
		vehicles: make(map[string]*VehicleState),
		byRoute:  make(map[string]map[string]*VehicleState),
	}
}

func (sv *StateVector) Update(vehicleID, routeID string, distanceM, speedMPS, heading, lat, lng, confidence float64, timestamp time.Time, nextStopIdx int) {
	sv.mu.Lock()
	defer sv.mu.Unlock()

	if prev, ok := sv.vehicles[vehicleID]; ok && prev.RouteID != routeID {
		delete(sv.byRoute[prev.RouteID], vehicleID)
	}

	sv.vehicles[vehicleID] = &VehicleState{
		VehicleID:    vehicleID,
		RouteID:      routeID,
		DistanceM:    distanceM,
		SpeedMPS:     speedMPS,
		Heading:      heading,
		Lat:          lat,
		Lng:          lng,
		Confidence:   confidence,
		LastPingTime: timestamp,
		NextStopIdx:  nextStopIdx,
	}

	if sv.byRoute[routeID] == nil {
		sv.byRoute[routeID] = make(map[string]*VehicleState)
	}
	sv.byRoute[routeID][vehicleID] = sv.vehicles[vehicleID]
}

func (sv *StateVector) Get(vehicleID string) *VehicleState {
	sv.mu.RLock()
	defer sv.mu.RUnlock()
	return sv.vehicles[vehicleID]
}

func (sv *StateVector) GetByRoute(routeID string) []*VehicleState {
	sv.mu.RLock()
	defer sv.mu.RUnlock()

	routeStates := sv.byRoute[routeID]
	if routeStates == nil {
		return nil
	}

	result := make([]*VehicleState, 0, len(routeStates))
	for _, v := range routeStates {
		result = append(result, v)
	}
	return result
}

func (sv *StateVector) Remove(vehicleID string) {
	sv.mu.Lock()
	defer sv.mu.Unlock()

	if v, ok := sv.vehicles[vehicleID]; ok {
		delete(sv.byRoute[v.RouteID], vehicleID)
		delete(sv.vehicles, vehicleID)
	}
}

func (sv *StateVector) Cleanup(staleAge time.Duration) {
	sv.mu.Lock()
	defer sv.mu.Unlock()

	cutoff := time.Now().Add(-staleAge)
	for id, v := range sv.vehicles {
		if v.LastPingTime.Before(cutoff) {
			delete(sv.byRoute[v.RouteID], id)
			delete(sv.vehicles, id)
		}
	}
}

func (sv *StateVector) StartCleanup(interval, staleAge time.Duration) {
	go func() {
		for {
			time.Sleep(interval)
			sv.Cleanup(staleAge)
		}
	}()
}

func (sv *StateVector) Stats() (vehicles int, routes int) {
	sv.mu.RLock()
	defer sv.mu.RUnlock()
	return len(sv.vehicles), len(sv.byRoute)
}

func (sv *StateVector) Snapshot() []*VehicleState {
	sv.mu.RLock()
	defer sv.mu.RUnlock()

	result := make([]*VehicleState, 0, len(sv.vehicles))
	for _, v := range sv.vehicles {
		cp := *v
		result = append(result, &cp)
	}
	return result
}
