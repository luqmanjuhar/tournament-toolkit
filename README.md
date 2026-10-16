# Tournament Toolkit

Tournament Toolkit is a growing collection of browser-based utilities for chess tournament organizers by Kamus Catur.

## Projects

### 1. Swiss Manager Project — Individual Event Export

Open the Swiss Manager Project at `/swiss-manager/` to convert XLSX, XLS or CSV participant listings into a Swiss Manager-compatible workbook.

- Exact target headers and order are preserved, including the leading space in ` Fed`.
- Supports source-column mapping, registration-date-based IDs, optional IC-derived birth/sex, category/federation rules, validation preview and XLSX export.

### 2. Prize Winner List

Open Prize Winner List at `/prize-winner/` to assign winners from two uploaded workbooks.

**Prize structure file:** Include `No`, `Winner`, `Prize` and a required `Type of Winner` column. The value in every prize row must explicitly be `Main Prizes` or `Special Prizes`. The `Winner` column is the award/category title; the tool fills the winning player's name in its result.

**Final ranking file:** A typical Chess-Results export has `Rk` (ranking), `Name` (player name), `Club/City`, `Typ` (type), and `Gr` (group). The user confirms the field mapping. Club/City, Typ and Gr can each be used as special-prize eligibility filters.

Configurable rules include whether a player can receive multiple prizes, the minimum number of eligible players for a special prize (default 3), and how to resolve a player who qualifies for multiple special prizes (highest numeric prize value or prize-list sequence). Main Prizes are assigned by ranking first. Special Prizes can be filtered by one, two or all three of Club/City, Typ and Gr. The tool produces a reviewable Excel workbook with winner assignments, unawarded prizes and a rule summary, plus CSV exports.

**Important:** Prize allocation is a draft. Arbiters should review the eligibility rules and winner list before publishing. Every prize must have an explicit prize type. If a special prize has fewer eligible players than the configured minimum, it is not awarded.

## Repository layout

```text
/
├── index.html                  # Toolkit dashboard
├── swiss-manager/index.html    # Swiss Manager converter
├── prize-winner/index.html     # Prize Winner List
└── README.md
```

## Deploy on Vercel

Import this GitHub repository into Vercel. For this static HTML app, choose **Other** as the framework preset, set the root directory to `./`, leave Build Command blank, and set Output Directory to `.` if requested. Once linked, pushes to the configured production branch can trigger automatic deployments.

## Privacy

There is no app database or application backend. Uploaded sheets are parsed and processed in the browser and are not intentionally uploaded to a server. Spreadsheet support loads SheetJS from jsDelivr, so an internet connection is required. Use a trusted device for sensitive participant lists and review exports before an official event.
