# Tournament Toolkit

Tournament Toolkit is a growing collection of browser-based utilities for chess tournament organizers by Kamus Catur.

## Projects

### 1. Swiss Manager Project — Individual Event Export

Open the Swiss Manager Project at `/swiss-manager/` to convert XLSX, XLS or CSV participant listings into a Swiss Manager-compatible workbook.

- Exact target headers and order are preserved, including the leading space in ` Fed`.
- Supports source-column mapping, registration-date-based IDs, optional IC-derived birth/sex, category/federation rules, validation preview and XLSX export.

### 2. Prize Winner List (Prize Structure)

Open Prize Winner List at `/prize-winner/` to find Main and Special prize winners from a Chess-Results Final Ranking. The interface is in English and has three tabs: **Data**, **Prizes**, **Winners**.

- **Data:** first fill in the tournament details (name, date and venue are required; organizer is optional). The ranking list upload stays locked until they are filled, and the Prizes and Winners tabs unlock once a ranking list is loaded. The details appear on the winner list, the Excel summary and the printed PDF. Then upload the Final Ranking exported from Chess-Results (XLSX, XLS or CSV; the ranking sheet and header row are found automatically) or paste the table copied from Chess-Results. Columns (`Rk.`, `SNo`, `Name`, `sex`, `Gr`, `FED`, `Club/City`, `Typ`, `RtgI`, `Pts.`) are detected from the headers. Sample data is available.
- **Prizes:** build the prize list. Each prize is Main or Special, with one or more places, each with an RM value. Special prizes can combine filters: Gr, sex, Club/City, Typ, FED, rated/unrated, rating range and rank range. Prizes can be reordered, and withdrawn players can be excluded by SNo.
- **Winner rule:** either one prize per player (the highest value wins; a released prize drops to the next eligible player) or several prizes per player.
- **Winners:** shows winners per prize, the total, and a log of players eligible for more than one prize. Results can be copied for Excel, downloaded as Excel (.xlsx) or CSV, or printed / saved as PDF through the browser's print dialog.

**Important:** Prize allocation is a draft. Review the rules and winner list before publishing.

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

There is no app database or application backend. Uploaded sheets are parsed and processed in the browser and are not intentionally uploaded to a server. Swiss Manager spreadsheet support loads SheetJS from jsDelivr, so an internet connection is required. Use a trusted device for sensitive participant lists and review exports before an official event.
