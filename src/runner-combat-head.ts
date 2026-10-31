import {SURVIVOR_ART} from './survivor-art';
import {RUNNER_AXE_ART,RUNNER_AXE_REGISTRATION,type RunnerAxeView} from './runner-axe-art';

type View='down'|'down-right'|'right';
type Point=readonly [number,number];
type Polygon=readonly Point[];

// The approved idle head, at its ORIGINAL scale/anchor. These crop-local
// outlines end along the chin/hair, not at a rectangular cut through the coat.
// Combat must never substitute a newly drawn/smaller face for this identity.
export const RUNNER_COMBAT_HEADS:Record<View,Polygon>={
 down:[[-2,-2],[202,-2],[202,142],[168,142],[158,147],[145,154],[126,160],[106,163],[88,162],[71,158],[55,152],[44,144],[30,144],[18,139],[-2,139]],
 'down-right':[[-2,-2],[205,-2],[205,139],[164,143],[156,150],[142,156],[127,161],[109,164],[96,163],[78,159],[63,151],[47,152],[39,148],[32,155],[20,155],[-2,145]],
 right:[[-2,-2],[200,-2],[200,148],[155,148],[148,153],[135,157],[120,160],[111,157],[99,158],[89,154],[74,157],[61,164],[47,167],[47,161],[38,159],[33,162],[24,161],[-2,159]]
};

// Measured foreground arms / weapon in each 384px attack cell. They are drawn
// AFTER the stable head so a raised hand or axe can genuinely pass in front.
// Everything else above the collar belongs to the original head, not the
// generated attack head. No texture readback or new sprite downloads at runtime.
export const RUNNER_COMBAT_FOREGROUND:Record<View,readonly Polygon[]>={
 down:[
  [[42,156],[56,112],[91,87],[109,91],[119,110],[114,145],[107,157],[124,167],[149,182],[163,190],[186,197],[199,209],[198,234],[173,244],[145,225],[97,211],[66,184]],
  [[133,187],[151,193],[168,207],[178,221],[208,239],[231,242],[263,235],[332,226],[341,321],[221,277],[174,261],[145,232],[129,208]],
  [[135,190],[155,194],[169,205],[187,218],[207,230],[328,225],[334,310],[211,273],[164,250],[143,232],[131,208]],
  [],
  [[168,220],[184,207],[193,200],[212,196],[227,190],[242,181],[257,169],[268,157],[274,154],[273,133],[281,86],[295,89],[317,117],[325,142],[304,141],[290,135],[294,151],[298,177],[287,190],[277,212],[254,232],[217,246],[176,248]],
  [[200,197],[220,196],[241,212],[233,240],[184,262],[43,313],[28,276],[34,252],[154,243],[177,214]],
  [[181,197],[210,197],[232,211],[226,241],[169,253],[45,285],[35,249],[40,225],[130,232],[153,211]],
  []
 ],
 'down-right':[
  [[47,132],[55,106],[89,81],[107,77],[121,96],[120,117],[111,136],[102,142],[117,155],[135,171],[155,181],[177,190],[190,206],[191,226],[166,233],[135,221],[93,207],[65,183]],
  [[138,184],[160,190],[179,210],[189,221],[215,236],[235,233],[286,240],[325,245],[329,311],[248,299],[216,272],[180,254],[151,231],[131,209]],
  [[134,184],[156,187],[178,204],[197,220],[213,232],[285,223],[328,228],[337,300],[233,276],[187,261],[154,231],[132,212]],
  [],
  [[185,213],[197,194],[217,190],[237,181],[251,166],[263,151],[268,141],[278,138],[279,128],[269,122],[266,103],[260,79],[281,74],[313,99],[318,121],[300,119],[288,114],[284,128],[297,139],[306,163],[303,190],[280,212],[228,238],[198,243],[186,229]],
  [[203,198],[224,194],[242,208],[246,226],[233,245],[195,253],[148,248],[101,250],[49,287],[37,268],[36,222],[61,215],[86,229],[151,227],[174,216]],
  [[208,197],[228,198],[245,213],[244,233],[229,245],[191,248],[150,246],[112,245],[48,288],[26,273],[25,226],[46,219],[80,229],[119,224],[146,211],[170,203]],
  []
 ],
 right:[
  [[78,136],[80,104],[107,67],[126,81],[146,111],[130,115],[117,125],[134,140],[147,144],[157,164],[171,163],[187,170],[199,181],[218,186],[239,193],[248,208],[239,227],[206,234],[161,223],[135,209],[119,184],[116,153]],
  [[166,192],[190,198],[210,208],[227,216],[245,206],[268,210],[289,202],[324,182],[351,205],[356,253],[309,261],[268,245],[232,249],[206,240],[184,236],[160,224],[155,206]],
  [[164,193],[188,194],[211,204],[229,220],[247,216],[260,227],[346,217],[359,288],[315,295],[238,260],[207,245],[177,236],[158,221]],
  [[182,200],[204,205],[216,219],[230,216],[239,203],[251,202],[261,168],[267,155],[315,186],[313,213],[288,240],[264,254],[239,265],[202,263],[180,248],[172,223]],
  [],
  [[190,195],[211,185],[230,174],[246,175],[253,160],[269,149],[275,126],[285,76],[322,67],[354,90],[338,127],[309,133],[299,168],[281,196],[257,220],[228,239],[198,242],[177,222]],
  [[180,220],[184,207],[196,197],[213,190],[225,188],[234,179],[241,180],[245,182],[251,171],[254,160],[257,150],[267,150],[270,130],[283,126],[289,92],[287,66],[302,52],[335,66],[353,79],[332,123],[313,117],[306,147],[294,172],[274,192],[253,217],[220,242],[193,245],[173,228]],
  []
 ]
};

// Register small clip polygons once, not on every animation frame.
function registerHead(view:View){
 const sprite=SURVIVOR_ART[view].idle,k=sprite.scale;
 return {sprite,outline:RUNNER_COMBAT_HEADS[view].map(([x,y]):Point=>[(x-sprite.anchor[0])*k,(y-sprite.anchor[1])*k]),
  foreground:RUNNER_COMBAT_FOREGROUND[view].map((poly,frame)=>{
   const r=RUNNER_AXE_REGISTRATION[view][frame];return poly.map(([x,y]):Point=>[r.x+x*r.scaleX,r.y+y*r.scaleY]);
  })};
}
const HEAD_LAYERS={down:registerHead('down'),'down-right':registerHead('down-right'),right:registerHead('right')};
const OUTER:Polygon=[[-200,-200],[200,-200],[200,100],[-200,100]];
const HEAD_HOLE:Polygon=[[-43,-120],[-43,-54],[43,-54],[43,-120]];

function path(ctx:CanvasRenderingContext2D,points:Polygon){
 points.forEach(([x,y],i)=>i?ctx.lineTo(x,y):ctx.moveTo(x,y));ctx.closePath();
}

/** Keep face size/eyes/chin identical across both cuts. This is runtime layer
 * composition of existing painted pixels, not another redraw or a head warp. */
export function drawRunnerCombatUpper(ctx:CanvasRenderingContext2D,imgs:Record<string,HTMLImageElement>,view:RunnerAxeView,frame:number,key:string){
 const [width,height]=RUNNER_AXE_ART.cell,r=RUNNER_AXE_REGISTRATION[view][frame];
 const drawAttack=()=>ctx.drawImage(imgs[key],frame%4*width,Math.floor(frame/4)*height,width,height,r.x,r.y,width*r.scaleX,height*r.scaleY);
 if(!(view in RUNNER_COMBAT_HEADS)||!imgs.survivorBase){drawAttack();return}
 const layer=HEAD_LAYERS[view as View],head=layer.sprite,k=head.scale;
 // A clockwise outer path and counterclockwise hole: works in Canvas2D and
 // the native Skia adapter without an offscreen buffer or alpha readback.
 ctx.save();ctx.beginPath();path(ctx,OUTER);path(ctx,HEAD_HOLE);ctx.clip();drawAttack();ctx.restore();
 ctx.save();ctx.beginPath();path(ctx,layer.outline);ctx.clip();
 const [sx,sy,sw,sh]=head.crop;
 ctx.drawImage(imgs[head.sheet],sx,sy,sw,sh,-head.anchor[0]*k,-head.anchor[1]*k,sw*k,sh*k);ctx.restore();
 const front=layer.foreground[frame];
 if(front.length){ctx.save();ctx.beginPath();path(ctx,front);ctx.clip();drawAttack();ctx.restore()}
}
