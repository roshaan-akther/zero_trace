package fare_test

import (
	"testing"

	"github.com/agentrix/backend/internal/fare"
)

func TestCalculateNormal(t *testing.T) {
	tests := []struct {
		km     float64
		expect int
	}{
		{0, 30},
		{0.5, 30},
		{0.8, 30},
		{0.9, 39},
		{1.0, 39},
		{1.6, 39},
		{1.7, 48},
		{5.0, 84},
		{10.0, 138},
	}

	for _, tt := range tests {
		got := fare.Calculate(tt.km, fare.Normal)
		if got != tt.expect {
			t.Errorf("Calculate(%.1f, Normal) = %d, want %d", tt.km, got, tt.expect)
		}
	}
}

func TestCalculateSemiLuxury(t *testing.T) {
	got := fare.Calculate(1.0, fare.SemiLuxury)
	if got != 64 {
		t.Errorf("Calculate(1.0, SemiLuxury) = %d, want 64", got)
	}

	got = fare.Calculate(10.0, fare.SemiLuxury)
	if got != 218 {
		t.Errorf("Calculate(10.0, SemiLuxury) = %d, want 218", got)
	}
}

func TestCalculateLuxury(t *testing.T) {
	got := fare.Calculate(1.0, fare.Luxury)
	if got != 102 {
		t.Errorf("Calculate(1.0, Luxury) = %d, want 102", got)
	}
}

func TestThreeWheeler(t *testing.T) {
	tests := []struct {
		km     float64
		expect int
	}{
		{0.5, 100},
		{1.0, 100},
		{2.0, 185},
		{5.0, 440},
	}

	for _, tt := range tests {
		got := fare.ThreeWheeler(tt.km)
		if got != tt.expect {
			t.Errorf("ThreeWheeler(%.1f) = %d, want %d", tt.km, got, tt.expect)
		}
	}
}
