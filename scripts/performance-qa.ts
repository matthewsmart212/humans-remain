// Development-only benchmark. Runs the actual shared renderer, world and streams.
// Vite serves this page; the production entry never imports it or its fixture.
import snapshot from '../native/assets/world-snapshot.json';
import lossless from '../server/lossless-artwork-redirects.json';
import retired from '../server/retired-road-redirects.json';
import calm from '../server/calm-river-redirects.json';
import features from '../server/river-features-redirects.json';
import quality from '../server/river-quality-redirects.json';
import {installImportedArt} from '../src/imported-art';
import {prepareAuthoredWorld} from '../src/authored-world';
import {createCampPlaySession,stepCampPlaySession} from '../src/studio-play';
import {createWebWorld} from '../src/skia-web';
import {drawWorldEditor,editorCamera} from '../src/placed-world-renderer';
import {EDITOR_IMAGE_SOURCES,editorTerrainDetail,prepareEditorMovement} from '../src/editor-image-sources';
import {requiredImages} from '../src/world-assets';
import {OutdoorTerrainStream} from '../src/outdoor-streaming';
import {setWorldWeather,stepWeather} from '../src/weather-model';
import type {ArtworkRecord} from '../src/artwork-model';
import type {WorldLayout} from '../src/world-layout';
import {GamePerformanceRecorder} from '../src/performance-recording';
import {performanceWorldContext} from '../src/performance-context';
import {mountPerformanceQA} from './performance-panel-qa';
const canonical:Record<string,string>={...lossless,...retired,...calm,...features,...quality},fetchOriginal=window.fetch.bind(window);
window.fetch=(input,init)=>{let url=String(input);while(canonical[url])url=canonical[url];if(url.startsWith('/api/asset-files/'))url='/native/assets/world/'+url.split('/').pop()+'.png';return fetchOriginal(url,init)};
const params=new URLSearchParams(location.search);Object.defineProperty(window,'devicePixelRatio',{value:Number(params.get('dpr')||2),configurable:true});
const canvas=document.querySelector('canvas')!,status=document.querySelector('#status')!,results=document.querySelector('#results')!,run=document.querySelector<HTMLButtonElement>('#run')!;
installImportedArt(snapshot.records as ArtworkRecord[]);const layout=prepareAuthoredWorld(snapshot.layout as WorldLayout),world=createCampPlaySession(layout);
const view={x:0,y:0,zoom:1,follow:true,grid:false,collision:false,selected:null,ghost:null,placingSpawn:false,playing:true};
const diagnostics=new GamePerformanceRecorder();
const renderer=await createWebWorld(canvas,(ctx,atlas,imgs,w)=>drawWorldEditor(ctx,atlas,imgs,w,view),{...editorTerrainDetail(layout.terrainImage),...requiredImages(layout.items.map(p=>p.assetId),layout.terrainImage)},{sources:EDITOR_IMAGE_SOURCES,diagnostics,onProgress:(stage,p)=>{status.textContent=stage+' '+(p?`${p.loaded}/${p.total}`:'')}});
const outdoor=new OutdoorTerrainStream(s=>renderer.warmImages(s),keys=>renderer.releaseImages(keys));
let running=true,last=0,acc=0,loading=true,lastTerrain=0,lastProgress=0,sample:{start:number;frame:number[];render:number[];update:number[]}|undefined;
const stats=(xs:number[])=>{const sorted=[...xs].sort((a,b)=>a-b);return{mean:+(xs.reduce((s,n)=>s+n,0)/xs.length).toFixed(2),p95:+sorted[Math.floor(sorted.length*.95)]?.toFixed(2),max:+sorted.at(-1)?.toFixed(2)}};
const frame=(now:number)=>{if(!running)return;const start=performance.now(),delta=last?now-last:0;last=now;
 const tracked=diagnostics.beginFrame(now,loading?'paused':'playing');
 if(now-lastTerrain>200){const c=editorCamera(canvas.width||1688,canvas.height||780,world,view);outdoor.update({x:c.x,y:c.y,width:(canvas.width||1688)/c.scale,height:(canvas.height||780)/c.scale},world.player);lastTerrain=now}
 acc+=Math.min(.1,delta/1000);while(acc>=1/60){if(!loading)stepCampPlaySession(world,{x:0,y:0},false,false);acc-=1/60}stepWeather(world,Math.min(.1,delta/1000));
 const draw=performance.now();renderer.draw(world);const end=performance.now();
 if(tracked)diagnostics.endFrame(draw-start,end-draw,0);
 if(diagnostics.sampleDue(now))diagnostics.sample(now,performanceWorldContext(world,view.zoom,renderer.textureStats(),canvas.clientWidth,canvas.clientHeight));
 if(loading&&now-lastProgress>1000){lastProgress=now;const queue=renderer.textureStats().artwork;status.textContent=`Preparing textures · ${queue.warming} warm / ${queue.active} loading / ${queue.queued} queued`}
 if(sample){if(delta){sample.frame.push(delta);sample.render.push(end-draw);sample.update.push(draw-start)}if(now-sample.start>=12000){const report={scene:document.querySelector<HTMLSelectElement>('#scene')!.value,night:document.querySelector<HTMLInputElement>('#night')!.checked,backend:canvas.dataset.skiaBackend,dpr:devicePixelRatio,canvas:[canvas.width,canvas.height],frames:sample.frame.length,fps:+(1000*sample.frame.length/sample.frame.reduce((s,n)=>s+n,0)).toFixed(2),frameMs:stats(sample.frame),updateMs:stats(sample.update),renderMs:stats(sample.render),textures:renderer.textureStats()};results.textContent=JSON.stringify(report,null,2);console.log('PERFORMANCE_QA',JSON.stringify(report));sample=undefined;run.disabled=false;run.textContent='Run 12-second sample'}}
 requestAnimationFrame(frame)};requestAnimationFrame(frame);
await prepareEditorMovement(renderer,layout);await outdoor.settled();loading=false;run.disabled=false;status.textContent=`Ready · ${layout.items.length} placements · ${world.animals.length} animals · ${canvas.dataset.skiaBackend}`;
run.onclick=()=>{sample={start:performance.now(),frame:[],render:[],update:[]};run.disabled=true;run.textContent='Sampling…'};
mountPerformanceQA(diagnostics,()=>diagnostics.start(performance.now(),{platform:'web-qa',renderer:canvas.dataset.skiaBackend}),()=>{diagnostics.stop(performance.now());const log=JSON.parse(diagnostics.exportJson());results.textContent=JSON.stringify({schema:log.schema,summary:log.summary,phaseSummary:log.phaseSummary,diagnostics:log.diagnostics,traceStages:[...new Set(log.traceEvents.map((e:{stage:string})=>e.stage))],assetExamples:log.traceEvents.filter((e:{stage:string})=>e.stage==='decode'||e.stage==='texture-warm').slice(0,5),lastContext:log.contextSamples.at(-1),slowFrames:log.slowFrames.slice(0,3)},null,2)});
document.querySelector<HTMLSelectElement>('#scene')!.onchange=e=>{const value=(e.target as HTMLSelectElement).value;Object.assign(world.player,value==='forest'?{x:-3000,y:3500}:value==='river'?{x:-4200,y:-2000}:layout.spawn);lastTerrain=0};
document.querySelector<HTMLInputElement>('#night')!.onchange=e=>{const on=(e.target as HTMLInputElement).checked;world.nightAmount=on?1:0;world.phase=on?'night':'day';world.cycle=undefined;setWorldWeather(world,{rain:on,heavyRain:on,fog:on,lightning:false},false)};
document.querySelector<HTMLButtonElement>('#stop')!.onclick=()=>{running=!running;document.querySelector('#stop')!.textContent=running?'Stop rendering':'Resume rendering';if(running){last=0;requestAnimationFrame(frame)}};
