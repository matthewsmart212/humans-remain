// Ground only. District structures, rivers and road overlays remain separate.
export const WORLD_GROUND_BOUNDS={x:-7200,y:-6200,width:20000,height:20000} as const;
export const WORLD_GROUND_OVERLAP=200;
export const WORLD_GROUND_MATERIAL_SOURCES={worldGroundWarm:'/survival/world-ground-v2/warm.webp',worldGroundBrown:'/survival/world-ground-v2/brown.webp',worldGroundClear:'/survival/world-ground-v3/clear-earth.webp'};
// Packaging overlaps 176 pixels of each original 1254px painting at the wrap.
// Scale the 1078px repeat to keep one-to-one detail with the original painting.
export const WORLD_GROUND_TEXTURE_SPAN=1078/1254;
// Keep the approved warm/brown detail scale and original 1437.5px footprints.
// The new clear-earth material shares that footprint, blended by world position;
// the existing grid, overlaps and saved world coordinates stay unchanged.
const count=16,stride=(WORLD_GROUND_BOUNDS.width-WORLD_GROUND_OVERLAP)/count,size=stride+WORLD_GROUND_OVERLAP;
const key=(row:number,col:number)=>`world-ground:v1:${row}:${col}`;
export const WORLD_GROUND_TILES=Array.from({length:count*count},(_,i)=>{
 const row=Math.floor(i/count),col=i%count,x=WORLD_GROUND_BOUNDS.x+col*stride,y=WORLD_GROUND_BOUNDS.y+row*stride;
 // Vary the starting point of the upright painting so nearby squares do not
 // repeat the same clusters of grass, leaves and exposed soil.
 const seed=Math.imul(i+1,0x45d9f3b),hash=Math.imul(seed^(seed>>>16),0x45d9f3b)>>>0;
 const texturePhase=[(hash&0xffff)/65536,(hash>>>16)/65536] as const;
 return {key:key(row,col),image:WORLD_GROUND_MATERIAL_SOURCES.worldGroundWarm,x,y,width:size,height:size,paintRight:0,paintBottom:0,fadeTop:row?200:100,fadeLeft:col?200:100,fadeRight:col===count-1?100:0,fadeBottom:row===count-1?100:0,northBlendKey:row?key(row-1,col):undefined,westKey:col?key(row,col-1):undefined,texturePhase};
});
