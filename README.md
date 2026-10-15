# Tournament Toolkit

Tournament Toolkit is a growing collection of browser-based utilities for chess tournament organizers by Kamus Catur.

## Projects

### 1. Swiss Manager Project — Individual Event Export

Open the Swiss Manager Project from the home page at `/swiss-manager/`.

The module converts XLSX, XLS or CSV participant listings into a workbook with the exact target headers and order:

`No;Name;Title;ID no;Rating nat;Rating int;Birth; Fed;Sex;Type;Gr;Clubno;Club;FIDE-No`

**Important:** ` Fed` includes one leading space intentionally.

Features include source-column mapping, registration-date based ID generation (`YYMMDD` plus a three-digit daily sequence), optional Malaysian IC-derived birth/sex, category and federation rules, duplicate checks, validation preview, XLSX export and validation report CSV.

The exporter uses a browser-side SheetJS library loaded from jsDelivr. An internet connection is needed to parse spreadsheet files in this version.

## Repository layout

```text
/
├── index.html                  # Tournament Toolkit home dashboard
├── swiss-manager/
│   └── index.html              # Swiss Manager converter
└── README.md
```

## Deploy on Vercel

Import this GitHub repository into Vercel. For the current static HTML application, choose **Other** as the framework preset, use the repository root (`./`), leave Build Command blank, and set Output Directory to `.` if requested.

When Vercel is linked to this repository, pushes to the configured production branch can trigger automatic deployments.

## Privacy

The application has no database or application backend. Participant lists are read and converted in the browser; the app does not intentionally upload them to a server. The browser does request the SheetJS library file from the CDN. Always use a trusted device and review exports before using them for an official tournament.
