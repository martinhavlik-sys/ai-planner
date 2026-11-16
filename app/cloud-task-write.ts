import {testReadOnlyEnabled, testTaskWritesEnabled, verifyTestSession, testProjectUrl, TestTaskWriteBlockedError, testWriteWorkspaces, type AuthSession} from './supabase-auth';
export const cloudTestWorkspaces=testWriteWorkspaces;
export type OwnTaskFields={title:string;status:string;priority:string};
export type OwnTaskEdit={workspace_id:string;id:number;write_version:number};
export async function writeOwnCloudTask(session:AuthSession, fields:OwnTaskFields, requestId:string, edit?:OwnTaskEdit){
 if(!testTaskWritesEnabled()||!testReadOnlyEnabled())throw new TestTaskWriteBlockedError();
 const validUuid=/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
 if(!validUuid.test(session.user.id)||!Number.isSafeInteger(session.expires_at)||session.expires_at*1000<=Date.now())throw Error('Relácia vypršala. Prihláste sa znova.');
 if(!fields.title.trim()||fields.title.length>1000||!['Backlog','Dnes','Robi sa','Caka','Hotovo'].includes(fields.status)||!['Nizka','Stredna','Vysoka'].includes(fields.priority)||!validUuid.test(requestId))throw Error('Skontrolujte názov, stav, prioritu a požiadavku.');
 await verifyTestSession(session);
 if(session.expires_at*1000<=Date.now())throw Error('Relácia vypršala.');
 const headers={apikey:process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,Authorization:`Bearer ${session.access_token}`,'Content-Type':'application/json',Prefer:'return=representation'};
 async function call(path:string,method='GET',body?:unknown){
  let r:Response;try{r=await fetch(testProjectUrl+path,{method,headers,credentials:'omit',redirect:'error',cache:'no-store',signal:AbortSignal.timeout(15000),...(body?{body:JSON.stringify(body)}:{})});}catch{throw Error('Výsledok odoslania nie je známy. Obnovte údaje; pri vytváraní zachovajte rovnaké ID požiadavky.');}
  let rows:unknown;try{rows=await r.json();}catch{throw Error('Neplatná odpoveď testovacieho prostredia.');}
  return {r,rows};
 }
 const memberships=await call(`/rest/v1/workspace_members?select=workspace_id,user_id&user_id=eq.${session.user.id}&limit=2`);
 const m=memberships.rows as {workspace_id:string;user_id:string}[];
 if(!memberships.r.ok||!Array.isArray(m)||m.length!==1||!m[0]||m[0].user_id!==session.user.id||!cloudTestWorkspaces.includes(m[0].workspace_id))throw Error('Účet nemá jednoznačný syntetický TEST workspace.');
 const workspace=m[0].workspace_id,body={title:fields.title.trim(),status:fields.status,priority:fields.priority};
 if(edit&&(!Number.isSafeInteger(edit.id)||edit.id<=0||!Number.isInteger(edit.write_version)||edit.write_version<1||edit.write_version>=2147483647||edit.workspace_id!==workspace))throw Error('Neplatná identita alebo verzia úlohy.');
 const select='workspace_id,id,title,status,priority,created_by_user_id,write_version,create_request_id,create_payload';
 const result=await call(edit?`/rest/v1/tasks?workspace_id=eq.${workspace}&created_by_user_id=eq.${session.user.id}&id=eq.${edit.id}&write_version=eq.${edit.write_version}&select=${select}`:`/rest/v1/tasks?select=${select}`,edit?'PATCH':'POST',edit?{...body,write_version:edit.write_version+1}:{workspace_id:workspace,...body,create_request_id:requestId});
 let rows=result.rows as Record<string,unknown>[];
 if(result.r.status===409&&!edit){
  const previous=await call(`/rest/v1/tasks?workspace_id=eq.${workspace}&created_by_user_id=eq.${session.user.id}&create_request_id=eq.${requestId}&select=${select}`);
  rows=previous.rows as Record<string,unknown>[];
  if(!previous.r.ok||!Array.isArray(rows)||rows.length!==1||!rows[0]||!Object.entries(body).every(([k,v])=>(rows[0].create_payload as Record<string,unknown>)?.[k]===v))throw Error('Požiadavka už bola použitá alebo účet dosiahol limit jednej TEST úlohy.');
 }else if(!result.r.ok)throw Error('Uloženie bolo odmietnuté. Overte reláciu a oprávnenia.');
 if(!Array.isArray(rows)||rows.length!==1)throw Error('Konflikt verzie alebo neprístupná úloha. Údaje sa obnovia.');
 const row=rows[0];if(!row||row.workspace_id!==workspace||row.created_by_user_id!==session.user.id||!Number.isSafeInteger(row.id)||!Number.isInteger(row.write_version)||(edit&&row.id!==edit.id))throw Error('Výsledok nepatrí aktuálnemu účtu.');
 return row;
}
