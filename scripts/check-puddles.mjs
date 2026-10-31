import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import assert from 'node:assert/strict';
import {pathToFileURL} from 'node:url';
import {build} from 'esbuild';
const temp=fs.mkdtempSync(path.join(os.tmpdir(),'puddle-check-')),out='docs/qa/camp-polish-v1/puddle-checks';
fs.mkdirSync(out,{recursive:true});
try{
 await build({stdin:{contents:`export * from './src/world-assets';export * from './src/world-layout';export * from './src/imported-art';export * from './src/camp-puddles';export * from './src/puddle-motion';export * from './src/studio-play';`,resolveDir:process.cwd()},bundle:true,platform:'node',format:'esm',outfile:path.join(temp,'test.mjs')});
 const m=await import(pathToFileURL(path.join(temp,'test.mjs')));m.installImportedArt(JSON.parse(fs.readFileSync('docs/qa/foliage-v3/artwork-before.json')).records);
 const before=JSON.parse(fs.readFileSync('docs/qa/foliage-v5/camp-after.json')).draft,encoded=JSON.stringify(before),after=m.addApprovedCampPuddles(before),water=after.items.filter(p=>m.ASSET_BY_ID.get(p.assetId)?.puddle);
 assert.equal(JSON.stringify(before),encoded);assert.equal(water.length,8);assert.equal(after.terrainPuddleVersion,2);assert.deepEqual(after.items.slice(0,before.items.length),before.items,'All authored foliage and props preserved');assert.deepEqual(m.validateLayout(after).errors,[]);assert.equal(m.validateLayout(JSON.parse(JSON.stringify(after))).layout.terrainPuddleVersion,2);assert(m.validateLayout({...after,terrainPuddleVersion:3}).errors.length);
 assert.equal(m.addApprovedCampPuddles(after),after);const removed={...after,items:before.items};assert.equal(m.addApprovedCampPuddles(removed),removed,'Deleting water is permanent');const custom={...before,terrainImage:{...before.terrainImage,url:'/api/asset-files/custom'}};assert.equal(m.addApprovedCampPuddles(custom),custom);
 for(let y=25;y<3370;y+=80)for(let x=25;x<3370;x+=80)assert.equal(m.layoutBlocked(before,x,y),m.layoutBlocked(after,x,y),'Water never changes navigation');
 for(const id of ['round','long','wide','lobed']){
  const p=m.newPlacement('art_puddle_'+id,1500,1500);p.scale=2;p.rotation=71;p.flipX=true;assert.equal(p.solid,false);assert.equal(p.layer,-7);assert.deepEqual(m.placementBodies(p),[]);
  const a=m.ASSET_BY_ID.get(p.assetId),b=m.placementBounds(p),interior=a.puddle.water.reduce((p,q)=>[p[0]+q[0]/a.puddle.water.length,p[1]+q[1]/a.puddle.water.length],[0,0]);
  const [x,y]=m.placementPoint(p,b.x+interior[0]*b.width,b.y+interior[1]*b.height);assert(m.pointInPuddle(p,x,y),id+' transformed water contact');const corner=m.placementPoint(p,b.x,b.y);assert(!m.pointInPuddle(p,...corner),id+' dry rim/corner ignored');
 }
 const puddle={...m.newPlacement('art_puddle_wide',1500,1500),scale:3},base={...m.emptyLayout(),spawn:{x:1170,y:1500},items:[puddle]};
 const walk=m.createCampPlaySession(base),run=m.createCampPlaySession(base);let walkCount=0,runCount=0;const powers={walk:[],run:[]};
 for(const [key,w,sprint] of [['walk',walk,false],['run',run,true]])for(let i=0;i<190;i++){m.stepCampPlaySession(w,{x:1,y:0},sprint,false);const fresh=w.puddleMotion.effects.filter(e=>e.age===0);powers[key].push(...fresh.map(e=>e.power));if(key==='walk')walkCount+=fresh.length;else runCount+=fresh.length;assert(w.puddleMotion.effects.length<=36)}
 assert(walkCount>2&&runCount>2);assert(Math.max(...powers.run)>Math.max(...powers.walk));
 const still=m.createCampPlaySession({...base,spawn:{x:1500,y:1500}});for(let i=0;i<120;i++)m.stepCampPlaySession(still,{x:0,y:0},false,false);assert.equal(still.puddleMotion.effects.length,0);
 for(let i=0;i<90;i++)m.stepCampPlaySession(run,{x:0,y:0},false,false);assert.equal(run.puddleMotion.effects.length,0,'Ripples settle after stopping');
 const blocked=m.createCampPlaySession({...base,spawn:{x:1500,y:1500}});m.stepPuddles(blocked,1/60);for(let i=0;i<120;i++){blocked.player.moving=true;blocked.player.walkDistance=(blocked.player.walkDistance+10)%112;m.stepPuddles(blocked,1/60)}assert.equal(blocked.puddleMotion.effects.length,0,'No displacement means no splash');
 const report={result:'pass',puddles:water.length,variants:4,walkContacts:walkCount,sprintContacts:runCount,checks:['migration preserves every existing placement','migration is idempotent and preserves deletion','marker round trip and invalid marker rejection','no navigation blockers','rotated/scaled/mirrored water contacts','transparent corners stay dry','walking versus sprint strength','idle and blocked movement silent','effects settle and remain bounded'],limitations:'Software rendering; no new physical iPhone performance measurement.'};
 fs.writeFileSync(out+'/camp-after.json',JSON.stringify({fixtureNote:'QA fixture only; never uploaded over the current owner draft.',draft:after})+'\n');fs.writeFileSync(out+'/verification.json',JSON.stringify(report,null,2)+'\n');console.log(JSON.stringify(report));
}finally{fs.rmSync(temp,{recursive:true,force:true})}
