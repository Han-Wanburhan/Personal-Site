package importer

import (
	"bufio"
	"fmt"
	"io"
	"strconv"
	"strings"
)

// Last means "the last day of the month".
const Last = 0

const bom = string(rune(0xFEFF)) // byte order mark

// Days maps an item name to the day of the month its amount is dated on.
// Items that are not listed use Last.
type Days map[string]int

// ParseDays reads lines of "<day> <item name>", where day is 1-31 or "last".
// Blank lines and lines starting with # are ignored.
//
//	25   เงินเดือน / Salary
//	last ค่าไฟ
func ParseDays(r io.Reader) (Days, error) {
	days := Days{}
	sc := bufio.NewScanner(r)
	for n := 1; sc.Scan(); n++ {
		line := strings.TrimSpace(strings.TrimPrefix(sc.Text(), bom)) // Notepad may add a BOM
		if line == "" || strings.HasPrefix(line, "#") {
			continue
		}
		dayText, item, ok := strings.Cut(line, " ")
		item = strings.TrimSpace(item)
		if !ok || item == "" {
			return nil, fmt.Errorf("line %d: want \"<day> <item name>\", got %q", n, line)
		}
		day := Last
		if dayText != "last" {
			d, err := strconv.Atoi(dayText)
			if err != nil || d < 1 || d > 31 {
				return nil, fmt.Errorf("line %d: day must be 1-31 or last, got %q", n, dayText)
			}
			day = d
		}
		if _, dup := days[item]; dup {
			return nil, fmt.Errorf("line %d: %q listed twice", n, item)
		}
		days[item] = day
	}
	return days, sc.Err()
}

// CheckItems fails on names that are not in the sheet (most likely a typo)
// and on days outside 1-31 (or Last).
func (d Days) CheckItems(s *Sheet) error {
	known := map[string]bool{}
	for _, r := range s.Rows {
		known[r.Item] = true
	}
	for item, day := range d {
		if !known[item] {
			return fmt.Errorf("days: item %q is not in the sheet", item)
		}
		if day < Last || day > 31 {
			return fmt.Errorf("days: %q has day %d, want 1-31 or last", item, day)
		}
	}
	return nil
}
