import {getFieldKitTarget} from './field-kit-target';
import type {World} from './survival-engine';
export function drawProgressionMarkers(ctx:CanvasRenderingContext2D,w:World,scale:number){const p=w.progression;if(!p||w.scene)return;ctx.save();
 if(getFieldKitTarget(w)?.revealed&&getFieldKitTarget(w)?.id==='furnace-bellows'&&!p.repairPart&&Math.hypot(w.player.x-p.cache.x,w.player.y-p.cache.y)<1100){const{x,y}=p.cache,k=1/Math.max(.6,scale);ctx.strokeStyle='#edce8a';ctx.lineWidth=2*k;ctx.beginPath();ctx.moveTo(x,y-110*k);ctx.lineTo(x+9*k,y-101*k);ctx.lineTo(x,y-92*k);ctx.lineTo(x-9*k,y-101*k);ctx.closePath();ctx.stroke();ctx.fillStyle='#173b32';ctx.fillRect(x-65*k,y-83*k,130*k,22*k);ctx.fillStyle='#f5e4b9';ctx.font=`bold ${11*k}px sans-serif`;ctx.textAlign='center';ctx.fillText('SALVAGE CACHE',x,y-68*k)}
 ctx.restore()}
