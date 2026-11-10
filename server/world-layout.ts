import {MAX_LAYOUT_BYTES} from '../src/layout-limits';
import {readArtwork} from './artwork';
import {assetMapWithImports} from '../src/imported-art';
import {validateLayout} from '../src/world-layout';
import {validTerrainBorder} from '../src/terrain-limits';
type Statement={bind:(...values:unknown[])=>Statement;all:()=>Promise<{results:any[]}>;run:()=>Promise<any>};

/** Public, read-only copy of the last explicitly published authored world.
 * Drafts and owner-only editor state never leave this endpoint. A missing
 * published world is not an empty world: clients should use their bundled copy.
 */
export async function handlePublishedWorld(request:Request,DB:{prepare:(sql:string)=>Statement}){
 const headers={'Access-Control-Allow-Origin':'*','Cache-Control':'public, max-age=30','X-Content-Type-Options':'nosniff'};
 if(request.method!=='GET'&&request.method!=='HEAD')return Response.json({error:'Read only'},{status:405,headers:{...headers,Allow:'GET, HEAD'}});
 try{
  const row=(await DB.prepare("SELECT applied_json FROM world_layout WHERE id='main'").all()).results[0];
  if(!row?.applied_json)return Response.json({error:'No published world yet'},{status:404,headers});
  const layout=JSON.parse(row.applied_json);
  // Artwork records are needed for custom assets and uploaded image variants.
  // Only the explicitly published *layout* is read here; editing drafts stay private.
  const records=await readArtwork(DB,true);
  return new Response(request.method==='HEAD'?null:JSON.stringify({schemaVersion:1,layout,records,updatedAt:layout.updatedAt}),{headers:{...headers,'Content-Type':'application/json;charset=utf-8'}});
 }catch(error){console.error('Published world read failed',error);return Response.json({error:'Published world unavailable'},{status:503,headers:{...headers,'Cache-Control':'no-store'}})}
}
export async function handleWorldLayout(request:Request,DB:{prepare:(sql:string)=>Statement},canEdit:boolean){
 const json=(v:unknown,status=200)=>Response.json(v,{status,headers:{'Cache-Control':'no-store'}});
 try{
  if(request.method==='GET'){const row=(await DB.prepare("SELECT draft_json,applied_json,revision,updated_at FROM world_layout WHERE id='main'").all()).results[0];return json({draft:row?.draft_json?JSON.parse(row.draft_json):null,applied:row?.applied_json?JSON.parse(row.applied_json):null,revision:row?.revision||0,updatedAt:row?.updated_at||null,canEdit})}
  if(request.method!=='PUT')return json({error:'Method not allowed'},405);
  if(!canEdit)return json({error:'Only the signed-in site owner can save or apply the shared world. Your local draft is kept.'},403);
  if(request.headers.get('Origin')!==new URL(request.url).origin)return json({error:'Origin not allowed'},403);
  if(!request.headers.get('Content-Type')?.startsWith('application/json'))return json({error:'JSON required'},415);
  const body=await request.text();if(new TextEncoder().encode(body).byteLength>MAX_LAYOUT_BYTES)return json({error:'World is too large'},413);
  let v;try{v=JSON.parse(body)}catch{return json({error:'Invalid JSON'},400)}
  if(!Number.isInteger(v.revision)||v.revision<0||!['save','apply','original'].includes(v.action))return json({error:'Invalid save request'},400);
  // The historic gameplay validator requires removed generator/storage stations. Modern
  // worlds may intentionally have neither; validate all placement geometry here.
  const {layout,errors}=validateLayout(v.layout,false,assetMapWithImports(await readArtwork(DB,true)));if(!layout||errors.length)return json({error:errors.join(' ')},400);
  if(v.action==='apply'&&!layout.items.length)return json({error:'An empty world cannot be published. Save it as a draft instead.'},400);
  if(layout.terrainImage){const t=layout.terrainImage,row=(await DB.prepare('SELECT * FROM asset_art_files WHERE id=? AND entry_id=?').bind(t.id,'world-terrain').all()).results[0];if(!row)return json({error:'Upload this terrain image before saving the world.'},400);if(!validTerrainBorder(row.width,row.height,layout.terrainBorder||0))return json({error:'The outer scenery border does not fit this image.'},400);layout.terrainImage={id:row.id,url:'/api/asset-files/'+row.id,name:row.name,mime:row.mime,width:row.width,height:row.height,bytes:row.bytes};await DB.prepare('UPDATE asset_art_files SET published=1 WHERE id=?').bind(row.id).run()}
  const at=new Date().toISOString();layout.updatedAt=at;const encoded=JSON.stringify(layout);
  // Compare-and-swap prevents a second tab overwriting a newer camp silently.
  const set=v.action==='save'?'draft_json=?,revision=revision+1,updated_at=?':v.action==='apply'?'draft_json=?,applied_json=?,revision=revision+1,updated_at=?':'draft_json=?,applied_json=NULL,revision=revision+1,updated_at=?';
  const args=v.action==='apply'?[encoded,encoded,at,v.revision]:[encoded,at,v.revision];
  const result=await DB.prepare("UPDATE world_layout SET "+set+" WHERE id='main' AND revision=?").bind(...args).run();
  if(result.meta?.changes!==1)return json({error:'Another tab saved a newer world. Export your draft, then reload before saving.'},409);
  return json({revision:v.revision+1,updatedAt:at});
 }catch(error){console.error('World storage error',error);return json({error:'World storage is unavailable. Your local draft is kept; retry saving.'},503)}
}
