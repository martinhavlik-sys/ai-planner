import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
import {readFile,mkdir} from 'node:fs/promises';
import {resolve} from 'node:path';
import {startLocalTest} from './lokalny-test-server.mjs';
const require=createRequire(import.meta.url);
const {chromium}=require(process.env.PLAYWRIGHT_MODULE||'playwright');
const root=resolve('out'),manifest=JSON.parse(await readFile(resolve(root,'lokalny-test.json'),'utf8'));
assert.equal(manifest.mode,'local-no-cloud');
const app=await startLocalTest(root,{port:0});
let browser,checks=0;
const ok=(a,b)=>{assert.deepEqual(a,b);checks++;};
try{
 for(const route of ['/','/report','/report/'])ok((await fetch(app.url+route)).status,200);
 ok((await fetch(app.url+'/.env.local')).status,404);ok((await fetch(app.url+'/%2e%2e/package.json')).status,404);
 ok((await fetch(app.url+'/',{method:'POST'})).status,405);
 assert.match((await fetch(app.url)).headers.get('Content-Security-Policy'),/connect-src 'self'/);checks++;
 browser=await chromium.launch({executablePath:process.env.CHROMIUM_PATH||'/usr/bin/chromium',headless:true,args:['--no-sandbox']});
 for(const viewport of [{width:1440,height:1000},{width:390,height:844}]){
  const context=await browser.newContext({viewport,timezoneId:'Europe/Bratislava',acceptDownloads:true});
  const external=[],errors=[];
  await context.route('**/*',r=>{if(new URL(r.request().url()).origin!==app.url){external.push('externá požiadavka');return r.abort();}return r.continue();});
  const page=await context.newPage();page.on('pageerror',e=>errors.push(e.message));page.on('dialog',d=>void d.accept());
  page.setDefaultTimeout(10000);await page.goto(app.url);await page.getByRole('button',{name:'Nova uloha',exact:true}).waitFor();
  await page.getByText('Lokálny TEST · údaje iba v tomto prehliadači. Cloudové prihlásenie a operácie sú vypnuté.',{exact:true}).waitFor();
  ok(await page.getByRole('region',{name:'Testovacie prihlásenie',exact:true}).count(),0);
  const seed={tasks:[],users:[{id:791001,name:'TEST osoba A',email:'a@example.invalid',role:'admin'}],projects:[],entities:[],campaigns:[],clients:[]};
  await page.locator('input[type=file]').setInputFiles({name:'synteticky-test.json',mimeType:'application/json',buffer:Buffer.from(JSON.stringify(seed))});
  await page.locator('.notice').filter({hasText:'Zaloha bola nacitana.'}).waitFor();
  await page.waitForFunction(()=>document.querySelectorAll('.taskRow').length===0);
  const today=await page.evaluate(()=>new Intl.DateTimeFormat('sv-SE',{timeZone:'Europe/Bratislava'}).format(new Date()));
  async function stored(){return page.evaluate(()=>JSON.parse(localStorage.getItem('ai-planner-workspace-v1')));}
  await page.getByRole('button',{name:'Nova uloha',exact:true}).click();
  const dialog=page.getByRole('dialog');await dialog.getByLabel('Názov úlohy',{exact:true}).fill('TEST lokálna úloha');
  await dialog.getByLabel('Oddelenie',{exact:true}).fill('Marketing');await dialog.getByLabel('Entita',{exact:true}).fill('NEM Medissimo');
  await dialog.locator('.personPicker summary').click();await dialog.locator('.personChoices label').filter({hasText:'TEST osoba A'}).getByRole('checkbox').check();
  await dialog.getByLabel('Prvý blok · dátum',{exact:true}).fill(today);
  await dialog.getByLabel('Zaciatok',{exact:true}).fill('9');
  await dialog.getByRole('button',{name:'Pridat ulohu',exact:true}).click();await dialog.waitFor({state:'hidden'});
  await page.locator('.taskRow').filter({hasText:'TEST lokálna úloha'}).waitFor();
  let data=await stored();ok(data.tasks.length,1);ok(data.tasks[0].ownerIds,[791001]);assert.ok(data.tasks[0].projectId&&data.tasks[0].entityId);checks++;
  await page.getByRole('button',{name:'Upraviť TEST lokálna úloha',exact:true}).click();
  await dialog.getByLabel('Názov úlohy',{exact:true}).fill('TEST upravená úloha');
  await dialog.getByLabel('Status').selectOption('Robi sa');
  await dialog.getByRole('button',{name:'Ulozit zmeny',exact:true}).click();await dialog.waitFor({state:'hidden'});
  await page.getByRole('button',{name:'Duplikovať TEST upravená úloha',exact:true}).click();
  await page.waitForFunction(()=>document.querySelectorAll('.taskRow').length===2);data=await stored();ok(data.tasks.length,2);ok(new Set(data.tasks.map(x=>x.id)).size,2);
  await page.getByRole('button',{name:'Zmazať TEST upravená úloha kópia',exact:true}).click();
  await page.waitForFunction(()=>document.querySelectorAll('.taskRow').length===1);ok((await stored()).tasks.length,1);
  await page.getByRole('button',{name:'Tyzden',exact:true}).click();await page.locator('.timedEvent').waitFor();
  await page.getByLabel('Rozsah kalendára',{exact:true}).selectOption('week');
  const handle=page.getByRole('slider',{name:'Koniec bloku: TEST upravená úloha',exact:true});await handle.scrollIntoViewIfNeeded();
  const before=(await stored()).tasks[0];await handle.focus();await handle.press('ArrowDown');
  await page.waitForFunction(d=>JSON.parse(localStorage.getItem('ai-planner-workspace-v1')).tasks[0].slots[0].duration===d,before.slots[0].duration+.25);
  ok((await stored()).tasks[0].id,before.id);
  if(viewport.width===1440){
   const event=page.locator('.timedEvent');await event.scrollIntoViewIfNeeded();
   const box=await event.boundingBox(),columns=page.locator('.dateColumn');
   const source=await event.evaluate(e=>Array.from(e.parentElement.parentElement.querySelectorAll('.dateColumn')).indexOf(e.parentElement));
   const target=columns.nth(source===6?5:source+1),tb=await target.boundingBox();
   const old=(await stored()).tasks[0].slots[0];
   await page.mouse.move(box.x+25,box.y+15);await page.mouse.down();await page.mouse.move(box.x+35,box.y+20,{steps:5});
   await page.mouse.move(tb.x+35,box.y+65,{steps:12});await page.mouse.up();
   await page.waitForFunction(day=>JSON.parse(localStorage.getItem('ai-planner-workspace-v1')).tasks[0].slots[0].day!==day,old.day);
   ok((await stored()).tasks[0].id,before.id);ok((await stored()).tasks.length,1);
  }else{
   ok(await page.locator('.calendarScroll').evaluate(e=>e.scrollWidth>e.clientWidth),true);
  }
  await page.getByRole('button',{name:'Report',exact:true}).click();
  const report=page.getByRole('region',{name:'Filtre reportu',exact:true});await report.waitFor();await report.getByLabel('Obdobie',{exact:true}).selectOption('Všetky obdobia');
  ok(await report.locator('.stats article').first().locator('span').textContent(),'1');ok(await report.locator('.reportTaskScroll li').count(),1);
  ok(await page.getByRole('button',{name:/Vzdialený report/}).count(),0);
  await report.getByLabel('Stav úlohy',{exact:true}).selectOption('Hotovo');ok(await report.locator('.reportTaskScroll li').count(),1); // vyradený riadok je v samostatnom zozname
  ok(await report.locator('.stats article').first().locator('span').textContent(),'0');await report.getByRole('button',{name:'Zrušiť filtre',exact:true}).click();
  await report.getByLabel('Obdobie',{exact:true}).selectOption('Všetky obdobia');
  const download=page.waitForEvent('download');await page.locator('header').getByRole('button',{name:'Export',exact:true}).click();
  const exported=JSON.parse(await readFile(await (await download).path(),'utf8'));ok(exported.tasks.length,1);ok(exported.tasks[0].name,'TEST upravená úloha');assert.ok(exported.tasks[0].projectId&&exported.tasks[0].entityId);checks++;
  await page.getByRole('button',{name:'Pracovná plocha',exact:true}).click();await page.getByRole('button',{name:'Tabulka',exact:true}).click();
  await page.getByRole('button',{name:'Zmazať TEST upravená úloha',exact:true}).click();await page.waitForFunction(()=>document.querySelectorAll('.taskRow').length===0);
  await page.locator('input[type=file]').setInputFiles({name:'obnovena-zaloha.json',mimeType:'application/json',buffer:Buffer.from(JSON.stringify(exported))});
  await page.waitForFunction(()=>JSON.parse(localStorage.getItem('ai-planner-workspace-v1')).tasks.length===1);ok((await stored()).tasks[0].id,exported.tasks[0].id);
  await page.getByRole('button',{name:'Report',exact:true}).click();await page.reload();await page.getByRole('region',{name:'Filtre reportu',exact:true}).waitFor();ok((await stored()).tasks.length,1);
  ok(await report.locator('.stats article').first().locator('span').textContent(),'1');
  await page.goto(app.url+'/report/');await page.getByRole('region',{name:'Filtre reportu',exact:true}).waitFor();
  const second=await browser.newContext({viewport});const other=await second.newPage();await other.goto(app.url);await other.getByRole('button',{name:'Nova uloha',exact:true}).waitFor();
  ok((await other.locator('.taskRow').allTextContents()).some(x=>x.includes('TEST upravená úloha')),false);await second.close();
  ok(external.length,0);ok(errors,[]);
  if(process.env.LOCAL_TEST_SCREENSHOTS){await mkdir(process.env.LOCAL_TEST_SCREENSHOTS,{recursive:true});await page.screenshot({path:resolve(process.env.LOCAL_TEST_SCREENSHOTS,`lokalny-test-${viewport.width}.png`),fullPage:true});}
  console.log(`PASS ${viewport.width} px: vytvorenie, úprava, duplikácia, mazanie, väzby, kalendár, report, export, obnovenie a oddelený profil prehliadača.`);
  await context.close();
 }
 console.log(`PASS: ${checks} kontrol skutočného lokálneho UI a HTTP. Žiadny Supabase mock ani cloudový test.`);
}finally{await browser?.close();await app.close();}
