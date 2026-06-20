package fare

import "math"

type ServiceType int

const (
	Normal      ServiceType = iota
	SemiLuxury
	Luxury
	SuperLuxury
)

func Calculate(km float64, serviceType ServiceType) int {
	stageKm := 0.8
	stages := math.Ceil(km / stageKm)
	if stages < 1 {
		stages = 1
	}

	switch serviceType {
	case Normal:
		base := 30.0
		perStage := 9.0
		return int(math.Round(base + (stages-1)*perStage))
	case SemiLuxury:
		base := 50.0
		perStage := 14.0
		return int(math.Round(base + (stages-1)*perStage))
	case Luxury:
		base := 80.0
		perStage := 22.0
		return int(math.Round(base + (stages-1)*perStage))
	case SuperLuxury:
		base := 100.0
		perStage := 30.0
		return int(math.Round(base + (stages-1)*perStage))
	default:
		return Calculate(km, Normal)
	}
}

func ThreeWheeler(km float64) int {
	firstKm := 100.0
	if km <= 1.0 {
		return int(firstKm)
	}
	perExtraKm := 85.0
	return int(firstKm + math.Ceil(km-1.0)*perExtraKm)
}
