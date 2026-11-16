import test from 'node:test';
import assert from 'node:assert/strict';
import {buildRemoteReport,remoteTaskKey} from '../app/remote-report-model.ts';

test('vzdialený report zachová šesť zložených kľúčov aj pri opakovaných číslach medzi workspace',()=>{
 const input=Array.from({length:6},(_,i)=>({workspace_id:i<3?'A':'B',id:i%3,title:'Syntetická '+i,status:i===0?'Hotovo':null,priority:null}));
 const before=JSON.stringify(input),result=buildRemoteReport(input);
 assert.equal(result.total,6);assert.equal(result.tasks.length,6);
 assert.equal(new Set(result.tasks.map(remoteTaskKey)).size,6);
 assert.equal(result.active+result.done,result.total);
 assert.equal(JSON.stringify(input),before);
});

test('duplikovaný vzdialený kľúč nezvyšuje súhrn a všetky filtre používajú výsledný zoznam',()=>{
 const rows=[{workspace_id:'A',id:1,title:'Prvá',status:'Hotovo',priority:'Vysoka'},{workspace_id:'A',id:2,title:'Druhá',status:'Backlog',priority:'Stredna'}];
 const all=buildRemoteReport([...rows,rows[0]]);
 assert.equal(all.total,2);assert.equal(all.loaded,2);
 const result=buildRemoteReport(rows,{query:' prvá ',status:'Hotovo',priority:'Vysoka'});
 assert.equal(result.total,result.tasks.length);assert.equal(result.total,1);assert.equal(result.done,1);assert.equal(result.loaded,2);
 assert.equal(buildRemoteReport([]).total,0);
});
