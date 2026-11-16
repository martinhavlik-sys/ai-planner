import test from 'node:test';
import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
import {readTestTasks,testReadOnlyEnabled,testProjectUrl,TestSessionController,saveTestTask} from '../app/supabase-auth.ts';

const user='00000000-0000-0000-0000-000000000001';
const workspace='00000000-0000-0000-0000-000000004a01';
const foreign='00000000-0000-0000-0000-000000004b01';
const task=(id=1)=>({workspace_id:workspace,id,title:'Syntetická '+id,status:'Backlog',priority:null});
const session=(id=user)=>({access_token:'synteticky-access',refresh_token:'synteticky-refresh',expires_at:4000,user:{id}});
function page(rows,start=0,total=rows.length){return Response.json(rows,{headers:{'Content-Range':rows.length?`${start}-${start+rows.length-1}/${total}`:'*/0'}});}
async function mode(run,flag='1'){
 const names=['NEXT_PUBLIC_TEST_READ_ONLY','NEXT_PUBLIC_SUPABASE_URL','NEXT_PUBLIC_SUPABASE_ANON_KEY'];
 const saved=names.map(n=>process.env[n]),fetch=globalThis.fetch;
 process.env.NEXT_PUBLIC_TEST_READ_ONLY=flag;process.env.NEXT_PUBLIC_SUPABASE_URL=testProjectUrl;process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY='sb_publishable_synteticky';
 try{return await run();}finally{names.forEach((n,i)=>{if(saved[i]===undefined)delete process.env[n];else process.env[n]=saved[i];});globalThis.fetch=fetch;}
}
function transport(tasks,log=[]){return async(url,options)=>{
 log.push({url,method:options.method});
 assert.equal(options.credentials,'omit');assert.equal(options.redirect,'error');
 if(url.endsWith('/auth/v1/user'))return Response.json({id:user});
 if(url.includes('/workspace_members?'))return page([{workspace_id:workspace,user_id:user}]);
 if(url.includes('/tasks?')){assert.ok(url.includes('workspace_id=in.('+workspace+')'));return page(tasks);}
 throw Error('Neočakávaná požiadavka');
};}

test('TEST čítanie najprv overí Auth a členstvo a používa iba GET',()=>mode(async()=>{
 const calls=[];globalThis.fetch=transport(Array.from({length:6},(_,i)=>task(i+1)),calls);
 const rows=await readTestTasks('synteticky-token',user);
 assert.equal(rows.length,6);assert.equal(calls.length,3);
 assert.ok(calls[0].url.endsWith('/auth/v1/user'));assert.ok(calls[1].url.includes('/workspace_members?'));
 assert.ok(calls.every(c=>c.method==='GET'));
}));

test('TEST read zachová stránkovanie aj pri menšom serverovom limite',()=>mode(async()=>{
 const fallback=transport([]),offsets=[];
 globalThis.fetch=async(url,options)=>{
  if(!url.includes('/tasks?'))return fallback(url,options);
  const offset=Number(new URL(url).searchParams.get('offset'));offsets.push(offset);
  return offset===0?page([task(1),task(2)],0,3):page([task(3)],2,3);
 };
 assert.equal((await readTestTasks('synteticky-token',user)).length,3);assert.deepEqual(offsets,[0,2]);
}));

test('cudzí workspace, duplicitný kľúč alebo neúplný rozsah bezpečne zablokujú výsledok',()=>mode(async()=>{
 for(const rows of [[{...task(),workspace_id:foreign}],[task(),task()]]){
  globalThis.fetch=transport(rows);await assert.rejects(readTestTasks('synteticky-token',user),/rozsah/);
 }
 const fallback=transport([]);
 globalThis.fetch=async(url,options)=>url.includes('/tasks?')?Response.json([task()]):fallback(url,options);
 await assert.rejects(readTestTasks('synteticky-token',user),/rozsah/);
}));

test('neplatná identita a prázdny token nesmú vyvolať REST čítanie',()=>mode(async()=>{
 let calls=0;globalThis.fetch=async()=>{calls++;return Response.json({id:'00000000-0000-0000-0000-000000000002'});};
 await assert.rejects(readTestTasks('',user));assert.equal(calls,0);
 await assert.rejects(readTestTasks('synteticky-token',user));assert.equal(calls,1);
}));

test('vypnutá brána aj nesprávny projekt zabránia všetkým requestom',()=>mode(async()=>{
 let calls=0;globalThis.fetch=async()=>{calls++;throw Error('Neočakávané fetch');};
 process.env.NEXT_PUBLIC_TEST_READ_ONLY='0';await assert.rejects(readTestTasks('synteticky-token'),e=>e.code==='READ_NOT_VERIFIED');
 process.env.NEXT_PUBLIC_TEST_READ_ONLY='1';process.env.NEXT_PUBLIC_SUPABASE_URL='https://iny-projekt.supabase.co';
 await assert.rejects(readTestTasks('synteticky-token'),e=>e.code==='READ_NOT_VERIFIED');assert.equal(calls,0);
}));

test('main a bežný build vynútia zatvorenú bránu aj pri ručne nastavenej verejnej premennej',()=>{
 const require=createRequire(import.meta.url),path=require.resolve('../next.config.js');
 const names=['CLOUDFLARE_TEST_EXPORT','WORKERS_CI','WORKERS_CI_BRANCH','NEXT_PUBLIC_TEST_READ_ONLY'];
 const saved=names.map(n=>process.env[n]);
 try{
  process.env.NEXT_PUBLIC_TEST_READ_ONLY='1';process.env.WORKERS_CI='1';process.env.WORKERS_CI_BRANCH='codex/pilot-supabase-auth-cloud-crud';
  delete process.env.CLOUDFLARE_TEST_EXPORT;delete require.cache[path];let config=require(path);
  assert.equal(config.output,undefined);assert.equal(config.env.NEXT_PUBLIC_TEST_READ_ONLY,'0');
  process.env.CLOUDFLARE_TEST_EXPORT='1';process.env.WORKERS_CI_BRANCH='main';delete require.cache[path];config=require(path);
  assert.equal(config.env.NEXT_PUBLIC_TEST_READ_ONLY,'0');
  process.env.WORKERS_CI_BRANCH='codex/pilot-supabase-auth-cloud-crud';delete require.cache[path];config=require(path);
  assert.equal(config.output,'export');assert.equal(config.env.NEXT_PUBLIC_TEST_READ_ONLY,'1');
 }finally{names.forEach((n,i)=>{if(saved[i]===undefined)delete process.env[n];else process.env[n]=saved[i];});delete require.cache[path];}
});

test('produkčný hostname nepovolí čítanie ani s TEST flagom',()=>mode(async()=>{
 const old=globalThis.window;
 try{globalThis.window={location:{hostname:'produkcia.example.invalid'}};assert.equal(testReadOnlyEnabled(),false);}
 finally{if(old===undefined)delete globalThis.window;else globalThis.window=old;}
}));

function controller(api,now=()=>100000){
 const store=new Map(),states=[];
 const storage={getItem:k=>store.get(k)??null,setItem:(k,v)=>store.set(k,v),removeItem:k=>store.delete(k)};
 const base={signIn:async()=>session(),verify:async()=>{},refresh:async()=>session(),signOut:async()=>{},read:async()=>[task()]};
 const instance=new TestSessionController(storage,s=>states.push(s),{...base,...api},now);
 return {instance,states,store,storage,last:()=>states.at(-1)};
}

test('controller načíta úlohy až po overení a obnoví ich z overenej relácie',()=>mode(async()=>{
 const calls=[];
 const x=controller({verify:async()=>{calls.push('verify');},read:async()=>{calls.push('read');return [task()];}});
 await x.instance.signIn('synteticky','synteticke');assert.deepEqual(calls,['verify','read']);assert.equal(x.last().tasks.length,1);
 const states=[];const restored=new TestSessionController(x.storage,s=>states.push(s),{signIn:async()=>session(),verify:async()=>{calls.push('verify');},read:async()=>[task()],refresh:async()=>session(),signOut:async()=>{}},()=>100000);
 await restored.restore();assert.equal(states.at(-1).tasks.length,1);
}));

test('oneskorené čítanie A po odhlásení nesmie obnoviť údaje',()=>mode(async()=>{
 let release;const waiting=new Promise(r=>{release=r;});
 const x=controller({read:()=>waiting});const loading=x.instance.signIn('synteticky','synteticke');
 await new Promise(setImmediate);await x.instance.signOut();assert.deepEqual(x.last().tasks,[]);
 release([task()]);await loading;assert.equal(x.last().phase,'signed-out');assert.deepEqual(x.last().tasks,[]);assert.equal(x.store.size,0);
}));

test('neskorá odpoveď účtu A nezmení nový účet B',()=>mode(async()=>{
 let release;const waiting=new Promise(r=>{release=r;});
 const x=controller({signIn:async email=>session(email==='A'?user:'B'),read:async(_token,id)=>id===user?waiting:[{...task(2),title:'Účet B'}]});
 const a=x.instance.signIn('A','synteticke');await new Promise(setImmediate);await x.instance.signOut();await x.instance.signIn('B','synteticke');
 release([task()]);await a;assert.equal(x.last().user.id,'B');assert.equal(x.last().tasks[0].title,'Účet B');
}));

test('expirácia počas čítania zahodí odpoveď a uloženú reláciu',()=>mode(async()=>{
 let now=100000,release;const waiting=new Promise(r=>{release=r;});
 const x=controller({read:()=>waiting},()=>now);const loading=x.instance.signIn('synteticky','synteticke');
 await new Promise(setImmediate);now=4000001;x.instance.checkExpiry();
 assert.equal(x.last().phase,'signed-out');assert.deepEqual(x.last().tasks,[]);assert.equal(x.store.size,0);
 release([task()]);await loading;assert.equal(x.last().phase,'signed-out');assert.deepEqual(x.last().tasks,[]);
}));

test('chyba čítania odstráni staré údaje a zápis zostáva blokovaný aj v TEST read režime',()=>mode(async()=>{
 let fail=false;const x=controller({read:async()=>{if(fail)throw Error('Syntetická chyba');return [task()];}});
 await x.instance.signIn('synteticky','synteticke');assert.equal(x.last().tasks.length,1);
 fail=true;await x.instance.reload();assert.equal(x.last().phase,'signed-out');assert.deepEqual(x.last().tasks,[]);assert.equal(x.store.size,0);
 let calls=0;globalThis.fetch=async()=>{calls++;throw Error('Neočakávané fetch');};await assert.rejects(saveTestTask(),e=>e.code==='WRITE_NOT_VERIFIED');assert.equal(calls,0);
}));
