import {RIVER_SOURCE} from './river-layout';
import {WORLD_PLAN_BOUNDS,WORLD_PLAN_DISTRICTS,WORLD_PLAN_BATCHES,type PlanRect} from './world-master-plan';
const get=<T extends Element>(id:string)=>document.getElementById(id) as unknown as T;
const map=get<SVGSVGElement>('world-map');
const unit=WORLD_PLAN_BOUNDS.width/1000;
let view={x:0,y:0,size:1000},selected='camp';
const clamp=(n:number,lo:number,hi:number)=>Math.max(lo,Math.min(hi,n));
function setView(x:number,y:number,size:number){
 size=clamp(size,240,1000);view={x:clamp(x,0,1000-size),y:clamp(y,0,1000-size),size};
 map.setAttribute('viewBox',`${view.x} ${view.y} ${view.size} ${view.size}`);
 get('view-status').textContent=size===1000?'Full world · drag to explore':`${(1000/size).toFixed(1)}× zoom · drag to explore`;
 get<HTMLButtonElement>('zoom-in').disabled=size<=240;get<HTMLButtonElement>('zoom-out').disabled=size>=1000;
}
function frame(rect:PlanRect,pad=1000){
 const w=(rect.width+2*pad)/unit,h=(rect.height+2*pad)/unit,size=clamp(Math.max(w,h),240,1000);
 const cx=(rect.x+rect.width/2-WORLD_PLAN_BOUNDS.x)/unit,cy=(rect.y+rect.height/2-WORLD_PLAN_BOUNDS.y)/unit;
 setView(cx-size/2,cy-size/2,size);
}
const extent=(points:readonly (readonly [number,number])[])=>{const xs=points.map(p=>p[0]),ys=points.map(p=>p[1]);return{x:Math.min(...xs),y:Math.min(...ys),width:Math.max(...xs)-Math.min(...xs),height:Math.max(...ys)-Math.min(...ys)}};
function selectDistrict(id:string,focus=false){
 const district=WORLD_PLAN_DISTRICTS.find(d=>d.id===id);if(!district)return;selected=id;
 get('detail-direction').textContent=district.direction+' · '+(district.status==='built'?'Existing home base':'Ground built · content planned');
 get('detail-title').textContent=district.name;get('detail-purpose').textContent=district.purpose;get('detail-ground').textContent=district.ground;
 get<HTMLButtonElement>('focus-district').hidden=false;
 document.querySelectorAll<HTMLElement>('[data-select]').forEach(b=>b.setAttribute('aria-pressed',String(b.dataset.select===id)));
 document.querySelectorAll<SVGElement>('[data-district]').forEach(pin=>{pin.classList.toggle('selected',pin.dataset.district===id);pin.setAttribute('aria-pressed',String(pin.dataset.district===id))});
 if(focus)frame(extent(district.outline),1600);
}
document.querySelectorAll<HTMLElement>('[data-select]').forEach(b=>b.addEventListener('click',()=>selectDistrict(b.dataset.select!,true)));
document.querySelectorAll<SVGElement>('[data-district]').forEach(pin=>{
 const choose=()=>selectDistrict(pin.dataset.district!);
 pin.addEventListener('click',choose);pin.addEventListener('keydown',e=>{if(e.key==='Enter'||e.key===' '){e.preventDefault();choose()}});
});
get('focus-district').addEventListener('click',()=>selectDistrict(selected,true));
get('fit-world').addEventListener('click',()=>setView(0,0,1000));
get('find-river').addEventListener('click',()=>{frame(RIVER_SOURCE,500);get('view-status').textContent='Western river · 26 connected sections';get('detail-direction').textContent='NORTHWEST TO SOUTH · BUILT';get('detail-title').textContent='Western river';get('detail-purpose').textContent='The headwaters flow through the logging bends and waterworks approach to the southern edge. Twenty-six connected sections have gently animated water, three narrow offshoot streams, the broad Stillwater Lake, ten selected waterfall and rapid areas, and four walkable wooden crossings. The meadow channel and eastern creek remain planned.';get('detail-ground').textContent='Warm brown earth and sculpted stone banks. Trees and bushes remain separate assets.';get<HTMLButtonElement>('focus-district').hidden=true;document.querySelectorAll('[aria-pressed][data-select], [aria-pressed][data-district]').forEach(e=>e.setAttribute('aria-pressed','false'));document.querySelectorAll('.district-pin').forEach(e=>e.classList.remove('selected'))});
get('find-camp').addEventListener('click',()=>selectDistrict('camp',true));
const zoom=(factor:number)=>{const size=clamp(view.size*factor,240,1000);setView(view.x+(view.size-size)/2,view.y+(view.size-size)/2,size)};
get('zoom-in').addEventListener('click',()=>zoom(.75));get('zoom-out').addEventListener('click',()=>zoom(4/3));
function layers(){
 const ground=get<HTMLInputElement>('show-ground').checked,routes=get<HTMLInputElement>('show-routes').checked,batches=get<HTMLInputElement>('show-batches').checked;
 get<SVGElement>('existing-ground').style.display=ground?'':'none';get<SVGElement>('built-survey').style.display=ground?'none':'block';
 get<SVGElement>('planned-routes').style.display=routes?'':'none';get<SVGElement>('next-batches').style.display=batches?'block':'none';
 get<SVGElement>('world-map').classList.toggle('showing-batches',batches);
}
['show-ground','show-routes','show-batches'].forEach(id=>get(id).addEventListener('change',layers));
function nextSections(){get<HTMLInputElement>('show-batches').checked=true;layers();frame({x:-1528,y:-1218,width:6268,height:7424},700)}
get('find-next').addEventListener('click',nextSections);
function selectBatch(id:string){
 const batch=WORLD_PLAN_BATCHES.find(b=>b.id===id);if(!batch)return;
 get<HTMLInputElement>('show-batches').checked=true;layers();frame(batch.bounds,1700);
 get('batch-detail').removeAttribute('hidden');get('batch-title').textContent=batch.id+' · '+batch.name;get('batch-goal').textContent=batch.goal;
 // Selection also updates the visible description beside the map on desktop.
 get('detail-direction').textContent='Ground complete · '+batch.id;get('detail-title').textContent=batch.name;get('detail-purpose').textContent=batch.goal;
 get('detail-ground').textContent='Warm and brown camp-style earth with softly blended clear-soil patches. Separate stone, dirt and gravel roads change gradually with the district. Foliage will be placed separately.';
 get<HTMLButtonElement>('focus-district').hidden=true;
 document.querySelectorAll<HTMLElement>('[data-select]').forEach(b=>b.setAttribute('aria-pressed','false'));
 document.querySelectorAll<SVGElement>('[data-district]').forEach(pin=>{pin.classList.remove('selected');pin.setAttribute('aria-pressed','false')});
}
document.querySelectorAll<HTMLElement>('[data-select-batch]').forEach(b=>b.addEventListener('click',()=>{selectBatch(b.dataset.selectBatch!);map.scrollIntoView({behavior:matchMedia('(prefers-reduced-motion: reduce)').matches?'instant':'smooth',block:'center'})}));
document.querySelectorAll<SVGElement>('[data-batch]').forEach(b=>{b.addEventListener('click',()=>selectBatch(b.dataset.batch!));b.addEventListener('keydown',e=>{if(e.key==='Enter'||e.key===' '){e.preventDefault();selectBatch(b.dataset.batch!)}})});
// Pointer drag and two-finger zoom keep the map useful on touch screens without
// ever moving the editor's camera or changing game coordinates.
const pointers=new Map<number,{x:number;y:number}>();
let gesture:{view:typeof view;centre:{x:number;y:number};distance:number}|null=null;
function centre(){const a=[...pointers.values()];return{x:a.reduce((s,p)=>s+p.x,0)/a.length,y:a.reduce((s,p)=>s+p.y,0)/a.length}}
function distance(){const a=[...pointers.values()];return a.length<2?0:Math.hypot(a[0].x-a[1].x,a[0].y-a[1].y)}
function startGesture(){gesture=pointers.size?{view:{...view},centre:centre(),distance:distance()}:null}
map.addEventListener('pointerdown',e=>{
 if(e.button!==0||(e.target as Element).closest('[role="button"]'))return;
 pointers.set(e.pointerId,{x:e.clientX,y:e.clientY});map.setPointerCapture(e.pointerId);startGesture();
});
map.addEventListener('pointermove',e=>{
 if(!pointers.has(e.pointerId)||!gesture)return;pointers.set(e.pointerId,{x:e.clientX,y:e.clientY});
 const bounds=map.getBoundingClientRect(),c=centre(),size=clamp(gesture.distance>0?gesture.view.size*gesture.distance/Math.max(1,distance()):gesture.view.size,240,1000);
 const startX=(gesture.centre.x-bounds.left)/bounds.width,startY=(gesture.centre.y-bounds.top)/bounds.height;
 setView(gesture.view.x+startX*gesture.view.size-(c.x-bounds.left)/bounds.width*size,gesture.view.y+startY*gesture.view.size-(c.y-bounds.top)/bounds.height*size,size);
});
for(const name of ['pointerup','pointercancel','lostpointercapture'])map.addEventListener(name,e=>{pointers.delete((e as PointerEvent).pointerId);startGesture()});
map.addEventListener('keydown',e=>{
 if(e.target!==map)return;const step=view.size*.1;
 if(['ArrowLeft','ArrowRight','ArrowUp','ArrowDown','+','=','-','Home'].includes(e.key))e.preventDefault();
 if(e.key==='ArrowLeft')setView(view.x-step,view.y,view.size);if(e.key==='ArrowRight')setView(view.x+step,view.y,view.size);
 if(e.key==='ArrowUp')setView(view.x,view.y-step,view.size);if(e.key==='ArrowDown')setView(view.x,view.y+step,view.size);
 if(e.key==='+'||e.key==='=')zoom(.75);if(e.key==='-')zoom(4/3);if(e.key==='Home')setView(0,0,1000);
});
setView(0,0,1000);layers();
