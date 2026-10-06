package importer

import (
	"errors"
	"fmt"
	"io"
	"regexp"
	"strconv"
	"strings"

	"github.com/xuri/excelize/v2"
)

// SheetPrefix + year is the usual name of a yearly sheet, e.g. "รายรับ-รายจ่าย 2026".
const SheetPrefix = "รายรับ-รายจ่าย "

var ErrSheetNotFound = errors.New("sheet not found")

func SheetName(year int) string {
	return SheetPrefix + strconv.Itoa(year)
}

// SheetInfo describes one sheet of an uploaded workbook.
type SheetInfo struct {
	Name       string
	Year       int  // guessed from a 4-digit year at the end of the name, 0 if none
	Importable bool // has the หมวด / รายการ / months layout
}

var trailingYear = regexp.MustCompile(`(\d{4})\s*$`)

// GuessYear reads "2026" from "รายรับ-รายจ่าย 2026". 0 when there is no year.
func GuessYear(name string) int {
	m := trailingYear.FindStringSubmatch(name)
	if m == nil {
		return 0
	}
	y, _ := strconv.Atoi(m[1])
	if y < 2000 || y > 2100 {
		return 0
	}
	return y
}

// ListSheets lists every sheet in the workbook, in tab order.
func ListSheets(r io.Reader) ([]SheetInfo, error) {
	f, err := open(r)
	if err != nil {
		return nil, err
	}
	defer f.Close()

	var out []SheetInfo
	for _, name := range f.GetSheetList() {
		info := SheetInfo{Name: name, Year: GuessYear(name)}
		if rows, err := f.GetRows(name, excelize.Options{RawCellValue: true}); err == nil {
			_, perr := Parse(rows)
			info.Importable = perr == nil
		}
		out = append(out, info)
	}
	return out, nil
}

// ReadWorkbook reads and checks one sheet from an .xlsx file.
// Every error it returns is about the file itself (bad file, missing sheet,
// unreadable cell, totals that don't add up), so callers can show it as is.
func ReadWorkbook(r io.Reader, sheet string) (*Sheet, error) {
	f, err := open(r)
	if err != nil {
		return nil, err
	}
	defer f.Close()

	if idx, _ := f.GetSheetIndex(sheet); idx < 0 {
		return nil, fmt.Errorf("%w: no sheet %q in this file (sheets: %s)",
			ErrSheetNotFound, sheet, strings.Join(f.GetSheetList(), ", "))
	}
	// RawCellValue: "36408" instead of the formatted "36,408"
	rows, err := f.GetRows(sheet, excelize.Options{RawCellValue: true})
	if err != nil {
		return nil, fmt.Errorf("sheet %q: %w", sheet, err)
	}
	s, err := Parse(rows)
	if err != nil {
		return nil, fmt.Errorf("sheet %q: %w", sheet, err)
	}
	if err := s.Check(); err != nil {
		return nil, fmt.Errorf("sheet %q: %w", sheet, err)
	}
	return s, nil
}

func open(r io.Reader) (*excelize.File, error) {
	f, err := excelize.OpenReader(r)
	if err != nil {
		return nil, errors.New("not a readable .xlsx file")
	}
	return f, nil
}
