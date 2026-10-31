import extensions from './river-extension-layout.json';
import sideFeatures from './river-side-features.json';
export type RiverSource={x:number;y:number;width:number;height:number};
export type RiverBatch={id:string;source:RiverSource;topFade:number;flowPoints?:readonly (readonly [number,number])[];corridor?:{points:readonly (readonly [number,number])[];inner:number;outer:number}};
export const RIVER_HEADWATERS_SOURCE={x:-6256,y:-6200,width:2048,height:2816};
export const RIVER_LOGGING_SOURCE={x:-5376,y:-4096,width:2816,height:2816};
export const RIVER_SOURCE={x:-6256,y:-6200,width:5744,height:20000};
export const RIVER_BATCHES:readonly RiverBatch[]=[
 {id:'river-headwaters-v1',source:RIVER_HEADWATERS_SOURCE,topFade:0,flowPoints:[[-5680,-6196],[-5612,-5876],[-5496,-5556],[-5400,-5236],[-5164,-4916],[-4884,-4596],[-4744,-4276],[-4768,-3956],[-4616,-3636],[-4500,-3476]]},
 {id:'river-logging-v1',source:RIVER_LOGGING_SOURCE,topFade:384,corridor:{points:[[-4660,-4096],[-4660,-3700],[-4500,-3200],[-3300,-2200],[-3150,-1680]],inner:500,outer:640}},
 ...extensions.map(p=>({id:p.id,source:p.source,topFade:p.topFade,corridor:{points:p.points as [number,number][],inner:430,outer:600}})),
];
export const RIVER_SIDE_FEATURES=sideFeatures.map(p=>{
 const s=RIVER_BATCHES[p.batch].source;
 const point=([x,y]:number[])=>[s.x+x/p.nativeSize[0]*s.width,s.y+y/p.nativeSize[1]*s.height] as const;
 return {...p,points:p.points.map(point),focus:point(p.focus),maskKey:'riverSideMask'+p.batch,maskPath:`/survival/river-features-v4/${p.id}-footprint.png`};
});
