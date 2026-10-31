import sections from './waterfall-sections.json';
import extensionSections from './river-extension-waterfalls.json';
import balance from './river-flow-balance.json';
import {RIVER_BATCHES} from './river-layout';
import {WATERFALL_PILOT} from './waterfall-pilot';

export type WaterfallSampling={
 nativeSize:readonly number[];
 // Normalized source rectangle in an already loaded river tile (or reference).
 region:readonly number[];
 direction:readonly number[];
};
type FallDefinition=typeof sections[number]&{masterWidth?:number;masterHeight?:number;maskPath?:string};
export const WATERFALL_SECTIONS=([...sections,...extensionSections] as FallDefinition[]).filter(p=>Object.hasOwn(balance.areas,p.id)).map(p=>{
 const source=RIVER_BATCHES[p.batch].source,[left,top,width,height]=p.crop;
 const masterWidth=p.masterWidth??(p.batch?1254:1070),masterHeight=p.masterHeight??(p.batch?1254:1470);
 return {
  id:p.id,batch:p.batch,name:p.name,tile:p.tile,maskKey:'riverWaterfallMask_'+p.id,
  artworkKey:p.reference?'riverWaterfallPoolEntryArtwork':p.tile,
  phase:p.phase,
  maskPath:`/survival/river-calm-v2/${p.id}-mask.png`,
  x:source.x+left/masterWidth*source.width,y:source.y+top/masterHeight*source.height,
  width:width/masterWidth*source.width,height:height/masterHeight*source.height,
  sampling:{nativeSize:[width,height],region:p.reference?[0,0,1,1]:[left/masterWidth,(top-p.tileTop)/p.tileHeight,width/masterWidth,height/p.tileHeight],direction:p.direction} satisfies WaterfallSampling,
 };
});
// All masks and the shared frame atlas load after editor entry. Source artwork
// comes from the existing camera-driven river stream, including its previews.
export const WATERFALL_SECTION_IMAGES:Record<string,string>={
 ...Object.fromEntries(WATERFALL_SECTIONS.map(p=>[p.maskKey,p.maskPath])),
};
export const WATERFALL_LOCATIONS=[{...WATERFALL_PILOT,name:'Upper waterfall'},...WATERFALL_SECTIONS];
