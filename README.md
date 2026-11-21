# IPI Report Generator — TMMIN Maintenance

## Phase 1: frontend first (recommended)
1. Install Node.js LTS and VS Code.
2. Extract ZIP and open the `ipi-report-generator` folder in VS Code (File > Open Folder).
3. Open Terminal > New Terminal.
4. Run `npm install`.
5. Run `npm run dev`.
6. Open the localhost URL shown by Vite (usually http://localhost:5173).
7. Fill out the form, add Why branches, draw SH/GL signatures, optionally add photos, and click Preview PDF or Save Report.
8. After Save, click Yes, Export PDF or Later. Search & Edit finds locally saved reports.

## Exact source PDF template
`public/template.pdf` is the uploaded original TMMIN template. The PDF generator embeds the original page, rather than redrawing it. The source PDF is US Letter; it is scaled proportionally to A4 portrait.

## Important demo limitations
- Without Supabase environment variables, reports live only in **this browser** (localStorage). They are not shared across devices and can be lost if browser storage is cleared.
- Image files are converted to PNG and scaled down before storage. LocalStorage capacity is limited; use small images during the prototype.
- The PDF renderer currently places content into fixed zones of the original template. Very long text/tree diagrams may become too small or be truncated. Verify preview before use; this is a prototype, not a guaranteed no-overflow production renderer.
- No PDF version history or dashboard.
- INITIAL and FINAL statuses are manually chosen; blank fields are allowed except report date.
- Signatures are drawn images, not certified electronic signatures.

## Phase 2: Supabase
1. Create a Supabase project and run `supabase.sql` in SQL Editor.
2. **Configure authentication and appropriate Row Level Security policies** for authorized maintenance staff before allowing access. This starter does not include login, and its SQL intentionally denies access by default.
3. Copy `.env.example` to `.env.local` and set `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` (publishable key, never service_role).
4. Restart `npm run dev`.
5. The starter's Supabase code is prepared, but you must implement sign-in and RLS before production usage. For a production deployment, move images/signatures to a private Supabase Storage bucket rather than storing large base64 data in the JSON payload.

## Production considerations
- Add authentication, role permissions, audit controls, private image storage, upload limits, and better overflow/diagram layout checks.
- The Save button persists the same report ID; saving again updates the same row.
- Date search uses creation date, separate from report date.
