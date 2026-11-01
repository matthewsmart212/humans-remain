/** Fixed-width, allocation-free frame detail storage; expanded only after Stop. */
export const PERFORMANCE_SYSTEMS=['simulationMs','terrainMs','audioMs','textureBudgetMs','mapPrefetchMs','diagnosticsMs','simMovementMs','simProgressionMs','simCombatMs','simWildlifeMs','simEnvironmentMs','simSurvivalMs'] as const;
export type PerformanceSystem=typeof PERFORMANCE_SYSTEMS[number];
export const PERFORMANCE_CONTEXT_COLUMNS=['playerX','playerY','cameraX','cameraY','zoom','atlasZoom','enemyCount','visibleSprites','flags','knownFlags'] as const;
export const PERFORMANCE_CONTEXT_FLAGS=['mapVisible','mapReady','worldDrawn','pinching','moving','sprinting'] as const;
type NumericContext=typeof PERFORMANCE_CONTEXT_COLUMNS[number];
export type PerformanceFrameContext=Partial<Record<Exclude<NumericContext,'flags'|'knownFlags'>,number>&Record<typeof PERFORMANCE_CONTEXT_FLAGS[number],boolean>>;
export const PERFORMANCE_SYSTEM_LABELS:Record<PerformanceSystem,string>={simulationMs:'Simulation',terrainMs:'Terrain streaming',audioMs:'Audio',textureBudgetMs:'Texture preparation budget',mapPrefetchMs:'Map tile preparation',diagnosticsMs:'Diagnostics',simMovementMs:'Movement and gates',simProgressionMs:'Camp progression and siege',simCombatMs:'Combat',simWildlifeMs:'Wildlife',simEnvironmentMs:'Environment simulation',simSurvivalMs:'Survival and repair'};
export function writeFrameContext(target:Float32Array,context:PerformanceFrameContext){
 for(let c=0;c<8;c++){const value=context[PERFORMANCE_CONTEXT_COLUMNS[c] as Exclude<NumericContext,'flags'|'knownFlags'>];target[c]=typeof value==='number'&&Number.isFinite(value)?value:NaN}
 let flags=0,known=0;
 for(let c=0;c<PERFORMANCE_CONTEXT_FLAGS.length;c++){const value=context[PERFORMANCE_CONTEXT_FLAGS[c]];if(typeof value==='boolean'){known|=1<<c;if(value)flags|=1<<c}}
 target[8]=flags;target[9]=known;
}
export function describeFrameContext(row:readonly (number|null)[]){
 const result:Record<string,number|boolean|null>={};
 for(let c=0;c<8;c++)result[PERFORMANCE_CONTEXT_COLUMNS[c]]=row[c]??null;
 const flags=row[8]??0,known=row[9]??0;
 for(let c=0;c<PERFORMANCE_CONTEXT_FLAGS.length;c++)result[PERFORMANCE_CONTEXT_FLAGS[c]]=known&(1<<c)?!!(flags&(1<<c)):null;
 return result;
}

/** Compute only after Stop. Buckets use callback timestamps, never fabricate frames during pauses. */
export function buildPerformanceTimeline(frames:readonly (readonly number[])[]){
 const buckets=new Map<number,{frames:number[];firstFrameIndex:number;lastFrameIndex:number;intervalMs:number;updateMs:number;renderMs:number;worstFrameIndex:number;over33ms:number;over50ms:number;over100ms:number}>();
 for(let index=0;index<frames.length;index++){
  const row=frames[index],second=Math.floor(row[0]/1000);
  let bucket=buckets.get(second);
  if(!bucket){bucket={frames:[],firstFrameIndex:index,lastFrameIndex:index,intervalMs:0,updateMs:0,renderMs:0,worstFrameIndex:index,over33ms:0,over50ms:0,over100ms:0};buckets.set(second,bucket)}
  bucket.frames.push(row[1]);bucket.lastFrameIndex=index;bucket.intervalMs+=row[1];bucket.updateMs+=row[2];bucket.renderMs+=row[3];
  if(row[1]>frames[bucket.worstFrameIndex][1])bucket.worstFrameIndex=index;
  if(row[1]>1000/30)bucket.over33ms++;if(row[1]>50)bucket.over50ms++;if(row[1]>100)bucket.over100ms++;
 }
 const round=(value:number)=>Math.round(value*1000)/1000;
 return [...buckets].map(([second,bucket])=>{
  const times=bucket.frames.sort((a,b)=>a-b),n=times.length;
  return {fromMs:second*1000,toMs:(second+1)*1000,frames:n,firstFrameIndex:bucket.firstFrameIndex,lastFrameIndex:bucket.lastFrameIndex,worstFrameIndex:bucket.worstFrameIndex,
   callbackFps:round(bucket.intervalMs?n*1000/bucket.intervalMs:0),meanFrameMs:round(bucket.intervalMs/n),p95FrameMs:times[Math.max(0,Math.ceil(n*.95)-1)],worstFrameMs:times[n-1],meanUpdateCpuMs:round(bucket.updateMs/n),meanRenderCpuMs:round(bucket.renderMs/n),over33ms:bucket.over33ms,over50ms:bucket.over50ms,over100ms:bucket.over100ms};
 });
}
