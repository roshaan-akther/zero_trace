package simulator

import (
	"math/rand"
	"time"

	"github.com/agentrix/backend/internal/engine"
	"github.com/agentrix/backend/internal/graph"
)

type RouteConfig struct {
	HeadwayMin  time.Duration
	HeadwayMax  time.Duration
	DwellMin    time.Duration
	DwellMax    time.Duration
	SpeedFactor float64
	InitCount   int
}

type vehicle struct {
	id          string
	routeID     string
	route       *graph.Route
	distanceM   float64
	speedMPS    float64
	nextStopIdx int
	dwelling    bool
	dwellUntil  time.Time
}

type Simulator struct {
	engine     *engine.Engine
	graph      *graph.RouteGraph
	vehicles   []*vehicle
	rng        *rand.Rand
	tickCount  int64
	spawnTimer map[string]time.Duration
	cfg        map[string]*RouteConfig
}

func New(eng *engine.Engine, g *graph.RouteGraph) *Simulator {
	return &Simulator{
		engine:     eng,
		graph:      g,
		rng:        rand.New(rand.NewSource(time.Now().UnixNano())),
		spawnTimer: make(map[string]time.Duration),
		cfg:        defaultConfigs(),
	}
}

func defaultConfigs() map[string]*RouteConfig {
	return map[string]*RouteConfig{
		"138": {
			HeadwayMin: 8 * time.Minute, HeadwayMax: 12 * time.Minute,
			DwellMin: 15 * time.Second, DwellMax: 30 * time.Second,
			InitCount: 3,
		},
		"100": {
			HeadwayMin: 12 * time.Minute, HeadwayMax: 18 * time.Minute,
			DwellMin: 10 * time.Second, DwellMax: 25 * time.Second,
			InitCount: 3,
		},
		"177": {
			HeadwayMin: 10 * time.Minute, HeadwayMax: 15 * time.Minute,
			DwellMin: 12 * time.Second, DwellMax: 28 * time.Second,
			InitCount: 3,
		},
		"coast-line": {
			HeadwayMin: 20 * time.Minute, HeadwayMax: 40 * time.Minute,
			DwellMin: 30 * time.Second, DwellMax: 60 * time.Second,
			InitCount: 2,
		},
		"tw-pettah-fort": {
			HeadwayMin: 2 * time.Minute, HeadwayMax: 4 * time.Minute,
			DwellMin: 0, DwellMax: 0,
			InitCount: 0,
		},
		"tw-wellawatta-dehiwala": {
			HeadwayMin: 3 * time.Minute, HeadwayMax: 5 * time.Minute,
			DwellMin: 0, DwellMax: 0,
			InitCount: 0,
		},
	}
}

func (s *Simulator) SetConfig(routeID string, cfg *RouteConfig) {
	s.cfg[routeID] = cfg
}

func (s *Simulator) Start() {
	for routeID, cfg := range s.cfg {
		s.spawnTimer[routeID] = randomDuration(s.rng, cfg.HeadwayMin, cfg.HeadwayMax)
		for i := 0; i < cfg.InitCount; i++ {
			s.spawnVehicle(routeID, time.Duration(i)*cfg.HeadwayMin)
		}
	}
}

func (s *Simulator) spawnVehicle(routeID string, offset time.Duration) {
	route := s.graph.GetRoute(routeID)
	if route == nil {
		return
	}
	cfg := s.cfg[routeID]
	if cfg == nil {
		return
	}

	speed := route.AvgSpeedMPS * (0.8 + s.rng.Float64()*0.4)
	dist := speed * float64(offset.Seconds())
	if dist >= route.TotalLengthM {
		dist = route.TotalLengthM - 10
	}
	if dist < 0 {
		dist = 0
	}

	nextStopIdx := 0
	for i, stop := range route.Stops {
		if stop.DistanceAlongM > dist+5 {
			nextStopIdx = i
			break
		}
	}

	v := &vehicle{
		id:          routeID + "-sim-" + s.nextLetter(),
		routeID:     routeID,
		route:       route,
		distanceM:   dist,
		speedMPS:    speed,
		nextStopIdx: nextStopIdx,
	}
	s.vehicles = append(s.vehicles, v)

	s.emitTelemetry(v)
}

var letterCounter int

func (s *Simulator) nextLetter() string {
	letterCounter++
	return string(rune('A' + (letterCounter-1)%26))
}

func (s *Simulator) Tick() {
	s.tickCount++

	for _, v := range s.vehicles {
		s.tickVehicle(v)
	}

	for routeID, cfg := range s.cfg {
		s.spawnTimer[routeID] -= time.Second
		if s.spawnTimer[routeID] <= 0 {
			s.spawnVehicle(routeID, 0)
			s.spawnTimer[routeID] = randomDuration(s.rng, cfg.HeadwayMin, cfg.HeadwayMax)
		}
	}

	alive := s.vehicles[:0]
	for _, v := range s.vehicles {
		if v.distanceM < v.route.TotalLengthM {
			alive = append(alive, v)
		}
	}
	s.vehicles = alive
}

func (s *Simulator) tickVehicle(v *vehicle) {
	if !v.dwelling {
		v.distanceM += v.speedMPS

		if v.nextStopIdx < len(v.route.Stops) {
			stopDist := v.route.Stops[v.nextStopIdx].DistanceAlongM
			if v.distanceM >= stopDist {
				v.distanceM = stopDist
				v.dwelling = true
				v.speedMPS = 0
				v.nextStopIdx++

				cfg := s.cfg[v.routeID]
				if cfg != nil && cfg.DwellMax > 0 {
					v.dwellUntil = time.Now().Add(randomDuration(s.rng, cfg.DwellMin, cfg.DwellMax))
				} else {
					v.dwellUntil = time.Now()
				}
			}
		}
	} else {
		if time.Now().After(v.dwellUntil) {
			v.dwelling = false
			v.speedMPS = v.route.AvgSpeedMPS * (0.75 + s.rng.Float64()*0.5)
		}
	}

	s.emitTelemetry(v)
}

func (s *Simulator) emitTelemetry(v *vehicle) {
	pos := graph.InterpolatePosition(v.route.Polyline, v.distanceM)
	latNoise := (s.rng.Float64() - 0.5) * 0.00009
	lngNoise := (s.rng.Float64() - 0.5) * 0.00009

	s.engine.ProcessTelemetry(&engine.Telemetry{
		VehicleID: v.id,
		RouteID:   v.routeID,
		Lat:       pos.Lat + latNoise,
		Lng:       pos.Lng + lngNoise,
		SpeedMPS:  v.speedMPS,
		Heading:   0,
		Timestamp: time.Now(),
	})
}

func (s *Simulator) Run(speedMul float64) {
	if speedMul <= 0 {
		speedMul = 1
	}
	s.Start()
	ticker := time.NewTicker(time.Duration(float64(time.Second) / speedMul))
	defer ticker.Stop()
	for range ticker.C {
		s.Tick()
	}
}

func (s *Simulator) RunAsync(speedMul float64) {
	go s.Run(speedMul)
}

func randomDuration(rng *rand.Rand, min, max time.Duration) time.Duration {
	if max <= min {
		return min
	}
	return min + time.Duration(rng.Int63n(int64(max - min)))
}
