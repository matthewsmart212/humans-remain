// Exercise the production Worker with a disposable local database, never the live Site.
import fs from 'node:fs';import assert from 'node:assert/strict';import {DatabaseSync} from 'node:sqlite';import {pathToFileURL} from 'node:url';
const worker=(await import(pathToFileURL(process.cwd()+'/dist/server/index.js'))).default,sql=new DatabaseSync(':memory:');for(const f of fs.readdirSync('drizzle').filter(f=>f.endsWith('.sql')).sort())sql.exec(fs.readFileSync('drizzle/'+f,'utf8'));
const DB={prepare(q){let params=[];return{bind(...p){params=p;return this},async all(){return{results:sql.prepare(q).all(...params)}},async run(){const r=sql.prepare(q).run(...params);return{meta:{changes:Number(r.changes)}}}}}},env={DB,SITE_OWNER_EMAIL:'owner@example.test'},origin='https://test.local',owner={'oai-authenticated-user-id':'site-scoped-owner-subject','oai-authenticated-user-email':'owner@example.test'};
const call=(p,o={})=>worker.fetch(new Request(origin+p,o),env),save=(layout,revision)=>call('/api/world-layout',{method:'PUT',headers:{...owner,Origin:origin,'Content-Type':'application/json'},body:JSON.stringify({layout,revision,action:'save'})});
const fixture=JSON.parse(fs.readFileSync('docs/qa/camp-moss-no-gates-v1/layout-before.json')).draft;
const layout={...fixture,name:'Gate removal persistence check',items:fixture.items.filter(p=>p.id.startsWith('camp-original-gate-')||p.assetId==='base_hearth_t1')};
delete layout.terrainImage;delete layout.terrainBorder;
assert.equal((await save({...layout,campPerimeterVersion:5},0)).status,400);
let r=await save(layout,0);assert.equal(r.status,200,await r.clone().text());
const old=await(await call('/api/world-layout')).json();assert.equal(old.draft.campPerimeterVersion,3);assert.deepEqual(old.draft.items,layout.items);
const removed={...layout,campPerimeterVersion:4,items:layout.items.filter(p=>!p.id.startsWith('camp-original-gate-'))};
assert.equal(removed.items.length,1);r=await save(removed,1);assert.equal(r.status,200,await r.clone().text());
const loaded=await(await call('/api/world-layout')).json();assert.equal(loaded.draft.campPerimeterVersion,4);assert.deepEqual(loaded.draft.items,removed.items);assert.equal((await save(removed,1)).status,409);
const html=await(await call('/checklist.html')).text();assert(!html.includes('Northeast matching timber gate'));assert(!html.includes('Heavy weathered fortification pier'));
sql.close();console.log('PASS: production Worker reads legacy gates, persists gate removal and v4 marker, preserves other objects, rejects stale/invalid writes, and hides retired gates from catalogue.');
