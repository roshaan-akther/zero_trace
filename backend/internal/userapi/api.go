package userapi

import (
	"encoding/json"
	"fmt"
	"net/http"
	"strings"
	"sync"
	"time"

	"github.com/agentrix/backend/internal/auth"
	"github.com/agentrix/backend/internal/engine"
	"github.com/agentrix/backend/internal/graph"
	"github.com/agentrix/backend/internal/registry"
)

const maxBodyBytes = 1 << 16

type TravelPlan struct {
	ID           string    `json:"id"`
	UserID       string    `json:"user_id"`
	FromStopID   string    `json:"from_stop_id"`
	FromStopName string    `json:"from_stop_name"`
	ToStopID     string    `json:"to_stop_id"`
	ToStopName   string    `json:"to_stop_name"`
	RouteID      string    `json:"route_id"`
	RouteName    string    `json:"route_name"`
	DistanceKM   float64   `json:"distance_km"`
	Fare         int       `json:"fare"`
	Finalized    bool      `json:"finalized"`
	CreatedAt    time.Time `json:"created_at"`
}

type GPSPoint struct {
	Lat     float64   `json:"lat"`
	Lng     float64   `json:"lng"`
	SpeedMPS float64  `json:"speed_mps"`
	Time    time.Time `json:"time"`
}

type Advisory struct {
	ID        string    `json:"id"`
	UserID    string    `json:"user_id"`
	RouteID   string    `json:"route_id"`
	Title     string    `json:"title"`
	Body      string    `json:"body"`
	Severity  string    `json:"severity"`
	CreatedAt time.Time `json:"created_at"`
	Read      bool      `json:"read"`
}

type Server struct {
	authStore    *auth.Store
	eng          *engine.Engine
	graph        *graph.RouteGraph
	registry     *registry.Store
	plans        map[string][]*TravelPlan
	plansMu      sync.RWMutex
	gpsHistories map[string][]GPSPoint
	gpsMu        sync.RWMutex
	advisories   map[string][]*Advisory
	advMu        sync.RWMutex
	planCounter  int
	advCounter   int
}

func NewServer(authStore *auth.Store, eng *engine.Engine, g *graph.RouteGraph) *Server {
	return &Server{
		authStore:    authStore,
		eng:          eng,
		graph:        g,
		plans:        make(map[string][]*TravelPlan),
		gpsHistories: make(map[string][]GPSPoint),
		advisories:   make(map[string][]*Advisory),
	}
}

func (s *Server) WithRegistry(r *registry.Store) {
	s.registry = r
}

func (s *Server) RegisterHandlers(mux *http.ServeMux) {
	mux.HandleFunc("/api/v1/plans", s.handlePlans)
	mux.HandleFunc("/api/v1/plans/finalize", s.handleFinalizePlan)
	mux.HandleFunc("/api/v1/plans/history", s.handlePlanHistory)
	mux.HandleFunc("/api/v1/driver/gps", s.handleDriverGPS)
	mux.HandleFunc("/api/v1/driver/gps/history", s.handleDriverGPSHistory)
	mux.HandleFunc("/api/v1/driver/advisories", s.handleDriverAdvisories)
	mux.HandleFunc("/api/v1/driver/advisories/", s.handleDriverAdvisoryRead)
	mux.HandleFunc("/api/v1/driver/routes", s.handleDriverRoutes)
	mux.HandleFunc("/api/v1/driver/routes/", s.handleDriverRouteDetail)
	mux.HandleFunc("/api/v1/vehicles/nearby", s.handleNearbyVehicles)
	mux.HandleFunc("/api/v1/driver/vehicle", s.handleDriverVehicle)
}

func userID(r *http.Request) string {
	uid, _ := auth.UserIDFromContext(r)
	return uid
}

func userType(r *http.Request) auth.UserType {
	ut, _ := auth.UserTypeFromContext(r)
	return ut
}

type planRequest struct {
	FromStopID string `json:"from_stop_id"`
	ToStopID   string `json:"to_stop_id"`
	RouteID    string `json:"route_id"`
}

func (s *Server) handlePlans(w http.ResponseWriter, r *http.Request) {
	switch r.Method {
	case http.MethodPost:
		s.createPlan(w, r)
	case http.MethodOptions:
		writeJSON(w, http.StatusOK, nil)
	default:
		writeJSON(w, http.StatusMethodNotAllowed, errResp("POST required"))
	}
}

func (s *Server) createPlan(w http.ResponseWriter, r *http.Request) {
	uid := userID(r)
	if uid == "" {
		writeJSON(w, http.StatusUnauthorized, errResp("unauthorized"))
		return
	}

	r.Body = http.MaxBytesReader(w, r.Body, maxBodyBytes)
	var req planRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		writeJSON(w, http.StatusBadRequest, errResp("invalid JSON: "+err.Error()))
		return
	}

	route := s.graph.GetRoute(req.RouteID)
	if route == nil {
		writeJSON(w, http.StatusNotFound, errResp("route not found"))
		return
	}

	var fromStop, toStop *graph.Stop
	for i := range route.Stops {
		if route.Stops[i].ID == req.FromStopID {
			fromStop = &route.Stops[i]
		}
		if route.Stops[i].ID == req.ToStopID {
			toStop = &route.Stops[i]
		}
	}
	if fromStop == nil || toStop == nil {
		writeJSON(w, http.StatusNotFound, errResp("stop not found on route"))
		return
	}

	distanceKM := (toStop.DistanceAlongM - fromStop.DistanceAlongM) / 1000.0
	if distanceKM < 0 {
		writeJSON(w, http.StatusBadRequest, errResp("from_stop must be before to_stop"))
		return
	}

	rawFare := s.eng.GetJourney(req.RouteID, req.FromStopID, req.ToStopID)
	var fare int
	if rawFare != nil {
		fare = rawFare.Fare["normal"]
	}

	s.plansMu.Lock()
	s.planCounter++
	plan := &TravelPlan{
		ID:           fmt.Sprintf("plan-%d", s.planCounter),
		UserID:       uid,
		FromStopID:   req.FromStopID,
		FromStopName: fromStop.Name,
		ToStopID:     req.ToStopID,
		ToStopName:   toStop.Name,
		RouteID:      req.RouteID,
		RouteName:    route.Name,
		DistanceKM:   distanceKM,
		Fare:         fare,
		Finalized:    false,
		CreatedAt:    time.Now(),
	}
	s.plans[uid] = append(s.plans[uid], plan)
	s.plansMu.Unlock()

	writeJSON(w, http.StatusCreated, plan)
}

func (s *Server) handleFinalizePlan(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		writeJSON(w, http.StatusMethodNotAllowed, errResp("POST required"))
		return
	}

	uid := userID(r)
	if uid == "" {
		writeJSON(w, http.StatusUnauthorized, errResp("unauthorized"))
		return
	}

	r.Body = http.MaxBytesReader(w, r.Body, maxBodyBytes)
	var req struct {
		PlanID string `json:"plan_id"`
	}
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		writeJSON(w, http.StatusBadRequest, errResp("invalid JSON: "+err.Error()))
		return
	}

	s.plansMu.Lock()
	found := false
	for _, p := range s.plans[uid] {
		if p.ID == req.PlanID {
			p.Finalized = true
			found = true
			break
		}
	}
	s.plansMu.Unlock()

	if !found {
		writeJSON(w, http.StatusNotFound, errResp("plan not found"))
		return
	}

	writeJSON(w, http.StatusOK, map[string]string{"status": "finalized"})
}

func (s *Server) handlePlanHistory(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodGet {
		writeJSON(w, http.StatusMethodNotAllowed, errResp("GET required"))
		return
	}

	uid := userID(r)
	if uid == "" {
		writeJSON(w, http.StatusUnauthorized, errResp("unauthorized"))
		return
	}

	finalizedOnly := r.URL.Query().Get("finalized") == "true"

	s.plansMu.RLock()
	plans := s.plans[uid]
	s.plansMu.RUnlock()

	var result []*TravelPlan
	for _, p := range plans {
		if finalizedOnly && !p.Finalized {
			continue
		}
		result = append(result, p)
	}
	if result == nil {
		result = []*TravelPlan{}
	}

	writeJSON(w, http.StatusOK, map[string]interface{}{
		"plans": result,
	})
}

type gpsRequest struct {
	Lat      float64 `json:"lat"`
	Lng      float64 `json:"lng"`
	SpeedMPS float64 `json:"speed_mps"`
}

var maxGPSHistory = 10000

func (s *Server) handleDriverGPS(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		writeJSON(w, http.StatusMethodNotAllowed, errResp("POST required"))
		return
	}

	uid := userID(r)
	if uid == "" {
		writeJSON(w, http.StatusUnauthorized, errResp("unauthorized"))
		return
	}

	r.Body = http.MaxBytesReader(w, r.Body, maxBodyBytes)
	var req gpsRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		writeJSON(w, http.StatusBadRequest, errResp("invalid JSON: "+err.Error()))
		return
	}

	point := GPSPoint{
		Lat:      req.Lat,
		Lng:      req.Lng,
		SpeedMPS: req.SpeedMPS,
		Time:     time.Now(),
	}

	s.gpsMu.Lock()
	s.gpsHistories[uid] = append(s.gpsHistories[uid], point)
	if len(s.gpsHistories[uid]) > maxGPSHistory {
		s.gpsHistories[uid] = s.gpsHistories[uid][len(s.gpsHistories[uid])-maxGPSHistory:]
	}
	s.gpsMu.Unlock()

	writeJSON(w, http.StatusOK, map[string]string{"status": "ok"})
}

func (s *Server) handleDriverGPSHistory(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodGet {
		writeJSON(w, http.StatusMethodNotAllowed, errResp("GET required"))
		return
	}

	uid := userID(r)
	if uid == "" {
		writeJSON(w, http.StatusUnauthorized, errResp("unauthorized"))
		return
	}

	since := r.URL.Query().Get("since")
	var sinceTime time.Time
	if since != "" {
		sinceTime, _ = time.Parse(time.RFC3339, since)
	}

	s.gpsMu.RLock()
	points := s.gpsHistories[uid]
	s.gpsMu.RUnlock()

	if sinceTime.IsZero() {
		if points == nil {
			points = []GPSPoint{}
		}
		writeJSON(w, http.StatusOK, map[string]interface{}{
			"points": points,
		})
		return
	}

	var filtered []GPSPoint
	for _, p := range points {
		if p.Time.After(sinceTime) {
			filtered = append(filtered, p)
		}
	}
	if filtered == nil {
		filtered = []GPSPoint{}
	}
	writeJSON(w, http.StatusOK, map[string]interface{}{
		"points": filtered,
	})
}

func (s *Server) handleDriverAdvisories(w http.ResponseWriter, r *http.Request) {
	switch r.Method {
	case http.MethodGet:
		s.getAdvisories(w, r)
	case http.MethodPost:
		s.createAdvisory(w, r)
	case http.MethodOptions:
		writeJSON(w, http.StatusOK, nil)
	default:
		writeJSON(w, http.StatusMethodNotAllowed, errResp("GET or POST required"))
	}
}

func (s *Server) getAdvisories(w http.ResponseWriter, r *http.Request) {
	uid := userID(r)
	if uid == "" {
		writeJSON(w, http.StatusUnauthorized, errResp("unauthorized"))
		return
	}

	s.advMu.RLock()
	advs := s.advisories[uid]
	s.advMu.RUnlock()

	if advs == nil {
		advs = []*Advisory{}
	}
	writeJSON(w, http.StatusOK, map[string]interface{}{
		"advisories": advs,
	})
}

type createAdvisoryRequest struct {
	RouteID  string `json:"route_id"`
	Title    string `json:"title"`
	Body     string `json:"body"`
	Severity string `json:"severity"`
}

func (s *Server) createAdvisory(w http.ResponseWriter, r *http.Request) {
	uid := userID(r)
	if uid == "" {
		writeJSON(w, http.StatusUnauthorized, errResp("unauthorized"))
		return
	}

	r.Body = http.MaxBytesReader(w, r.Body, maxBodyBytes)
	var req createAdvisoryRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		writeJSON(w, http.StatusBadRequest, errResp("invalid JSON: "+err.Error()))
		return
	}

	if req.Title == "" || req.Body == "" {
		writeJSON(w, http.StatusBadRequest, errResp("title and body required"))
		return
	}
	if req.Severity == "" {
		req.Severity = "info"
	}

	s.advMu.Lock()
	s.advCounter++
	adv := &Advisory{
		ID:        fmt.Sprintf("adv-%d", s.advCounter),
		UserID:    uid,
		RouteID:   req.RouteID,
		Title:     req.Title,
		Body:      req.Body,
		Severity:  req.Severity,
		CreatedAt: time.Now(),
		Read:      false,
	}
	s.advisories[uid] = append(s.advisories[uid], adv)
	s.advMu.Unlock()

	writeJSON(w, http.StatusCreated, adv)
}

func (s *Server) handleDriverAdvisoryRead(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		writeJSON(w, http.StatusMethodNotAllowed, errResp("POST required"))
		return
	}

	uid := userID(r)
	if uid == "" {
		writeJSON(w, http.StatusUnauthorized, errResp("unauthorized"))
		return
	}

	path := strings.TrimPrefix(r.URL.Path, "/api/v1/driver/advisories/")
	advID := strings.TrimSuffix(path, "/read")
	advID = strings.TrimSuffix(advID, "/")

	if advID == "" {
		writeJSON(w, http.StatusBadRequest, errResp("advisory ID required"))
		return
	}

	s.advMu.Lock()
	found := false
	for _, a := range s.advisories[uid] {
		if a.ID == advID {
			a.Read = true
			found = true
			break
		}
	}
	s.advMu.Unlock()

	if !found {
		writeJSON(w, http.StatusNotFound, errResp("advisory not found"))
		return
	}

	writeJSON(w, http.StatusOK, map[string]string{"status": "read"})
}

func (s *Server) handleDriverRoutes(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodGet {
		writeJSON(w, http.StatusMethodNotAllowed, errResp("GET required"))
		return
	}

	uid := userID(r)
	if uid == "" {
		writeJSON(w, http.StatusUnauthorized, errResp("unauthorized"))
		return
	}

	var list []map[string]interface{}
	for _, rt := range s.graph.Routes {
		vehicles := s.eng.States().GetByRoute(rt.ID)
		list = append(list, map[string]interface{}{
			"id":              rt.ID,
			"name":            rt.Name,
			"vehicle_type":    rt.VehicleType,
			"stops":           len(rt.Stops),
			"length_m":        rt.TotalLengthM,
			"length_km":       rt.TotalLengthM / 1000,
			"active_vehicles": len(vehicles),
		})
	}
	if list == nil {
		list = []map[string]interface{}{}
	}

	writeJSON(w, http.StatusOK, map[string]interface{}{
		"routes": list,
	})
}

func (s *Server) handleDriverRouteDetail(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodGet {
		writeJSON(w, http.StatusMethodNotAllowed, errResp("GET required"))
		return
	}

	uid := userID(r)
	if uid == "" {
		writeJSON(w, http.StatusUnauthorized, errResp("unauthorized"))
		return
	}

	path := strings.TrimPrefix(r.URL.Path, "/api/v1/driver/routes/")
	parts := strings.Split(path, "/")
	if len(parts) == 0 || parts[0] == "" {
		writeJSON(w, http.StatusBadRequest, errResp("route_id required"))
		return
	}

	routeID := parts[0]
	rt := s.graph.GetRoute(routeID)
	if rt == nil {
		writeJSON(w, http.StatusNotFound, errResp("route not found"))
		return
	}

	if len(parts) >= 2 && parts[1] == "stops" {
		writeJSON(w, http.StatusOK, map[string]interface{}{
			"route_id": rt.ID,
			"stops":    rt.Stops,
		})
		return
	}

	writeJSON(w, http.StatusOK, map[string]interface{}{
		"id":             rt.ID,
		"name":           rt.Name,
		"vehicle_type":   rt.VehicleType,
		"stops":          rt.Stops,
		"polyline":       rt.Polyline,
		"total_length_m": rt.TotalLengthM,
		"avg_speed_mps":  rt.AvgSpeedMPS,
		"capacity":       rt.Capacity,
	})
}

func (s *Server) handleNearbyVehicles(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodGet {
		writeJSON(w, http.StatusMethodNotAllowed, errResp("GET required"))
		return
	}

	latStr := r.URL.Query().Get("lat")
	lngStr := r.URL.Query().Get("lng")
	radiusStr := r.URL.Query().Get("radius")
	if latStr == "" || lngStr == "" {
		writeJSON(w, http.StatusBadRequest, errResp("lat and lng required"))
		return
	}

	var latF, lngF float64
	if _, err := fmt.Sscanf(latStr, "%f", &latF); err != nil {
		writeJSON(w, http.StatusBadRequest, errResp("invalid lat"))
		return
	}
	if _, err := fmt.Sscanf(lngStr, "%f", &lngF); err != nil {
		writeJSON(w, http.StatusBadRequest, errResp("invalid lng"))
		return
	}

	radiusKM := 100.0
	if radiusStr != "" {
		fmt.Sscanf(radiusStr, "%f", &radiusKM)
	}

	if s.registry == nil {
		writeJSON(w, http.StatusOK, map[string]interface{}{
			"vehicles": []interface{}{},
		})
		return
	}

	vehicles := s.registry.Nearby(latF, lngF, radiusKM, s.graph, s.eng)
	if vehicles == nil {
		vehicles = []registry.NearbyVehicle{}
	}

	writeJSON(w, http.StatusOK, map[string]interface{}{
		"vehicles":  vehicles,
		"lat":       latF,
		"lng":       lngF,
		"radius_km": radiusKM,
	})
}

func (s *Server) handleDriverVehicle(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodGet {
		writeJSON(w, http.StatusMethodNotAllowed, errResp("GET required"))
		return
	}

	uid := userID(r)
	if uid == "" {
		writeJSON(w, http.StatusUnauthorized, errResp("unauthorized"))
		return
	}

	if s.registry == nil {
		writeJSON(w, http.StatusNotFound, errResp("no vehicle registry"))
		return
	}

	v := s.registry.GetByDriver(uid)
	if v == nil {
		writeJSON(w, http.StatusNotFound, errResp("no vehicle assigned"))
		return
	}

	writeJSON(w, http.StatusOK, map[string]interface{}{
		"vehicle": v,
	})
}

func writeJSON(w http.ResponseWriter, status int, data interface{}) {
	w.Header().Set("Content-Type", "application/json")
	w.Header().Set("Access-Control-Allow-Origin", "*")
	w.Header().Set("Access-Control-Allow-Methods", "GET, POST, OPTIONS")
	w.Header().Set("Access-Control-Allow-Headers", "Content-Type, Authorization")
	w.WriteHeader(status)
	json.NewEncoder(w).Encode(data)
}

func errResp(msg string) map[string]string {
	return map[string]string{"error": msg}
}
