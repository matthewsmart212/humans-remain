export type NativeTouch={id:number;absoluteX:number;absoluteY:number};
type Contact={id:number;x:number;y:number;downX:number;downY:number;surfaceId?:number|string};
type Registration={id:number|string;x:number;y:number};
export type NativePinchState={contacts:Contact[];registrations:Registration[];pair:number[];distance:number;blocked:boolean};
export function nativePinchState():NativePinchState{'worklet';return{contacts:[],registrations:[],pair:[],distance:0,blocked:false}}
function matchSurfaces(state:NativePinchState){
 'worklet';
 for(const r of state.registrations){
  if(state.contacts.some(c=>c.surfaceId===r.id))continue;
  let closest:Contact|undefined,distance=.001;
  for(const c of state.contacts){if(c.surfaceId!==undefined)continue;const d=Math.max(Math.hypot(c.downX-r.x,c.downY-r.y),Math.hypot(c.x-r.x,c.y-r.y));if(d<distance){closest=c;distance=d}}
  if(closest)closest.surfaceId=r.id;
 }
}
/** Native parent and surface recognizers have independent identifiers. Match
 * their same-window down/current coordinates exactly, then retain the parent ID.
 * Action buttons never register and cannot become a pinch participant. */
export function registerNativePinchSurface(state:NativePinchState,id:number|string,x:number,y:number){
 'worklet';if(!state.registrations.some(r=>r.id===id))state.registrations.push({id,x,y});matchSurfaces(state);
}
export function updateNativePinchTouches(state:NativePinchState,kind:'down'|'move'|'up',touches:NativeTouch[],changed:NativeTouch[]){
 'worklet';
 const lifted=kind==='up'?changed.map(t=>t.id):[];
 if(kind==='down')for(const t of changed)if(!state.contacts.some(c=>c.id===t.id))state.contacts.push({id:t.id,x:t.absoluteX,y:t.absoluteY,downX:t.absoluteX,downY:t.absoluteY});
 for(const t of touches){const c=state.contacts.find(v=>v.id===t.id);if(c){c.x=t.absoluteX;c.y=t.absoluteY}}
 if(lifted.length){const removed=state.contacts.filter(c=>lifted.includes(c.id));state.registrations=state.registrations.filter(r=>!removed.some(c=>c.surfaceId===r.id));state.contacts=state.contacts.filter(c=>!lifted.includes(c.id));if(!state.contacts.length)state.registrations=[]}
 matchSurfaces(state);
}
export function advanceNativePinch(state:NativePinchState,zoom:number,minimum:number){
 'worklet';
 const points=state.contacts.filter(c=>c.surfaceId!==undefined),started=points.length>=2&&!state.blocked,ended=state.blocked&&!points.length;
 if(started)state.blocked=true;if(ended)state.blocked=false;
 let next=Math.max(minimum,Math.min(1,Number.isFinite(zoom)?zoom:1));
 if(points.length!==2){state.pair=[];state.distance=0;return{zoom:next,started,ended}}
 const [a,b]=points,distance=Math.hypot(a.x-b.x,a.y-b.y);
 if(!Number.isFinite(distance)||distance<4){state.pair=[];state.distance=0;return{zoom:next,started,ended}}
 if(state.distance>0&&state.pair.includes(a.id)&&state.pair.includes(b.id))next=Math.max(minimum,Math.min(1,next*distance/state.distance));
 state.pair=[a.id,b.id];state.distance=distance;return{zoom:next,started,ended};
}
/** A surface observer emits this on the same UI touch stream as the parent.
 * Removing a not-yet-matched grant also handles child-before-parent delivery. */
export function unregisterNativePinchSurface(state:NativePinchState,id:number|string){
 'worklet';state.registrations=state.registrations.filter(r=>r.id!==id);for(const c of state.contacts)if(c.surfaceId===id)c.surfaceId=undefined;
}
