package main

import (
	"flag"
	"fmt"
	"log"
	"net/http"
	"os"
	"time"

	"github.com/joho/godotenv"

	"github.com/agentrix/backend/internal/auth"
	"github.com/agentrix/backend/internal/engine"
	"github.com/agentrix/backend/internal/graph"
	"github.com/agentrix/backend/internal/registry"
	"github.com/agentrix/backend/internal/simulator"
	"github.com/agentrix/backend/internal/userapi"
)

func main() {
	simSpeed := flag.Float64("sim-speed", 10.0, "simulator speed multiplier (0=disable)")
	flag.Parse()

	godotenv.Load()

	dsn := os.Getenv("DATABASE_URL")
	if dsn == "" {
		dsn = "postgresql://postgres:postgres@localhost:5432/agentrix?sslmode=disable"
	}

	db, err := auth.OpenDB(dsn)
	if err != nil {
		log.Fatalf("database: %v", err)
	}
	defer db.Close()

	if err := auth.MigrateDB(db); err != nil {
		log.Fatalf("migrate: %v", err)
	}
	auth.StartSessionCleanup(db)

	g := graph.NewDefaultGraph()
	eng := engine.New(g)

	eng.States().StartCleanup(30*time.Second, 5*time.Minute)

	if *simSpeed > 0 {
		sim := simulator.New(eng, g)
		fmt.Printf("  Simulator: %.1fx speed\n", *simSpeed)
		sim.RunAsync(*simSpeed)
	}

	authStore := auth.NewStore(db)
	authServer := auth.NewServer(authStore)
	userAPIServer := userapi.NewServer(authStore, eng, g)

	vehRegistry := registry.NewStore()
	vehRegistry.SeedDemoData(authStore, g)
	authServer.WithVehicleRegistrar(vehRegistry)
	userAPIServer.WithRegistry(vehRegistry)

	mux := http.NewServeMux()

	mux.Handle("/api/v1/auth/signup", cors(http.HandlerFunc(authServer.HandleSignup)))
	mux.Handle("/api/v1/auth/login", cors(http.HandlerFunc(authServer.HandleLogin)))
	mux.Handle("/api/v1/auth/me", cors(http.HandlerFunc(authServer.HandleMe)))

	srv := engine.NewServer(eng)
	srv.RegisterRoutesOn(mux)

	userAPIServer.RegisterHandlers(mux)

	wrapped := authMiddleware(authStore, mux)

	summary := g.Summarize()
	fmt.Printf("╔══════════════════════════════════════════════╗\n")
	fmt.Printf("║     AGENTRIX DYNAMIC TIMETABLE ENGINE       ║\n")
	fmt.Printf("╚══════════════════════════════════════════════╝\n")
	fmt.Printf("  Routes:    %d\n", summary["total_routes"])
	fmt.Printf("  Stops:     %d\n", summary["total_stops"])
	fmt.Printf("  Distance:  %.1f km\n", summary["total_distance_m"].(float64)/1000)
	fmt.Printf("  Listening: :%s\n", getPort())

	log.Fatal(http.ListenAndServe(":"+getPort(), withLogging(wrapped)))
}

func getPort() string {
	if p := os.Getenv("PORT"); p != "" {
		return p
	}
	return "8080"
}

func withLogging(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		start := time.Now()
		lrw := &loggingResponseWriter{ResponseWriter: w, status: 200}
		next.ServeHTTP(lrw, r)
		log.Printf("%s %s %d %s", r.Method, r.URL.Path, lrw.status, time.Since(start).Round(time.Millisecond))
	})
}

type loggingResponseWriter struct {
	http.ResponseWriter
	status int
}

func (lrw *loggingResponseWriter) WriteHeader(code int) {
	lrw.status = code
	lrw.ResponseWriter.WriteHeader(code)
}

func cors(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("Access-Control-Allow-Origin", "*")
		w.Header().Set("Access-Control-Allow-Methods", "GET, POST, OPTIONS")
		w.Header().Set("Access-Control-Allow-Headers", "Content-Type, Authorization")
		if r.Method == http.MethodOptions {
			w.WriteHeader(http.StatusOK)
			return
		}
		next.ServeHTTP(w, r)
	})
}

func authMiddleware(store *auth.Store, next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("Access-Control-Allow-Origin", "*")
		w.Header().Set("Access-Control-Allow-Methods", "GET, POST, OPTIONS")
		w.Header().Set("Access-Control-Allow-Headers", "Content-Type, Authorization")
		if r.Method == http.MethodOptions {
			w.WriteHeader(http.StatusOK)
			return
		}

		if needsAuth(r.URL.Path) {
			auth.Middleware(store, next).ServeHTTP(w, r)
			return
		}
		next.ServeHTTP(w, r)
	})
}

func needsAuth(path string) bool {
	unauthed := []string{
		"/api/v1/auth/signup",
		"/api/v1/auth/login",
		"/api/v1/telemetry",
		"/api/v1/routes",
		"/api/v1/eta",
		"/api/v1/headway",
		"/api/v1/status",
		"/api/v1/vehicles/nearby",
	}
	for _, u := range unauthed {
		if path == u || stringsHasPrefix(path, u+"/") {
			return false
		}
	}
	return true
}

func stringsHasPrefix(s, prefix string) bool {
	return len(s) >= len(prefix) && s[:len(prefix)] == prefix
}
