import {handleArtwork,readArtwork,type ArtEnv} from './artwork';
import {artworkEntry,readCustomAssets} from './custom-assets';
import {customCatalogueEntry} from '../src/custom-assets';
import {entries as catalogue} from '../src/catalogue-model';
import losslessArtworkRedirects from './lossless-artwork-redirects.json';
import calmRiverRedirects from './calm-river-redirects.json';
import retiredRoadRedirects from './retired-road-redirects.json';
import riverFeaturesRedirects from './river-features-redirects.json';
import riverQualityRedirects from './river-quality-redirects.json';
import {handleMcp} from './mcp';
import {renderPublicChecklist} from './public-checklist';
import {handleWorldLayout} from './world-layout';
import {editorIdentity,editAccessResponse,type EditorIdentityEnv} from './edit-access';
import {isLibraryAssetId} from '../src/asset-library-policy';
type Statement={bind:(...values:unknown[])=>Statement;all:()=>Promise<{results:unknown[]}>;run:()=>Promise<unknown>};
type Env=ArtEnv & EditorIdentityEnv & {DB:{prepare:(sql:string)=>Statement};ASSETS?:{fetch:(request:Request)=>Promise<Response>}};
declare const __INDEX_HTML__:string;
const json=(data:unknown,status=200)=>Response.json(data,{status,headers:{'Cache-Control':'no-store'}});
const db=(env:Env)=>{if(!env.DB)throw Error('Checklist storage unavailable');return env.DB};
// Keep older open tabs working after superseded map exports leave the bundle.
// Each replacement retains the original texture rectangle and coordinate scale.
const retiredTerrain:Record<string,string>={
 ...retiredRoadRedirects,
 ...calmRiverRedirects,
 ...riverFeaturesRedirects,
 ...riverQualityRedirects,
 ...losslessArtworkRedirects,
 '/planning/built-river-logging-v1.webp':'/planning/built-river-calm-v2.webp',
 '/planning/river-logging-detail.webp':'/planning/river-calm-detail.webp',
 ...Object.fromEntries(['built-ground-consistent-v1','built-ground-earth-v3','built-ground-regions-v1','built-ground-regions-v2','built-ground-world-v1','built-roads-textured-v1','built-roads-bedded-v2','built-river-headwaters-v1'].map(name=>[`/planning/${name}.webp`,'/planning/built-river-logging-v1.webp'])),
 '/planning/river-headwaters-detail.webp':'/planning/river-logging-detail.webp',
 '/survival/world-ground-v1/warm.webp':'/survival/world-ground-v2/warm.webp',
 '/survival/world-ground-v1/brown.webp':'/survival/world-ground-v2/brown.webp',
 '/survival/world-ground-v1/olive.webp':'/survival/world-ground-v2/brown.webp',
 '/survival/world-ground-v2/olive.webp':'/survival/world-ground-v2/brown.webp',
 '/survival/home-terrain-perimeter-v4-preview.webp':'/survival/camp-ground-v3/preview.webp',
 ...Object.fromEntries(['camp-stone','dry-earth','dark-earth','works-gravel','salvage-gravel'].map(name=>[`/survival/road-materials-v1/${name}.webp`,`/survival/road-sections-v2/${name}.webp`])),
 '/survival/maps/village-outskirts-v1/05-camp-northeast-clearing.webp':'/survival/maps/consistent-terrain-v1/05-camp-northeast-clearing.webp',
 '/survival/maps/village-outskirts-v1/06-village-outskirts.webp':'/survival/maps/consistent-terrain-v1/06-village-outskirts.webp',
 '/survival/maps/village-approach-v2/03-camp-east-clearing.webp':'/survival/maps/consistent-terrain-v1/03-camp-east-clearing.webp',
 '/survival/maps/village-approach-v2/04-village-trail.webp':'/survival/maps/consistent-terrain-v1/04-village-trail.webp',
 '/survival/maps/east-approach-v1/01-camp-approach.webp':'/survival/maps/consistent-terrain-v1/01-camp-approach.webp',
 '/survival/maps/east-approach-v1/02-woodland-junction.webp':'/survival/maps/consistent-terrain-v1/02-woodland-junction.webp',
 '/survival/maps/northern-works-v1/09-north-works-clearing.webp':'/survival/maps/consistent-terrain-v1/09-north-works-clearing.webp',
 '/survival/maps/northern-works-v1/10-works-trail-connector.webp':'/survival/maps/consistent-terrain-v1/10-works-trail-connector.webp',
 '/survival/maps/eastern-works-v1/07-works-footpath.webp':'/survival/maps/consistent-terrain-v1/07-works-footpath.webp',
 '/survival/maps/eastern-works-v1/08-works-service-track.webp':'/survival/maps/consistent-terrain-v1/08-works-service-track.webp',
 '/survival/maps/works-meadow-v1/13-works-meadow.webp':'/survival/maps/consistent-terrain-v1/13-works-meadow.webp',
 '/survival/maps/works-meadow-v1/14-meadow-south-contact.webp':'/survival/maps/consistent-terrain-v1/14-meadow-south-contact.webp',
 '/survival/maps/works-meadow-v1/15-meadow-yard-contact.webp':'/survival/maps/consistent-terrain-v1/15-meadow-yard-contact.webp',
 '/survival/maps/works-grounds-v1/11-works-yard.webp':'/survival/maps/consistent-terrain-v1/11-works-yard.webp',
 '/survival/maps/works-grounds-v1/12-works-dirt-lane.webp':'/survival/maps/consistent-terrain-v1/12-works-dirt-lane.webp',
 '/survival/maps/south-works-v1/16-south-works-clearing.webp':'/survival/maps/consistent-terrain-v1/16-south-works-clearing.webp',
 '/survival/maps/south-works-v1/17-scrap-outskirts-trail.webp':'/survival/maps/consistent-terrain-v1/17-scrap-outskirts-trail.webp',
 '/survival/maps/camp-return-v2/18-camp-southeast-meadow.webp':'/survival/maps/consistent-terrain-v1/18-camp-southeast-meadow.webp',
 '/survival/maps/camp-return-v2/19-camp-works-open-ground.webp':'/survival/maps/consistent-terrain-v1/19-camp-works-open-ground.webp',
 '/survival/maps/south-camp-v1/20-camp-south-clearing.webp':'/survival/maps/consistent-terrain-v1/20-camp-south-clearing.webp',
 '/survival/maps/south-camp-v1/21-camp-south-trail.webp':'/survival/maps/consistent-terrain-v1/21-camp-south-trail.webp',
 '/survival/maps/west-camp-v2/22-southwest-camp-corner.webp':'/survival/maps/consistent-terrain-v1/22-southwest-camp-corner.webp',
 '/survival/maps/west-camp-v2/23-west-camp-lower.webp':'/survival/maps/consistent-terrain-v1/23-west-camp-lower.webp',
 '/survival/maps/west-camp-v2/24-southwest-woodland-trail.webp':'/survival/maps/consistent-terrain-v1/24-southwest-woodland-trail.webp',
 '/survival/maps/west-camp-v2/25-west-camp-exit.webp':'/survival/maps/consistent-terrain-v1/25-west-camp-exit.webp',
 '/survival/maps/west-camp-v2/26-west-camp-upper-ground.webp':'/survival/maps/consistent-terrain-v1/26-west-camp-upper-ground.webp',
 '/planning/built-ground-west-camp-v2.webp':'/planning/built-ground-consistent-v1.webp',
 '/survival/home-ground.png':'/survival/home-ground-lossless.webp',
 '/survival/city-ground.png':'/survival/city-ground-lossless.webp',
 '/survival/building-roofs.png':'/survival/building-roofs-lossless.webp',
 '/survival/home-buildings-atlas.png':'/survival/home-buildings-atlas-lossless.webp',
 '/survival/home-ground-empty.png':'/survival/home-buildings-atlas-lossless.webp',
 '/survival/maps/village-approach-v1/03-camp-east-clearing.webp':'/survival/maps/consistent-terrain-v1/03-camp-east-clearing.webp',
 '/survival/maps/village-approach-v1/04-village-trail.webp':'/survival/maps/consistent-terrain-v1/04-village-trail.webp',
 '/survival/maps/camp-return-v1/18-camp-southeast-meadow.webp':'/survival/maps/consistent-terrain-v1/18-camp-southeast-meadow.webp',
 '/survival/maps/camp-return-v1/19-camp-works-open-ground.webp':'/survival/maps/consistent-terrain-v1/19-camp-works-open-ground.webp',
 '/survival/maps/west-camp-v1/22-southwest-camp-corner.webp':'/survival/maps/consistent-terrain-v1/22-southwest-camp-corner.webp',
 '/survival/maps/west-camp-v1/23-west-camp-lower.webp':'/survival/maps/consistent-terrain-v1/23-west-camp-lower.webp',
 '/survival/maps/west-camp-v1/24-southwest-woodland-trail.webp':'/survival/maps/consistent-terrain-v1/24-southwest-woodland-trail.webp',
 '/survival/maps/west-camp-v1/25-west-camp-exit.webp':'/survival/maps/consistent-terrain-v1/25-west-camp-exit.webp',
 '/survival/maps/west-camp-v1/26-west-camp-upper-ground.webp':'/survival/maps/consistent-terrain-v1/26-west-camp-upper-ground.webp',
 '/survival/maps/west-camp-v1/manifest.json':'/survival/maps/west-camp-v2/manifest.json',
 '/planning/built-ground-west-camp-v1.webp':'/planning/built-ground-west-camp-v2.webp',
};
// Resolve old artwork chains in one request.
for(const key of Object.keys(retiredTerrain)){const seen=new Set([key]);let target=retiredTerrain[key];while(retiredTerrain[target]&&!seen.has(target)){seen.add(target);target=retiredTerrain[target]}retiredTerrain[key]=target}

export default {async fetch(request:Request,env:Env):Promise<Response>{
 const url=new URL(request.url);
 if((request.method==='GET'||request.method==='HEAD')&&url.pathname.startsWith('/survival/maps/consistent-terrain-v1/')&&url.pathname.endsWith('.webp'))return Response.redirect(new URL('/survival/world-ground-v2/warm.webp',url.origin).href,307);
 if((request.method==='GET'||request.method==='HEAD')&&retiredTerrain[url.pathname])return Response.redirect(new URL(retiredTerrain[url.pathname],url.origin).href,307);
 const {canEdit}=editorIdentity(request,env);
 if(url.pathname==='/api/edit-access')return editAccessResponse(request,env);
 if(url.pathname==='/api/custom-assets'||url.pathname==='/api/asset-artwork'||url.pathname==='/api/asset-files'||url.pathname==='/api/world-terrain'||url.pathname.startsWith('/api/asset-files/'))return handleArtwork(request,env,canEdit);
 if(url.pathname==='/api/world-layout')return handleWorldLayout(request,env.DB,canEdit);
 if(url.pathname==='/checklist.html'){
  if(!['GET','HEAD'].includes(request.method))return new Response('Read-only page',{status:405,headers:{Allow:'GET, HEAD'}});
  let rows:any[]=[],available=true;try{rows=(await db(env).prepare('SELECT id,art,implemented,tested,concept,export_complete,updated_at FROM base_checklist').all()).results as any[]}catch{available=false}
  return new Response(request.method==='HEAD'?null:renderPublicChecklist(url.origin,rows,available,await readArtwork(env.DB).catch(()=>[]),(await readCustomAssets(env.DB).catch(()=>[])).map(customCatalogueEntry)),{headers:{'Content-Type':'text/html;charset=utf-8','Cache-Control':'no-store'}});
 }
 if(url.pathname==='/mcp')return handleMcp(request,async()=>(await db(env).prepare('SELECT id,art,implemented,tested,concept,export_complete,updated_at FROM base_checklist').all()).results as any,()=>readArtwork(env.DB));
 if(url.pathname==='/'||url.pathname==='/index.html')return new Response(request.method==='HEAD'?null:__INDEX_HTML__,{headers:{'Content-Type':'text/html;charset=utf-8'}});
 if(url.pathname!=='/api/base-checklist')return env.ASSETS?env.ASSETS.fetch(request):new Response('Not found',{status:404});
 try{
  if(request.method==='GET'){const rows=await db(env).prepare('SELECT id,art,implemented,tested,concept,export_complete,updated_at FROM base_checklist').all();return json({rows:(rows.results as {id:string}[]).filter(row=>isLibraryAssetId(row.id)),canEdit});}
  if(request.method!=='PUT')return json({error:'Method not allowed'},405);
  if(!canEdit)return json({error:'Only the signed-in site owner can edit this checklist.'},403);
  if(request.headers.get('Origin')!==url.origin)return json({error:'Origin not allowed'},403);
  if(!request.headers.get('Content-Type')?.startsWith('application/json'))return json({error:'JSON required'},415);
  const raw=await request.text();if(raw.length>1000)return json({error:'Request too large'},413);
  let value;try{value=JSON.parse(raw)}catch{return json({error:'Invalid JSON'},400)}
  const item=catalogue.find(x=>x.id===value?.id)||await artworkEntry(env.DB,value?.id),field=value?.field;
  const columns:{[key:string]:string}={art:'art',concept:'concept',exportComplete:'export_complete',implemented:'implemented',tested:'tested'};
  if(!item||!Object.hasOwn(columns,field)||typeof value.checked!=='boolean'||(field==='art'&&item.art===null)||(field==='exportComplete'&&item.art===null))return json({error:'Invalid checklist item'},400);
  // SQL identifiers come only from the fixed whitelist, never from raw input.
  const column=columns[field];
  await db(env).prepare('INSERT INTO base_checklist (id,'+column+',updated_at) VALUES (?,?,?) ON CONFLICT(id) DO UPDATE SET '+column+'=excluded.'+column+',updated_at=excluded.updated_at').bind(item.id,value.checked?1:0,new Date().toISOString()).run();
  return json({ok:true});
 }catch(error){console.error('Base checklist storage error',error);return json({error:'Checklist could not be saved. Please retry.'},503);}
}};
