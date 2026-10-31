import atlas from '../public/survival/scrap-runner/bow-v1/atlas.json';
import {bowFrame} from './bow-combat';
import {hasGear} from './player-gear';
import {timeOf,type World} from './survival-engine';
import {weaponGrip,type WeaponView} from './weapon-grip';
import {runnerFacing} from './runner-cycles';
import {drawBowLayers} from './bow-composition';

export const BOW_IMAGES:Record<string,string>={
 ...Object.fromEntries(Object.entries(atlas.views).map(([direction,url])=>['runnerBow-'+direction,url])),
 bowCarry:'/survival/scrap-runner/bow-v1/bow-carry.webp',bowArrow:'/survival/scrap-runner/bow-v1/arrow.webp'
};
export function drawRunnerBow(ctx:CanvasRenderingContext2D,images:Record<string,HTMLImageElement>,world:World){
 const p=world.player,shot=world.bowShot;
 if(p.equipped!=='bow'||p.downedUntil||p.hp<=0||world.phase==='over'||!hasGear(world,'bow')||(!shot&&p.moving))return false;
 const facing=runnerFacing(shot?.direction??p.direction),view=facing.view as WeaponView,image=images['runnerBow-'+view];if(!image)return false;
 ctx.save();if(facing.mirror)ctx.scale(-1,1);
 const age=shot?timeOf(world)-shot.started:0;
 const drawn=drawBowLayers(ctx,images,view,shot?bowFrame(age):0,image,!!shot&&!shot.released,age);
 ctx.restore();return drawn;
}

const CARRY:Record<WeaponView,number>={down:-.9,'down-right':-.45,right:.25,'up-right':.3,up:.2};
export function bowCarryPose(world:World){
 if(world.player.equipped!=='bow'||world.player.downedUntil||!hasGear(world,'bow'))return;
 const grip=weaponGrip(world);return {...grip,angle:CARRY[grip.view]};
}
export function drawBowCarry(ctx:CanvasRenderingContext2D,image:HTMLImageElement,pose:NonNullable<ReturnType<typeof bowCarryPose>>){
 ctx.save();ctx.translate(...pose.hand);ctx.rotate(pose.angle);
 // The leather grip, not the sprite edge, stays in the existing walking palm.
 ctx.drawImage(image,-12,-48,24,92);ctx.restore();
}
export function bowArrowDrawables(ctx:CanvasRenderingContext2D,images:Record<string,HTMLImageElement>,world:World){
 const image=images.bowArrow;if(!image||world.phase==='over')return [];
 return (world.bowArrows??[]).map(arrow=>({y:arrow.y,draw:()=>{
  ctx.save();ctx.translate(arrow.x,arrow.y-48);ctx.rotate(arrow.angle+Math.PI);
  ctx.drawImage(image,-39,-4.5,78,9);ctx.restore();
 }}));
}
