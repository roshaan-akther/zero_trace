package graph

var TWRoutePettahFort = Route{
	ID:          "tw-pettah-fort",
	Name:        "Pettah – Fort (Short Connector)",
	VehicleType: VehicleThreeWheeler,
	AvgSpeedMPS: 7.0,
	Capacity:    3,
	Polyline: []LatLng{
		{6.9347, 79.8513}, // Pettah Bus Stand
		{6.9342, 79.8520},
		{6.9338, 79.8530},
		{6.9336, 79.8540},
		{6.9336, 79.8553}, // Fort Station
	},
	Stops: []Stop{
		{ID: "TWF-01", Name: "Pettah Bus Stand", Lat: 6.9347, Lng: 79.8513},
		{ID: "TWF-02", Name: "Fort Railway Station", Lat: 6.9336, Lng: 79.8553},
	},
}

var TWRouteWellawattaDehiwala = Route{
	ID:          "tw-wellawatta-dehiwala",
	Name:        "Wellawatta – Dehiwala (Galle Road)",
	VehicleType: VehicleThreeWheeler,
	AvgSpeedMPS: 8.0,
	Capacity:    3,
	Polyline: []LatLng{
		{6.8769, 79.8597}, // Wellawatta
		{6.8740, 79.8600},
		{6.8700, 79.8610},
		{6.8660, 79.8625},
		{6.8620, 79.8645},
		{6.8570, 79.8670}, // Dehiwala
	},
	Stops: []Stop{
		{ID: "TWD-01", Name: "Wellawatta", Lat: 6.8769, Lng: 79.8597},
		{ID: "TWD-02", Name: "Dehiwala", Lat: 6.8570, Lng: 79.8670},
	},
}
