"use client";

import { FormEvent, useEffect, useRef, useState } from "react";
import { TestSessionController, testConfigurationStatus, testReadOnlyEnabled, testTaskWritesEnabled, testSessionKey, type AuthSession, type TestAuthState, type RemoteTask } from "./supabase-auth";
import {writeOwnCloudTask} from "./cloud-task-write";
export type { RemoteTask } from "./supabase-auth";
type Props = {
  onTasksLoaded?: (tasks: RemoteTask[]) => void;
  onSessionChange?: (state: TestAuthState, signOut: () => void) => void;
};
const initialState: TestAuthState = { phase: "checking", user: null, expiresAt: null, tasks: [], message: "" };

export default function TestAuthPanel({ onTasksLoaded, onSessionChange }: Props) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [state, setState] = useState<TestAuthState>(initialState);
  const mutationGeneration=useRef(0),busyMutation=useRef(false);
  const account=useRef<string|null>(null);
  account.current=state.user?.id??null;
  const [taskTitle,setTaskTitle]=useState("Syntetická TEST – cloudový zápis");
  const [taskStatus,setTaskStatus]=useState("Backlog");
  const [taskPriority,setTaskPriority]=useState("Stredna");
  const [editId,setEditId]=useState("");
  const [taskMessage,setTaskMessage]=useState("");
  const [sending,setSending]=useState(false);
  const request=useRef<{user:string;id:string}|null>(null);
  async function saveCloud(event:FormEvent){
    event.preventDefault();if(busyMutation.current||!account.current)return;
    const user=account.current,generation=mutationGeneration.current;busyMutation.current=true;setSending(true);setTaskMessage("");
    try{
      let session:AuthSession|null;try{session=JSON.parse(window.sessionStorage.getItem(testSessionKey)??"null");}catch{throw Error("Relácia nie je platná.");}
      if(!session||session.user?.id!==user)throw Error("Relácia nie je platná.");
      if(request.current?.user!==user)request.current={user,id:crypto.randomUUID()};
      const edit=editId?state.tasks.find(t=>String(t.id)===editId):undefined;
      if(editId&&(!edit||!edit.write_version))throw Error("Obnovte verziu úlohy.");
      await writeOwnCloudTask(session,{title:taskTitle,status:taskStatus,priority:taskPriority},request.current.id,edit?{workspace_id:edit.workspace_id,id:edit.id,write_version:edit.write_version!}:undefined);
      if(account.current!==user||generation!==mutationGeneration.current)return;
      setTaskMessage("TEST úloha bola uložená.");await controller.current?.reload();
    }catch(error){if(account.current===user&&generation===mutationGeneration.current){setTaskMessage(error instanceof Error?error.message:"Uloženie zlyhalo.");await controller.current?.reload();}}
    finally{if(generation===mutationGeneration.current){busyMutation.current=false;setSending(false);}}
  }
  const controller = useRef<TestSessionController | null>(null);
  const configuration = testConfigurationStatus();
  const readOnly = testReadOnlyEnabled();
  const callback = useRef(onTasksLoaded);
  callback.current = onTasksLoaded;
  const sessionCallback = useRef(onSessionChange);
  sessionCallback.current = onSessionChange;

  useEffect(() => {
    let active = true;
    let instance: TestSessionController;
    try {
      instance = new TestSessionController(window.sessionStorage, next => {
        if (!active) return;
        if(next.phase!=="signed-in"||account.current!==next.user?.id){mutationGeneration.current++;busyMutation.current=false;setSending(false);}
        if(next.phase==="signed-out"){request.current=null;setEditId("");setTaskMessage("");}
        account.current=next.user?.id??null;setState(next); callback.current?.(next.tasks);
        sessionCallback.current?.(next, () => { void instance.signOut(); });
      });
      controller.current = instance;
      void instance.restore();
    } catch {
      const next: TestAuthState = { ...initialState, phase: "signed-out", message: "Úložisko relácie nie je dostupné. Povoľte ho pre testovacie prihlásenie." };
      setState(next);
      callback.current?.([]);
      sessionCallback.current?.(next, () => {});
      return;
    }
    const timer = window.setInterval(() => { void instance.reload(); }, 30000);
    const focus = () => { instance.checkExpiry(); void instance.reload(); };
    window.addEventListener("focus", focus);
    const visible = () => { if (document.visibilityState === "visible") focus(); };
    document.addEventListener("visibilitychange", visible);
    return () => {
      active = false; instance.dispose(); controller.current = null;
      window.clearInterval(timer); window.removeEventListener("focus", focus); document.removeEventListener("visibilitychange", visible);
    };
  }, []);

  useEffect(() => {
    if (state.expiresAt === null) return;
    const timer = window.setTimeout(() => controller.current?.checkExpiry(), Math.max(0, Math.min(2147483647, state.expiresAt * 1000 - Date.now())));
    return () => window.clearTimeout(timer);
  }, [state.expiresAt]);

  async function submit(event: FormEvent) {
    event.preventDefault();
    const secret = password; setPassword("");
    await controller.current?.signIn(email.trim(), secret);
  }
  const busy = state.phase === "checking";
  return <section aria-label="Testovacie prihlásenie" style={{ margin: "1rem 0", padding: "1rem", border: "1px solid #d5deea", borderRadius: 12 }}>
    <h2 style={{ marginTop: 0 }}>Testovacie prihlásenie</h2>
    <p>{testTaskWritesEnabled() ? "TEST režim · čítanie, vytvorenie a úprava vlastnej syntetickej úlohy. Mazanie zostáva uzamknuté." : readOnly ? "TEST režim iba na čítanie · vzdialené úlohy sa načítajú po overení relácie a členstva. Lokálne údaje zostávajú oddelené." : "Auth-only · vzdialené úlohy zostávajú uzamknuté do kontroly RLS. Lokálny pracovný priestor a report sú oddelené."}</p>
    <p>{testTaskWritesEnabled() ? "Relácia zostáva iba v tejto karte. Povolená je jedna syntetická úloha na účet; lokálne údaje zostávajú oddelené." : "Relácia sa uchováva iba v tejto karte. Ukladanie do databázy je zatiaľ zablokované."}</p>
    {taskMessage ? <p role="status">{taskMessage}</p> : null}
    {testTaskWritesEnabled()&&state.phase==="signed-in" ? <form aria-label="Vlastná cloudová TEST úloha" onSubmit={saveCloud}>
      <label>Úloha na úpravu<select value={editId} onChange={e=>{setEditId(e.target.value);const row=state.tasks.find(t=>String(t.id)===e.target.value);setTaskTitle(row?.title??"Syntetická TEST – cloudový zápis");setTaskStatus(row?.status??"Backlog");setTaskPriority(row?.priority??"Stredna");}}><option value="">Nová syntetická úloha</option>{state.tasks.map(t=><option key={t.id} value={t.id}>{t.title}</option>)}</select></label>
      <label>Názov cloudovej úlohy<input required value={taskTitle} disabled={sending||!editId} onChange={e=>setTaskTitle(e.target.value)} /></label>
      <label>Stav cloudovej úlohy<select value={taskStatus} onChange={e=>setTaskStatus(e.target.value)}>{["Backlog","Dnes","Robi sa","Caka","Hotovo"].map(x=><option key={x}>{x}</option>)}</select></label>
      <label>Priorita cloudovej úlohy<select value={taskPriority} onChange={e=>setTaskPriority(e.target.value)}>{["Nizka","Stredna","Vysoka"].map(x=><option key={x}>{x}</option>)}</select></label>
      <button disabled={sending}>{sending?"Ukladám…":editId?"Uložiť vlastnú cloudovú úlohu":"Vytvoriť vlastnú TEST úlohu"}</button>
    </form> : null}
    {state.phase === "signed-in" ? <>
      <p>Prihlásený účet: {state.user?.email ?? state.user?.id}</p>
      <button type="button" onClick={() => { void controller.current?.reload(); }}>Overiť prihlásenie/reláciu</button>{" "}
    </> : null}
    {state.phase !== "signed-out" ? <button type="button" onClick={() => { void controller.current?.signOut(); }}>Odhlásiť sa</button> : null}
    {state.phase === "signed-out" ? <form onSubmit={submit} style={{ display: "flex", gap: ".5rem", flexWrap: "wrap" }}>
      <input aria-label="E-mail" type="email" autoComplete="username" required placeholder="E-mail" value={email} onChange={event => setEmail(event.target.value)} />
      <input aria-label="Heslo" type="password" autoComplete="current-password" required placeholder="Heslo" value={password} onChange={event => setPassword(event.target.value)} />
      <button type="submit" disabled={!controller.current || !configuration.ready}>Overiť prihlásenie/reláciu</button>
    </form> : null}
    {!configuration.ready ? <p role="alert">{configuration.message}</p> : null}
    {busy ? <p role="status">Overujem reláciu…</p> : null}
    {state.message ? <p role="status">{state.message}</p> : null}
  </section>;
}
