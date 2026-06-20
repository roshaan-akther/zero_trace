package graph

var BusRoutes = []Route{
	Route138,
	Route100,
	Route177,
}

var TrainRoutes = []Route{
	CoastLine,
}

var ThreeWheelerRoutes = []Route{
	TWRoutePettahFort,
	TWRouteWellawattaDehiwala,
}

func initRoutes(g *RouteGraph) {
	for i := range BusRoutes {
		g.AddRoute(&BusRoutes[i])
	}
	for i := range TrainRoutes {
		g.AddRoute(&TrainRoutes[i])
	}
	for i := range ThreeWheelerRoutes {
		g.AddRoute(&ThreeWheelerRoutes[i])
	}
}
