package auth

import (
	"encoding/json"
	"fmt"
	"net/http"
	"strings"
)

const maxBodyBytes = 1 << 16

type VehicleInfo struct {
	PlateNumber string `json:"plate_number"`
	VehicleType string `json:"vehicle_type"`
	RouteID     string `json:"route_id"`
}

type signupRequest struct {
	Email    string       `json:"email"`
	Password string       `json:"password"`
	Name     string       `json:"name"`
	Type     UserType     `json:"type"`
	Vehicle  *VehicleInfo `json:"vehicle,omitempty"`
}

type loginRequest struct {
	Email    string `json:"email"`
	Password string `json:"password"`
}

type authResponse struct {
	User    *User        `json:"user"`
	Token   string       `json:"token"`
	Vehicle *VehicleInfo `json:"vehicle,omitempty"`
}

type VehicleRegistrar interface {
	Register(plateNumber string, vehicleType string, routeID string) (*VehicleInfo, error)
	AssignDriver(vehicleID, driverID string) error
}

type Server struct {
	store    *Store
	vehicles VehicleRegistrar
}

func NewServer(store *Store) *Server {
	return &Server{store: store}
}

func (s *Server) WithVehicleRegistrar(vr VehicleRegistrar) {
	s.vehicles = vr
}

func (s *Server) HandleSignup(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		writeJSON(w, http.StatusMethodNotAllowed, errResp("POST required"))
		return
	}

	r.Body = http.MaxBytesReader(w, r.Body, maxBodyBytes)
	var req signupRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		writeJSON(w, http.StatusBadRequest, errResp("invalid JSON: "+err.Error()))
		return
	}

	user, token, err := s.store.Signup(req.Email, req.Password, req.Name, req.Type)
	if err != nil {
		writeJSON(w, http.StatusBadRequest, errResp(err.Error()))
		return
	}

	resp := authResponse{User: user, Token: token}

	if req.Vehicle != nil && s.vehicles != nil {
		reg, err := s.vehicles.Register(req.Vehicle.PlateNumber, req.Vehicle.VehicleType, req.Vehicle.RouteID)
		if err != nil {
			writeJSON(w, http.StatusBadRequest, errResp("vehicle registration: "+err.Error()))
			return
		}
		if err := s.vehicles.AssignDriver("veh-"+req.Vehicle.PlateNumber, user.ID); err != nil {
			writeJSON(w, http.StatusInternalServerError, errResp("driver assignment: "+err.Error()))
			return
		}
		resp.Vehicle = reg
	}

	writeJSON(w, http.StatusCreated, resp)
}

func (s *Server) HandleLogin(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		writeJSON(w, http.StatusMethodNotAllowed, errResp("POST required"))
		return
	}

	r.Body = http.MaxBytesReader(w, r.Body, maxBodyBytes)
	var req loginRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		writeJSON(w, http.StatusBadRequest, errResp("invalid JSON: "+err.Error()))
		return
	}

	user, token, err := s.store.Login(req.Email, req.Password)
	if err != nil {
		writeJSON(w, http.StatusUnauthorized, errResp(err.Error()))
		return
	}

	writeJSON(w, http.StatusOK, authResponse{User: user, Token: token})
}

func (s *Server) HandleMe(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodGet {
		writeJSON(w, http.StatusMethodNotAllowed, errResp("GET required"))
		return
	}

	userID, ok := UserIDFromContext(r)
	if !ok {
		writeJSON(w, http.StatusUnauthorized, errResp("unauthorized"))
		return
	}

	user := s.store.GetUser(userID)
	if user == nil {
		writeJSON(w, http.StatusNotFound, errResp("user not found"))
		return
	}

	writeJSON(w, http.StatusOK, user)
}

type contextKey string

const ctxKeyUserID contextKey = "user_id"
const ctxKeyUserType contextKey = "user_type"

func UserIDFromContext(r *http.Request) (string, bool) {
	uid := r.Context().Value(ctxKeyUserID)
	if uid == nil {
		return "", false
	}
	return uid.(string), true
}

func UserTypeFromContext(r *http.Request) (UserType, bool) {
	ut := r.Context().Value(ctxKeyUserType)
	if ut == nil {
		return "", false
	}
	return ut.(UserType), true
}

func Middleware(store *Store, next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		auth := r.Header.Get("Authorization")
		if auth == "" {
			writeJSON(w, http.StatusUnauthorized, errResp("authorization header required"))
			return
		}

		token := strings.TrimPrefix(auth, "Bearer ")
		if token == auth {
			writeJSON(w, http.StatusUnauthorized, errResp("Bearer token required"))
			return
		}

		userID, userType, err := store.ValidateToken(token)
		if err != nil {
			writeJSON(w, http.StatusUnauthorized, errResp(err.Error()))
			return
		}

		r = r.WithContext(withUserID(r.Context(), userID, userType))
		next.ServeHTTP(w, r)
	})
}

func RequireType(userType UserType, next http.HandlerFunc) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		ut, ok := UserTypeFromContext(r)
		if !ok {
			writeJSON(w, http.StatusUnauthorized, errResp("unauthorized"))
			return
		}
		if ut != userType {
			writeJSON(w, http.StatusForbidden, errResp(fmt.Sprintf("requires %s role", userType)))
			return
		}
		next(w, r)
	}
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
