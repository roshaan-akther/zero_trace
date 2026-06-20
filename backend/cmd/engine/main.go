package main

import (
	"flag"
	"fmt"
	"log"
	"net/http"
	"os"
	"time"

	"github.com/agentrix/backend/internal/engine"
	"github.com/agentrix/backend/internal/graph"
	"github.com/agentrix/backend/internal/simulator"
)

func main() {
	simSpeed := flag.Float64("sim-speed", 1.0, "simulator speed multiplier (0=disable)")
	flag.Parse()

	g := graph.NewDefaultGraph()
	eng := engine.New(g)

	eng.States().StartCleanup(30*time.Second, 5*time.Minute)

	if *simSpeed > 0 {
		sim := simulator.New(eng, g)
		fmt.Printf("  Simulator: %.1fx speed\n", *simSpeed)
		sim.RunAsync(*simSpeed)
	}

	srv := engine.NewServer(eng)

	summary := g.Summarize()
	fmt.Printf("╔══════════════════════════════════════════════╗\n")
	fmt.Printf("║     AGENTRIX DYNAMIC TIMETABLE ENGINE       ║\n")
	fmt.Printf("╚══════════════════════════════════════════════╝\n")
	fmt.Printf("  Routes:    %d\n", summary["total_routes"])
	fmt.Printf("  Stops:     %d\n", summary["total_stops"])
	fmt.Printf("  Distance:  %.1f km\n", summary["total_distance_m"].(float64)/1000)
	fmt.Printf("  Listening: :%s\n", getPort())

	log.Fatal(http.ListenAndServe(":"+getPort(), withLogging(srv)))
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
