package registry

import (
	"fmt"
	"math"
	"strings"
	"sync"

	"github.com/agentrix/backend/internal/auth"
	"github.com/agentrix/backend/internal/engine"
	"github.com/agentrix/backend/internal/graph"
)

type Vehicle struct {
	ID          string            `json:"id"`
	PlateNumber string            `json:"plate_number"`
	VehicleType graph.VehicleType `json:"vehicle_type"`
	RouteID     string            `json:"route_id"`
	DriverID    string            `json:"driver_id,omitempty"`
	Seats       int               `json:"seats"`
}

type NearbyVehicle struct {
	Vehicle    *Vehicle `json:"vehicle"`
	RouteName  string   `json:"route_name"`
	Lat        float64  `json:"lat"`
	Lng        float64  `json:"lng"`
	DistanceM  float64  `json:"distance_m"`
	Confidence float64  `json:"confidence"`
	SpeedMPS   float64  `json:"speed_mps"`
	LastPing   string   `json:"last_ping"`
	NextStop   string   `json:"next_stop_name,omitempty"`
	ETASeconds float64  `json:"eta_s,omitempty"`
}

type Store struct {
	mu       sync.RWMutex
	vehicles map[string]*Vehicle
	byPlate  map[string]*Vehicle
	byDriver map[string]*Vehicle
	byRoute  map[string][]*Vehicle
}

func NewStore() *Store {
	return &Store{
		vehicles: make(map[string]*Vehicle),
		byPlate:  make(map[string]*Vehicle),
		byDriver: make(map[string]*Vehicle),
		byRoute:  make(map[string][]*Vehicle),
	}
}

func (s *Store) Register(plateNumber, vehicleType, routeID string) (*auth.VehicleInfo, error) {
	s.mu.Lock()
	defer s.mu.Unlock()

	if plateNumber == "" {
		return nil, fmt.Errorf("plate number is required")
	}
	if s.byPlate[plateNumber] != nil {
		return nil, fmt.Errorf("vehicle %s already registered", plateNumber)
	}

	id := "veh-" + plateNumber
	v := &Vehicle{
		ID:          id,
		PlateNumber: plateNumber,
		VehicleType: graph.VehicleType(vehicleType),
		RouteID:     routeID,
	}
	s.vehicles[id] = v
	s.byPlate[plateNumber] = v
	s.byRoute[routeID] = append(s.byRoute[routeID], v)

	return &auth.VehicleInfo{
		PlateNumber: plateNumber,
		VehicleType: vehicleType,
		RouteID:     routeID,
	}, nil
}

func (s *Store) AssignDriver(vehicleID, driverID string) error {
	s.mu.Lock()
	defer s.mu.Unlock()

	v := s.vehicles[vehicleID]
	if v == nil {
		return fmt.Errorf("vehicle not found")
	}
	if v.DriverID != "" {
		delete(s.byDriver, v.DriverID)
	}
	v.DriverID = driverID
	s.byDriver[driverID] = v
	return nil
}

func (s *Store) GetByDriver(driverID string) *Vehicle {
	s.mu.RLock()
	defer s.mu.RUnlock()
	return s.byDriver[driverID]
}

func (s *Store) GetByPlate(plateNumber string) *Vehicle {
	s.mu.RLock()
	defer s.mu.RUnlock()
	return s.byPlate[plateNumber]
}

func (s *Store) GetByRoute(routeID string) []*Vehicle {
	s.mu.RLock()
	defer s.mu.RUnlock()
	return s.byRoute[routeID]
}

func (s *Store) ListAll() []*Vehicle {
	s.mu.RLock()
	defer s.mu.RUnlock()
	result := make([]*Vehicle, 0, len(s.vehicles))
	for _, v := range s.vehicles {
		result = append(result, v)
	}
	return result
}

func (s *Store) SeedDemoData(authStore *auth.Store, g *graph.RouteGraph) {
	count := 0
	for routeID, route := range g.Routes {
		email := "driver@demo.com"
		name := "Demo Driver"
		if count > 0 {
			email = fmt.Sprintf("driver%d@demo.com", count)
			name = fmt.Sprintf("Demo Driver %d", count+1)
		}
		user := authStore.GetUserByEmail(email)
		if user == nil {
			var err error
			user, _, err = authStore.Signup(email, "demo123", name, auth.UserDriver)
			if err != nil {
				count++
				continue
			}
		}
		vtype := string(route.VehicleType)
		if vtype == "" {
			vtype = "bus"
		}
		plate := fmt.Sprintf("DEMO-%s", routeID)
		vi, err := s.Register(plate, vtype, routeID)
		if err != nil {
			if !strings.Contains(err.Error(), "already registered") {
				continue
			}
			vi = &auth.VehicleInfo{PlateNumber: plate}
			_ = s.AssignDriver("veh-"+vi.PlateNumber, user.ID)
		} else {
			_ = s.AssignDriver("veh-"+vi.PlateNumber, user.ID)
		}
		count++
	}
	fmt.Printf("  Demo drivers: %d\n", count)
}

func (s *Store) Nearby(lat, lng float64, radiusKM float64, graph *graph.RouteGraph, eng *engine.Engine) []NearbyVehicle {
	radiusM := radiusKM * 1000
	states := eng.States().Snapshot()

	s.mu.RLock()
	defer s.mu.RUnlock()

	var result []NearbyVehicle
	for _, state := range states {
		d := haversine(lat, lng, state.Lat, state.Lng)
		if d > radiusM {
			continue
		}

		nv := NearbyVehicle{
			Lat:        state.Lat,
			Lng:        state.Lng,
			DistanceM:  d,
			Confidence: state.Confidence,
			SpeedMPS:   state.SpeedMPS,
			LastPing:   state.LastPingTime.Format("15:04:05"),
		}

		v := s.byPlate[state.VehicleID]
		if v == nil {
			routes := s.byRoute[state.RouteID]
			if len(routes) > 0 {
				v = routes[0]
			}
		}
		if v != nil {
			nv.Vehicle = v
			route := graph.GetRoute(v.RouteID)
			if route != nil {
				nv.RouteName = route.Name
			}
		} else {
			route := graph.GetRoute(state.RouteID)
			if route != nil {
				nv.RouteName = route.Name + " (unregistered)"
			}
		}

		if state.NextStopIdx >= 0 {
			route := graph.GetRoute(state.RouteID)
			if route != nil && state.NextStopIdx < len(route.Stops) {
				nv.NextStop = route.Stops[state.NextStopIdx].Name
				eta := route.ETAForStop(state.NextStopIdx, state.DistanceM, state.SpeedMPS)
				if !math.IsInf(eta, 0) && !math.IsNaN(eta) {
					nv.ETASeconds = eta
				}
			}
		}

		result = append(result, nv)
	}
	return result
}

func haversine(lat1, lng1, lat2, lng2 float64) float64 {
	const R = 6371000.0
	dLat := (lat2 - lat1) * math.Pi / 180
	dLng := (lng2 - lng1) * math.Pi / 180
	a := math.Sin(dLat/2)*math.Sin(dLat/2) +
		math.Cos(lat1*math.Pi/180)*math.Cos(lat2*math.Pi/180)*
			math.Sin(dLng/2)*math.Sin(dLng/2)
	return R * 2 * math.Atan2(math.Sqrt(a), math.Sqrt(1-a))
}
