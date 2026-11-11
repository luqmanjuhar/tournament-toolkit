# Tournament Toolkit

Tournament Toolkit is a growing collection of browser-based utilities for chess tournament organizers by Kamus Catur.

## Projects

### 1. Swiss Manager Project

Open the Swiss Manager Project at `/swiss-manager/` and choose the tournament type. Each type has its own Excel layout for the participant database, so each has its own converter:

1. **Swiss Manager Individual Event** (available, `/swiss-manager/individual/`).
2. **Swiss Manager Team Tiebreak** (coming soon).
3. **Swiss Manager Team** (coming soon).

#### Individual Event Export

Turn any registration or participant listing into a Swiss Manager-compatible workbook.

- **Input:** upload an XLSX, XLS or CSV file, or paste a table copied from Excel, Google Sheets or a web page (tab, comma or semicolon separated, with the header row). Nothing is uploaded to a server.
- **Mapping:** columns are matched automatically from common header names in English and Malay (for example Attendee Name, Participant, Gender / Jantina, Category → Gr, School → Club, FIDE ID, Date of Birth, IC Number) and can be changed in the mapping table. Columns you do not map (such as Nationality or payment status) are simply ignored.
- **Rules:** registration-date-based ID numbers, Birth taken from the listing's birthday column when one is mapped (otherwise derived from a Malaysian IC, falling back to the Birth column when the IC is missing, with a warning when the two disagree), Sex derived from the IC with the listing's Sex column as fallback, and a warning for a birth date in the future or on or after the registration date, Gr from the listing or one value for everyone, a default federation, and an optional IC column selector.
- **Dates:** `DD/MM/YYYY`, `YYYY-MM-DD`, `7 Nov 2026` style dates and real Excel date cells are understood.
- **Capitals:** Name and Club are converted to capital letters automatically.
- **Output:** a validation preview with blocking errors and warnings, then an XLSX with the 11 Swiss Manager individual-event headers in order (`No, Name, Title, ID no, Birth,  Fed, Sex, Type, Gr, Club, FIDE-No`, including the leading space in ` Fed`), plus a validation report CSV. `Clubno` and the national / international rating columns are not included; `Clubno` is left for a future team-event export with team tiebreaks.

### 2. Prize Winner List (Prize Structure)

Open Prize Winner List at `/prize-winner/` to find Main and Special prize winners from a Chess-Results Final Ranking. The interface is in English and has three tabs: **Data**, **Prizes**, **Winners**.

- **Data:** first fill in the tournament details (name, date and venue are required; organizer is optional). The ranking list upload stays locked until they are filled, and the Prizes and Winners tabs unlock once a ranking list is loaded. The details appear on the winner list, the Excel summary and the printed PDF. Then upload the Final Ranking exported from Chess-Results (XLSX, XLS or CSV; the ranking sheet and header row are found automatically) or paste the table copied from Chess-Results. Columns (`Rk.`, `SNo`, `Name`, `sex`, `Gr`, `FED`, `Club/City`, `Typ`, `RtgI`, `Pts.`) are detected from the headers. Sample data is available.
- **Prizes:** build the prize list. Each prize is Main or Special, with one or more places, each with an RM value. Special prizes can combine filters: Gr, sex, Club/City, Typ, FED, rated/unrated, rating range and rank range. Prizes can be reordered by dragging the handle (mouse, touch or pen) or with the arrow buttons, and withdrawn players can be excluded by SNo.
- **Winner rule:** either one prize per player (a released prize drops to the next eligible player) or several prizes per player. In one-prize mode, **Prize priority** is either *list order* (default: slots are filled in prize-list order, then place, so put Main prizes at the top) or *highest value first* (equal values follow list order), or *fill every slot* (highest value first; prizes with the same value, including RM0 medals, go to the one with the fewest eligible players first, so as many slots as possible get a winner whatever the list order; on an exact tie a Main prize goes before a Special prize). By default RM0 prizes (medal or trophy only) also count as a prize; untick that option to let a player take several medals, or a medal plus a cash prize. One player never takes two places in the same prize.
- **Winners:** shows winners per prize, the total, and a log of players eligible for more than one prize. Results can be copied for Excel, downloaded as Excel (.xlsx) or CSV, or printed / saved as PDF through the browser's print dialog (a minimalist A4 report with orange accents and an optional sign-off block for the Chief Arbiter and Organizer).

**Important:** Prize allocation is a draft. Review the rules and winner list before publishing.

### 3. Result Slips

Open Result Slips at `/result-slips/` to print match result slips, 16 per A4 page (2 by 8) with dashed cut lines.

- **Event details:** event name, date and round are required; category is optional. The event name and date print in red (or orange or black).
- **Pairings:** paste the round's pairing table copied from Chess-Results or Swiss Manager (or upload XLSX/CSV). The first `Name` column is White, the second is Black, and the `Bo.` / Board / Table column gives the table number (otherwise tables are numbered in order). A table with `White` and `Black` columns, or plain `table, white, black` lines, also works. Byes are skipped.
- **Each slip:** event, date, category, round, table, arbiter signature, White and Black names with a signature line each, a result box, and tick squares for **I** (illegal move) and **W** (warning), three per player.
- **Output:** a live preview and Print / Save as PDF. A blank sheet (event name, date, category and round filled in; table and player names left empty) can be printed for hand-written slips, so all four details are required for it.

## Tests

The prize allocation engine (`prize-winner/engine.js`) and the pairing parser (`result-slips/slips.js`) are covered by unit tests that need no dependencies (Node 18+):

```bash
node --test
```

## Repository layout

```text
/
├── index.html                  # Toolkit dashboard
├── swiss-manager/index.html    # Swiss Manager options (individual, team tiebreak, team)
├── swiss-manager/individual/index.html  # Swiss Manager individual event converter
├── prize-winner/index.html     # Prize Winner List (UI)
├── result-slips/index.html     # Result Slips (UI)
├── result-slips/slips.js       # Pairing parser (tested)
├── prize-winner/engine.js      # Prize allocation engine (tested)
├── tests/                      # Unit tests
└── README.md
```

## Deploy on Vercel

Import this GitHub repository into Vercel. For this static HTML app, choose **Other** as the framework preset, set the root directory to `./`, leave Build Command blank, and set Output Directory to `.` if requested. Once linked, pushes to the configured production branch can trigger automatic deployments.

## Privacy

There is no app database or application backend. Uploaded sheets are parsed and processed in the browser and are not intentionally uploaded to a server. Swiss Manager spreadsheet support loads SheetJS from jsDelivr, so an internet connection is required. Use a trusted device for sensitive participant lists and review exports before an official event.
