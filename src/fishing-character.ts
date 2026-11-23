import type {FishingRenderState} from './fishing-types';
import {drawFishingAirborneTackle,drawFishingLine,drawFishingRod,fishingRodRig} from './fishing-renderer';
import {runnerFacing,type RunnerSprite} from './runner-cycles';
import {SURVIVOR_ART} from './survivor-art';
import {timeOf,type World} from './survival-engine';
import type {WeaponPoint,WeaponView} from './weapon-grip';

type Point=readonly [number,number];
type Polygon=readonly Point[];
type Arm={sprite:RunnerSprite;outline:Polygon;shoulder:Point;hand:Point};
const TAU=Math.PI*2;
// Removal masks include the dark outline of each resting arm; the smaller
// paint masks below contain only the sleeve/palm being moved, not the collar.
const restingArmPixels:Record<WeaponView,readonly Polygon[]>={
 down:[[[0,145],[31,144],[47,156],[52,177],[41,199],[36,219],[0,219]],[[152,144],[177,148],[200,168],[200,216],[156,216],[145,190],[150,178]]],
 'down-right':[[[0,154],[39,153],[57,166],[66,183],[59,199],[53,215],[40,229],[0,229]],[[170,147],[203,147],[210,210],[178,210],[166,193]]],
 right:[[[64,159],[94,159],[116,168],[123,187],[120,207],[112,226],[77,226],[66,208],[63,189]]],
 'up-right':[[[0,143],[29,143],[42,161],[43,181],[33,202],[0,202]],[[130,150],[158,146],[184,167],[199,191],[198,220],[162,228],[145,211],[138,193]]],
 up:[[[0,135],[38,136],[53,157],[45,177],[40,198],[0,198]],[[154,134],[194,134],[200,200],[162,200],[146,176]]],
};
const armPixels:Record<WeaponView,readonly Polygon[]>={
 down:[[[31,148],[42,154],[49,163],[54,178],[50,188],[44,202],[39,213],[28,220],[14,217],[7,211],[6,198],[11,184],[14,170],[22,157]],[[157,150],[172,160],[182,172],[186,185],[185,205],[176,217],[161,218],[153,208],[150,195],[146,179],[147,165]]],
 'down-right':[[[40,156],[53,162],[64,174],[71,188],[65,204],[54,218],[42,228],[27,227],[15,221],[11,209],[14,193],[24,176],[30,165]],[[163,151],[174,151],[185,164],[189,177],[184,192],[175,199],[167,198],[164,189],[168,180],[169,169]]],
 right:[[[82,166],[98,166],[112,173],[116,190],[116,207],[110,222],[101,231],[85,232],[75,225],[71,213],[66,201],[65,185],[70,173]]],
 'up-right':[[[24,149],[32,154],[38,166],[38,180],[30,196],[17,204],[7,198],[4,187],[7,174],[9,160]],[[137,162],[151,165],[162,176],[175,184],[178,196],[187,208],[187,225],[175,232],[157,232],[146,224],[144,212],[135,205],[126,193],[123,180],[126,169]]],
 up:[[[33,143],[45,155],[51,172],[45,183],[44,195],[27,199],[14,191],[9,178],[15,160],[21,150]],[[144,140],[162,146],[176,161],[178,172],[180,181],[174,193],[158,199],[146,194],[141,179],[139,170],[137,155]]],
};
const measured:Record<WeaponView,readonly {shoulder:Point;hand:Point}[]>={
 down:[{shoulder:[-24,-49],hand:[-29,-33]},{shoulder:[24,-49],hand:[28,-34]}],
 'down-right':[{shoulder:[-23,-48],hand:[-26,-31]},{shoulder:[26,-50],hand:[28,-39]}],
 right:[{shoulder:[-6,-49],hand:[-3,-29]}],
 'up-right':[{shoulder:[-28,-49],hand:[-32,-39]},{shoulder:[16,-45],hand:[27,-30]}],
 up:[{shoulder:[-26,-47],hand:[-31,-33]},{shoulder:[22,-47],hand:[27,-31]}],
};
const registered=Object.fromEntries(Object.entries(armPixels).map(([view,polygons])=>{
 const sprite=SURVIVOR_ART[view as WeaponView].idle,k=sprite.scale;
 return [view,polygons.map((poly,i):Arm=>({sprite,outline:poly.map(([x,y])=>[(x-sprite.anchor[0])*k,(y-sprite.anchor[1])*k] as Point),...measured[view as WeaponView][i]}))];
})) as Record<WeaponView,Arm[]>;
const removal=Object.fromEntries(Object.entries(restingArmPixels).map(([view,polygons])=>{
 const sprite=SURVIVOR_ART[view as WeaponView].idle,k=sprite.scale;
 return [view,polygons.map(poly=>poly.map(([x,y])=>[(x-sprite.anchor[0])*k,(y-sprite.anchor[1])*k] as Point))];
})) as unknown as Record<WeaponView,Polygon[]>;
const grips:Record<WeaponView,WeaponPoint>={down:[7,-47],'down-right':[11,-44],right:[18,-48],'up-right':[35,-56],up:[33,-58]};
const outer:Polygon=[[-220,-240],[220,-240],[220,100],[-220,100]];
function path(ctx:CanvasRenderingContext2D,polygon:Polygon,reverse=false){
 for(let j=0;j<polygon.length;j++){const [x,y]=polygon[reverse?polygon.length-j-1:j];j?ctx.lineTo(x,y):ctx.moveTo(x,y)}ctx.closePath();
}
function sprite(ctx:CanvasRenderingContext2D,imgs:Record<string,HTMLImageElement>,f:RunnerSprite){
 const image=imgs[f.sheet];if(!image)return;
 const [sx,sy,sw,sh]=f.crop,k=f.scale;ctx.drawImage(image,sx,sy,sw,sh,-f.anchor[0]*k,-f.anchor[1]*k,sw*k,sh*k);
}
function arm(ctx:CanvasRenderingContext2D,imgs:Record<string,HTMLImageElement>,source:Arm,hand:Point,palm=false){
 const [sx,sy]=source.shoulder,ax=source.hand[0]-sx,ay=source.hand[1]-sy,bx=hand[0]-sx,by=hand[1]-sy;
 const length=Math.hypot(ax,ay),newLength=Math.hypot(bx,by);
 ctx.save();ctx.translate(sx,sy);ctx.rotate(Math.atan2(by,bx));ctx.scale(newLength/length,1);ctx.rotate(-Math.atan2(ay,ax));ctx.translate(-sx,-sy);
 ctx.beginPath();if(palm)ctx.ellipse(source.hand[0],source.hand[1],5.4,5.1,0,0,TAU);else path(ctx,source.outline);
 ctx.clip();sprite(ctx,imgs,source.sprite);ctx.restore();
}
function hiddenHand(ctx:CanvasRenderingContext2D,imgs:Record<string,HTMLImageElement>,hand:Point){
 const source=registered['down-right'][1];
 ctx.save();ctx.translate(hand[0]-source.hand[0],hand[1]-source.hand[1]);ctx.beginPath();ctx.ellipse(source.hand[0],source.hand[1],5.1,4.9,0,0,TAU);ctx.clip();sprite(ctx,imgs,source.sprite);ctx.restore();
}

/** Re-pose only the approved painted arms. The face, hair, coat, boots and
 * scale are the exact idle character. There is no alternate fishing avatar. */
export function drawFishingSurvivor(ctx:CanvasRenderingContext2D,imgs:Record<string,HTMLImageElement>,w:World,state:FishingRenderState){
 if(w.player.downedUntil||w.player.moving||state.phase==='equipped'||state.phase==='caught'||state.phase==='escaped')return false;
 const facing=runnerFacing(state.direction),view=facing.view as WeaponView,base=SURVIVOR_ART[view].idle;
 if(!imgs[base.sheet])return false;
 const now=w.weather?.reducedMotion?0:timeOf(w),breath=w.weather?.reducedMotion?0:Math.sin(now*2.3)*.32;
 const windup=state.phase==='aiming'?state.charge:state.phase==='casting'?Math.max(0,1-state.phaseProgress*2.7):0;
 const landing=state.phase==='landing'?state.phaseProgress:0;
 const g=grips[view],hand:WeaponPoint=[g[0]+(state.phase==='casting'?Math.sin(state.phaseProgress*Math.PI)*3:0),g[1]+breath-windup*6-landing*4];
 const rig=fishingRodRig(w,state,hand,view,facing.mirror),layers=registered[view],near=layers[view==='up'||view==='up-right'?1:0];
 const nearHand:Point=[rig.reel.x-.7,rig.reel.y+2.5];
 ctx.save();if(facing.mirror)ctx.scale(-1,1);
 drawFishingLine(ctx,w,state,rig);
 // The source punch supplies the shirt normally hidden by the side sleeve.
 // This is the same painted torso repair used by the existing bow pose.
 if(view==='right'){
  ctx.save();ctx.beginPath();path(ctx,[[-14,-48],[7,-48],[7,-25],[-14,-25]]);ctx.clip();sprite(ctx,imgs,SURVIVOR_ART.right.punch);ctx.restore();
 }
 // Opposite winding removes only the original sleeves and palms. It works
 // identically in the web canvas and native Skia without an offscreen mask.
 ctx.save();ctx.beginPath();path(ctx,outer);for(const outline of removal[view])path(ctx,outline,true);ctx.clip();sprite(ctx,imgs,base);ctx.restore();
 if(view==='down'||view==='down-right')arm(ctx,imgs,layers[1],hand);
 arm(ctx,imgs,near,nearHand);
 drawFishingRod(ctx,w,state,rig);
 if(view==='down'||view==='down-right')arm(ctx,imgs,layers[1],hand,true);else hiddenHand(ctx,imgs,hand);
 arm(ctx,imgs,near,nearHand,true);
 drawFishingAirborneTackle(ctx,w,state,facing.mirror);
 ctx.restore();return true;
}
