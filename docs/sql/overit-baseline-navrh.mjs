// Iba lokálny PostgreSQL WASM; bez sieťového alebo Supabase pripojenia.
import {readFile,writeFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import assert from 'node:assert/strict';
if(!process.env.PGLITE_MODULE)throw Error('Chýba cesta k lokálnemu PGlite 0.3.14 (PostgreSQL 17.5).');
const {PGlite}=await import(process.env.PGLITE_MODULE);
const dir=new URL('./',import.meta.url),read=name=>readFile(new URL(name,dir),'utf8');
const baseline=JSON.parse(await read('baseline-ai-planner-test.json'));
const ddl=await read('baseline-ai-planner-test.schema.sql'),capture=await read('baseline-ai-planner-test.readonly.sql');
const proposal=await read('20261115160703_test_task_write_gate.sql'),r1=await read('test_task_write_rollback.sql'),r2=await read('test_task_write_schema_rollback.sql');
const id=n=>'00000000-0000-0000-0000-'+String(n).padStart(12,'0'),A=id(101),B=id(102);
let count=0;
const check=(a,b)=>{assert.deepEqual(a,b);count++;};
async function init(){const db=new PGlite();await db.exec(`CREATE ROLE anon;CREATE ROLE authenticated;CREATE ROLE service_role;CREATE ROLE supabase_admin;CREATE SCHEMA auth;CREATE TABLE auth.users(id uuid PRIMARY KEY);CREATE FUNCTION auth.uid() RETURNS uuid LANGUAGE sql STABLE AS $$ SELECT nullif(current_setting('request.jwt.claim.sub',true),'')::uuid $$;GRANT USAGE ON SCHEMA auth TO authenticated;`);return db;}
async function snapshot(db){const rs=await db.query(capture.replace(/^BEGIN READ ONLY;/,'').replace(/ROLLBACK;\s*$/,''));return rs.rows[0].baseline;}
const keys=['schemas','relations','columns','constraints','indexes','views','functions','triggers','policies','default_acl','event_triggers','custom_types','sequences','migration_registry'];
function normalized(b){return Object.fromEntries(keys.map(k=>{let v=b[k];if(k==='constraints')v=v?.filter(x=>x.type!=='n');if(k==='default_acl'&&v)v=[...v].sort((a,b)=>JSON.stringify(a).localeCompare(JSON.stringify(b)));return[k,v];}));}
async function apply(db){await db.exec(`BEGIN;SET LOCAL app.ai_planner_target_ref='yqleboakzkowfxsmynfy';${proposal}COMMIT;`);}
async function actor(db,n,sql,commit=true){await db.exec(`BEGIN;SET LOCAL ROLE authenticated;SET LOCAL request.jwt.claim.sub='${id(n)}';`);try{const r=(await db.query(sql)).rows;await db.exec(commit?'COMMIT':'ROLLBACK');return r;}catch(e){await db.exec('ROLLBACK');throw e;}}
async function denied(db,n,sql){await assert.rejects(actor(db,n,sql));count++;}
const create=(w,request=501,title='Syntetická TEST – cloudový zápis')=>`INSERT INTO public.tasks(workspace_id,title,status,priority,create_request_id) VALUES('${w}','${title}','Backlog','Stredna','${id(request)}') RETURNING *`;
const update=(w,k,v=1)=>`UPDATE public.tasks SET title='Syntetická zmena',write_version=${v+1} WHERE workspace_id='${w}' AND id=${k} AND write_version=${v} RETURNING *`;
const db=await init();const legacy=await init();
try{
 await db.exec(ddl);const restored=await snapshot(db);check(normalized(restored),normalized(baseline.baseline));
 // Porovnanie pôvodných migračných súborov s aktuálnym aplikačným baseline.
 await legacy.exec(await readFile(new URL('../../supabase/migrations/202609190001_core.sql',dir),'utf8'));
 await legacy.exec(await readFile(new URL('../../supabase/migrations/202609210001_catalog.sql',dir),'utf8'));
 const old=await snapshot(legacy);const diff={};
 for(const key of ['relations','columns','constraints','indexes','functions','policies','triggers','views','event_triggers','default_acl']){
  const identity=x=>[x.table??x.tablename??'',x.name??x.policyname??'',x.identity??x.owner??'',x.kind??''].join('/');
  const left=new Map((old[key]??[]).filter(x=>key!=='constraints'||x.type!=='n').map(x=>[identity(x),x])),right=new Map((restored[key]??[]).filter(x=>key!=='constraints'||x.type!=='n').map(x=>[identity(x),x]));
  diff[key]={only_live:[...right].filter(([k])=>!left.has(k)).map(([k])=>k),only_migrations:[...left].filter(([k])=>!right.has(k)).map(([k])=>k),different:[...right].filter(([k,v])=>left.has(k)&&JSON.stringify(left.get(k))!==JSON.stringify(v)).map(([k])=>k)};
 }
 await writeFile(new URL('baseline-rozdiely-migracie.json',dir),JSON.stringify(diff,null,2)+'\n');
 await apply(db);await db.exec(`BEGIN;${r1}${r2}COMMIT;`);check(normalized(await snapshot(db)),normalized(restored));
 // Skutočná baseline schéma, iba syntetické lokálne riadky a simulované claims.
 await db.exec(`INSERT INTO auth.users VALUES ${[1,2,3,4,5,6,7].map(n=>`('${id(n)}')`).join(',')};INSERT INTO public.workspaces(id,name) VALUES('${A}','Syntetický A'),('${B}','Syntetický B');INSERT INTO public.workspace_members(workspace_id,user_id,role) VALUES ${[[1,'admin'],[3,'analyst'],[4,'member'],[5,'owner'],[6,'user'],[7,'member']].map(([n,r])=>`('${A}','${id(n)}','${r}')`).join(',')},('${B}','${id(2)}','member');INSERT INTO public.profiles(workspace_id,id,auth_user_id,name) VALUES ${[1,2,3,4,5,6,7].map(n=>`('${n===2?B:A}',${n},'${id(n)}','Syntetický ${n}')`).join(',')};INSERT INTO public.tasks(workspace_id,id,title,created_by_user_id) VALUES('${A}',10,'Priradená','${id(4)}'),('${A}',11,'Nepriradená','${id(4)}'),('${A}',12,'Vlastná analytika','${id(3)}'),('${B}',20,'Úloha B','${id(2)}');INSERT INTO public.task_assignees(workspace_id,id,task_id,profile_id) VALUES('${A}',1,10,6);`);
 await apply(db);const after=await snapshot(db);
 const delta={};for(const key of keys){const before=normalized(restored)[key],next=normalized(after)[key];if(JSON.stringify(before)===JSON.stringify(next))continue;
  const identity=x=>[x.table??x.tablename??'',x.name??x.policyname??x.sequencename??'',x.identity??x.owner??'',x.kind??''].join('/');
  const left=new Map((before??[]).map(x=>[identity(x),x])),right=new Map((next??[]).map(x=>[identity(x),x]));
  delta[key]={pridane:[...right].filter(([k])=>!left.has(k)).map(([,v])=>v),odstranene:[...left].filter(([k])=>!right.has(k)).map(([,v])=>v),zmenene:[...right].filter(([k,v])=>left.has(k)&&JSON.stringify(left.get(k))!==JSON.stringify(v)).map(([k,v])=>({pred:left.get(k),po:v}))};
 }
 await writeFile(new URL('baseline-rozdiely-navrh.json',dir),JSON.stringify(delta,null,2)+'\n');
 check((after.policies??[]).length,(restored.policies??[]).length+3);
 check(after.functions.filter(f=>f.name!=='test_tasks_guard'),restored.functions);
 check(after.views,restored.views);check(after.default_acl,restored.default_acl);check(after.event_triggers,restored.event_triggers);
 check(after.columns.filter(c=>c.table!=='tasks'),restored.columns.filter(c=>c.table!=='tasks'));
 // Každá kladná INSERT skúška sa rollbackne; na konci zostane len jedna nová úloha.
 for(const n of [4,6,5,2]){const rows=await actor(db,n,create(n===2?B:A,500+n),false);check(rows[0].created_by_user_id,id(n));check(rows[0].write_version,1);}
 await denied(db,3,create(A));await denied(db,2,create(A));await denied(db,1,create(A,600,'Nesyntetický názov'));
 const [task]=await actor(db,1,create(A));check(task.created_by_user_id,id(1));check(task.id>20,true);
 await denied(db,1,create(A));await denied(db,2,create(B,502));
 check((await actor(db,1,update(A,11))).length,1); // admin – nepriradená tímová úloha
 check((await actor(db,5,update(A,11,2))).length,1); // owner – nepriradená tímová úloha
 check((await actor(db,4,update(A,11,3))).length,1); // vlastný autor
 check((await actor(db,6,update(A,10))).length,1); // aktívne priradený user
 check((await actor(db,7,update(A,11,4))).length,0);
 check((await actor(db,6,update(A,11,4))).length,0);
 check((await actor(db,3,update(A,11,4))).length,0);
 check((await actor(db,3,update(A,12))).length,0);
 check((await actor(db,1,update(B,20))).length,0);
 check((await actor(db,5,update(B,20))).length,0);
 check((await actor(db,2,update(A,11,4))).length,0);
 check((await actor(db,1,update(A,task.id))).length,1);
 check((await actor(db,1,update(A,task.id))).length,0); // zastaraná verzia
 for(const clause of [`id=900`,`workspace_id='${B}'`,`created_by_user_id='${id(4)}'`,`create_request_id=NULL`])await denied(db,1,`UPDATE public.tasks SET ${clause} WHERE workspace_id='${A}' AND id=${task.id}`);
 await denied(db,1,`DELETE FROM public.tasks WHERE workspace_id='${A}' AND id=${task.id}`);
 await denied(db,1,`UPDATE public.workspace_members SET role='admin' WHERE user_id='${id(7)}'`);
 await denied(db,1,`INSERT INTO public.task_assignees(workspace_id,id,task_id,profile_id) VALUES('${A}',99,20,1)`);
 const rows=(await db.query('SELECT * FROM public.tasks ORDER BY workspace_id,id')).rows;
 await db.exec(`BEGIN;${r1}COMMIT;`);check((await db.query('SELECT * FROM public.tasks ORDER BY workspace_id,id')).rows,rows);
 await denied(db,1,create(A,700));await denied(db,1,update(A,task.id,2));
 const r1Schema=await snapshot(db);
 await db.exec('BEGIN');await assert.rejects(db.exec(r2));await db.exec('ROLLBACK');count++;
 check(normalized(await snapshot(db)),normalized(r1Schema));
 check((await db.query('SELECT * FROM public.tasks ORDER BY workspace_id,id')).rows,rows);
 console.log(`PASS: ${count} kontrol nad obnoveným schema-only baseline; admin/owner, member/user, analytik, limit 1, verzia, izolácia, R1 a R2.`);
 console.log('R2 pred zápisom: úplná zhoda katalógov. R1 po zápise: celý dátový snapshot nezmenený. R2 po zápise: odmietnuté bez zmien.');
 console.log('SHA256 baseline JSON: '+createHash('sha256').update(await read('baseline-ai-planner-test.json')).digest('hex'));
 console.log('Iba lokálny PGlite; bez Supabase zápisu a bez živého Auth/REST testu.');
}finally{await db.close();await legacy.close();}
