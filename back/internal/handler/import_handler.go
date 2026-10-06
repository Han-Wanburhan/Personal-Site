package handler

import (
	"encoding/json"
	"errors"
	"mime/multipart"
	"strconv"
	"strings"

	"github.com/gofiber/fiber/v2"
	"gorm.io/gorm"

	"github.com/Han-Wanburhan/personal-site/back/internal/dto"
	"github.com/Han-Wanburhan/personal-site/back/internal/importer"
	"github.com/Han-Wanburhan/personal-site/back/internal/middleware"
)

const maxImportSize = 2 << 20 // 2 MB; the real workbook is ~45 KB

type ImportHandler struct {
	db *gorm.DB
}

func NewImportHandler(db *gorm.DB) *ImportHandler {
	return &ImportHandler{db: db}
}

// Sheets handles POST /api/import/sheets (multipart form with "file"):
// lists the sheets so the user can pick one. Saves nothing.
func (h *ImportHandler) Sheets(c *fiber.Ctx) error {
	f, err := uploadedFile(c)
	if err != nil {
		return err
	}
	defer f.Close()

	sheets, err := importer.ListSheets(f)
	if err != nil {
		return fiber.NewError(fiber.StatusBadRequest, err.Error())
	}
	resp := make([]dto.ImportSheetResponse, 0, len(sheets))
	for _, s := range sheets {
		resp = append(resp, dto.ImportSheetResponse{Name: s.Name, Year: s.Year, Importable: s.Importable})
	}
	return c.JSON(resp)
}

// Excel handles POST /api/import (multipart form):
//
//	file   the .xlsx workbook
//	sheet  which sheet to read (optional; default "รายรับ-รายจ่าย <year>")
//	year   the year the sheet's months belong to, e.g. 2026
//	from   first month 1-12
//	to     last month 1-12
//	days   optional JSON {"item name": day}, day 1-31 or 0 = last day of the month
//	apply  "true" to save; anything else is a preview that saves nothing
//
// Always imports for the logged-in user.
func (h *ImportHandler) Excel(c *fiber.Ctx) error {
	user, ok := middleware.CurrentUser(c)
	if !ok {
		return fiber.ErrUnauthorized
	}

	rg := importer.Range{}
	for name, dst := range map[string]*int{"year": &rg.Year, "from": &rg.From, "to": &rg.To} {
		n, err := strconv.Atoi(c.FormValue(name))
		if err != nil {
			return fiber.NewError(fiber.StatusBadRequest, name+" must be a number")
		}
		*dst = n
	}
	if err := rg.Validate(); err != nil {
		return fiber.NewError(fiber.StatusBadRequest, err.Error())
	}

	sheetName := strings.TrimSpace(c.FormValue("sheet"))
	if sheetName == "" {
		sheetName = importer.SheetName(rg.Year)
	}

	days := importer.Days{}
	if raw := c.FormValue("days"); raw != "" {
		if err := json.Unmarshal([]byte(raw), &days); err != nil {
			return fiber.NewError(fiber.StatusBadRequest, `days must be JSON like {"item name": 25}`)
		}
	}
	apply := c.FormValue("apply") == "true"

	f, err := uploadedFile(c)
	if err != nil {
		return err
	}
	defer f.Close()

	sheet, err := importer.ReadWorkbook(f, sheetName)
	if err != nil {
		return fiber.NewError(fiber.StatusBadRequest, err.Error()) // always about the file, safe to show
	}
	if err := days.CheckItems(sheet); err != nil {
		return fiber.NewError(fiber.StatusBadRequest, err.Error())
	}

	res, err := importer.Import(c.UserContext(), h.db, user.ID, sheet, days, rg, !apply)
	if errors.Is(err, importer.ErrAlreadyImported) {
		return fiber.NewError(fiber.StatusConflict, err.Error())
	}
	if err != nil {
		return err
	}
	return c.JSON(dto.NewImportResponse(sheetName, sheet, days, rg, res, apply))
}

// uploadedFile opens the "file" field of a multipart form.
func uploadedFile(c *fiber.Ctx) (multipart.File, error) {
	fh, err := c.FormFile("file")
	if err != nil {
		return nil, fiber.NewError(fiber.StatusBadRequest, "file is required")
	}
	if fh.Size > maxImportSize {
		return nil, fiber.NewError(fiber.StatusRequestEntityTooLarge, "file is larger than 2 MB")
	}
	return fh.Open()
}
