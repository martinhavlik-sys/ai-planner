// Lokálny export, syntetické Auth/REST odpovede; nikdy živý cloudový zápis.
import assert from 'node:assert/strict';import {createRequire} from 'node:module';import {startLocalTest} from './lokalny-test-server.mjs';
const {chromium}=createRequire(import.meta.url)(process.env.PLAYWRIGHT_MODULE||'playwright');
const app=await startLocalTest('out',{port:0});let browser;
const ids=['00000000-0000-0000-0000-000000000001','00000000-0000-0000-0000-000000000002'],spaces=['00000000-0000-4000-8000-000000008a01','00000000-0000-4000-8000-000000008b01'];
try{
 browser=await chromium.launch({executablePath:process.env.CHROMIUM_PATH||'/usr/bin/chromium',headless:true,args:['--no-sandbox']});
 // CSP loopback servera je určené offline režimu. V tomto mock teste sa sieť úplne interceptuje.
 const context=await browser.newContext({bypassCSP:true});const rows=[];let release,held=false;
 await context.route('**/*',async route=>{const req=route.request(),u=new URL(req.url());if(u.origin===app.url)return route.continue();if(u.origin!=='https://yqleboakzkowfxsmynfy.supabase.co')return route.abort();
  const headers={'access-control-allow-origin':app.url,'access-control-allow-headers':'apikey,authorization,content-type,prefer','access-control-expose-headers':'Content-Range'};
  if(req.method()==='OPTIONS')return route.fulfill({status:204,headers});
  let n=req.headers().authorization==='Bearer synteticky-2'?1:0;
  if(u.pathname==='/auth/v1/token'){n=req.postDataJSON().email.startsWith('b@')?1:0;return route.fulfill({headers,json:{access_token:'synteticky-'+(n+1),refresh_token:'synteticky-refresh',expires_at:Math.floor(Date.now()/1000)+3600,user:{id:ids[n]}}});}
  if(u.pathname==='/auth/v1/user')return route.fulfill({headers,json:{id:ids[n]}});
  if(u.pathname==='/auth/v1/logout')return route.fulfill({status:204,headers});
  if(u.pathname.endsWith('workspace_members'))return route.fulfill({headers:{...headers,'Content-Range':'0-0/1'},json:[{workspace_id:spaces[n],user_id:ids[n]}]});
  assert.ok(u.pathname.endsWith('/tasks'));
  if(req.method()==='POST'){const body=req.postDataJSON();rows.push({...body,id:n+1,created_by_user_id:ids[n],write_version:1,create_payload:{title:body.title,status:body.status,priority:body.priority}});if(held&&n===0)await new Promise(r=>{release=r;});return route.fulfill({headers,json:[rows.find(x=>x.created_by_user_id===ids[n])]});}
  if(req.method()==='PATCH'){const row=rows.find(x=>x.created_by_user_id===ids[n]);assert.equal(u.searchParams.get('write_version'),'eq.'+row.write_version);Object.assign(row,req.postDataJSON());return route.fulfill({headers,json:[row]});}
  const own=rows.filter(x=>x.created_by_user_id===ids[n]);return route.fulfill({headers:{...headers,'Content-Range':own.length?`0-${own.length-1}/${own.length}`:'*/0'},json:own});
 });
 const page=await context.newPage();page.setDefaultTimeout(10000);await page.goto(app.url);
 const auth=page.getByRole('region',{name:'Testovacie prihlásenie',exact:true});
 const login=async name=>{await auth.getByLabel('E-mail',{exact:true}).fill(name+'@example.invalid');await auth.getByLabel('Heslo',{exact:true}).fill('synteticke');await auth.locator('form').getByRole('button').click();await auth.getByRole('form',{name:'Vlastná cloudová TEST úloha'}).waitFor();};
 await auth.getByLabel('E-mail',{exact:true}).waitFor();const snapshot=await page.evaluate(()=>localStorage.getItem('ai-planner-workspace-v1'));
 await login('a');const form=auth.getByRole('form',{name:'Vlastná cloudová TEST úloha'});held=true;
 await form.getByRole('button',{name:'Vytvoriť vlastnú TEST úlohu',exact:true}).click();await page.waitForTimeout(50);
 await page.locator('header').getByRole('button',{name:'Odhlásiť sa',exact:true}).click();await login('b');
 for(let i=0;!release&&i<1000;i++)await new Promise(r=>setTimeout(r,10));assert.ok(release,'Odpoveď A musí byť zachytená pred časovým limitom');release();await page.waitForTimeout(50);
 assert.equal(await page.getByRole('region',{name:'Databázové úlohy',exact:true}).count(),0);
 await form.getByRole('button',{name:'Vytvoriť vlastnú TEST úlohu',exact:true}).click();await page.getByRole('region',{name:'Databázové úlohy',exact:true}).waitFor();
 await form.getByLabel('Úloha na úpravu').selectOption('2');await form.getByLabel('Názov cloudovej úlohy').fill('Syntetická úloha B upravená');await form.getByRole('button',{name:'Uložiť vlastnú cloudovú úlohu',exact:true}).click();
 await page.getByRole('region',{name:'Databázové úlohy',exact:true}).getByText(/Syntetická úloha B upravená/).waitFor();assert.equal(rows[1].write_version,2);
 await page.getByRole('button',{name:'Report',exact:true}).click();await page.getByRole('region',{name:'Vzdialený report',exact:true}).getByText('Syntetická úloha B upravená',{exact:true}).waitFor();
 await page.locator('header').getByRole('button',{name:'Odhlásiť sa',exact:true}).click();assert.equal(await page.locator('.remoteReportList li').count(),0);assert.equal(await page.evaluate(()=>localStorage.getItem('ai-planner-workspace-v1')),snapshot);
 console.log('PASS: syntetické prihlásenie A/B, neskorý zápis A po zmene účtu, vytvorenie/úprava B, report, logout a nezmenené localStorage. Iba lokálny mock, nie živý Auth/REST.');
}finally{await browser?.close();await app.close();}
