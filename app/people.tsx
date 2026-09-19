"use client";

import { useState } from "react";
import { User, Task, assignedUsers, departmentColors, defaultColor } from "./model";

export function Avatar({ user }: { user: User }) {
  return <span className="avatar" role="img" aria-label={user.name} title={user.name} style={{ background: user.avatarColor }}>
    {user.photo ? <img src={user.photo} alt="" /> : <span>{user.initials}</span>}
  </span>;
}

export function People({ task, users, expanded = false }: { task: Task; users: User[]; expanded?: boolean }) {
  const people = assignedUsers(task, users);
  if (!people.length) return <span className="unassigned">Nepriradené</span>;
  return <span className={`people ${expanded ? "expanded" : ""}`} role="group" aria-label={`Osoby: ${people.map(u => u.name).join(", ")}`}>
    {people.slice(0, expanded ? people.length : 3).map(user => <span className="person" key={user.id}><Avatar user={user} />{expanded ? user.name : null}</span>)}
    {!expanded && people.length > 3 ? <span className="avatar morePeople" title={people.slice(3).map(u => u.name).join(", ")}>+{people.length - 3}</span> : null}
  </span>;
}

export function PersonPicker({ users, ids, onChange }: { users: User[]; ids: number[]; onChange: (ids: number[]) => void }) {
  const [query, setQuery] = useState("");
  return <fieldset className="personPicker"><legend>Osoby ({ids.length})</legend>
    <details><summary>{ids.length ? users.filter(u => ids.includes(u.id)).map(u => u.name).join(", ") : "Vybrať osoby"}</summary>
      <input aria-label="Vyhľadať osobu" placeholder="Hľadať osobu" value={query} onChange={e => setQuery(e.target.value)} />
      <div className="personChoices">{users.filter(u => `${u.name} ${u.email}`.toLocaleLowerCase("sk").includes(query.toLocaleLowerCase("sk"))).map(user =>
        <label key={user.id}><input type="checkbox" checked={ids.includes(user.id)} onChange={e => onChange(e.target.checked ? [...new Set([...ids, user.id])] : ids.filter(id => id !== user.id))} /><Avatar user={user} /><span>{user.name}</span></label>
      )}</div>
      <button type="button" className="ghost" onClick={() => onChange([])}>Zrušiť priradenie</button>
    </details>
  </fieldset>;
}

export function ColorPicker({ value, onChange, label }: { value: string; onChange: (color: string) => void; label: string }) {
  return <fieldset className="compactColor"><legend>{label}</legend><div className="colorControl">
    <span className="colorSample" role="img" aria-label={`Vybraná farba ${value}`} style={{ background: value }} />
    <details><summary>Vybrať inú farbu</summary><div className="colorPalette"><div className="colorChoices">
      {departmentColors.map(color => <button key={color} type="button" className={value.toLowerCase() === color.toLowerCase() ? "selected" : ""} style={{ background: color }} aria-pressed={value.toLowerCase() === color.toLowerCase()} title={`Farba ${color}`} aria-label={`Farba ${color}`} onClick={() => onChange(color)}>{value.toLowerCase() === color.toLowerCase() ? "✓" : ""}</button>)}
    </div><button type="button" className="ghost paletteDefault" onClick={() => onChange(defaultColor)}>Predvolené</button></div></details>
  </div></fieldset>;
}
