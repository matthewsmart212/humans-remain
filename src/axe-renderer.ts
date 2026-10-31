import {timeOf,type World,type Direction} from './survival-engine';
import type {RunnerSprite} from './runner-cycles';
import {axeProfile} from './axe-combat';

export const AXE_IMAGE_SOURCES={woodenAxe:'/survival/equipment/wooden-axe-v1.webp',campAxe:'/survival/equipment/camp-axe-v1.png'};
type Point=readonly [number,number];
// Measured in the original sprite's rendered space (feet = 0,0). These follow
// the held body frames, including the independent-leg gait variants.
const CARRY:Record<string,{walk:Point[];run:Point[]}>= {
 down:{walk:[[-28,-39],[-25,-41],[-22,-38],[-27,-40]],run:[[-25,-48],[-25,-50],[-25,-45],[-18,-45]]},
 'down-right':{walk:[[-31,-37],[-27,-35],[-22,-45],[-18,-40]],run:[[-30,-53],[-32,-53],[-17,-39],[-30,-54]]},
 right:{walk:[[-14,-27],[-10,-26],[16,-39],[3,-33]],run:[[6,-45],[2,-45],[-15,-36],[-5,-41]]},
 'up-right':{walk:[[23,-32],[18,-30],[26,-39],[24,-40]],run:[[16,-42],[19,-42],[18,-43],[27,-44]]},
 up:{walk:[[23,-47],[25,-38],[25,-47],[23,-38]],run:[[27,-55],[24,-51],[27,-39],[24,-49]]}
};
const IDLE:Record<Direction,Point>={down:[-28,-34],'down-right':[-26,-29],right:[-3,-28],'up-right':[25,-29],up:[27,-36],'up-left':[-24,-29],left:[14,-29],'down-left':[23,-29]};
const STRIKE:Record<Direction,Point>={down:[-17,-44],'down-right':[7,-42],right:[34,-48],'up-right':[38,-63],up:[23,-103],'up-left':[-38,-86],left:[-39,-47],'down-left':[-36,-46]};
const CARRY_ANGLE:Record<Direction,number>={down:-.6,'down-right':-.65,right:1.05,'up-right':.75,up:.3,'up-left':-.75,left:-1.05,'down-left':.65};
const CONTACT_ANGLE:Record<Direction,number>={down:2.85,'down-right':2.1,right:1.4,'up-right':.6,up:.08,'up-left':-.6,left:-1.4,'down-left':-2.1};
const ease=(n:number)=>{const x=Math.max(0,Math.min(1,n));return x*x*(3-2*x)};
const mix=(a:number,b:number,t:number)=>a+(b-a)*ease(t);
export function axeAttachment(w:World,direction:Direction,pose:string,cycle?:{frame:number;mirror:boolean}){
 const running=(w.player.runBlend??0)>.45;
 const canonical=direction.replace('left','right') as Direction;
 const view=direction==='left'?'right':canonical;
 const hand=cycle?CARRY[view][running?'run':'walk'][cycle.frame]:(pose==='punch'?STRIKE[direction]:IDLE[direction]);
 const localDirection=cycle?.mirror?view:direction;
 const elapsed=w.axeSwing?timeOf(w)-w.axeSwing.started:-1;
 const spec=axeProfile(w.axeSwing),returning=w.axeSwing?.cut===2;
 const contact=CONTACT_ANGLE[localDirection],sign=(localDirection.includes('left')?-1:1)*(returning?-1:1);
 const carry=CARRY_ANGLE[localDirection];
 let angle=carry;
 if(elapsed>=0){
  const wind=contact-sign*2.05;
  const release=spec.contact-.085,follow=spec.contact+.075;
  if(elapsed<release)angle=mix(carry,wind,elapsed/release);
  else if(elapsed<spec.contact)angle=mix(wind,contact,(elapsed-release)/.085);
  else if(elapsed<follow)angle=contact+sign*.18*ease((elapsed-spec.contact)/.075);
  else angle=mix(contact+sign*.18,carry,(elapsed-follow)/(spec.duration-follow));
 }
 return {hand,angle,flip:elapsed>=0?sign:(localDirection==='down'||localDirection==='down-right'?-1:sign),behind:localDirection==='up'||localDirection.startsWith('up-'),elapsed};
}
export function drawAxe(ctx:CanvasRenderingContext2D,image:HTMLImageElement,attachment:ReturnType<typeof axeAttachment>){
 const {hand,angle,flip,elapsed}=attachment;
 const paint=(a:number,alpha=1)=>{ctx.save();ctx.translate(...hand);ctx.rotate(a);ctx.scale(flip,1);ctx.globalAlpha*=alpha;
  // Native 1024 × 1536 art, grip measured at (455,1125). No moving crop.
  const k=.039;ctx.drawImage(image,-455*k,-1125*k,1024*k,1536*k);ctx.restore()};
 if(elapsed>.205&&elapsed<.295){paint(angle-flip*.34,.12);paint(angle-flip*.17,.22)}
 paint(angle);
}
/** Repaint only the centre of the original fist over the haft, so it is held
 * in the hand rather than pasted across the character. */
export function drawAxeGrip(ctx:CanvasRenderingContext2D,image:HTMLImageElement,sprite:RunnerSprite,hand:Point){
 ctx.save();ctx.beginPath();ctx.ellipse(hand[0],hand[1],4.7,5.1,0,0,Math.PI*2);ctx.clip();
 const [sx,sy,sw,sh]=sprite.crop,k=sprite.scale;
 ctx.drawImage(image,sx,sy,sw,sh,-sprite.anchor[0]*k,-sprite.anchor[1]*k,sw*k,sh*k);ctx.restore();
}
