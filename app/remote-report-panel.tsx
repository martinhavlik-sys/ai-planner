"use client";

import { useState } from "react";
import type { RemoteTask } from "./supabase-auth";
import { buildRemoteReport, emptyRemoteReportFilters, remoteTaskKey } from "./remote-report-model";
import { reportStatusLabels, reportPriorityLabels } from "./report-model";

export default function RemoteReportPanel({ tasks }: { tasks: RemoteTask[] }) {
  const [filters, setFilters] = useState({ ...emptyRemoteReportFilters });
  const result = buildRemoteReport(tasks, filters);
  const statuses = [...new Set(tasks.flatMap(task => task.status ? [task.status] : []))];
  const priorities = [...new Set(tasks.flatMap(task => task.priority ? [task.priority] : []))];
  const statusLabel = (value: string | null) => value ? reportStatusLabels[value as keyof typeof reportStatusLabels] ?? value : "Bez stavu";
  const priorityLabel = (value: string | null) => value ? reportPriorityLabels[value as keyof typeof reportPriorityLabels] ?? value : "Bez priority";
  return <section className="reportFilterPanel" aria-label="Vzdialený report">
    <h2>Vzdialený report</h2>
    <p>Zdroj: úlohy z testovacej databázy. Iba na čítanie. Lokálne úlohy do tohto reportu nevstupujú.</p>
    <p role="status">Načítané úlohy: {result.loaded}. Zobrazené po filtrovaní: {result.total}.</p>
    {!result.loaded ? <p>Vzdialené úlohy nie sú načítané. Po odhlásení sú skryté.</p> : null}
    <div className="reportFilterGrid">
      <label>Hľadať vzdialené úlohy<input aria-label="Hľadať vzdialené úlohy" value={filters.query} onChange={event => setFilters(current => ({ ...current, query: event.target.value }))} /></label>
      <label>Stav vzdialenej úlohy<select aria-label="Stav vzdialenej úlohy" value={filters.status} onChange={event => setFilters(current => ({ ...current, status: event.target.value }))}>
        <option value="">Všetky stavy</option>{statuses.map(status => <option key={status} value={status}>{statusLabel(status)}</option>)}
      </select></label>
      <label>Priorita vzdialenej úlohy<select aria-label="Priorita vzdialenej úlohy" value={filters.priority} onChange={event => setFilters(current => ({ ...current, priority: event.target.value }))}>
        <option value="">Všetky priority</option>{priorities.map(priority => <option key={priority} value={priority}>{priorityLabel(priority)}</option>)}
      </select></label>
      <button type="button" className="ghost" onClick={() => setFilters({ ...emptyRemoteReportFilters })}>Zrušiť vzdialené filtre</button>
    </div>
    <section aria-label="Súhrn vzdialeného reportu" className="stats">
      <article><span>{result.total}</span><p>Úloh spolu</p></article>
      <article><span>{result.active}</span><p>Aktívne úlohy</p></article>
      <article><span>{result.done}</span><p>Hotové úlohy</p></article>
    </section>
    <section className="reportResults" aria-label="Výsledné vzdialené úlohy">
      <h3>Výsledné vzdialené úlohy</h3>
      {result.tasks.length ? <ul className="remoteReportList">{result.tasks.map(task => <li key={remoteTaskKey(task)}>
        <strong>{task.title}</strong><span>Číslo úlohy: {task.id} · {statusLabel(task.status)} · {priorityLabel(task.priority)}</span>
      </li>)}</ul> : <p>Zvoleným filtrom nevyhovuje žiadna načítaná vzdialená úloha.</p>}
    </section>
  </section>;
}
