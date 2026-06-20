package engine

import (
	"encoding/json"
	"net/http"
	"strings"
	"time"
)

const maxBodyBytes = 1 << 16

type Server struct {
	engine *Engine
	mux    *http.ServeMux
}

func NewServer(e *Engine) *Server {
	s := &Server{
		engine: e,
		mux:    http.NewServeMux(),
	}
	s.registerRoutes()
	return s
}

func (s *Server) ServeHTTP(w http.ResponseWriter, r *http.Request) {
	s.mux.ServeHTTP(w, r)
}

func (s *Server) registerRoutes() {
	s.mux.HandleFunc("/api/v1/telemetry", s.handleTelemetry)
	s.mux.HandleFunc("/api/v1/eta", s.handleETA)
	s.mux.HandleFunc("/api/v1/eta/journey", s.handleJourney)
	s.mux.HandleFunc("/api/v1/headway", s.handleHeadway)
	s.mux.HandleFunc("/api/v1/routes", s.handleRoutes)
	s.mux.HandleFunc("/api/v1/routes/", s.handleRouteDetail)
	s.mux.HandleFunc("/api/v1/status", s.handleStatus)
}

func (s *Server) handleTelemetry(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		writeJSON(w, http.StatusMethodNotAllowed, errResp("POST required"))
		return
	}

	r.Body = http.MaxBytesReader(w, r.Body, maxBodyBytes)
	var t Telemetry
	if err := json.NewDecoder(r.Body).Decode(&t); err != nil {
		writeJSON(w, http.StatusBadRequest, errResp("invalid JSON: "+err.Error()))
		return
	}
	if t.Timestamp.IsZero() {
		t.Timestamp = time.Now()
	}

	resp, err := s.engine.ProcessTelemetry(&t)
	if err != nil {
		writeJSON(w, http.StatusBadRequest, errResp(err.Error()))
		return
	}

	writeJSON(w, http.StatusOK, resp)
}

func (s *Server) handleETA(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodGet {
		writeJSON(w, http.StatusMethodNotAllowed, errResp("GET required"))
		return
	}

	routeID := r.URL.Query().Get("route_id")
	stopID := r.URL.Query().Get("stop_id")
	if routeID == "" || stopID == "" {
		writeJSON(w, http.StatusBadRequest, errResp("route_id and stop_id required"))
		return
	}

	results := s.engine.GetETA(routeID, stopID)
	if results == nil {
		writeJSON(w, http.StatusNotFound, errResp("route or stop not found"))
		return
	}

	writeJSON(w, http.StatusOK, map[string]interface{}{
		"route_id": routeID,
		"stop_id":  stopID,
		"vehicles": results,
	})
}

func (s *Server) handleJourney(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodGet {
		writeJSON(w, http.StatusMethodNotAllowed, errResp("GET required"))
		return
	}

	routeID := r.URL.Query().Get("route_id")
	fromStop := r.URL.Query().Get("from_stop")
	toStop := r.URL.Query().Get("to_stop")
	if routeID == "" || fromStop == "" || toStop == "" {
		writeJSON(w, http.StatusBadRequest, errResp("route_id, from_stop, to_stop required"))
		return
	}

	result := s.engine.GetJourney(routeID, fromStop, toStop)
	if result == nil {
		writeJSON(w, http.StatusNotFound, errResp("route or stops not found, or from_stop after to_stop"))
		return
	}

	writeJSON(w, http.StatusOK, result)
}

func (s *Server) handleHeadway(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodGet {
		writeJSON(w, http.StatusMethodNotAllowed, errResp("GET required"))
		return
	}

	routeID := r.URL.Query().Get("route_id")
	if routeID == "" {
		writeJSON(w, http.StatusBadRequest, errResp("route_id required"))
		return
	}

	results := s.engine.GetHeadway(routeID)
	if results == nil {
		writeJSON(w, http.StatusNotFound, errResp("route not found or <2 vehicles"))
		return
	}

	writeJSON(w, http.StatusOK, map[string]interface{}{
		"route_id": routeID,
		"vehicles": results,
	})
}

func (s *Server) handleRoutes(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodGet {
		writeJSON(w, http.StatusMethodNotAllowed, errResp("GET required"))
		return
	}

	var list []map[string]interface{}
	for _, rt := range s.engine.Graph.Routes {
		list = append(list, map[string]interface{}{
			"id":              rt.ID,
			"name":            rt.Name,
			"vehicle_type":    rt.VehicleType,
			"stops":           len(rt.Stops),
			"length_m":        rt.TotalLengthM,
			"length_km":       rt.TotalLengthM / 1000,
			"avg_speed_mps":   rt.AvgSpeedMPS,
			"capacity":        rt.Capacity,
		})
	}

	writeJSON(w, http.StatusOK, map[string]interface{}{
		"routes": list,
	})
}

func (s *Server) handleRouteDetail(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodGet {
		writeJSON(w, http.StatusMethodNotAllowed, errResp("GET required"))
		return
	}

	path := strings.TrimPrefix(r.URL.Path, "/api/v1/routes/")
	parts := strings.Split(path, "/")
	if len(parts) == 0 || parts[0] == "" {
		writeJSON(w, http.StatusBadRequest, errResp("route_id required"))
		return
	}

	routeID := parts[0]
	rt := s.engine.Graph.GetRoute(routeID)
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
		"id":            rt.ID,
		"name":          rt.Name,
		"vehicle_type":  rt.VehicleType,
		"stops":         rt.Stops,
		"polyline":      rt.Polyline,
		"total_length_m": rt.TotalLengthM,
		"avg_speed_mps": rt.AvgSpeedMPS,
		"capacity":      rt.Capacity,
	})
}

func (s *Server) handleStatus(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodGet {
		writeJSON(w, http.StatusMethodNotAllowed, errResp("GET required"))
		return
	}

	vehicleCount, routeCount := s.engine.States().Stats()
	writeJSON(w, http.StatusOK, map[string]interface{}{
		"vehicles_tracked": vehicleCount,
		"routes_monitored": routeCount,
		"total_routes":     s.engine.Graph.RouteCount(),
	})
}

func writeJSON(w http.ResponseWriter, status int, data interface{}) {
	w.Header().Set("Content-Type", "application/json")
	w.Header().Set("Access-Control-Allow-Origin", "*")
	w.Header().Set("Access-Control-Allow-Methods", "GET, POST, OPTIONS")
	w.Header().Set("Access-Control-Allow-Headers", "Content-Type")
	w.WriteHeader(status)
	json.NewEncoder(w).Encode(data)
}

func errResp(msg string) map[string]string {
	return map[string]string{"error": msg}
}
