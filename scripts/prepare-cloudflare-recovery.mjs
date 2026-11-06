import fs from 'node:fs';
import path from 'node:path';

const snapshot=JSON.parse(fs.readFileSync('native/assets/world-snapshot.json','utf8'));
if(!snapshot.layout?.items?.length||!Array.isArray(snapshot.records))throw Error('Missing world snapshot');
const files=new Map();
function collect(file,entryId){
 if(!file?.url?.startsWith('/api/asset-files/'))return;
 if(!/^[a-zA-Z0-9_-]+$/.test(file.id))throw Error('Invalid artwork ID');
 const disk=path.join('public','api','asset-files',file.id);
 if(!fs.existsSync(disk))throw Error('Missing saved artwork: '+disk);
 const bytes=fs.readFileSync(disk);
 if(bytes.length!==file.bytes)throw Error('Saved artwork is not the real LFS binary: '+disk);
 files.set(file.id,{...file,entryId,source:disk,objectKey:'catalogue/'+entryId+'/'+file.id});
}
collect(snapshot.layout.terrainImage,'world-terrain');
for(const record of snapshot.records)for(const file of [record.config.base,...record.config.frames,record.config.roof,record.config.unlit])collect(file,record.id);

const q=value=>"'"+String(value).replaceAll("'","''")+"'";
const guarded=' EXISTS (SELECT 1 FROM world_layout WHERE id=\'main\' AND revision=0 AND draft_json IS NULL AND applied_json IS NULL)';
const sql=[];
for(const record of snapshot.records){
 if(record.customAsset){
  const a=record.customAsset;
  sql.push('INSERT OR IGNORE INTO custom_assets (id,name,created_at) SELECT '+[a.id,a.name,a.createdAt].map(q).join(',')+' WHERE'+guarded+';');
 }
 const fields=[crypto.randomUUID(),record.id,record.revision,JSON.stringify(record.config),record.updatedAt];
 sql.push('INSERT OR IGNORE INTO asset_artwork (id,entry_id,revision,config_json,created_at) SELECT '+fields.map(q).join(',')+' WHERE'+guarded+';');
}
for(const f of files.values()){
 const fields=[f.id,f.entryId,f.objectKey,f.name,f.mime,f.width,f.height,f.bytes,1,snapshot.layout.updatedAt];
 sql.push('INSERT OR IGNORE INTO asset_art_files (id,entry_id,object_key,name,mime,width,height,bytes,published,created_at) SELECT '+fields.map(v=>typeof v==='number'?v:q(v)).join(',')+' WHERE'+guarded+';');
}
// D1 limits SQL statement size. Stage the layout as small ordered fragments,
// then assemble it entirely inside SQLite. Never overwrite an existing world.
const layoutJSON=JSON.stringify(snapshot.layout);
const layoutChunks=[];
for(let i=0;i<layoutJSON.length;i+=12000)layoutChunks.push(layoutJSON.slice(i,i+12000));
sql.push('CREATE TABLE IF NOT EXISTS _humans_remain_recovery_chunks (part INTEGER PRIMARY KEY, payload TEXT NOT NULL);');
sql.push('DELETE FROM _humans_remain_recovery_chunks;');
for(let i=0;i<layoutChunks.length;i++)sql.push('INSERT INTO _humans_remain_recovery_chunks (part,payload) VALUES ('+i+','+q(layoutChunks[i])+');');
const reconstructed='(SELECT GROUP_CONCAT(payload,\'\') FROM (SELECT payload FROM _humans_remain_recovery_chunks ORDER BY part))';
sql.push('UPDATE world_layout SET draft_json='+reconstructed+',applied_json='+reconstructed+',revision='+Number(snapshot.revision)+',updated_at='+q(snapshot.layout.updatedAt)+' WHERE id=\'main\' AND revision=0 AND draft_json IS NULL AND applied_json IS NULL AND (SELECT COUNT(*) FROM _humans_remain_recovery_chunks)='+layoutChunks.length+';');
sql.push('DROP TABLE _humans_remain_recovery_chunks;');
fs.mkdirSync('.cloudflare-recovery',{recursive:true});
fs.writeFileSync('.cloudflare-recovery/seed.sql',sql.join('\n')+'\n');
fs.writeFileSync('.cloudflare-recovery/files.json',JSON.stringify([...files.values()],null,2));
console.log('Prepared guarded snapshot recovery: '+snapshot.layout.items.length+' objects, '+snapshot.records.length+' records, '+files.size+' R2 files. Existing saved worlds will not be overwritten.');
