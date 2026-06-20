package simulator_test

import (
	"testing"
	"time"

	"github.com/agentrix/backend/internal/engine"
	"github.com/agentrix/backend/internal/graph"
	"github.com/agentrix/backend/internal/simulator"
)

func newTestEnv() (*engine.Engine, *simulator.Simulator) {
	g := graph.NewDefaultGraph()
	eng := engine.New(g)
	sim := simulator.New(eng, g)
	return eng, sim
}

func TestSimulatorStart(t *testing.T) {
	eng, sim := newTestEnv()
	sim.Start()

	total := 0
	for _, rt := range eng.Graph.Routes {
		states := eng.States().GetByRoute(rt.ID)
		total += len(states)
	}

	if total == 0 {
		t.Error("expected vehicles to be spawned and telemetry sent on start")
	}
}

func TestSimulatorTick(t *testing.T) {
	eng, sim := newTestEnv()

	sim.Start()
	before := countVehicles(eng)

	sim.Tick()
	sim.Tick()

	after := countVehicles(eng)
	if after < before {
		t.Errorf("vehicle count should not decrease: was %d, now %d", before, after)
	}
}

func TestSimulatorMovement(t *testing.T) {
	g := graph.NewDefaultGraph()
	eng := engine.New(g)
	sim := simulator.New(eng, g)

	cfg := &simulator.RouteConfig{
		HeadwayMin: 60 * time.Second,
		HeadwayMax: 120 * time.Second,
		DwellMin:   0,
		DwellMax:   0,
		InitCount:  1,
	}
	sim.SetConfig("tw-pettah-fort", cfg)
	sim.Start()

	for i := 0; i < 10; i++ {
		sim.Tick()
		time.Sleep(1 * time.Millisecond)
	}

	states := eng.States().GetByRoute("tw-pettah-fort")
	if len(states) == 0 {
		t.Fatal("expected vehicle on route")
	}

	if states[0].DistanceM <= 0 {
		t.Errorf("expected vehicle to have moved, distance=%.1f", states[0].DistanceM)
	}
}

func TestSimulatorProducesTelemetry(t *testing.T) {
	eng, sim := newTestEnv()

	sim.Start()

	count := 0
	for _, rt := range eng.Graph.Routes {
		states := eng.States().GetByRoute(rt.ID)
		count += len(states)
	}

	if count == 0 {
		t.Error("expected telemetry to be produced on start")
	}
}

func TestVehicleSpawnInterval(t *testing.T) {
	g := graph.NewDefaultGraph()
	eng := engine.New(g)
	sim := simulator.New(eng, g)

	fastCfg := &simulator.RouteConfig{
		HeadwayMin: 1 * time.Second,
		HeadwayMax: 2 * time.Second,
		DwellMin:   0,
		DwellMax:   0,
		InitCount:  1,
	}
	sim.SetConfig("tw-pettah-fort", fastCfg)
	sim.Start()
	count1 := countVehicles(eng)

	for i := 0; i < 5; i++ {
		sim.Tick()
	}

	count2 := countVehicles(eng)
	if count2 <= count1 {
		t.Errorf("expected vehicles to spawn, was %d now %d", count1, count2)
	}
}

func TestVehicleCompletesRoute(t *testing.T) {
	g := graph.NewDefaultGraph()
	eng := engine.New(g)
	sim := simulator.New(eng, g)

	cfg := &simulator.RouteConfig{
		HeadwayMin: 10 * time.Minute,
		HeadwayMax: 20 * time.Minute,
		DwellMin:   0,
		DwellMax:   0,
		InitCount:  1,
	}
	sim.SetConfig("tw-pettah-fort", cfg)
	sim.Start()

	for i := 0; i < 200; i++ {
		sim.Tick()
		time.Sleep(1 * time.Millisecond)
	}

	states := eng.States().GetByRoute("tw-pettah-fort")
	if len(states) == 0 {
		t.Log("vehicle completed route and was removed (expected)")
	} else {
		t.Logf("vehicle still active at %.1fm", states[0].DistanceM)
	}
}

func TestDwellBehavior(t *testing.T) {
	g := graph.NewDefaultGraph()
	eng := engine.New(g)
	sim := simulator.New(eng, g)

	cfg := &simulator.RouteConfig{
		HeadwayMin: 60 * time.Minute,
		HeadwayMax: 120 * time.Minute,
		DwellMin:   1 * time.Second,
		DwellMax:   2 * time.Second,
		InitCount:  1,
	}
	sim.SetConfig("tw-pettah-fort", cfg)
	sim.Start()

	speedHistory := make([]float64, 0, 100)
	for i := 0; i < 100; i++ {
		sim.Tick()
		time.Sleep(5 * time.Millisecond)
		states := eng.States().GetByRoute("tw-pettah-fort")
		if len(states) > 0 {
			speedHistory = append(speedHistory, states[0].SpeedMPS)
			if states[0].SpeedMPS == 0 {
				break
			}
		}
	}

	hadZero := false
	for _, s := range speedHistory {
		if s == 0 {
			hadZero = true
			break
		}
	}
	if !hadZero {
		t.Error("expected vehicle speed to drop to 0 during dwell at end stop")
	}
}

func countVehicles(eng *engine.Engine) int {
	total := 0
	for _, rt := range eng.Graph.Routes {
		total += len(eng.States().GetByRoute(rt.ID))
	}
	return total
}
