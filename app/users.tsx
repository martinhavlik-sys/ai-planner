"use client";

import { FormEvent, useState, useRef } from "react";
import { User, UserRole, Task, Project, defaultPermissions, newId, permissionCatalog, saveUser, removeUser } from "./model";
import { avatarProfile, initialsFromName, maxPhotoBytes, personTaskCount } from "./model";
import { Avatar, ColorPicker } from "./people";

const blankUser = (): User => ({ id: newId(), name: "", ...avatarProfile({}), email: "", role: "user", status: "pending", permissions: defaultPermissions("user"), capacity: 60 });
const roleLabel = (role: UserRole) => role === "admin" ? "Administrátor" : "Používateľ";

export default function Users({ users, tasks, projects, onChange }: { users: User[]; tasks: Task[]; projects: Project[]; onChange: (users: User[]) => void }) {
  const [draft, setDraft] = useState<User>(blankUser);
  const [editing, setEditing] = useState(false);
  const [error, setError] = useState("");
  const [customInitials, setCustomInitials] = useState(false);
  const photoRevision = useRef(0);
  const reset = () => { photoRevision.current++; setDraft(blankUser()); setEditing(false); setCustomInitials(false); setError(""); };
  function selectPhoto(file?: File) {
    const revision = ++photoRevision.current;
    if (!file) return;
    if (!["image/png", "image/jpeg", "image/webp"].includes(file.type) || file.size > maxPhotoBytes) { setError("Vyberte PNG, JPEG alebo WebP do 150 KB."); return; }
    const reader = new FileReader();
    reader.onload = () => {
      if (revision !== photoRevision.current) return;
      try {
        const photo = avatarProfile({ photo: reader.result }).photo;
        const image = new Image();
        image.onload = () => { if (revision === photoRevision.current) { setDraft(current => ({ ...current, photo })); setError(""); } };
        image.onerror = () => { if (revision === photoRevision.current) setError("Obrázok sa nepodarilo načítať."); };
        image.src = photo;
      } catch (error) { setError((error as Error).message); }
    };
    reader.onerror = () => { if (revision === photoRevision.current) setError("Fotografiu sa nepodarilo prečítať."); };
    reader.readAsDataURL(file);
  }
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
      <form className="userForm" onSubmit={submit}>
        <h2>{editing ? "Upraviť používateľa" : "Nový používateľ"}</h2>
        <label>Meno<input required value={draft.name} onChange={e => setDraft({ ...draft, name: e.target.value, initials: customInitials ? draft.initials : initialsFromName(e.target.value) })} /></label>
        <div className="profilePreview"><Avatar user={{ ...draft, ...avatarProfile(draft) }} /><label>Iniciály<input maxLength={3} value={draft.initials} placeholder={initialsFromName(draft.name)} onChange={e => { setCustomInitials(!!e.target.value.trim()); setDraft({ ...draft, initials: e.target.value.toLocaleUpperCase("sk").replace(/\s/g, "").slice(0, 3) }); }} /></label><button type="button" className="ghost" onClick={() => { setCustomInitials(false); setDraft({ ...draft, initials: initialsFromName(draft.name) }); }}>Z mena</button></div>
        <ColorPicker label="Farba avatara" value={draft.avatarColor} onChange={avatarColor => setDraft({ ...draft, avatarColor })} />
        <label>Fotografia · PNG, JPEG, WebP do 150 KB<input type="file" accept="image/png,image/jpeg,image/webp" onChange={e => { selectPhoto(e.target.files?.[0]); e.target.value = ""; }} /></label>
        {draft.photo ? <button type="button" className="ghost" onClick={() => { photoRevision.current++; setDraft({ ...draft, photo: "" }); }}>Odstrániť fotografiu</button> : null}
        <label>Email<input required type="email" value={draft.email} onChange={e => setDraft({ ...draft, email: e.target.value })} /></label>
        <label>Rola<select value={draft.role} onChange={e => { const role = e.target.value as UserRole; setDraft({ ...draft, role, permissions: defaultPermissions(role) }); }}><option value="admin">Administrátor</option><option value="user">Používateľ</option></select></label>
        <small>Zmena roly nastaví predvolené oprávnenia. Jednotlivé oprávnenia môžete upraviť.</small>
        <span>Stav: {draft.status === "active" ? "Aktívny (lokálny záznam)" : "Pripravený na pozvanie"}</span>
        <div className="permissionGrid">{Array.from(new Set(permissionCatalog.map(p => p.group))).map(group => <fieldset key={group} className="permissionGroup"><legend>{group}</legend>
          {permissionCatalog.filter(p => p.group === group).map(p => <label key={p.key}><input type="checkbox" checked={draft.permissions.includes(p.key)} onChange={e => setDraft({ ...draft, permissions: e.target.checked ? [...draft.permissions, p.key] : draft.permissions.filter(key => key !== p.key) })} />{p.label}</label>)}
        </fieldset>)}</div>
        <button type="submit">{editing ? "Uložiť používateľa" : "Pridať používateľa"}</button>
        {editing ? <button type="button" className="ghost" onClick={reset}>Zrušiť</button> : null}
      </form>
      <div className="userList"><div className="userListHeader"><span>Meno / email</span><span>Rola / stav</span><span>Oprávnenia</span><span>Akcie</span></div>{users.map(user => <article className="userRow" key={user.id}>
        <div className="userIdentity"><Avatar user={user} /><div><strong>{user.name}</strong><small>{user.email || "Email treba doplniť"}</small><small>{personTaskCount(tasks, user.id)} úloh</small></div></div>
        <div><span>{roleLabel(user.role)}</span><small>{user.status === "active" ? "Aktívny (lokálny záznam)" : "Pripravený na pozvanie"}</small></div>
        <details><summary>Oprávnenia ({user.permissions.length}/{permissionCatalog.length})</summary><ul>{permissionCatalog.filter(p => user.permissions.includes(p.key)).map(p => <li key={p.key}>{p.label}</li>)}</ul>{user.permissions.length === 0 ? <p>Žiadne oprávnenia</p> : null}</details>
        <div className="userActions"><button className="ghost iconButton" title="Upraviť" aria-label={`Upraviť ${user.name}`} onClick={() => { photoRevision.current++; setDraft({ ...user, permissions: [...user.permissions] }); setCustomInitials(user.initials !== initialsFromName(user.name)); setEditing(true); setError(""); }}>✎</button><button className="danger iconButton" title="Zmazať" aria-label={`Zmazať ${user.name}`} onClick={() => remove(user.id)}>×</button></div>
      </article>)}</div>
    </div>
  </section>;
}
