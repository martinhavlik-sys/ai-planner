# v7 verification — 2026-09-20

- Full offline Babel component harness plus model/regression suite: **65 passed, 0 failed, 0 skipped**. Includes calendar pointer resize/move, keyboard resize, native dialog, navigation persistence, assignments, schema migration and new icon/accessibility/font checks.
- Explicit TypeScript check (`tsc --noEmit --incremental false`): passed.
- Production Next.js 16.3.5 / Turbopack build: passed; static `/` and `/_not-found` routes. Shared icon component is `ui-icon.tsx` to avoid Next's reserved icon metadata filename. No font network request is needed by the build.
- v6 model, repository, Supabase client and neutral globals.css are byte-identical to the preserved baseline. SQL is byte-identical to the unchanged v6 archive. Archive hash matches the recorded v6 checkpoint.
- Local font binary signatures and SHA-256 values checked. Every mapped MDX codepoint was verified against the supplied WOFF Unicode cmap. Montserrat Latin and Latin Extended WOFF2 and complete OFL are bundled.

## Browser observations

Actual local in-app browser QA at 1280×720 and responsive override 390×844, not a screenshot mockup. Inspected desktop table, calendar, task editor over calendar, flat departments, projects (empty state/form), users, Inbox, Kanban and detail. Navigation controls and icon-only action accessible names were visible in the accessibility tree. Corrected Kanban card contrast after inspection. Task dialog uses native top layer, locks body scroll, closes with Escape and returns focus to the opening button.

At 390 px, users, entities, clients, table and calendar had document scrollWidth 390 (no whole-page horizontal overflow). The task dialog width was 358 px and scrolled internally. Table content (1063 px) and calendar canvas (656 px) retain their own horizontal scrolling. Mobile navigation remains available and grouped; filters can be collapsed. Viewport override was reset and temporary browser tab closed.

Browser QA did not perform destructive data actions or a complete create/edit/export/import roundtrip, and did not manually exercise every drag gesture, touch device, browser engine or blocked-font scenario. Move/resize behavior was checked by the full handler harness; font failure retains system text fallback and labeled controls by construction. No claim of exhaustive browser/device accessibility certification is made.

No push, deployment, dashboard changes or remote database writes were performed. Local dev preview was stopped. MDX redistribution permission was not supplied or independently verified; see public/fonts/SOURCES.md.
