"use client";

import { useState } from "react";

const defaults = {
  period: "Tento týždeň",
  dateType: "Dátum dokončenia",
  department: "",
  entity: "",
  project: "",
  status: "",
  priority: "",
};

type FilterState = typeof defaults;

export default function ReportPanel() {
  const [filters, setFilters] = useState<FilterState>({ ...defaults });
  const set = (key: keyof FilterState, value: string) => setFilters(current => ({ ...current, [key]: value }));
  return <section className="reportFilterPanel" aria-label="Filtre reportu">
    <div className="reportFilterGrid">
      <label>Obdobie<select aria-label="Obdobie" value={filters.period} onChange={event => set("period", event.target.value)}>
        <option>Tento týždeň</option><option>Minulý týždeň</option><option>Tento mesiac</option><option>Minulý mesiac</option><option>Tento rok</option><option>Vlastné obdobie</option>
      </select></label>
      <label>Typ dátumu<select aria-label="Typ dátumu" value={filters.dateType} onChange={event => set("dateType", event.target.value)}>
        <option>Dátum dokončenia</option><option>Dátum vytvorenia</option><option>Termín</option><option>Dátum pracovného bloku</option>
      </select></label>
      <label>Oddelenie<select aria-label="Oddelenie" value={filters.department} onChange={event => set("department", event.target.value)}>
        <option value="">Všetky oddelenia</option>
      </select></label>
      <label>Entita<select aria-label="Entita" value={filters.entity} onChange={event => set("entity", event.target.value)}>
        <option value="">Všetky entity</option>
      </select></label>
      <label>Projekt<select aria-label="Projekt" value={filters.project} onChange={event => set("project", event.target.value)}>
        <option value="">Všetky projekty</option>
      </select></label>
      <label>Stav úlohy<select aria-label="Stav úlohy" value={filters.status} onChange={event => set("status", event.target.value)}>
        <option value="">Všetky stavy</option><option>Backlog</option><option>Dnes</option><option>Robi sa</option><option>Caka</option><option>Hotovo</option>
      </select></label>
      <label>Priorita<select aria-label="Priorita" value={filters.priority} onChange={event => set("priority", event.target.value)}>
        <option value="">Všetky priority</option><option>Nizka</option><option>Stredna</option><option>Vysoka</option>
      </select></label>
      <button type="button" className="ghost reportFilterReset" onClick={() => setFilters({ ...defaults })}>Zrušiť filtre</button>
    </div>
  </section>;
}
