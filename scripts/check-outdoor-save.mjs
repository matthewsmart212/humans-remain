import assert from 'node:assert/strict';import fs from 'node:fs';import os from 'node:os';import path from 'node:path';import {createRequire} from 'node:module';import {DatabaseSync} from 'node:sqlite';import {build} from 'esbuild';
const temp=fs.mkdtempSync(path.join(os.tmpdir(),'outdoor-save-')),db=new DatabaseSync(':memory:');
try{
 await build({stdin:{contents:`export * from './src/world-assets';export * from './src/world-layout';export * from './src/imported-art';export * from './src/east-approach';export * from './src/village-approach';export * from './src/village-outskirts';export * from './src/eastern-works';export * from './src/northern-works';export * from './src/works-grounds';export * from './src/works-meadow';export * from './src/south-works';export * from './src/camp-return';export * from './src/south-camp';export * from './src/west-camp';export * from './server/world-layout';`,resolveDir:process.cwd()},bundle:true,platform:'node',format:'cjs',outfile:path.join(temp,'model.cjs')});
 const m=createRequire(import.meta.url)(path.join(temp,'model.cjs'));
 const saved=JSON.parse(fs.readFileSync(process.argv[2]||'docs/qa/camp-moss-no-gates-v1/layout-after.json'));
 const art=JSON.parse(fs.readFileSync(process.argv[3]||'docs/qa/camp-moss-no-gates-v1/source-artwork.json'));
 for(const file of fs.readdirSync('drizzle').filter(f=>f.endsWith('.sql')).sort())db.exec(fs.readFileSync('drizzle/'+file,'utf8'));
 const custom=new Map([...art.customAssets,...art.records.map(r=>r.customAsset).filter(Boolean)].map(a=>[a.id,a]));
 for(const a of custom.values())db.prepare('INSERT OR REPLACE INTO custom_assets (id,name,created_at) VALUES (?,?,?)').run(a.id,a.name,a.createdAt);
 for(const a of art.records)db.prepare('INSERT INTO asset_artwork (id,entry_id,revision,config_json,created_at) VALUES (?,?,?,?,?)').run(a.id+'-'+a.revision,a.id,a.revision,JSON.stringify(a.config),a.updatedAt);
 const t=saved.draft.terrainImage;
 if(t)db.prepare('INSERT INTO asset_art_files (id,entry_id,object_key,name,mime,width,height,bytes,published,created_at) VALUES (?,?,?,?,?,?,?,?,?,?)').run(t.id,'world-terrain','test',t.name,t.mime,t.width,t.height,t.bytes,1,saved.updatedAt||saved.draft.updatedAt);
 const revision=saved.revision||1;db.prepare("UPDATE world_layout SET draft_json=?,revision=?,updated_at=? WHERE id='main'").run(JSON.stringify(saved.draft),revision,saved.draft.updatedAt);
 const DB={prepare(sql){
  let args=[];
  return {
   bind(...values){args=values;return this},
   async all(){return{results:db.prepare(sql).all(...args)}},
   async run(){return{meta:{changes:Number(db.prepare(sql).run(...args).changes)}}},
  };
 }};
 m.installImportedArt(art.records);const s=m.EAST_TERRAIN_SCALE,x=(m.EAST_APPROACH.x+2400-600)*s,y=(m.EAST_APPROACH.y+900-600)*s;
 const north={x:(m.VILLAGE_APPROACH.x+2400-600)*s,y:(m.VILLAGE_APPROACH.y+700-600)*s};
 const outskirts={x:(m.VILLAGE_OUTSKIRTS.x+2100-600)*s,y:(m.VILLAGE_OUTSKIRTS.y+700-600)*s};
 const works={x:(m.EASTERN_WORKS.x+1100-600)*s,y:(m.EASTERN_WORKS.y+700-600)*s};
 const northWorks={x:(m.NORTHERN_WORKS.x+1100-600)*s,y:(m.NORTHERN_WORKS.y+700-600)*s};
 const grounds={x:(m.WORKS_GROUNDS.x+800-600)*s,y:(m.WORKS_GROUNDS.y+600-600)*s};
 const meadow={x:(m.WORKS_MEADOW.x+700-600)*s,y:(m.WORKS_MEADOW.y+400-600)*s};
 const southWorks={x:(m.SOUTH_WORKS.x+800-600)*s,y:(m.SOUTH_WORKS.y+700-600)*s};
 const campReturn={x:(m.CAMP_RETURN.x+800-600)*s,y:(m.CAMP_RETURN.y+700-600)*s};
 const southCamp={x:(m.SOUTH_CAMP.x+2100-600)*s,y:(m.SOUTH_CAMP.y+1050-600)*s};
 const westPoints=m.WEST_CAMP_TERRAIN_TILES.map(t=>({x:(t.x+t.width/2-600)*s,y:(t.y+t.height/2-600)*s}));
 const draft={...saved.draft,spawn:westPoints.at(-1),items:[...saved.draft.items,...westPoints.map(p=>m.newPlacement('base_well_t1',p.x,p.y+100)),m.newPlacement('base_well_t1',x,y),m.newPlacement('base_well_t1',north.x,north.y+200),m.newPlacement('base_well_t1',outskirts.x+200,outskirts.y),m.newPlacement('base_well_t1',works.x+200,works.y),m.newPlacement('base_well_t1',works.x,works.y+1400*s),m.newPlacement('base_well_t1',northWorks.x+200,northWorks.y),m.newPlacement('base_well_t1',northWorks.x,northWorks.y+900*s),m.newPlacement('base_well_t1',grounds.x+200,grounds.y),m.newPlacement('base_well_t1',grounds.x,grounds.y+1500*s),m.newPlacement('base_well_t1',meadow.x+200,meadow.y),m.newPlacement('base_well_t1',meadow.x,meadow.y+1200*s),m.newPlacement('base_well_t1',meadow.x,meadow.y+1330*s),m.newPlacement('base_well_t1',southWorks.x+200,southWorks.y),m.newPlacement('base_well_t1',southWorks.x+1500*s,southWorks.y+200*s),m.newPlacement('base_well_t1',campReturn.x+100,campReturn.y),m.newPlacement('base_well_t1',campReturn.x+1500*s,campReturn.y+200),m.newPlacement('base_well_t1',southCamp.x+100,southCamp.y),m.newPlacement('base_well_t1',southCamp.x-1400*s,southCamp.y+150*s)]};
 const request=rev=>new Request('https://test.local/api/world-layout',{method:'PUT',headers:{Origin:'https://test.local','Content-Type':'application/json'},body:JSON.stringify({layout:draft,revision:rev,action:'save'})});
 const response=await m.handleWorldLayout(request(revision),DB,true);assert.equal(response.status,200,await response.clone().text());
 const loaded=await(await m.handleWorldLayout(new Request('https://test.local/api/world-layout'),DB,true)).json();
 assert.equal(loaded.revision,revision+1);assert.deepEqual(loaded.draft.items,draft.items);assert.deepEqual(loaded.draft.spawn,draft.spawn);assert.equal(loaded.draft.terrainImage.id,t.id);
 assert.equal((await m.handleWorldLayout(request(revision),DB,true)).status,409,'Stale tab cannot overwrite expanded world');
 assert.equal((await m.handleWorldLayout(request(revision+1),DB,false)).status,403);
 console.log('PASS: real save/read handlers retain all '+saved.draft.items.length+' camp placements plus objects throughout the expansions, southern works and both westward camp connections, both central south-camp pieces, all five western pieces and a negative-coordinate western spawn; stale and unauthorised writes remain blocked. Test used only in-memory SQLite.');
}finally{db.close();fs.rmSync(temp,{recursive:true,force:true})}
