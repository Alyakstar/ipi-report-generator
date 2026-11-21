# IPI Report Generator v8 — Section Spacing and Alignment

Based on v7. No features intentionally removed.

- Increased III. ACTION table height from 132 to 190 PDF points, keeping the existing Temporary Action / Fixed Action columns.
- Reduced IV. NEXT ACTION table height from 148 to 90 points. Image attachment remains supported.
- Updated PDF_ZONES for the four image placement areas so drag-and-drop locations match the new tables.
- General Information label column starts at x=27, aligned with the heading; label, colon, and value now use fixed aligned columns in the visual editor and PDF.
- Date format, signature methods, Search Reports landing, Back, CRUD, and Why-Why Tree unchanged.

Validation: PDF generator passes node --check; ZIP integrity tested. Browser build was not available in this environment because npm registry network lookup failed. Please test PDF export and image dragging locally.
