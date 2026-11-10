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
- **Prizes:** build the prize list. Each prize is Main or Special, with one or more places, each with an RM value. Special prizes can combine filters: Gr, sex, Club/City, Typ, FED, rated/unrated, rating range and rank range. Prizes can be reordered by dragging the handle (mouse, touch or pen) or with the arrow buttons, and withdrawn players can be excluded by SNo.
- **Winner rule:** either one prize per player (a released prize drops to the next eligible player) or several prizes per player. In one-prize mode, **Prize priority** is either *list order* (default: slots are filled in prize-list order, then place, so put Main prizes at the top) or *highest value first* (equal values follow list order), or *fill every slot* (highest value first; prizes with the same value, including RM0 medals, go to the one with the fewest eligible players first, so as many slots as possible get a winner whatever the list order; on an exact tie a Main prize goes before a Special prize). By default RM0 prizes (medal or trophy only) also count as a prize; untick that option to let a player take several medals, or a medal plus a cash prize. One player never takes two places in the same prize.
- **Winners:** shows winners per prize, the total, and a log of players eligible for more than one prize. Results can be copied for Excel, downloaded as Excel (.xlsx) or CSV, or printed / saved as PDF through the browser's print dialog (a clean A4 report with an optional sign-off block for the Chief Arbiter and Organizer).

**Important:** Prize allocation is a draft. Review the rules and winner list before publishing.

## Tests

The allocation engine lives in `prize-winner/engine.js` and is covered by unit tests that need no dependencies (Node 18+):

```bash
node --test tests/prize-engine.test.js
```

## Repository layout

```text
/
├── index.html                  # Toolkit dashboard
├── swiss-manager/index.html    # Swiss Manager converter
├── prize-winner/index.html     # Prize Winner List (UI)
├── prize-winner/engine.js      # Prize allocation engine (tested)
├── tests/                      # Unit tests
└── README.md
```

## Deploy on Vercel

Import this GitHub repository into Vercel. For this static HTML app, choose **Other** as the framework preset, set the root directory to `./`, leave Build Command blank, and set Output Directory to `.` if requested. Once linked, pushes to the configured production branch can trigger automatic deployments.

## Privacy

There is no app database or application backend. Uploaded sheets are parsed and processed in the browser and are not intentionally uploaded to a server. Swiss Manager spreadsheet support loads SheetJS from jsDelivr, so an internet connection is required. Use a trusted device for sensitive participant lists and review exports before an official event.
