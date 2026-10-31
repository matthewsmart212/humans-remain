import type {Direction,Enemy} from './survival-engine';
import {BOMBER_ATTACK} from './bomber-model';
import atlas from '../public/survival/scrap-bomber-v1/atlas.json';

const imageKey=(image:string)=>'bomber-'+image.split('/').at(-1)!.replace('.webp','');
export const BOMBER_CELL=atlas.cell[0],BOMBER_ANCHOR=atlas.anchor;
export const BOMBER_EXPLOSION=atlas.explosion;
export const BOMBER_IMAGE_SOURCES:Record<string,string>={
 ...Object.fromEntries([...new Set(Object.values(atlas.directions).map(view=>view.image))].map(image=>[imageKey(image),image])),
 [BOMBER_EXPLOSION.key]:BOMBER_EXPLOSION.image,
};
const VIEWS=Object.fromEntries(Object.entries(atlas.directions).map(([direction,view])=>[direction,{key:imageKey(view.image),mirror:view.mirror}])) as Record<Direction,{key:string;mirror:boolean}>;
export const bomberView=(direction:Direction)=>VIEWS[direction];

/** Locomotion is distance-driven; a blocked robot never walks on the spot.
 * Charge uses its committed simulation clock and keeps the same sprite scale. */
export function bomberFrame(e:Enemy,t:number){
 if(e.bomber&&Number.isFinite(e.bomber.armedAt)){
  const progress=Math.max(0,Math.min(.999,(t-e.bomber.armedAt)/BOMBER_ATTACK.fuse));
  return atlas.armingFrames[Math.floor(progress*atlas.armingFrames.length)];
 }
 const m=e.motion,hitAge=m?t-m.hitAt:Infinity;
 if(hitAge>=0&&hitAge<.22){
  // The second NE hurt source turns to the camera. Never show that bad heading.
  return (m?.direction==='up-right'||m?.direction==='up-left'||hitAge<.11)?8:9;
 }
 return e.moving?atlas.walkFrames[Math.floor((e.walkDistance||0)/14)%atlas.walkFrames.length]:atlas.idleFrame;
}

/** Measured glass centres, rather than red-rust colour detection. */
const BEACONS:Record<string,readonly (readonly [number,number])[]>={
 down:[[189.5,114.4],[189.9,113.9],[189.2,113.2],[189.6,114.4],[190.6,145.1],[192.1,124.6],[184,132.8],[185.6,122.6],[200.3,58.4],[191.7,91.9]],
 'down-left':[[182,92],[181,92],[180,91],[182,91],[183,103],[178.8,110.5],[169.9,127.1],[174.4,122.2],[188,64],[181,79]],
 right:[[252,109.9],[250.8,112.2],[255,110.5],[251.6,111.2],[254.6,112.8],[246.1,121.7],[257.2,127.9],[251.1,139.1],[236.7,39.4],[254.1,82.9]],
 'up-right':[[178.3,99.4],[174.5,99.6],[176.8,100.4],[174.5,99.8],[177,120.2],[177.9,120.1],[181.2,115.5],[172.4,131.8],[178.1,50.5],[178.5,70.8]],
 up:[[198.2,86.6],[197.1,84.5],[183.8,85.6],[176.2,88.4],[200.6,102.2],[207.3,112],[178.8,115.4],[179,128.5],[202,51],[200.7,65.1]],
};
const sourceView=(direction:Direction)=>atlas.directions[direction].image.split('/').at(-1)!.replace('.webp','');
/** Source-cell coordinates; the renderer applies the sprite mirror. */
export function bomberBeacon(direction:Direction,frame:number):readonly [number,number]{
 return BEACONS[sourceView(direction)][Math.max(0,Math.min(9,frame))];
}
/** Reuse the existing painted dome where the diagonal source omitted it. */
export const BOMBER_BEACON_PATCH={imageKey:'bomber-down',crop:[173,101,36,34],anchor:[190,114],outline:[[188,102],[195,103],[201,108],[203,119],[208,123],[207,130],[197,134],[181,133],[174,128],[174,123],[178,120],[178,111],[181,105]]} as const;
export const bomberNeedsBeacon=(direction:Direction,frame:number)=>sourceView(direction)==='down-left'&&[0,1,2,3,4,8,9].includes(frame);

/** Visible lens centres in the four planted warning poses; rear views hide eyes. */
const WARNING_EYES:Record<string,number[][][]>={
 'down-left':[[[117.6,206.7,11],[170.6,213.8,13]],[[119.2,204.2,11],[173.5,213.3,13]],[[111.5,219.4,11],[166,229.5,13]],[[121.5,215.8,11],[176.5,225.2,13]]],
 down:[[[159,244.3,12],[216.3,244.4,12]],[[159.5,229,12],[217.1,228.8,12]],[[152.1,238.3,12],[209.2,238.1,12]],[[153.8,226.6,12],[211.7,226.3,12]]],
 right:[[[291.6,202.2,12]],[[294,212.3,12]],[[289.6,222.8,12]],[[291.4,231.1,12]]],
};
export function bomberWarningEyes(direction:Direction,frame:number){
 const source=atlas.directions[direction].image.split('/').at(-1)!.replace('.webp','');
 return WARNING_EYES[source]?.[Math.max(0,Math.min(3,frame-4))]??[];
}

/** Visible normal-colour lenses across idle, walking and impact frames. */
const NORMAL_EYES:Record<string,number[][][]>={
 down:[[[151.6,213.2,12],[208.5,213.8,12]],[[155.2,212.1,12],[212.2,214,12]],[[154.7,212.2,12],[211.4,212.5,12]],[[156.5,213,12],[212.9,213.2,12]],[[148.7,148,12],[208,157.3,12]],[[152.5,192.9,12],[210.9,195.6,12]]],
 'down-left':[[[113.9,192.1,11],[166,200.5,13]],[[113.5,193.1,11],[165.7,199.6,13]],[[112.3,190.6,11],[165.1,199.1,13]],[[114.2,189.6,11],[167.4,197.1,13]],[[124.2,121.1,11],[176.6,142.5,13]],[[116.6,172.9,11],[171.5,185.4,13]]],
 right:[[[291.1,197.7,11]],[[287,200,11]],[[291.2,197.9,11]],[[288.8,197.4,11]],[[302.2,109,11]],[[297.5,171,11]]],
};
export function bomberEyes(direction:Direction,frame:number){
 if(frame>=4&&frame<=7)return bomberWarningEyes(direction,frame);
 if(frame>=10)return[];
 return NORMAL_EYES[sourceView(direction)]?.[frame>=8?frame-4:frame]??[];
}

/** Fixed centre of the four warning silhouettes in source-cell coordinates.
 * Union bounds keep the halo centred without following frame-to-frame bob. */
const WARNING_CENTRES:Record<string,readonly [number,number]>={
 down:[196.5,187.5],'down-left':[195,189],right:[196,194],
 'up-right':[192,194.5],up:[186.5,198],
};
export function bomberWarningAnchor(direction:Direction){
 const source=atlas.directions[direction].image.split('/').at(-1)!.replace('.webp','');
 return WARNING_CENTRES[source];
}
