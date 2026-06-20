package graph

func NewDefaultGraph() *RouteGraph {
	g := NewRouteGraph()
	initRoutes(g)
	return g
}

func (g *RouteGraph) Summarize() map[string]interface{} {
	summary := make(map[string]interface{})
	routesByType := make(map[VehicleType][]string)
	for _, r := range g.Routes {
		routesByType[r.VehicleType] = append(routesByType[r.VehicleType], r.ID)
	}
	totalStops := 0
	totalDistance := 0.0
	for _, r := range g.Routes {
		totalStops += len(r.Stops)
		totalDistance += r.TotalLengthM
	}
	summary["total_routes"] = len(g.Routes)
	summary["total_stops"] = totalStops
	summary["total_distance_m"] = totalDistance
	summary["routes_by_type"] = routesByType
	return summary
}
