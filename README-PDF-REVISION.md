# IPI Report Generator — PDF Layout Revision

## What changed
- Original template PDF is no longer embedded as a background; the report is drawn cleanly in A4 portrait.
- All input sections have fixed boundaries to avoid spillover into neighboring cells.
- Problem Assumption tree is drawn top-down with branches below their parents.
- SH and GL signatures are placed within their signature boxes.
- Images are placed inside their selected sections.
- INITIAL reports can be exported with blank fields.

## Run
Open this folder in VS Code and run:

```powershell
npm.cmd install
npm.cmd run dev
```

## Important limitations
- A4 has finite space. Very large diagrams/text are fitted to a minimum font size, then may be truncated with ellipses. Some excess photos may be omitted with a console warning. Check PDF preview before printing.
- This version uses localStorage when Supabase environment variables are absent. Set up authentication and RLS before storing company data in a deployed application.
- The text renderer uses standard Helvetica, so non-Latin Unicode characters are replaced. Ordinary Indonesian/English ASCII text works.
