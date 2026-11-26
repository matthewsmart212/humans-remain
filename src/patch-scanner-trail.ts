import {EAST_TERRAIN_SCALE} from './east-approach';
import {patchRescueSite,patchRouteSite} from './patch-placement';
import {RIVER_BRIDGES} from './river-collision';
import type {Vec} from './survival-engine';
import type {WorldLayout} from './world-layout';

export type PatchTrackKind='right-tread'|'left-skid'|'crawler'|'rope';
export const PATCH_TRACK_WIDTH={ 'right-tread':59,'left-skid':68,crawler:98,rope:89 } as const;
export type PatchTrack=Vec&{kind:PatchTrackKind;angle:number};
export type PatchTrailStage='footprints'|'haulage';
type SurveyPoint=readonly [number,number];

// Ground surveyed on the published Stillwater map. The western trail stays on
// the bank. The other approaches the mast via the lower and waterworks bridges.
export const PATCH_TRAIL_FORK:Vec={x:-3590,y:7245};
const bank:readonly SurveyPoint[]=[[-3640,6810],[-3860,6310],[-4100,5800],[-4140,5510],[-3550,5050]];
const crossings:readonly SurveyPoint[]=[[-3480,7230],[-3415,7267],[-2544,7840],[-2380,7630],[-1350,7515],[-1360,6440],[-1510,6250],[-1841,6121],[-2000,5570],[-2260,4920],[-2350,4889],[-3300,4889]];
const loggingRoad:readonly SurveyPoint[]=[[-3776,4726],[-3770,4650],[-4590,4380],[-5400,3480],[-5620,3180],[-5360,2320],[-5250,2030],[-5700,1320],[-5980,600],[-5990,-200],[-5900,-850],[-5570,-1530],[-5200,-2010],[-4815,-2410]];
const point=([x,y]:SurveyPoint):Vec=>({x,y});
const bridges=RIVER_BRIDGES.map(({from,to,width})=>({
 x:(from[0]-600)*EAST_TERRAIN_SCALE,y:(from[1]-600)*EAST_TERRAIN_SCALE,
 dx:(to[0]-from[0])*EAST_TERRAIN_SCALE,dy:(to[1]-from[1])*EAST_TERRAIN_SCALE,
 width:width*EAST_TERRAIN_SCALE,
}));

/** Bare boards take no imprint. An extra muddy stride at the bank hides the
 * painted-to-world seam and leaves a readable end to the line of tracks. */
export function onPatchBridge(p:Vec,margin=10){
 return bridges.some(b=>{
  const t=Math.max(0,Math.min(1,((p.x-b.x)*b.dx+(p.y-b.y)*b.dy)/(b.dx*b.dx+b.dy*b.dy)));
  return Math.hypot(p.x-b.x-t*b.dx,p.y-b.y-t*b.dy)<=b.width/2+margin;
 });
}

function layTracks(points:readonly Vec[],stage:PatchTrailStage){
 const tracks:PatchTrack[]=[];
 const spacing=stage==='footprints'?61:73;
 let next=18,index=0,travelled=0;
 for(let i=1;i<points.length;i++){
  const a=points[i-1],b=points[i],length=Math.hypot(b.x-a.x,b.y-a.y);
  if(!length)continue;
  const dx=(b.x-a.x)/length,dy=(b.y-a.y)/length,angle=Math.atan2(dy,dx);
  for(;next<travelled+length;next+=spacing,index++){
   const stageDistance=next-travelled;
   // The evacuee's sled left runners at the post; cleats join its drag on
   // the logging road. P-04's left toe skidded beside his weight-bearing tread.
   const kind:PatchTrackKind=stage==='footprints'?(index%2?'left-skid':'right-tread'):
    next<1500||index%3===0?'rope':'crawler';
   const side=(index%2?1:-1)*(stage==='footprints'?9:14);
   const mark={kind,x:a.x+stageDistance*dx-side*dy,y:a.y+stageDistance*dy+side*dx,angle};
   if(!onPatchBridge(mark,PATCH_TRACK_WIDTH[kind]*.6))tracks.push(mark);
  }
  travelled+=length;
 }
 return tracks;
}

type Survey={shelter:Vec;post:Vec;hauler:Vec;footprints:PatchTrack[];haulage:PatchTrack[]};
const surveys=new WeakMap<WorldLayout,Survey>();
const same=(a:Vec,b:Vec)=>a.x===b.x&&a.y===b.y;

export function patchScannerTrail(layout:WorldLayout,stage:PatchTrailStage):readonly PatchTrack[]{
 const site=patchRescueSite(layout),ledger=patchRouteSite(layout,'dispatch'),machine=patchRouteSite(layout,'hauler');
 if(!site||!ledger||stage==='haulage'&&!machine)return [];
 const shelter=site.approach,post=ledger.approach,hauler=machine?.approach??post;
 let survey=surveys.get(layout);
 if(!survey||!same(shelter,survey.shelter)||!same(post,survey.post)||!same(hauler,survey.hauler)){
  const junction=PATCH_TRAIL_FORK;
  // His last two strikes are under the awning. The player can sample the
  // damaged foot while still facing the seated unit, then turn toward the trail.
  const bootAngle=Math.atan2(site.robot.y-shelter.y,site.robot.x-shelter.x);
  const atCot:PatchTrack[]=[
   {x:site.robot.x-15,y:site.robot.y+12,angle:bootAngle,kind:'right-tread'},
   {x:site.robot.x+18,y:site.robot.y+15,angle:bootAngle,kind:'left-skid'},
  ];
  survey={shelter,post,hauler,footprints:[...atCot,...layTracks([shelter,junction,...bank.map(point),post],'footprints'),
   ...layTracks([junction,...crossings.map(point),post],'footprints')],
   haulage:layTracks([post,...loggingRoad.map(point),hauler],'haulage')};
  surveys.set(layout,survey);
 }
 return survey[stage];
}
