import {bowLockTarget,bowTargetHeight,bowTargetName,setBowTargetView,type BowTargetView} from './bow-lock';
import {timeOf,type World} from './survival-engine';

/** Shared Canvas/Skia field-kit reticle. Geometry remains legible while zooming. */
export function drawBowLock(ctx:CanvasRenderingContext2D,w:World,view:BowTargetView){
 setBowTargetView(w,view);
 const target=bowLockTarget(w);if(!target||!w.bowLock)return;
 const a=target.entity,height=bowTargetHeight(target),s=Math.max(.05,view.scale);
 if(a.x<view.x-80/s||a.x>view.x+view.width+80/s||a.y<view.y||a.y-height>view.y+view.height)return;
 const age=timeOf(w)-w.bowLock.acquiredAt,settle=w.weather?.reducedMotion?0:Math.max(0,1-age/.2);
 const halfWidth=Math.max(19,Math.min(34,height*s*.28))+settle*7,halfHeight=Math.max(20,Math.min(42,height*s*.42))+settle*7;
 ctx.save();ctx.translate(a.x,a.y);
 ctx.beginPath();ctx.ellipse(0,2,Math.max(23,halfWidth/s),Math.max(10,halfWidth*.38/s),0,0,Math.PI*2);
 ctx.fillStyle='#183c3440';ctx.fill();ctx.strokeStyle='#c5d88db8';ctx.lineWidth=1.2/s;ctx.stroke();
 ctx.translate(0,-height*.48);ctx.scale(1/s,1/s);
 ctx.beginPath();
 for(const x of [-1,1])for(const y of [-1,1]){ctx.moveTo(x*(halfWidth-8),y*halfHeight);ctx.lineTo(x*halfWidth,y*halfHeight);ctx.lineTo(x*halfWidth,y*(halfHeight-8))}
 ctx.strokeStyle='#112e2b';ctx.lineWidth=5;ctx.stroke();ctx.strokeStyle='#efd49c';ctx.lineWidth=2;ctx.stroke();
 // Small enamel diamond echoes the HUD's active green indicator.
 ctx.beginPath();ctx.moveTo(0,-halfHeight-10);ctx.lineTo(4,-halfHeight-6);ctx.lineTo(0,-halfHeight-2);ctx.lineTo(-4,-halfHeight-6);ctx.closePath();ctx.fillStyle='#c1e38e';ctx.fill();ctx.strokeStyle='#163a32';ctx.lineWidth=1.5;ctx.stroke();
 ctx.translate(0,height*.48*s+22);
 const label=bowTargetName(target),width=Math.max(70,label.length*5.5+32);
 ctx.beginPath();ctx.moveTo(-width/2+5,-10);ctx.lineTo(width/2-5,-10);ctx.lineTo(width/2,-5);ctx.lineTo(width/2,5);ctx.lineTo(width/2-5,10);ctx.lineTo(-width/2+5,10);ctx.lineTo(-width/2,5);ctx.lineTo(-width/2,-5);ctx.closePath();
 ctx.fillStyle='#123831ee';ctx.fill();ctx.strokeStyle='#9f9665';ctx.lineWidth=1;ctx.stroke();
 ctx.beginPath();ctx.arc(-width/2+10,0,2,0,Math.PI*2);ctx.fillStyle='#bce385';ctx.fill();
 ctx.font="900 10px 'Barlow Condensed'";ctx.textAlign='center';ctx.fillStyle='#f4e6c7';ctx.fillText(label,4,3.5);
 ctx.restore();
}
