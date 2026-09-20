/** MDX names/codepoints from the supplied UI kit. No raw glyphs in consumers.
 * All icons are decorative: the enclosing control owns its accessible name.
 * Small original SVGs cover actions without a verified MDX mapping.
 */
export const iconGlyphs = {
  dashboard: "\ue936", calendar: "\ue935", departments: "\ue98e",
  projects: "\ue99a", users: "\ue990", entity: "\ue983", inbox: "\ue93f",
  settings: "\ue94d", download: "\ue948", upload: "\ue908", plus: "\ue912",
  check: "\ue914", search: "\ue919", sort: "\ue91a", right: "\ue91b",
  left: "\ue91c", up: "\ue91d", down: "\ue91e", close: "\ue91f",
  filter: "\ue920", edit: "\ue924", trash: "\ue929",
} as const;
const paths = {
  tasks: "M8 5h13 M8 12h13 M8 19h13 M3 5h.1 M3 12h.1 M3 19h.1",
  copy: "M8 8h12v12H8z M16 8V4H4v12h4",
  archive: "M3 4h18v4H3z M5 8v12h14V8 M9 12h6",
  restore: "M4 10a8 8 0 1 1 1 8 M4 4v6h6",
  table: "M3 4h18v16H3z M3 9h18 M9 9v11",
  kanban: "M3 4h5v12H3z M10 4h5v8h-5z M17 4h4v15h-4z",
} as const;
export type IconName = keyof typeof iconGlyphs | keyof typeof paths;
export default function Icon({ name }: { name: IconName }) {
  if (name in iconGlyphs) return <span className="uiIcon" aria-hidden="true">{iconGlyphs[name as keyof typeof iconGlyphs]}</span>;
  return <svg className="uiIcon" aria-hidden="true" focusable="false" viewBox="0 0 24 24"><path d={paths[name as keyof typeof paths]} /></svg>;
}
