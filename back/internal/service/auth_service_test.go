package service

import "testing"

func TestIsAllDigits(t *testing.T) {
	tests := []struct {
		name  string
		input string
		want  bool
	}{
		{"thai mobile number", "0812345678", true},
		{"single digit", "7", true},
		{"empty string", "", false},
		{"username", "han_w", false},
		{"email", "han@example.com", false},
		{"phone with dashes", "081-234-5678", false},
		{"phone with spaces", "081 234 5678", false},
		{"thai digits", "๐๘๑", false},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			got := isAllDigits(tt.input)
			if got != tt.want {
				t.Errorf("isAllDigits(%q) = %v, want %v", tt.input, got, tt.want)
			}
		})
	}
}
