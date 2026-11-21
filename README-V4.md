# IPI Report Generator v4 — Visual PDF Image Layout

## Install
1. Open `ipi-report-generator` in VS Code.
2. In PowerShell run `npm.cmd install` then `npm.cmd run dev`.
3. Open the localhost URL displayed by Vite.

## Workflow
- Create/Edit IPI: fill the form (only report date is required).
- Add photos under Image Attachments, click **Edit PDF Layout**.
- Drag photos within or between the dashed sections. Drag the red bottom-right handle to resize. Save Layout.
- Preview PDF or Save Report, then choose Yes Export PDF or Later.
- Search Reports by Initial Problem title or creation date, edit or delete.
- INITIAL / FINAL status is manual. Empty fields are allowed when exporting.

## Data
Without `.env.local`, reports use browser localStorage (same browser/device only). Images are compressed, but storage is limited. This is a **frontend prototype**, not a shared multi-device database deployment. For Supabase deployment, create the database and RLS policies and configure VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY; the existing `supabase.sql` is a starting point and should be reviewed before production. Do not use real confidential maintenance data before access control is implemented.

## PDF layout
The PDF is generated in A4 portrait. Image coordinates are stored as percentages of the selected section and converted to PDF points on export. The visual editor uses the same section geometry. The editor draws a simplified page background for positioning photos; it does not render every field or the complete Why-Why diagram. Use **Preview PDF** to inspect the final document. Very large diagrams/text may become too small or be truncated due to single-page limits.
