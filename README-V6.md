# IPI Report Generator v6 — Daily Report-style Header

## Changes from v5
- A4 PDF uses the boxed Daily Report-style header with PT TMMIN, EPSD SUNTER II, Maintenance Department and INITIAL PROBLEM INFORMATION. Date and shift are populated from General Information.
- Section II: one full-width Why-Why / Problem Assumption diagram area, with Estimation time and Actual Time in the upper-right. The old separate Action column is removed.
- Section III renamed ACTION (Problem Countermeasure), Temporary Action on left and Fixed Action on right.
- Image attachment zones: Problem Assumption, Temporary Action, Fixed Action, Next Action. Existing images previously placed in the old Action zone are exported in Problem Assumption for backward compatibility.
- SH and GL each offer Draw Online and Upload Image (PNG/JPG/WebP), with preview, clear, and PDF embedding.
- Search Reports remains the default home. Navigation, report CRUD, localStorage, optional Supabase, manual status and export behavior are retained.

## Run
`npm.cmd install` then `npm.cmd run dev` on Windows PowerShell.

## Notes
- The visual image layout editor is an SVG approximation of the A4 PDF, not a PDF.js rendered WYSIWYG view.
- Image placements can overlap text/tree elements; visually check the exported PDF before official use.
- Reports stored in browser localStorage do not sync across devices until Supabase is configured.
- Build and cross-device runtime testing are still required.
