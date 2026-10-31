import type {World} from './survival-engine';
import {currentWaypoint} from './waypoint';

/** A ground contact ring and upright pin, using the same camera as the terrain.
 * This path is shared by Canvas2D and the native Skia adapter. */
export function drawWorldWaypoint(ctx:CanvasRenderingContext2D,world:World,view:{x:number;y:number;width:number;height:number;scale:number}){
 const target=currentWaypoint(world);if(!target||target.x<view.x-90/view.scale||target.x>view.x+view.width+90/view.scale||target.y<view.y||target.y>view.y+view.height+90/view.scale)return;
 ctx.save();ctx.translate(target.x,target.y);
 // Perspective ground ring is fixed in world space, not attached to the HUD.
 ctx.beginPath();ctx.ellipse(0,0,29,13,0,0,Math.PI*2);ctx.fillStyle='#143e3c66';ctx.fill();ctx.lineWidth=2/view.scale;ctx.strokeStyle='#edca81cc';ctx.stroke();
 ctx.beginPath();ctx.ellipse(0,0,17,7,0,0,Math.PI*2);ctx.strokeStyle='#f6e8bd99';ctx.lineWidth=1/view.scale;ctx.stroke();
 // Keep the enamel pin legible at every supported game zoom.
 ctx.scale(1/view.scale,1/view.scale);ctx.translate(0,-3);
 ctx.beginPath();ctx.moveTo(0,0);ctx.lineTo(-12,-18);ctx.arc(0,-25,14,Math.PI*5/6,Math.PI*13/6);ctx.lineTo(0,0);ctx.closePath();ctx.fillStyle='#143e3d';ctx.fill();ctx.strokeStyle='#dfbd78';ctx.lineWidth=2;ctx.stroke();
 ctx.beginPath();ctx.arc(0,-25,4,0,Math.PI*2);ctx.fillStyle='#f4e6c7';ctx.fill();
 ctx.restore();
}
