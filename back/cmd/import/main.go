// Command import loads the old Excel workbook into the database.
//
// It is a dry run unless -apply is given:
//
//	go run ./cmd/import -user han -year 2026 -from 6 -to 9            # show what would happen
//	go run ./cmd/import -user han -year 2026 -from 6 -to 9 -apply     # write it
package main

import (
	"context"
	"flag"
	"fmt"
	"log"
	"os"
	"sort"

	"github.com/Han-Wanburhan/personal-site/back/internal/config"
	"github.com/Han-Wanburhan/personal-site/back/internal/database"
	"github.com/Han-Wanburhan/personal-site/back/internal/importer"
	"github.com/Han-Wanburhan/personal-site/back/internal/repository"
)

func main() {
	file := flag.String("file", "../import/finance.xlsx", "Excel workbook")
	daysFile := flag.String("days", "../import/days.txt", "day-of-month per item (optional; missing file = last day for all)")
	username := flag.String("user", "", "username to import for (required)")
	year := flag.Int("year", 0, "year the months belong to (required)")
	sheetName := flag.String("sheet", "", `sheet to read (default "รายรับ-รายจ่าย <year>")`)
	from := flag.Int("from", 0, "first month, 1-12 (required)")
	to := flag.Int("to", 0, "last month, 1-12 (required)")
	apply := flag.Bool("apply", false, "write to the database (default is a dry run)")
	flag.Parse()

	if *username == "" || *year == 0 || *from == 0 || *to == 0 {
		flag.Usage()
		os.Exit(2)
	}
	rg := importer.Range{Year: *year, From: *from, To: *to}
	if err := rg.Validate(); err != nil {
		log.Fatal(err)
	}

	// 1. read and check the sheet (before touching the database)
	if *sheetName == "" {
		*sheetName = importer.SheetName(*year)
	}
	sheet, err := readSheet(*file, *sheetName)
	if err != nil {
		log.Fatal(err)
	}
	days, err := readDays(*daysFile)
	if err != nil {
		log.Fatal(err)
	}
	if err := days.CheckItems(sheet); err != nil {
		log.Fatal(err)
	}
	fmt.Printf("sheet %q: %d items, totals match the sheet\n", *sheetName, len(sheet.Rows))

	// 2. database
	cfg, err := config.Load()
	if err != nil {
		log.Fatalf("config: %v", err)
	}
	db, err := database.Connect(cfg.DB)
	if err != nil {
		log.Fatalf("database: %v", err)
	}
	sqlDB, _ := db.DB()
	defer sqlDB.Close()

	ctx := context.Background()
	user, err := repository.NewUserRepository(db).FindByUsername(ctx, *username)
	if err != nil {
		log.Fatalf("user %q: %v", *username, err)
	}

	// 3. import
	res, err := importer.Import(ctx, db, user.ID, sheet, days, rg, !*apply)
	if err != nil {
		log.Fatal(err)
	}

	months := make([]int, 0, len(res.Months))
	for m := range res.Months {
		months = append(months, m)
	}
	sort.Ints(months)
	fmt.Printf("\n%-8s %14s %14s %6s\n", "month", "income", "expense", "count")
	for _, m := range months {
		t := res.Months[m]
		fmt.Printf("%d-%02d  %14s %14s %6d\n", *year, m, t.Income.StringFixed(2), t.Expense.StringFixed(2), t.Count)
	}
	fmt.Printf("\ncategories created: %d, items created: %d, transactions: %d\n",
		res.CategoriesCreated, res.ItemsCreated, res.Transactions)
	if *apply {
		fmt.Println("done: written to the database")
	} else {
		fmt.Println("dry run: nothing was saved. Add -apply to write it.")
	}
}

func readSheet(path, sheet string) (*importer.Sheet, error) {
	f, err := os.Open(path)
	if err != nil {
		return nil, err
	}
	defer f.Close()
	return importer.ReadWorkbook(f, sheet)
}

func readDays(path string) (importer.Days, error) {
	f, err := os.Open(path)
	if os.IsNotExist(err) {
		fmt.Printf("no %s: every amount goes on the last day of its month\n", path)
		return importer.Days{}, nil
	}
	if err != nil {
		return nil, err
	}
	defer f.Close()
	return importer.ParseDays(f)
}
