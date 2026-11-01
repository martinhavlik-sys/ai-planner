import test from 'node:test';
import assert from 'node:assert/strict';
import { TestSessionController, testSessionKey, testProjectUrl, readTestTasks, TestTaskReadBlockedError, signInWithPassword, saveTestTask } from '../app/supabase-auth.ts';
const session = (id = 'A', expires_at = 1000) => ({ access_token: `access-${id}`, refresh_token: `refresh-${id}`, expires_at, user: { id } });
const row = { workspace_id: 'workspace-A', id: 1, title: 'Test', status: 'Backlog', priority: 'Stredna' };
const deferred = () => { let resolve, reject; const promise = new Promise((a,b) => { resolve=a; reject=b; }); return { promise, resolve, reject }; };
function setup(saved, overrides = {}) {
 const values = new Map(saved ? [[testSessionKey, JSON.stringify(saved)]] : []), states = [], calls = [];
 const storage = { getItem: key => values.get(key) ?? null, setItem: (key,value) => values.set(key,value), removeItem: key => values.delete(key) };
 const api = { signIn: async () => session(), refresh: async () => { calls.push('refresh'); return session('A',2000); }, verify: async () => { calls.push('verify'); }, read: async () => { calls.push('read'); return [row]; }, signOut: async () => { calls.push('logout'); }, ...overrides };
 const controller = new TestSessionController(storage, state => states.push(state), api, () => 100000);
 return { controller, states, values, calls, storage, last: () => states.at(-1) };
}
test('signed-out restore exposes no tasks and makes no network calls', async () => {
 const x=setup(); await x.controller.restore(); assert.equal(x.last().phase,'signed-out'); assert.deepEqual(x.last().tasks,[]); assert.deepEqual(x.calls,[]);
});
test('restore verifies the session without requesting the foreign task mock', async () => {
 const x=setup(session()); await x.controller.restore(); assert.deepEqual(x.calls,['verify']); assert.equal(x.last().user.id,'A'); assert.deepEqual(x.last().tasks,[]);
 const next=setup(JSON.parse(x.values.get(testSessionKey))); await next.controller.restore(); assert.equal(next.last().phase,'signed-in');
});
test('expired session refreshes once for concurrent restores and persists rotated credentials', async () => {
 const x=setup(session('A',90)); await Promise.all([x.controller.restore(),x.controller.restore()]); assert.deepEqual(x.calls,['refresh','verify']); assert.equal(JSON.parse(x.values.get(testSessionKey)).expires_at,2000);
});
test('rejected server verification erases saved session and never loads data', async () => {
 const x=setup(session(),{verify:async()=>{throw Error('denied');}}); await x.controller.restore(); assert.equal(x.last().phase,'signed-out'); assert.equal(x.values.size,0); assert.deepEqual(x.calls,[]);
});
test('malformed stored session fails closed', async () => {
 const x=setup({user:{id:'A'}}); await x.controller.restore(); assert.equal(x.last().phase,'signed-out'); assert.equal(x.values.size,0); assert.deepEqual(x.calls,[]);
});
test('logout clears data immediately and late verification response cannot restore them', async () => {
 const wait=deferred(), x=setup(session(),{verify:()=>wait.promise}); const loading=x.controller.restore(); await new Promise(setImmediate);
 const logout=x.controller.signOut(); assert.deepEqual(x.last().tasks,[]); assert.equal(x.last().phase,'signed-out'); assert.equal(x.values.size,0);
 wait.resolve([row]); await Promise.all([loading,logout]); assert.equal(x.last().phase,'signed-out');
});
test('late failed login A cannot replace successful login B', async () => {
 const wait=deferred(), x=setup(null,{signIn:email=>email==='A'?wait.promise:Promise.resolve(session('B'))});
 const a=x.controller.signIn('A','fake'); await x.controller.signIn('B','fake'); wait.reject(Error('A failed')); await a; assert.equal(x.last().user.id,'B');
});
test('logout server failure remains signed out with explicit unconfirmed revocation', async () => {
 const x=setup(session(),{signOut:async()=>{throw Error('offline');}}); await x.controller.restore(); await x.controller.signOut(); assert.equal(x.last().phase,'signed-out'); assert.equal(x.values.size,0); assert.match(x.last().message,/nepodarilo potvrdiť/);
});
test('late logout failure cannot hide a new account', async () => {
 const wait=deferred(), x=setup(session(),{signOut:()=>wait.promise,signIn:async()=>session('B')}); await x.controller.restore(); const logout=x.controller.signOut(); await x.controller.signIn('B','fake'); wait.reject(Error('offline')); await logout; assert.equal(x.last().user.id,'B');
});
test('storage removal failure still hides all data on logout', async () => {
 const x=setup(session()); await x.controller.restore(); x.storage.removeItem=()=>{throw Error('blocked');}; await x.controller.signOut(); assert.deepEqual(x.last().tasks,[]); assert.equal(x.last().phase,'signed-out'); assert.match(x.last().message,/zatvorte/);
});
test('expired refreshed session is not published', async () => {
 const x=setup(session('A',99),{refresh:async()=>session('A',99)}); await x.controller.restore(); assert.equal(x.last().phase,'signed-out'); assert.deepEqual(x.last().tasks,[]);
});
test('write boundary never calls fetch', async () => {
 const original=globalThis.fetch; let calls=0; globalThis.fetch=async()=>{calls++; throw Error('unexpected');};
 try { await assert.rejects(saveTestTask(),/zablokované/); assert.equal(calls,0); } finally { globalThis.fetch=original; }
});
test('transport rejects production configuration before transmitting a password', async () => {
 const oldUrl=process.env.NEXT_PUBLIC_SUPABASE_URL, oldKey=process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY, original=globalThis.fetch; let calls=0;
 process.env.NEXT_PUBLIC_SUPABASE_URL='https://other-project.supabase.co'; process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY='sb_publishable_test_only'; globalThis.fetch=async()=>{calls++;};
 try { await assert.rejects(signInWithPassword('A','fake')); assert.equal(calls,0); }
 finally { globalThis.fetch=original; if(oldUrl===undefined)delete process.env.NEXT_PUBLIC_SUPABASE_URL;else process.env.NEXT_PUBLIC_SUPABASE_URL=oldUrl; if(oldKey===undefined)delete process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;else process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY=oldKey; }
});
test('direct read rejects with typed Auth-only error before fetch, even for an empty token', async () => {
 let calls=0;
 await withTestTransport(async()=>{calls++;return Response.json([{...row,workspace_id:'foreign'}]);},async()=>{
  for(const token of ['fake-user-token','']) await assert.rejects(readTestTasks(token), e=>e instanceof TestTaskReadBlockedError && e.code==='READ_NOT_VERIFIED');
  assert.equal(calls,0);
 });
});

async function withTestTransport(fetcher, run) {
 const oldUrl=process.env.NEXT_PUBLIC_SUPABASE_URL, oldKey=process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY, original=globalThis.fetch;
 process.env.NEXT_PUBLIC_SUPABASE_URL=testProjectUrl; process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY='sb_publishable_test_only'; globalThis.fetch=fetcher;
 try { await run(); }
 finally { globalThis.fetch=original; if(oldUrl===undefined)delete process.env.NEXT_PUBLIC_SUPABASE_URL;else process.env.NEXT_PUBLIC_SUPABASE_URL=oldUrl; if(oldKey===undefined)delete process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;else process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY=oldKey; }
}
test('REST auth contract uses password grant, verifies identity, and logs out only the current session', async () => {
 const { verifyTestSession, signOutTestSession }=await import('../app/supabase-auth.ts');
 const calls=[];
 await withTestTransport(async(url,options)=>{
  calls.push({url,options});
  if(url.includes('/token?'))return Response.json(session());
  if(url.endsWith('/user'))return Response.json({id:'A'});
  return new Response(null,{status:204});
 },async()=>{
  const value=await signInWithPassword('test@example.invalid','fake-password');
  await verifyTestSession(value); await signOutTestSession(value);
  assert.equal(calls.length,3); assert.match(calls[0].url,/\/auth\/v1\/token\?grant_type=password$/);
  assert.deepEqual(JSON.parse(calls[0].options.body),{email:'test@example.invalid',password:'fake-password'});
  assert.equal(calls[1].options.method,'GET'); assert.equal(calls[1].options.headers.Authorization,'Bearer access-A');
  assert.match(calls[2].url,/\/auth\/v1\/logout\?scope=local$/); assert.equal(calls[2].options.method,'POST');
 });
});
test('REST refresh coalesces overlapping requests and preserves rotated session', async () => {
 const { refreshTestSession }=await import('../app/supabase-auth.ts'); const wait=deferred(); let calls=0;
 await withTestTransport(async(url,options)=>{
  calls++; assert.match(url,/grant_type=refresh_token$/); assert.deepEqual(JSON.parse(options.body),{refresh_token:'refresh-A'});
  await wait.promise; return Response.json(session('A',2000));
 },async()=>{
  const first=refreshTestSession(session()), second=refreshTestSession(session()); wait.resolve();
  const values=await Promise.all([first,second]); assert.equal(calls,1); assert.equal(values[0].expires_at,2000); assert.deepEqual(values[0],values[1]);
 });
});
test('missing configuration exposes an actionable Slovak error without any network call', async () => {
 const original=globalThis.fetch, oldUrl=process.env.NEXT_PUBLIC_SUPABASE_URL, oldKey=process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
 let calls=0; delete process.env.NEXT_PUBLIC_SUPABASE_URL; delete process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
 globalThis.fetch=async()=>{calls++;throw Error('must not connect');};
 try { await assert.rejects(signInWithPassword('test@example.invalid','fake'),/Chýba konfigurácia/); assert.equal(calls,0); }
 finally { globalThis.fetch=original; if(oldUrl!==undefined)process.env.NEXT_PUBLIC_SUPABASE_URL=oldUrl; if(oldKey!==undefined)process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY=oldKey; }
});
test('malformed email in stored session is rejected before any remote read', async () => {
 const value=session(); value.user.email={unexpected:'object'};
 const x=setup(value); await x.controller.restore(); assert.equal(x.last().phase,'signed-out'); assert.match(x.last().message,/neplatná/); assert.deepEqual(x.calls,[]); assert.equal(x.values.size,0);
});
test('expiry clears visible tasks immediately and ignores an in-flight reload', async () => {
 let now=100000; const wait=deferred(), values=new Map([[testSessionKey,JSON.stringify(session())]]), states=[];
 let verifies=0;
 const controller=new TestSessionController({getItem:k=>values.get(k)??null,setItem:(k,v)=>values.set(k,v),removeItem:k=>values.delete(k)},s=>states.push(s),{
  signIn:async()=>session(),refresh:async()=>session(),verify:async()=>{if(++verifies>1)await wait.promise;},read:async()=>{throw Error("task read forbidden");},signOut:async()=>{}
 },()=>now);
 await controller.restore(); assert.equal(states.at(-1).phase,'signed-in');
 const reload=controller.reload(); await new Promise(setImmediate); now=1001000; controller.checkExpiry();
 assert.equal(states.at(-1).phase,'signed-out'); assert.deepEqual(states.at(-1).tasks,[]); assert.equal(values.size,0);
 wait.resolve([row]); await reload; assert.equal(states.at(-1).phase,'signed-out');
});
test('server rejection after a successful sign-in clears old tasks and keeps a safe local error', async () => {
 let fail=false;
 const x=setup(session(),{verify:async()=>{if(fail)throw Error('SECRET SERVER DETAILS');}});
 await x.controller.restore(); fail=true; await x.controller.reload(); assert.equal(x.last().phase,'signed-out'); assert.deepEqual(x.last().tasks,[]);
 assert.doesNotMatch(x.last().message,/SECRET/); assert.equal(x.values.size,0);
});
test('pending login or refresh cannot republish after disposal', async () => {
 const wait=deferred(), x=setup(null,{signIn:()=>wait.promise}); const pending=x.controller.signIn('A','fake'); x.controller.dispose(); const count=x.states.length;
 wait.resolve(session()); await pending; assert.equal(x.states.length,count); assert.equal(x.values.size,0);
});

test('configuration rejects secret, privileged, malformed and foreign-project keys before fetch', async () => {
 const original=globalThis.fetch, oldUrl=process.env.NEXT_PUBLIC_SUPABASE_URL, oldKey=process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
 let calls=0; process.env.NEXT_PUBLIC_SUPABASE_URL=testProjectUrl; globalThis.fetch=async()=>{calls++;throw Error('must not connect');};
 const jwt=payload=>`eyJhbGciOiJIUzI1NiJ9.${Buffer.from(JSON.stringify(payload)).toString('base64url')}.fake-signature`;
 const {testConfigurationStatus}=await import('../app/supabase-auth.ts');
 try {
  for(const key of ['sb_secret_fake',jwt({role:'service_role'}),jwt({role:'anon',ref:'other-project'}),'malformed']) {
   process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY=key; assert.equal(testConfigurationStatus().ready,false); await assert.rejects(signInWithPassword('A','fake'));
  }
  assert.equal(calls,0);
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY=jwt({role:'anon',ref:'yqleboakzkowfxsmynfy'});assert.equal(testConfigurationStatus().ready,true);
 } finally {globalThis.fetch=original;if(oldUrl===undefined)delete process.env.NEXT_PUBLIC_SUPABASE_URL;else process.env.NEXT_PUBLIC_SUPABASE_URL=oldUrl;if(oldKey===undefined)delete process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;else process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY=oldKey;}
});
test('typed write request remains blocked even with a plausible task and valid test configuration', async () => {
 let calls=0;
 await withTestTransport(async()=>{calls++;throw Error('must not connect');},async()=>{
  const input={workspaceId:'00000000-0000-0000-0000-000000004a01',id:999001,title:'Lokálny návrh testu',status:'Backlog',priority:'Stredna'};
  await assert.rejects(saveTestTask(input),error=>error.code==='WRITE_NOT_VERIFIED'); assert.equal(calls,0);
 });
});

test('network and malformed JSON failures never expose response contents', async () => {
 await withTestTransport(async()=>{throw Error('SECRET NETWORK DETAILS');},async()=>{
  await assert.rejects(signInWithPassword('A','fake'),e=>/zlyhalo/.test(e.message)&&!e.message.includes('SECRET'));
 });
 await withTestTransport(async()=>new Response('SECRET NON JSON',{status:200}),async()=>{
  await assert.rejects(signInWithPassword('A','fake'),e=>/zlyhalo/.test(e.message)&&!e.message.includes('SECRET'));
 });
});
test('refresh rejection and storage write rejection clear cached tasks and session', async () => {
 const expired=setup(session('A',90),{refresh:async()=>{throw Error('denied');}}); await expired.controller.restore();
 assert.equal(expired.last().phase,'signed-out'); assert.deepEqual(expired.last().tasks,[]); assert.equal(expired.values.size,0);
 const blocked=setup(session()); blocked.storage.setItem=()=>{throw Error('quota');}; await blocked.controller.restore();
 assert.equal(blocked.last().phase,'signed-out'); assert.deepEqual(blocked.last().tasks,[]); assert.equal(blocked.values.size,0);
});
test('changing accounts clears old rows before the next sign-in resolves', async () => {
 const wait=deferred(), x=setup(session(),{signIn:()=>wait.promise}); await x.controller.restore();
 const signing=x.controller.signIn('B','fake'); assert.equal(x.last().phase,'checking'); assert.deepEqual(x.last().tasks,[]); assert.equal(x.values.size,0);
 wait.resolve(session('B')); await signing; assert.equal(x.last().user.id,'B');
});

test('late verification of account A cannot overwrite account B or request foreign tasks', async () => {
 const wait=deferred(); let reads=0;
 const x=setup(session(),{signIn:async()=>session('B'),verify:s=>s.user.id==='A'?wait.promise:Promise.resolve(),read:async()=>{reads++;return [row];}});
 const old=x.controller.restore(); await new Promise(setImmediate); await x.controller.signIn('B','fake');
 wait.resolve(); await old;
 assert.equal(x.last().user.id,'B'); assert.deepEqual(x.last().tasks,[]); assert.equal(reads,0);
 assert.equal(JSON.parse(x.values.get(testSessionKey)).user.id,'B');
});
test('login, restore and repeated lifecycle reloads never request tasks (application guard, not RLS)', async () => {
 const x=setup(); await x.controller.signIn('A','fake');
 await x.controller.reload(); x.controller.checkExpiry(); await x.controller.reload();
 assert.equal(x.last().phase,'signed-in'); assert.deepEqual(x.last().tasks,[]); assert.ok(!x.calls.includes('read'));
 assert.ok(x.states.every(state=>state.tasks.length===0));
});
