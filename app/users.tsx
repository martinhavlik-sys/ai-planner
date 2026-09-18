"use client";

import { FormEvent, useState } from "react";
import { User, UserRole, Task, Project, defaultPermissions, newId, permissionCatalog, saveUser, removeUser } from "./model";

const blankUser = (): User => ({ id: newId(), name: "", email: "", role: "user", status: "pending", permissions: defaultPermissions("user"), capacity: 60 });
const roleLabel = (role: UserRole) => role === "admin" ? "Administrátor" : "Používateľ";

export default function Users({ users, tasks, projects, onChange }: { users: User[]; tasks: Task[]; projects: Project[]; onChange: (users: User[]) => void }) {
  const [draft, setDraft] = useState<User>(blankUser);
  const [editing, setEditing] = useState(false);
  const [error, setError] = useState("");
  const reset = () => { setDraft(blankUser()); setEditing(false); setError(""); };
  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    try { onChange(saveUser(users, draft)); reset(); }
    catch (error) { setError(error instanceof Error ? error.message : "Používateľa sa nepodarilo uložiť."); }
  }
  function remove(id: number) {
    try { onChange(removeUser(users, tasks, projects, id)); if (draft.id === id) reset(); else setError(""); }
    catch (error) { setError(error instanceof Error ? error.message : "Používateľa sa nepodarilo zmazať."); }
  }
  return <section className="usersManager">
    <p className="usersInfo">Používatelia a oprávnenia sa zatiaľ iba evidujú lokálne. Aktivácia účtu a pozvánka budú dostupné po pripojení prihlasovania. Oprávnenia zatiaľ neobmedzujú prístup.</p>
    {error ? <p role="alert" className="notice">{error}</p> : null}
    <div className="usersColumns">
      <form className="clientForm userForm" onSubmit={submit}>
        <h2>{editing ? "Upraviť používateľa" : "Nový používateľ"}</h2>
        <label>Meno<input required value={draft.name} onChange={e => setDraft({ ...draft, name: e.target.value })} /></label>
        <label>Email<input required type="email" value={draft.email} onChange={e => setDraft({ ...draft, email: e.target.value })} /></label>
        <label>Rola<select value={draft.role} onChange={e => { const role = e.target.value as UserRole; setDraft({ ...draft, role, permissions: defaultPermissions(role) }); }}><option value="admin">Administrátor</option><option value="user">Používateľ</option></select></label>
        <small>Zmena roly nastaví predvolené oprávnenia. Jednotlivé oprávnenia môžete upraviť.</small>
        <span>Stav: {draft.status === "active" ? "Aktívny (lokálny záznam)" : "Pripravený na pozvanie"}</span>
        {Array.from(new Set(permissionCatalog.map(p => p.group))).map(group => <fieldset key={group} className="permissionGroup"><legend>{group}</legend>
          {permissionCatalog.filter(p => p.group === group).map(p => <label key={p.key}><input type="checkbox" checked={draft.permissions.includes(p.key)} onChange={e => setDraft({ ...draft, permissions: e.target.checked ? [...draft.permissions, p.key] : draft.permissions.filter(key => key !== p.key) })} />{p.label}</label>)}
        </fieldset>)}
        <button type="submit">{editing ? "Uložiť používateľa" : "Pridať používateľa"}</button>
        {editing ? <button type="button" className="ghost" onClick={reset}>Zrušiť</button> : null}
      </form>
      <div className="clientList">{users.map(user => <article className="userRow" key={user.id}>
        <div><strong>{user.name}</strong><small>{user.email || "Email treba doplniť"}</small><p>{roleLabel(user.role)} · {user.status === "active" ? "Aktívny (lokálny záznam)" : "Pripravený na pozvanie"}</p></div>
        <details><summary>Oprávnenia ({user.permissions.length}/{permissionCatalog.length})</summary><ul>{permissionCatalog.filter(p => user.permissions.includes(p.key)).map(p => <li key={p.key}>{p.label}</li>)}</ul>{user.permissions.length === 0 ? <p>Žiadne oprávnenia</p> : null}</details>
        <div className="userActions"><button className="ghost" onClick={() => { setDraft({ ...user, permissions: [...user.permissions] }); setEditing(true); setError(""); }}>Upraviť</button><button className="danger" onClick={() => remove(user.id)}>Zmazať</button></div>
      </article>)}</div>
    </div>
  </section>;
}
