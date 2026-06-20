package graph

import (
	"math"
)

type LatLng struct {
	Lat float64 `json:"lat"`
	Lng float64 `json:"lng"`
}

type Stop struct {
	ID                string  `json:"id"`
	Name              string  `json:"name"`
	Lat               float64 `json:"lat"`
	Lng               float64 `json:"lng"`
	DistanceAlongM    float64 `json:"distance_m"`
}

type VehicleType string

const (
	VehicleBus          VehicleType = "bus"
	VehicleTrain        VehicleType = "train"
	VehicleThreeWheeler VehicleType = "three_wheeler"
)

type Route struct {
	ID          string      `json:"id"`
	Name        string      `json:"name"`
	VehicleType VehicleType `json:"vehicle_type"`
	Polyline    []LatLng    `json:"polyline"`
	Stops       []Stop      `json:"stops"`
	TotalLengthM float64    `json:"total_length_m"`
	AvgSpeedMPS float64     `json:"avg_speed_mps"`
	Capacity    int         `json:"capacity"`
}

type RouteGraph struct {
	Routes      map[string]*Route `json:"routes"`
	StopsByID   map[string]*Stop  `json:"-"`
	StopsByRoute map[string][]*Stop `json:"-"`
}

func NewRouteGraph() *RouteGraph {
	return &RouteGraph{
		Routes:       make(map[string]*Route),
		StopsByID:    make(map[string]*Stop),
		StopsByRoute: make(map[string][]*Stop),
	}
}

func (g *RouteGraph) AddRoute(r *Route) {
	if r.Polyline == nil {
		r.Polyline = []LatLng{}
	}
	if r.Stops == nil {
		r.Stops = []Stop{}
	}

	precomputePolylineDistances(r)
	precomputeStopDistances(r)

	g.Routes[r.ID] = r
	g.StopsByRoute[r.ID] = make([]*Stop, len(r.Stops))
	for i := range r.Stops {
		s := &r.Stops[i]
		g.StopsByID[s.ID] = s
		g.StopsByRoute[r.ID][i] = s
	}
}

func (g *RouteGraph) GetRoute(id string) *Route {
	return g.Routes[id]
}

func (g *RouteGraph) GetStop(id string) *Stop {
	return g.StopsByID[id]
}

func (g *RouteGraph) StopsForRoute(routeID string) []*Stop {
	return g.StopsByRoute[routeID]
}

func (g *RouteGraph) RouteCount() int {
	return len(g.Routes)
}

func (g *RouteGraph) StopCount() int {
	return len(g.StopsByID)
}

func haversine(a, b LatLng) float64 {
	const R = 6371000.0
	dLat := (b.Lat - a.Lat) * math.Pi / 180
	dLng := (b.Lng - a.Lng) * math.Pi / 180
	lat1 := a.Lat * math.Pi / 180
	lat2 := b.Lat * math.Pi / 180
	x := math.Sin(dLat/2)*math.Sin(dLat/2) +
		math.Sin(dLng/2)*math.Sin(dLng/2)*math.Cos(lat1)*math.Cos(lat2)
	return R * 2 * math.Atan2(math.Sqrt(x), math.Sqrt(1-x))
}

func precomputePolylineDistances(r *Route) {
	if len(r.Polyline) == 0 {
		return
	}
	r.TotalLengthM = 0
	pts := make([]float64, len(r.Polyline))
	pts[0] = 0
	for i := 1; i < len(r.Polyline); i++ {
		d := haversine(r.Polyline[i-1], r.Polyline[i])
		r.TotalLengthM += d
		pts[i] = r.TotalLengthM
	}
}

func precomputeStopDistances(r *Route) {
	if len(r.Stops) == 0 || len(r.Polyline) < 2 {
		return
	}
	for i := range r.Stops {
		r.Stops[i].DistanceAlongM = projectStopOntoPolyline(&r.Stops[i], r.Polyline)
	}
}

func projectStopOntoPolyline(s *Stop, polyline []LatLng) float64 {
	stopLL := LatLng{s.Lat, s.Lng}
	minDist := math.MaxFloat64
	bestDistAlong := 0.0
	cumulative := 0.0

	for i := 1; i < len(polyline); i++ {
		d := haversine(polyline[i-1], polyline[i])
		projected := projectPointOntoSegment(polyline[i-1], polyline[i], stopLL)
		if projected < 0 {
			projected = 0
		} else if projected > d {
			projected = d
		}
		distAlong := cumulative + projected
		perpDist := pointSegmentDistance(polyline[i-1], polyline[i], stopLL)
		if perpDist < minDist {
			minDist = perpDist
			bestDistAlong = distAlong
		}
		cumulative += d
	}

	return bestDistAlong
}

func projectPointOntoSegment(a, b, p LatLng) float64 {
	ab := LatLng{b.Lat - a.Lat, b.Lng - a.Lng}
	ap := LatLng{p.Lat - a.Lat, p.Lng - a.Lng}
	abSq := ab.Lat*ab.Lat + ab.Lng*ab.Lng
	if abSq == 0 {
		return 0
	}
	t := (ap.Lat*ab.Lat + ap.Lng*ab.Lng) / abSq
	segLen := math.Sqrt(abSq)
	return t * segLen
}

func pointSegmentDistance(a, b, p LatLng) float64 {
	ab := LatLng{b.Lat - a.Lat, b.Lng - a.Lng}
	ap := LatLng{p.Lat - a.Lat, p.Lng - a.Lng}
	abSq := ab.Lat*ab.Lat + ab.Lng*ab.Lng

	if abSq == 0 {
		return haversine(a, p)
	}

	t := (ap.Lat*ab.Lat + ap.Lng*ab.Lng) / abSq
	if t < 0 {
		return haversine(a, p)
	}
	if t > 1 {
		return haversine(b, p)
	}

	proj := LatLng{a.Lat + t*ab.Lat, a.Lng + t*ab.Lng}
	return haversine(proj, p)
}

func (r *Route) ETAForStop(stopIndex int, distanceAlongM float64, speedMPS float64) float64 {
	if speedMPS < 0.5 {
		return math.Inf(1)
	}
	if stopIndex < 0 || stopIndex >= len(r.Stops) {
		return math.Inf(1)
	}
	remaining := r.Stops[stopIndex].DistanceAlongM - distanceAlongM
	if remaining < 0 {
		return 0
	}
	return remaining / speedMPS
}

func (r *Route) FareForDistance(km float64) int {
	base := 30.0
	stageKm := 0.8
	stages := math.Ceil(km / stageKm)
	if stages < 1 {
		stages = 1
	}
	return int(math.Round(base + (stages-1)*9))
}
