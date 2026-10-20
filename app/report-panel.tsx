"use client";

import { useState } from "react";
import { reportPeriodOptions, formatDeadline } from "./model";
import type { Task, Project, Entity, Campaign } from "./model";
import { buildReport, defaultReportFilters, reportDateTypes, reportStatusLabels, reportPriorityLabels } from "./report-model";
import type { ReportFilters } from "./report-model";

type Props = { tasks?: Task[]; departments?: Project[]; entities?: Entity[]; projects?: Campaign[] };
export default function ReportPanel({ tasks = [], departments = [], entities = [], projects = [] }: Props) {
  const [filters, setFilters] = useState<ReportFilters>({ ...defaultReportFilters });
  const set = (key: keyof ReportFilters, value: string) => setFilters(current => ({ ...current, [key]: value }));
  const result = buildReport(tasks, filters);
  const { range } = result;
  const reset = () => setFilters({ ...defaultReportFilters });
  const doneLabel = filters.dateType === "Dátum dokončenia" ? "Dokončené v období" : filters.dateType === "Termín" ? "Hotové úlohy s termínom v období" : filters.dateType === "Dátum vytvorenia" ? "Hotové úlohy vytvorené v období" : "Hotové úlohy s blokom v období";
  const missingLabel = { "Dátum dokončenia": "dátum dokončenia", "Dátum vytvorenia": "dátum vytvorenia", "Termín": "platný termín", "Dátum pracovného bloku": "platný pracovný blok" }[filters.dateType];
  const catalogOptions = (items: { id: number; name: string; archived?: boolean }[], assigned: (number | null)[]) => {
    const missingIds = [...new Set(assigned.filter((id): id is number => id != null && !items.some(item => item.id === id)))];
    return <>{items.map(item => <option key={item.id} value={item.id}>{item.name}{item.archived ? " (archivované)" : ""}</option>)}{missingIds.map(id => <option key={id} value={id}>Neznámy záznam č. {id}</option>)}</>;
  };
  return <section className="reportFilterPanel" aria-label="Filtre reportu">
    <h2>Lokálny report</h2>
    <p>Zdroj: lokálne úlohy aktuálneho pracovného priestoru. Časové pásmo: Europe/Bratislava.</p>
    <div className="reportFilterGrid">
      <label>Obdobie<select aria-label="Obdobie" value={filters.period} onChange={event => set("period", event.target.value)}>
        {reportPeriodOptions.map(option => <option key={option}>{option}</option>)}
      </select></label>
      <label>Typ dátumu<select aria-label="Typ dátumu" value={filters.dateType} onChange={event => set("dateType", event.target.value)}>
        {reportDateTypes.map(option => <option key={option}>{option}</option>)}
      </select></label>
      <label>Oddelenie<select aria-label="Oddelenie" value={filters.department} onChange={event => set("department", event.target.value)}>
        <option value="">Všetky oddelenia</option><option value="none">Bez oddelenia</option>
        {catalogOptions(departments, tasks.map(task => task.projectId))}
      </select></label>
      <label>Entita<select aria-label="Entita" value={filters.entity} onChange={event => set("entity", event.target.value)}>
        <option value="">Všetky entity</option><option value="none">Bez entity</option>
        {catalogOptions(entities, tasks.flatMap(task => [task.entityId, ...(task.entityIds ?? [])]))}
      </select></label>
      <label>Projekt<select aria-label="Projekt" value={filters.project} onChange={event => set("project", event.target.value)}>
        <option value="">Všetky projekty</option><option value="none">Bez projektu</option>
        {catalogOptions(projects.map(project => ({ ...project, name: [project.name, project.edition, project.year].filter(Boolean).join(" · ") })), tasks.map(task => task.campaignId))}
      </select></label>
      <label>Stav úlohy<select aria-label="Stav úlohy" value={filters.status} onChange={event => set("status", event.target.value)}>
        <option value="">Všetky stavy</option>{Object.entries(reportStatusLabels).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
      </select></label>
      <label>Priorita<select aria-label="Priorita" value={filters.priority} onChange={event => set("priority", event.target.value)}>
        <option value="">Všetky priority</option>{Object.entries(reportPriorityLabels).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
      </select></label>
      <button type="button" className="ghost reportFilterReset" onClick={reset}>Zrušiť filtre</button>
    </div>
    {filters.period === "Vlastné obdobie" ? <div className="reportCustomRange">
      <label>Od<input aria-label="Od" type="date" value={filters.from} onChange={event => set("from", event.target.value)} /></label>
      <label>Do<input aria-label="Do" type="date" value={filters.to} onChange={event => set("to", event.target.value)} /></label>
    </div> : null}
    <p className="reportPeriodStatus" role={range.valid ? "status" : "alert"}>{range.valid ? `Vybrané obdobie: ${formatDeadline(range.start!)} – ${formatDeadline(range.end!)} · ${filters.dateType}` : range.error}</p>
    {range.valid ? <>
      {result.missingDateCount > 0 ? <p role="status">Počet úloh bez údaja „{missingLabel}“: {result.missingDateCount}. Rešpektuje ostatné filtre; tieto úlohy nie sú zahrnuté do výsledkov obdobia. Historické dátumy sa spätne nedopĺňajú.</p> : null}
      <section aria-label="Súhrn reportu" className="stats">
        <article><span>{result.total}</span><p>Úloh spolu</p></article>
        <article><span>{result.active}</span><p>Aktívne úlohy</p></article>
        <article><span>{result.done}</span><p>{doneLabel}</p></article>
      </section>
      <section aria-label="Výsledné úlohy" className="reportResults">
        <h3>Výsledné úlohy</h3>
        {result.tasks.length ? <ul>{result.tasks.map(task => <li key={task.id}><strong>{task.name}</strong><span>Číslo úlohy: {task.id} · {reportStatusLabels[task.status]} · {reportPriorityLabels[task.priority]}</span></li>)}</ul> : <p>Zvoleným filtrom nevyhovuje žiadna úloha.</p>}
      </section>
    </> : null}
  </section>;
}
