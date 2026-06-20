package graph

import "strconv"

type _place struct {
	Name string
	Lat  float64
	Lng  float64
}

type _routeDef struct {
	ID       string
	Name     string
	VType    VehicleType
	Speed    float64
	Capacity int
	PIDs     []int
}

var _places = map[int]_place{
	1:   {"Pettah", 6.933211, 79.855435},
	2:   {"Fort Railway Station", 6.934085, 79.850221},
	3:   {"Lotus Road", 6.933978, 79.846991},
	4:   {"Galle Face Green", 6.921959, 79.846085},
	5:   {"Kollupitiya Junc.", 6.911159, 79.849652},
	6:   {"McDonalds, Kollupitiya", 6.903171, 79.852297},
	7:   {"Bambalapitiya Junc.", 6.893686, 79.855456},
	8:   {"Holy Family Convent, Bambalapitiya", 6.887812, 79.857318},
	9:   {"Savoy Cinema, Wellawatte", 6.88027, 79.85956},
	10:  {"Wellawatte Junc.", 6.875344, 79.861014},
	16:  {"Lake House", 6.932609, 79.847989},
	19:  {"Gamini Hall Junc.", 6.926533, 79.861813},
	20:  {"Darley Road/Excel World", 6.921661, 79.862167},
	21:  {"Gangarama", 6.918109, 79.854341},
	22:  {"Bishop's College", 6.914594, 79.855928},
	23:  {"Mahanama College", 6.905679, 79.853579},
	24:  {"British Council", 6.899832, 79.855542},
	25:  {"Regal Cinema", 6.931283, 79.846959},
	26:  {"Slave Island", 6.923296, 79.851626},
	27:  {"Town Hall", 6.916799, 79.863364},
	28:  {"Public Library", 6.912869, 79.857945},
	29:  {"St. Bridget's Convent", 6.909652, 79.863685},
	30:  {"Race Course Grounds", 6.90618, 79.863685},
	31:  {"Campus (Arts Faculty)", 6.90258, 79.862237},
	32:  {"Campus (near Wycherley)", 6.900023, 79.859544},
	33:  {"Thurstan College", 6.905019, 79.858342},
	34:  {"Glass House", 6.910941, 79.858342},
	35:  {"Thunmulla", 6.896189, 79.860263},
	36:  {"Police Park", 6.892876, 79.861979},
	37:  {"Thimbirigasyaya", 6.889979, 79.863793},
	38:  {"BRC Grounds", 6.887529, 79.864501},
	39:  {"Redimola Junc.", 6.883631, 79.868277},
	40:  {"Maya Ave.", 6.880766, 79.870402},
	41:  {"Kirulapone Junc.", 6.878582, 79.874629},
	42:  {"Kirulapone South", 6.877719, 79.878631},
	43:  {"Balapokuna Road", 6.873842, 79.881849},
	44:  {"Anula Vidyalaya", 6.871946, 79.884317},
	45:  {"Nugegoda", 6.869315, 79.889628},
	46:  {"Seventh Mile Post", 6.866855, 79.893297},
	47:  {"Gansabha Junc.", 6.865108, 79.896559},
	48:  {"Delkanda", 6.862818, 79.901794},
	49:  {"Wijerama", 6.857641, 79.908607},
	50:  {"Navinna", 6.855105, 79.913392},
	51:  {"Arpico M'gama", 6.852432, 79.917018},
	52:  {"Wattegedara Junc.", 6.851228, 79.921106},
	53:  {"Maharagama", 6.846083, 79.928144},
	74:  {"Sugathadasa Stadium", 6.946662, 79.869146},
	75:  {"Armour Street", 6.943425, 79.864254},
	76:  {"Ananda College", 6.924499, 79.868031},
	77:  {"Maradana", 6.928237, 79.864619},
	78:  {"Castle Street Hospital", 6.910973, 79.88525},
	79:  {"Devi Balika Vidyalaya", 6.911015, 79.882118},
	80:  {"Alwis Place, Kollupitiya", 6.912645, 79.853911},
	81:  {"Arts Fac. Horton Place", 6.911548, 79.868717},
	82:  {"Green Path", 6.911729, 79.862012},
	83:  {"Stratford Avenue", 6.877613, 79.873019},
	84:  {"Kirulapone Ave.", 6.882694, 79.875573},
	85:  {"Suwisuddharamaya", 6.880127, 79.869554},
	86:  {"Sapphire Halt", 6.876697, 79.866421},
	87:  {"Pamankada", 6.876984, 79.869661},
	88:  {"Vijaya Kumaratunge Mw.", 6.885527, 79.876742},
	89:  {"Apollo Hospital", 6.889223, 79.876893},
	90:  {"Narahenpita Junc.", 6.891886, 79.877011},
	100: {"Borella", 6.914743, 79.877601},
	101: {"Horton Place - Baseline Junc.", 6.91126, 79.877472},
	102: {"Borella Cemetery Junc.", 6.908587, 79.877279},
	103: {"Sarana Road", 6.905583, 79.87347},
	104: {"Maitland Place", 6.902899, 79.870487},
	201: {"Delmon Hospital", 6.870711, 79.86206},
	202: {"Ramakrishna Road", 6.865896, 79.863047},
	203: {"William Grinding Mills", 6.862514, 79.863766},
	204: {"Dehiwala Municipal Council", 6.861033, 79.864125},
	205: {"St. Mary's Church, Dehiwala", 6.859175, 79.864522},
	206: {"Holy Family Convent, Dehiwala", 6.857172, 79.865016},
	207: {"Dehiwala Junc.", 6.850823, 79.865992},
	208: {"Dehiwala Cemetery", 6.844933, 79.866217},
	209: {"Hotel Road, Mt. Lavinia", 6.841971, 79.866904},
	210: {"S. Thomas' College, Mt. Lavinia", 6.837753, 79.86744},
	211: {"Mount Lavinia Junc.", 6.832959, 79.867301},
	212: {"Maliban Junc.", 6.81943, 79.873706},
	213: {"Belekkade Junc., Rathmalana", 6.814743, 79.87877},
	214: {"Rathmalana Airport", 6.812442, 79.881152},
	215: {"Soysapura", 6.804622, 79.886688},
	216: {"Katubedda Junc.", 6.797325, 79.888533},
	217: {"Rawatawatta", 6.788035, 79.885111},
	218: {"Moratuwa", 6.774494, 79.88245},
	219: {"Panadura", 6.711376, 79.907609},
	220: {"Angulana", 6.798188, 79.873009},
	230: {"Dutugemunu Street", 6.870593, 79.877359},
	231: {"Kohuwala", 6.867068, 79.884574},
	232: {"Woodlands", 6.862301, 79.888394},
	233: {"Pepiliyana", 6.856661, 79.890647},
	234: {"Raththanapitiya", 6.848336, 79.897599},
	235: {"Boralesgamuwa", 6.841242, 79.901612},
	236: {"Werahera", 6.829721, 79.911391},
	237: {"Bokundara", 6.818621, 79.917727},
	238: {"Piliyandala", 6.801219, 79.923338},
	239: {"Kesbewa", 6.795519, 79.940804},
	240: {"Polgasovita", 6.78698, 79.964896},
	241: {"Kahathuduwa", 6.783465, 79.983408},
	242: {"Horana", 6.716624, 80.063826},
	244: {"Panagoda", 6.848267, 80.018798},
	245: {"Godagama", 6.851478, 80.031608},
	246: {"Migoda", 6.84423, 80.046719},
	247: {"Padukka", 6.841465, 80.090777},
	248: {"Handapangoda", 6.792339, 80.142624},
	249: {"Ingiriya", 6.743991, 80.176613},
	250: {"Teachers' Training College", 6.844709, 79.932704},
	251: {"Pannipitiya", 6.8462, 79.949698},
	252: {"Kottawa", 6.841673, 79.963989},
	253: {"Makumbura", 6.838616, 79.979954},
	254: {"Homagama", 6.84113, 80.002012},
	255: {"Kottawa Railway Station", 6.844006, 79.968152},
	256: {"Rukmalgama", 6.856916, 79.985855},
	257: {"Walgama Junc., Athurugiriya", 6.864948, 79.995832},
	258: {"Athurugiriya Junc.", 6.877453, 79.989502},
	259: {"Pinhena Junc.", 6.832778, 79.964654},
	260: {"Mattegoda", 6.811579, 79.975083},
	271: {"Open University, Nawala", 6.883024, 79.886795},
	272: {"Nawala Junc.", 6.887029, 79.887203},
	273: {"Koswatte, Nawala", 6.900034, 79.893994},
	274: {"Bellanthota Junc.", 6.848315, 79.885433},
	275: {"Nandimala", 6.849859, 79.879398},
	276: {"Karagampitiya", 6.850253, 79.872022},
	277: {"Kalubowila Hospital", 6.866466, 79.8773},
	278: {"Nugegoda Supermarket", 6.873469, 79.891355},
	279: {"Pita Kotte", 6.883897, 79.901891},
	280: {"Impala Cinema, Rajagiriya", 6.910973, 79.890743},
	281: {"Rajagiriya Junc.", 6.910121, 79.894434},
	282: {"Ethul Kotte Junc.", 6.905509, 79.905217},
	283: {"Sethsiripaya", 6.902441, 79.914347},
	284: {"Battaramulla", 6.90209, 79.918059},
	285: {"Thalangama", 6.905967, 79.926234},
	286: {"Thalahena", 6.908012, 79.944999},
	287: {"Malabe", 6.904081, 79.954408},
	288: {"Pittugala", 6.908693, 79.969289},
	289: {"SLIIT, Malabe", 6.914711, 79.972175},
	290: {"Kaduwela", 6.935703, 79.984245},
	291: {"Thalawathugoda", 6.876281, 79.935343},
	292: {"Pelawatta/Isurupaya", 6.890597, 79.928927},
	295: {"Peliyagoda Junc.", 6.955758, 79.883115},
	296: {"Nawaloka Junc.", 6.960678, 79.880841},
	297: {"Wattala", 6.981253, 79.888029},
	298: {"Handala", 6.990688, 79.893136},
	299: {"Welisara", 7.021782, 79.899552},
	300: {"Kandana", 7.047827, 79.897041},
	301: {"Kapuwatta", 7.064012, 79.893222},
	302: {"Ja-Ela", 7.078236, 79.89054},
	303: {"Katunayake Airport", 7.16564, 79.884059},
}

var _routeDefs = []_routeDef{
	// Route 138 variants — High-Level Road corridor (most frequent route)
	{"138", "Pettah → Kottawa (High Level Rd)", VehicleBus, 9.0, 65, []int{1, 2, 25, 26, 27, 28, 29, 30, 31, 34, 35, 36, 37, 38, 39, 40, 41, 42, 43, 44, 45, 46, 47, 48, 49, 50, 51, 52, 53, 250, 251, 252}},
	{"138-homagama", "Pettah → Homagama", VehicleBus, 9.0, 65, []int{1, 2, 25, 26, 27, 28, 29, 30, 31, 34, 35, 36, 37, 38, 39, 40, 41, 42, 43, 44, 45, 46, 47, 48, 49, 50, 51, 52, 53, 250, 251, 252, 253, 254}},
	{"138-maharagama", "Pettah → Maharagama", VehicleBus, 8.5, 65, []int{1, 2, 25, 26, 27, 28, 29, 30, 31, 34, 35, 36, 37, 38, 39, 40, 41, 42, 43, 44, 45, 46, 47, 48, 49, 50, 51, 52, 53}},
	{"138-2", "Pettah → Mattegoda", VehicleBus, 9.0, 65, []int{1, 2, 25, 26, 27, 28, 29, 30, 31, 34, 35, 36, 37, 38, 39, 40, 41, 42, 43, 44, 45, 46, 47, 48, 49, 50, 51, 52, 53, 250, 251, 252, 259, 260}},
	{"138-4", "Pettah → Athurugiriya", VehicleBus, 9.0, 65, []int{1, 2, 25, 26, 27, 28, 29, 30, 31, 34, 35, 36, 37, 38, 39, 40, 41, 42, 43, 44, 45, 46, 47, 48, 49, 50, 51, 52, 53, 250, 251, 252, 255, 256, 257, 258}},
	{"138-3", "Pettah → Rukmalgama", VehicleBus, 9.0, 65, []int{1, 2, 25, 26, 27, 28, 29, 30, 31, 34, 35, 36, 37, 38, 39, 40, 41, 42, 43, 44, 45, 46, 47, 48, 49, 50, 51, 52, 53, 250, 251, 252, 255, 256}},
	// Route 100 — Galle Road (Coastal, Panadura)
	{"100", "Pettah → Panadura (Galle Rd)", VehicleBus, 8.0, 70, []int{1, 2, 3, 4, 5, 23, 24, 7, 8, 9, 10, 201, 202, 203, 204, 205, 206, 207, 208, 209, 210, 211, 212, 213, 214, 215, 216, 217, 218, 219}},
	{"100-moratuwa", "Pettah → Moratuwa (Galle Rd)", VehicleBus, 8.0, 70, []int{1, 2, 3, 4, 5, 23, 24, 7, 8, 9, 10, 201, 202, 203, 204, 205, 206, 207, 208, 209, 210, 211, 212, 213, 214, 215, 216, 217, 218}},
	// Route 101 — Galle Road via Slave Island
	{"101", "Pettah → Moratuwa (via Slave Is.)", VehicleBus, 8.0, 70, []int{1, 2, 25, 26, 21, 22, 5, 23, 24, 7, 8, 9, 10, 201, 202, 203, 204, 205, 206, 207, 208, 209, 210, 211, 212, 213, 214, 215, 216, 217, 218}},
	// Route 154 — Cross-town (Kiribathgoda ↔ Angulana / Bambalapitiya ↔ Kadawatha)
	{"154-kiribathgoda", "Kiribathgoda → Angulana", VehicleBus, 8.5, 75, []int{100, 101, 102, 103, 104, 31, 35, 7, 8, 9, 10, 201, 202, 203, 204, 205, 206, 207, 208, 209, 210, 211, 212, 213, 214, 220}},
	{"154-kadawatha", "Kadawatha → Bambalapitiya", VehicleBus, 8.5, 75, []int{100, 101, 102, 103, 104, 31, 35, 7}},
	// Route 120 — High Level Road (southern suburbs)
	{"120-horana", "Pettah → Horana (High Level Rd)", VehicleBus, 8.5, 65, []int{1, 2, 16, 19, 20, 27, 29, 30, 31, 35, 36, 37, 38, 39, 40, 83, 230, 231, 232, 233, 234, 235, 236, 237, 238, 239, 240, 241, 242}},
	{"120-kesbewa", "Pettah → Kesbewa", VehicleBus, 8.5, 65, []int{1, 2, 16, 19, 20, 27, 29, 30, 31, 35, 36, 37, 38, 39, 40, 83, 230, 231, 232, 233, 234, 235, 236, 237, 238, 239}},
	{"120-piliyandala", "Pettah → Piliyandala", VehicleBus, 8.5, 65, []int{1, 2, 16, 19, 20, 27, 29, 30, 31, 35, 36, 37, 38, 39, 40, 83, 230, 231, 232, 233, 234, 235, 236, 237, 238}},
	// Route 141 — Short cross-town (Narahenpita ↔ Wellawatte)
	{"141", "Narahenpita → Wellawatte", VehicleBus, 7.0, 55, []int{90, 89, 88, 5, 87, 86, 10}},
	// Route 135 — Kohuwala ↔ Kelaniya
	{"135", "Kohuwala → Kelaniya", VehicleBus, 8.0, 60, []int{231, 230, 87, 85, 39, 38, 37, 90, 100, 102, 101}},
	// Route 122 — Pettah to Avissawella/Ratnapura
	{"122-avissawella", "Pettah → Avissawella", VehicleBus, 9.0, 65, []int{1, 2, 16, 19, 20, 27, 28, 29, 30, 31, 35, 36, 37, 38, 39, 40, 41, 42, 43, 44, 45, 46, 47, 48, 49, 50, 51, 52, 53, 250, 251, 252, 253, 254, 244, 245, 246, 247}},
	{"122-ratnapura", "Pettah → Ratnapura", VehicleBus, 9.0, 65, []int{1, 2, 16, 19, 20, 27, 28, 29, 30, 31, 35, 36, 37, 38, 39, 40, 41, 42, 43, 44, 45, 46, 47, 48, 49, 50, 51, 52, 53, 250, 251, 252, 253, 254, 244, 245, 246, 247, 248, 249}},
	// Route 125 — Padukka/Ingiriya
	{"125-padukka", "Pettah → Padukka", VehicleBus, 8.5, 60, []int{1, 2, 16, 19, 20, 27, 28, 29, 30, 31, 35, 36, 37, 38, 39, 40, 41, 42, 43, 44, 45, 46, 47, 48, 49, 50, 51, 52, 53, 244, 245, 246, 247, 250, 251, 252, 253, 254}},
	{"125-ingiriya", "Pettah → Ingiriya", VehicleBus, 8.5, 60, []int{1, 2, 16, 19, 20, 27, 28, 29, 30, 31, 35, 36, 37, 38, 39, 40, 41, 42, 43, 44, 45, 46, 47, 48, 49, 50, 51, 52, 53, 244, 245, 246, 247, 248, 249, 250, 251, 252, 253, 254}},
	// Route 177 — Kollupitiya ↔ Kaduwela (Battaramulla Rd)
	{"177", "Kollupitiya → Kaduwela", VehicleBus, 8.5, 70, []int{5, 80, 28, 34, 29, 81, 79, 78, 101, 280, 281, 282, 283, 284, 285, 286, 287, 288, 289, 290}},
	// Route 155 — Coastal long (Soysapura/Mt Lavinia ↔ Mattakkuliya)
	{"155-soysapura", "Soysapura → Mattakkuliya", VehicleBus, 9.0, 70, []int{215, 214, 213, 212, 211, 210, 209, 208, 207, 206, 205, 204, 203, 202, 201, 10, 9, 8, 7, 24, 35, 32, 29, 27}},
	{"155-mtlavinia", "Mt. Lavinia → Mattakkuliya", VehicleBus, 9.0, 70, []int{215, 214, 213, 212, 211, 210, 209, 208, 207, 206, 205, 204, 203, 202, 201, 10, 9, 8, 7, 24, 35, 32, 29, 27}},
	// Route 140 — Short (Kollupitiya ↔ Wellampitiya)
	{"140", "Kollupitiya → Wellampitiya", VehicleBus, 7.5, 55, []int{5, 80, 28, 27, 77}},
	// Route 175 — Short (Kollupitiya ↔ Kohilawatte)
	{"175", "Kollupitiya → Kohilawatte", VehicleBus, 7.5, 55, []int{5, 80, 28, 27, 100}},
	// Route 119 — Dehiwala ↔ Maharagama (cross-town)
	{"119", "Dehiwala → Maharagama", VehicleBus, 7.5, 55, []int{207, 276, 275, 274, 235, 53}},
	// Route 174 — Kottawa ↔ Borella
	{"174", "Kottawa → Borella", VehicleBus, 8.0, 60, []int{252, 251, 291, 292, 283, 284, 281, 280, 100}},
	// Route 163 — Dehiwala ↔ Battaramulla
	{"163", "Dehiwala → Battaramulla", VehicleBus, 8.0, 55, []int{207, 206, 205, 204, 203, 277, 231, 45, 278, 279, 282, 283, 284}},
	// Route 176 — Karagampitiya ↔ Hettiyawatte (Nawala loop)
	{"176", "Karagampitiya → Hettiyawatte", VehicleBus, 7.5, 50, []int{276, 277, 278, 45, 271, 272, 273, 280, 281, 101, 100, 79, 78, 77, 76}},
	// Route 103 — Narahenpita ↔ Fort (Borella-Maradana corridor)
	{"103", "Narahenpita → Fort", VehicleBus, 7.0, 55, []int{90, 102, 101, 100, 77, 76, 1, 2}},
	// Route 187 — Fort ↔ Airport
	{"187", "Fort → Airport", VehicleBus, 10.0, 50, []int{2, 75, 74, 295, 296, 297, 298, 299, 300, 301, 302, 303}},
}

func buildRoutesFromData(g *RouteGraph) {
	for _, rd := range _routeDefs {
		r := buildRoute(rd)
		g.AddRoute(r)
	}

	// build reverse routes
	for _, rd := range _routeDefs {
		rev := buildReverseRoute(rd)
		g.AddRoute(rev)
	}

	// train routes
	g.AddRoute(buildCoastLine())
	g.AddRoute(buildCoastLineReverse())

	// three-wheeler routes
	for _, tw := range buildThreeWheelerRoutes() {
		g.AddRoute(tw)
	}
}

func buildRoute(rd _routeDef) *Route {
	stops := make([]Stop, 0, len(rd.PIDs))
	for i, pid := range rd.PIDs {
		p := _places[pid]
		stops = append(stops, Stop{
			ID:   rd.ID + "-s" + strconv.Itoa(i+1),
			Name: p.Name,
			Lat:  p.Lat,
			Lng:  p.Lng,
		})
	}

	polyline := interpolatePolyline(stops)

	return &Route{
		ID:          rd.ID,
		Name:        rd.Name,
		VehicleType: rd.VType,
		Polyline:    polyline,
		Stops:       stops,
		AvgSpeedMPS: rd.Speed,
		Capacity:    rd.Capacity,
	}
}

func buildReverseRoute(rd _routeDef) *Route {
	stops := make([]Stop, 0, len(rd.PIDs))
	for i := len(rd.PIDs) - 1; i >= 0; i-- {
		pid := rd.PIDs[i]
		p := _places[pid]
		stops = append(stops, Stop{
			ID:   rd.ID + "-rev-s" + strconv.Itoa(len(rd.PIDs) - i),
			Name: p.Name,
			Lat:  p.Lat,
			Lng:  p.Lng,
		})
	}
	polyline := interpolatePolyline(stops)
	return &Route{
		ID:          rd.ID + "-rev",
		Name:        rd.Name + " (reverse)",
		VehicleType: rd.VType,
		Polyline:    polyline,
		Stops:       stops,
		AvgSpeedMPS: rd.Speed,
		Capacity:    rd.Capacity,
	}
}

func interpolatePolyline(stops []Stop) []LatLng {
	if len(stops) == 0 {
		return nil
	}
	if len(stops) == 1 {
		return []LatLng{{stops[0].Lat, stops[0].Lng}}
	}
	var pts []LatLng
	for i := 0; i < len(stops)-1; i++ {
		a, b := stops[i], stops[i+1]
		d := Haversine(LatLng{a.Lat, a.Lng}, LatLng{b.Lat, b.Lng})
		n := 3
		if d > 500 {
			n = 5
		} else if d > 200 {
			n = 4
		}
		for j := 0; j < n; j++ {
			f := float64(j) / float64(n)
			pts = append(pts, LatLng{
				Lat: a.Lat + f*(b.Lat-a.Lat),
				Lng: a.Lng + f*(b.Lng-a.Lng),
			})
		}
	}
	// include last stop
	last := stops[len(stops)-1]
	pts = append(pts, LatLng{last.Lat, last.Lng})
	return pts
}

func buildCoastLine() *Route {
	polyline := []LatLng{
		{6.9336, 79.8553}, {6.9315, 79.8570}, {6.9292, 79.8656}, {6.9260, 79.8620},
		{6.9220, 79.8580}, {6.9180, 79.8540}, {6.9145, 79.8515}, {6.9112, 79.8497},
		{6.9070, 79.8505}, {6.9020, 79.8520}, {6.8970, 79.8535}, {6.8919, 79.8556},
		{6.8870, 79.8570}, {6.8820, 79.8585}, {6.8769, 79.8597}, {6.8720, 79.8610},
		{6.8670, 79.8625}, {6.8620, 79.8645}, {6.8570, 79.8670}, {6.8500, 79.8685},
		{6.8420, 79.8698}, {6.8370, 79.8700}, {6.8250, 79.8710}, {6.8100, 79.8720},
		{6.7950, 79.8740}, {6.7800, 79.8770}, {6.7650, 79.8800}, {6.7500, 79.8830},
		{6.7350, 79.8840}, {6.7240, 79.8840}, {6.7130, 79.8930}, {6.7000, 79.9020},
		{6.6880, 79.9140}, {6.6780, 79.9260}, {6.6650, 79.9360}, {6.6500, 79.9440},
		{6.6350, 79.9500}, {6.6200, 79.9560}, {6.6050, 79.9590}, {6.5850, 79.9580},
		{6.5770, 79.9620}, {6.5650, 79.9700}, {6.5500, 79.9790}, {6.5350, 79.9870},
		{6.5200, 79.9940}, {6.5050, 80.0000}, {6.4900, 80.0060}, {6.4750, 80.0090},
		{6.4600, 80.0080}, {6.4450, 80.0040}, {6.4290, 80.0020}, {6.4100, 80.0060},
		{6.3900, 80.0120}, {6.3700, 80.0220}, {6.3500, 80.0330}, {6.3300, 80.0450},
		{6.3100, 80.0580}, {6.2900, 80.0710}, {6.2700, 80.0840}, {6.2500, 80.0980},
		{6.2300, 80.1110}, {6.2100, 80.1240}, {6.1900, 80.1370}, {6.1700, 80.1500},
		{6.1500, 80.1600}, {6.1300, 80.1700}, {6.1100, 80.1790}, {6.0900, 80.1860},
		{6.0700, 80.1970}, {6.0500, 80.2080}, {6.0370, 80.2170},
	}
	stops := []Stop{
		{ID: "CN-01", Name: "Colombo Fort Station", Lat: 6.9336, Lng: 79.8553},
		{ID: "CN-02", Name: "Maradana Station", Lat: 6.9292, Lng: 79.8656},
		{ID: "CN-03", Name: "Bambalapitiya Station", Lat: 6.8919, Lng: 79.8556},
		{ID: "CN-04", Name: "Wellawatta Station", Lat: 6.8769, Lng: 79.8597},
		{ID: "CN-05", Name: "Dehiwala Station", Lat: 6.8570, Lng: 79.8670},
		{ID: "CN-06", Name: "Mt. Lavinia Station", Lat: 6.8370, Lng: 79.8700},
		{ID: "CN-07", Name: "Panadura Station", Lat: 6.7240, Lng: 79.8840},
		{ID: "CN-08", Name: "Wadduwa Station", Lat: 6.6780, Lng: 79.9260},
		{ID: "CN-09", Name: "Kalutara North Station", Lat: 6.5850, Lng: 79.9580},
		{ID: "CN-10", Name: "Kalutara South Station", Lat: 6.5770, Lng: 79.9620},
		{ID: "CN-11", Name: "Aluthgama Station", Lat: 6.4290, Lng: 80.0020},
		{ID: "CN-12", Name: "Galle Station", Lat: 6.0370, Lng: 80.2170},
	}
	return &Route{
		ID:          "coast-line",
		Name:        "Colombo Fort – Galle (Coast Line Railway)",
		VehicleType: VehicleTrain,
		Polyline:    polyline,
		Stops:       stops,
		AvgSpeedMPS: 22.0,
		Capacity:    800,
	}
}

func buildCoastLineReverse() *Route {
	original := buildCoastLine()
	stops := make([]Stop, len(original.Stops))
	polyline := make([]LatLng, len(original.Polyline))
	for i, s := range original.Stops {
		stops[len(stops)-1-i] = Stop{
			ID:   "CN-rev-" + s.ID[3:],
			Name: s.Name,
			Lat:  s.Lat,
			Lng:  s.Lng,
		}
	}
	for i, p := range original.Polyline {
		polyline[len(polyline)-1-i] = p
	}
	return &Route{
		ID:          "coast-line-rev",
		Name:        "Galle – Colombo Fort (Coast Line Railway)",
		VehicleType: VehicleTrain,
		Polyline:    polyline,
		Stops:       stops,
		AvgSpeedMPS: 22.0,
		Capacity:    800,
	}
}

type twDef struct {
	ID       string
	Name     string
	Speed    float64
	PIDs     []int
}

func buildThreeWheelerRoutes() []*Route {
	defs := []twDef{
		{"tw-pettah-fort", "Pettah – Fort", 7.0, []int{1, 2}},
		{"tw-wellawatta-dehiwala", "Wellawatta – Dehiwala", 8.0, []int{10, 201, 202, 203, 204, 205, 206, 207}},
		{"tw-kollupitiya-bambalapitiya", "Kollupitiya – Bambalapitiya", 7.0, []int{5, 6, 7}},
		{"tw-bambalapitiya-wellawatta", "Bambalapitiya – Wellawatta", 7.0, []int{7, 8, 9, 10}},
		{"tw-maradana-borella", "Maradana – Borella", 7.0, []int{77, 100}},
		{"tw-nugegoda-maharagama", "Nugegoda – Maharagama", 8.0, []int{45, 46, 47, 48, 49, 50, 51, 52, 53}},
		{"tw-kirulapone-nugegoda", "Kirulapone – Nugegoda", 7.0, []int{41, 42, 43, 44, 45}},
		{"tw-dehiwala-mtlavinia", "Dehiwala – Mt. Lavinia", 7.0, []int{207, 208, 209, 210, 211}},
	}
	routes := make([]*Route, 0, len(defs)*2)
	for _, d := range defs {
		stops := make([]Stop, 0, len(d.PIDs))
		for i, pid := range d.PIDs {
			p := _places[pid]
			stops = append(stops, Stop{
				ID:   d.ID + "-s" + strconv.Itoa(i+1),
				Name: p.Name,
				Lat:  p.Lat,
				Lng:  p.Lng,
			})
		}
		pl := interpolatePolyline(stops)
		routes = append(routes, &Route{
			ID:          d.ID,
			Name:        d.Name,
			VehicleType: VehicleThreeWheeler,
			Polyline:    pl,
			Stops:       stops,
			AvgSpeedMPS: d.Speed,
			Capacity:    3,
		})
		// reverse
		rstops := make([]Stop, 0, len(d.PIDs))
		for i := len(d.PIDs) - 1; i >= 0; i-- {
			pid := d.PIDs[i]
			p := _places[pid]
			rstops = append(rstops, Stop{
				ID:   d.ID + "-rev-s" + strconv.Itoa(len(d.PIDs) - i),
				Name: p.Name,
				Lat:  p.Lat,
				Lng:  p.Lng,
			})
		}
		rpl := interpolatePolyline(rstops)
		routes = append(routes, &Route{
			ID:          d.ID + "-rev",
			Name:        d.Name + " (reverse)",
			VehicleType: VehicleThreeWheeler,
			Polyline:    rpl,
			Stops:       rstops,
			AvgSpeedMPS: d.Speed,
			Capacity:    3,
		})
	}
	return routes
}
