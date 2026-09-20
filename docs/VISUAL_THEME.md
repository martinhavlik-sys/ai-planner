# v7 visual theme — 2026-09-20

The ProCare-inspired layer uses Montserrat, navy #033f75, green #0ba13b and accent #3385d1. Small white-on-green action text uses darker #087b2e for readability. The UI kit is a visual reference, not a runtime dependency. All assets are local; see `public/fonts/SOURCES.md` and `OFL.txt` for sources and license limits.

`app/theme.css` scopes all presentation overrides to `html[data-theme="procare"]`. Tokens are defined at the top. `app/fonts.css` defines local font faces and shared decorative icon sizing. `app/ui-icon.tsx` is the only glyph map, with a typed name union and small SVG fallbacks. Callers own labels/tooltips; decorative glyphs are hidden from assistive technology.

The theme covers navigation, header, filters, task table, Kanban, calendar chrome, record forms/lists, users and permissions, dialogs, detail, notices, badges, focus and responsive layout. Departments are a flat list instead of separate cards. Long task tables retain horizontal scrolling. Calendar event background/text/department border, time coordinates, resize handle geometry and layering remain governed by v6.

## Reversal

For neutral styling, change only `data-theme="procare"` to `data-theme="neutral"` in `app/layout.tsx`. The original `globals.css` then governs appearance; local Montserrat is not selected. Shared decorative icons remain. This does not change or migrate workspace data.

For an exact v6 application-source rollback, stop the dev server, retain a copy of current v7, and restore the application files (all files except manifest.json) from `visual-baseline/v6/` to `app/`, removing only the trailing `.txt` from TypeScript copies (`page.tsx.txt` becomes `page.tsx`). Then remove v7-only `app/theme.css`, `app/fonts.css`, `app/ui-icon.tsx` and `public/fonts/`. `visual-baseline/v6/manifest.json` records SHA-256 checksums. Baseline copies are text so Next/TypeScript do not compile a duplicate app. Restore v6 tests/docs from the unchanged v6 ZIP if reverting the whole project; the baseline contains application source, not all project files.

The original v6 archive is preserved beside the source: `ai-planner-v6-2026-09-19.zip`, SHA-256 `fa30eba916c9d2a396f0a9e85f2e83c4968ee7083e771015ff788ca9159ceb43`. Extract that archive into a separate directory for a full snapshot. Do not import a different workspace merely to change the theme. Browser local data is origin-specific, not stored in either ZIP.

## Verification

See `QA_V7.md` for actual checks and limitations. Data model, repository, SQL and schema version 5 are unchanged. No deployment, push, account provisioning or remote data write is part of v7.
