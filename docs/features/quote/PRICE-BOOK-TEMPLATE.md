# Feature: Simple Price Book Setup

> Owner: **Claude** (Opus 4.8 · extra) — 기획/디자인/QA/분석 문서. 구현·DB·git 결정은 Codex(high) 영역.

## Decision

v1 should not make users clean up Excel before they can use Coatly.

Each painter's existing Excel structure can be different: column names, merged cells, hidden formulas, unit conventions, GST handling, notes, markups, and quote-only shortcuts vary too much. Treating every uploaded file as directly importable would turn v1 into an Excel parser project.

The safer v1 product is **app-first price book setup**:

- A painter can add prices directly inside Coatly.
- Existing Excel is used as a reference, not as a required import path.
- A simple Excel/CSV template may exist only as an optional bulk-entry helper.
- Quote creation uses saved Coatly price book data, not the original Excel file.

## Product Promise

Coatly should promise:

> Add your common painting prices in Coatly, then use them to create quotes, PDFs, emails, follow-ups, invoices, and jobs.

Coatly may also say:

> If you already have a price sheet, use it as a reference or paste a simple list into Coatly.

Coatly should not promise:

> Upload any Excel file and Coatly will automatically understand every formula, column, and pricing rule.

## v1 Flow

Primary path:

```text
Open Price Book in Coatly
  -> add price item
  -> service name + unit + price
  -> optional category / customer description
  -> save
  -> use saved price item in quote
```

Optional bulk path:

```text
Existing painter Excel price sheet
  -> user copies only the simple values needed
  -> upload/export simple Excel CSV in Price Rates > Manual
  -> validation blocks missing or invalid rows
  -> saved Material / Service catalogue items
  -> saved Coatly price book
```

The Excel file is never the live calculation engine.

## v1 Price Item Fields

Keep the first structure small enough that a painter can add an item from a phone.

| Field                  | Required | Default | Notes                                                                      |
| ---------------------- | -------- | ------- | -------------------------------------------------------------------------- |
| `Service / Item`       | yes      | none    | Example: Interior wall painting, Door repaint, Patch repair                |
| `Unit`                 | yes      | `each`  | Allowed: `each`, `sqm`, `lm`, `room`, `hour`, `day`, `fixed`               |
| `Price`                | yes      | none    | AUD number. Stored as cents                                                |
| `Category`             | optional | service | Coatly catalogue category: `service`, `paint`, `primer`, `supply`, `other` |
| `Customer Description` | optional | blank   | Reused in quote wording when available                                     |

Everything else should be hidden or defaulted in v1.

| Field                       | v1 handling                                               |
| --------------------------- | --------------------------------------------------------- |
| GST mode                    | Workspace/business-level setting first, not per-row setup |
| Active/inactive             | Default active. Add archive/disable only if needed        |
| Internal notes              | Not required for v1 setup                                 |
| Labour/material split       | Post-core job costing                                     |
| Minimum charge              | Later business rule                                       |
| Prep/coat/surface modifiers | Later pricing expansion, not basic setup                  |

## Optional Simple Template Columns

If an Excel/CSV template is provided, it should mirror the Manual price book form and stay this small:

| Column                 | Required |
| ---------------------- | -------- |
| `Service / Item`       | yes      |
| `Unit`                 | yes      |
| `Price`                | yes      |
| `Category`             | optional |
| `Customer Description` | optional |

Do not add GST, active status, notes, markups, formulas, prep levels, coating systems, or split costing to the first template.

Current app implementation uses Excel-friendly CSV from **Price Rates > Manual**:

- inline `+ Price Item` is the primary setup path
- import accepts `.csv`
- template download provides `coatly-manual-price-book-template.csv` with the supported headers only
- export downloads `coatly-manual-price-book-YYYY-MM-DD.csv`
- blank `Category` imports as `service`
- imported rows become `Material / Service` catalogue items for manual quote line items
- uploaded rows are reviewed before the final import action
- this is not arbitrary `.xlsx` workbook parsing
- the Materials & Services page still has a broader catalogue CSV for paints/supplies; Price Rates > Manual uses the simpler v1 price-book CSV

## Preview And Validation

Bulk upload shows a review screen before saving. The app flags:

- missing item name, unit, or price
- unsupported units
- negative prices
- duplicate service + unit rows
- malformed price strings or formulas that are not plain AUD numbers
- duplicate service + unit rows already saved in the current catalogue

Rows with warnings should not silently become quoteable prices.

## Data Mapping

| Setup concept        | Coatly destination                           |
| -------------------- | -------------------------------------------- |
| Service / Item       | service/material item name                   |
| Unit                 | quote line item unit / estimate source unit  |
| Price                | deterministic stored rate, cents integer     |
| Category             | quote picker grouping                        |
| Customer Description | reusable scope text / quote line description |

If a row represents a complex room template, surface rate, prep modifier, or exterior system, v1 should not force it into the simple template. Add it manually in the existing rate settings or record it as a pricing expansion gap.

## UX Rules

- The first screen should be `+ Price Item`, not `Upload Excel`.
- Users should be able to create a quote with only a few saved prices or manual line items.
- Excel/CSV template is optional for bulk setup, not mandatory onboarding.
- The upload/paste screen should say that arbitrary Excel layouts are not supported in v1.
- The review screen must show what will be saved before it changes the user's price book.
- The quote builder should use saved Coatly data after setup, not read from an Excel file each time.
- AI column guessing is post-core only.

## Explicitly Not v1

- requiring an Excel template before the user can quote
- automatic parsing of arbitrary Excel files
- preserving hidden formulas as quote logic
- importing merged-cell presentation spreadsheets
- AI-based column detection as the primary onboarding path
- photo/damage-based pricing
- automatic price/rate/GST decisions

## Release Gate

Simple price book setup is release-ready when:

- A can add the prices needed for one real quote directly in Coatly.
- A can optionally copy simple service/unit/price rows from Excel without restructuring the whole workbook.
- The app does not ask for GST, active status, notes, or advanced modifiers before the first quote can be made.
- Preview/validation catches missing or invalid values for optional bulk input.
- The saved Coatly price book can recreate A's selected quote total and scope without using the original Excel file as a calculation engine.
- Any setup step that feels harder than Excel is documented in [`../../PLANS.md`](../../PLANS.md).
