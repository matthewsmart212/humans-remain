// Build the owner's planning view from the same coordinates used for each
// terrain brief. This page never changes the playable ground or saved layout.
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {createRequire} from 'node:module';
import {build} from 'esbuild';
const temp=fs.mkdtempSync(path.join(os.tmpdir(),'world-plan-build-'));
try{
 await build({stdin:{contents:"export * from './src/world-master-plan';export * from './src/world-plan-geometry';export * from './src/outdoor-terrain';export * from './src/terrain-art';export * from './src/world-roads';export * from './src/world-road-materials';export * from './src/river-art';",resolveDir:process.cwd()},bundle:true,platform:'node',format:'cjs',outfile:path.join(temp,'plan.cjs')});
 const p=createRequire(import.meta.url)(path.join(temp,'plan.cjs'));
 const errors=p.validateWorldPlan();if(errors.length)throw Error(errors.join('\n'));
 const bounds=p.WORLD_PLAN_BOUNDS,unit=bounds.width/1000;
 const xy=([x,y])=>[(x-bounds.x)/unit,(y-bounds.y)/unit];
 const pair=v=>xy(v).map(n=>+n.toFixed(3)).join(',');
 const points=vs=>vs.map(pair).join(' ');
 const line=vs=>'M'+vs.map(pair).join(' L');
 const rect=r=>{const [x,y]=xy([r.x,r.y]);return `x="${x}" y="${y}" width="${r.width/unit}" height="${r.height/unit}"`};
 const escape=s=>String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
 const built=[{x:0,y:0,width:p.HOME_TERRAIN.fullSize,height:p.HOME_TERRAIN.fullSize},...p.OUTDOOR_SOURCE_TILES.map(t=>({x:t.x,y:t.y,width:t.width-t.paintRight,height:t.height-t.paintBottom}))];
 const xs=[...new Set(built.flatMap(r=>[r.x,r.x+r.width]))].sort((a,b)=>a-b),ys=[...new Set(built.flatMap(r=>[r.y,r.y+r.height]))].sort((a,b)=>a-b);
 const cells=ys.slice(1).map((_,j)=>xs.slice(1).map((_,i)=>built.some(r=>xs[i]>=r.x&&xs[i+1]<=r.x+r.width&&ys[j]>=r.y&&ys[j+1]<=r.y+r.height)));
 const edges=[];let builtArea=0;
 for(let j=0;j<ys.length-1;j++)for(let i=0;i<xs.length-1;i++)if(cells[j][i]){
  builtArea+=(xs[i+1]-xs[i])*(ys[j+1]-ys[j]);
  if(!cells[j-1]?.[i])edges.push([[xs[i],ys[j]],[xs[i+1],ys[j]]]);
  if(!cells[j+1]?.[i])edges.push([[xs[i],ys[j+1]],[xs[i+1],ys[j+1]]]);
  if(!cells[j]?.[i-1])edges.push([[xs[i],ys[j]],[xs[i],ys[j+1]]]);
  if(!cells[j]?.[i+1])edges.push([[xs[i+1],ys[j]],[xs[i+1],ys[j+1]]]);
 }
 const river=p.WORLD_PLAN_RIVERS.filter(r=>r.id!=='western-river').map(r=>`<path d="${line(r.points)}" stroke-width="${r.width/unit+8}" class="river-bank"/><path d="${line(r.points)}" stroke-width="${r.width/unit}" class="river"/>`).join('');
 const routes=status=>p.WORLD_PLAN_ROUTES.filter(r=>r.status===status&&r.kind!=='access').map(r=>{
  const road=p.WORLD_ROADS.find(road=>road.id===r.id),guide=status==='planned';
  return `<path d="${line(road.sourcePoints)}" stroke-width="${r.width/unit}" class="route ${r.kind}${guide?' layout-guide':''}" data-route="${r.id}"><title>${escape(r.id.replaceAll('-',' '))}${guide?' · textured route':''}</title></path>`;
 }).join('');
 const quiet=p.WORLD_PLAN_QUIET.map(a=>`<g><polygon points="${points(a.polygon)}"/><text x="${Math.max(72,Math.min(928,xy(a.polygon.reduce((v,b)=>[v[0]+b[0]/a.polygon.length,v[1]+b[1]/a.polygon.length],[0,0]))[0]))}" y="${xy(a.polygon.reduce((v,b)=>[v[0]+b[0]/a.polygon.length,v[1]+b[1]/a.polygon.length],[0,0]))[1]}">${escape(a.name)}</text></g>`).join('');
 const districtShapes=p.WORLD_PLAN_DISTRICTS.filter(d=>d.id!=='camp').map(d=>`<polygon class="district-area" points="${points(d.outline)}" fill="${d.colour}"/>`).join('');
 const pins=p.WORLD_PLAN_DISTRICTS.map(d=>{const [x,y]=xy(d.centre);return `<g class="district-pin ${d.id==='camp'?'selected':''}" data-district="${d.id}" role="button" tabindex="0" aria-label="${escape(d.name+', '+d.direction)}" aria-pressed="${d.id==='camp'}" transform="translate(${x},${y})"><circle class="hit-target" r="48"/><circle class="pin-ring" r="24"/><circle class="pin-face" r="19" style="fill:${d.colour}"/><text class="pin-number" y="1">${d.number}</text><text class="pin-label" y="44">${escape(d.name)}</text></g>`}).join('');
 const batches=p.WORLD_PLAN_BATCHES.map(b=>`<g class="batch ${b.status}" data-batch="${b.id}" role="button" tabindex="0" aria-label="${escape(b.id+' '+b.name)}"><rect ${rect(b.bounds)}/><text x="${xy([b.bounds.x+b.bounds.width/2,b.bounds.y+b.bounds.height/2])[0]}" y="${xy([b.bounds.x+b.bounds.width/2,b.bounds.y+b.bounds.height/2])[1]}">${b.id}</text></g>`).join('');
 const svg=`<svg id="world-map" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1000 1000" aria-label="Planned world around the existing camp" role="group" tabindex="0">
 <title>Humans Remain — camp-anchored world plan</title><desc>Ground and separate textured roads connect all seven district areas. Twenty-six western river sections reach the southern edge, with animated water, three narrow offshoot streams, Stillwater Lake and four wooden crossings. The meadow channel, eastern creek, district buildings and scenery remain planned.</desc>
 <defs><radialGradient id="ground"><stop stop-color="#344c42"/><stop offset="1" stop-color="#152d2d"/></radialGradient><pattern id="quiet-hatch" width="12" height="12" patternUnits="userSpaceOnUse" patternTransform="rotate(35)"><path d="M0 0V12" stroke="#b5bd88" stroke-width="2" opacity=".26"/></pattern><pattern id="map-grid" width="100" height="100" patternUnits="userSpaceOnUse"><path d="M100 0H0V100" fill="none" stroke="#9eaea0" stroke-width="1" opacity=".08"/></pattern></defs>
 <rect width="1000" height="1000" fill="url(#ground)"/><rect width="1000" height="1000" fill="url(#map-grid)"/>
 <g class="districts">${districtShapes}</g>
 <g id="existing-ground"><image href="/planning/built-river-features-v4.webp" ${rect(p.OUTDOOR_SOURCE_BOUNDS)} preserveAspectRatio="none"/></g>
 <g class="quiet-areas">${quiet}</g>
 <g id="built-survey" class="built-survey">${routes('built')}</g>
 <g id="planned-routes" class="planned-routes"><g class="waterways">${river}</g>${routes('planned')}${p.WORLD_PLAN_RAIL.map(r=>`<path class="rail-base" d="${line(r.points)}"/><path class="rail-ties" d="${line(r.points)}"/>`).join('')}</g>
 <g class="built-outline">${edges.map(e=>`<path d="${line(e)}"/>`).join('')}</g>
 <g id="next-batches" class="next-batches">${batches}</g><g class="district-pins">${pins}</g>
 </svg>`;
 const list=p.WORLD_PLAN_DISTRICTS.map(d=>`<button type="button" data-select="${d.id}" aria-pressed="${d.id==='camp'}"><span class="district-index" style="--district:${d.colour}">${d.number}</span><span>${escape(d.name)}<small>${escape(d.direction)} · ${d.status==='built'?'Existing home base':'Ground built · content planned'}</small></span><span class="list-arrow" aria-hidden="true">↗</span></button>`).join('');
 const phases=p.WORLD_PLAN_PHASES.map(f=>`<li><span>${String(f.number).padStart(2,'0')}</span><div><strong>${escape(f.name)}</strong><p>${escape(f.detail)}</p></div></li>`).join('');
 const batchList=p.WORLD_PLAN_BATCHES.map(b=>`<button type="button" data-select-batch="${b.id}"><b>${b.id}</b><span>${escape(b.name)}<small>Ground complete</small></span><span aria-hidden="true">↗</span></button>`).join('');
 const ratio=(bounds.width*bounds.height/p.HOME_TERRAIN.fullSize**2).toFixed(1);
 fs.mkdirSync('public/planning',{recursive:true});
 const metadata={bounds,originalCampSize:p.HOME_TERRAIN.fullSize,plannedAreaVsCamp:Number(ratio),groundStatus:'complete',groundColour:'Warm and brown earth with irregular clear-soil patches; green terrain removed.',builtArea,builtTextureCount:p.OUTDOOR_SOURCE_TILES.length,uniqueGroundImages:3,builtRectangles:built,builtOverview:{path:'/planning/built-river-features-v4.webp',sourceBounds:p.OUTDOOR_SOURCE_BOUNDS},districts:p.WORLD_PLAN_DISTRICTS.map(d=>({...d,groundStatus:'built'})),nodes:p.WORLD_PLAN_NODES,routes:p.WORLD_PLAN_ROUTES,rivers:p.WORLD_PLAN_RIVERS,rail:p.WORLD_PLAN_RAIL,quietAreas:p.WORLD_PLAN_QUIET,batches:p.WORLD_PLAN_BATCHES.map(b=>({...b,contacts:p.patchRouteContacts(b.bounds)})),phases:p.WORLD_PLAN_PHASES,bridgeCrossings:p.riverRouteCrossings()};
 metadata.riverArtwork={stage:'western-river-features-v4',sideFeatures:p.RIVER_SIDE_FEATURES,whitewaterAreas:10,previousWhitewaterAreas:31,sections:p.RIVER_SECTIONS,bounds:p.RIVER_SOURCE,animated:true,frames:12,remainingRiver:'Meadow channel and eastern creek planned',builtCrossings:JSON.parse(fs.readFileSync('src/river-bridges.json','utf8'))};
 metadata.roadLayout={stage:p.WORLD_ROAD_STAGE,sections:p.WORLD_ROADS.length,texturesReady:true,materials:p.WORLD_ROAD_MATERIALS.map(m=>m.name)};
 fs.writeFileSync('public/planning/world-plan.json',JSON.stringify(metadata,null,2)+'\n');
 const html=fs.readFileSync('scripts/world-plan-template.html','utf8').replace('{{MAP}}',svg).replace('{{DISTRICTS}}',list).replace('{{PHASES}}',phases).replace('{{BATCHES}}',batchList).replaceAll('{{RATIO}}',ratio).replaceAll('{{TILE_COUNT}}',String(p.OUTDOOR_SOURCE_TILES.length));
 fs.writeFileSync('public/world-plan.html',html);
 fs.copyFileSync('src/world-plan.css','public/planning/world-plan.css');
 await build({entryPoints:['src/world-plan-page.ts'],bundle:true,format:'esm',target:'es2022',minify:true,outfile:'public/planning/world-plan.js'});
 // A self-contained schematic for visual QA. This is a diagram, not game art.
 const baseStyle=fs.readFileSync('src/world-plan.css','utf8').split('/* MAP STYLES */')[1].split('/* END MAP STYLES */')[0];
 const image=fs.readFileSync('public/planning/built-river-features-v4.webp').toString('base64');
 fs.mkdirSync('docs/qa/world-master-plan',{recursive:true});
 fs.writeFileSync('docs/qa/world-master-plan/master-map.svg',svg.replace('viewBox="0 0 1000 1000"','width="1400" height="1400" viewBox="0 0 1000 1000"').replace('<defs>','<style>'+baseStyle+'</style><defs>').replace('/planning/built-river-features-v4.webp','data:image/webp;base64,'+image));
 console.log(JSON.stringify({districts:metadata.districts.length,riverCrossings:metadata.bridgeCrossings.length,quietAreas:metadata.quietAreas.length,nextBatches:metadata.batches.length,plannedAreaVsCamp:metadata.plannedAreaVsCamp,builtTextures:metadata.builtTextureCount,errors}));
}finally{fs.rmSync(temp,{recursive:true,force:true})}
