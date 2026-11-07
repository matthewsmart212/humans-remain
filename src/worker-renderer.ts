import {drawRepairHammer} from './repair-hammer';
import {ENGINEER_ART,engineerCycle} from './engineer-sprites';
import {isPickaxe} from './pickaxes';
import {drawPickaxe} from './mining-renderer';
import {heldProvision} from './food-provisions';
import {provisionImageKey} from './food-provisions-art';
import {isAxe,isSword} from './player-gear';
import {drawRunnerBow,bowCarryPose,drawBowCarry} from './bow-art';
import {axeAttachment,drawAxe,drawAxeGrip} from './axe-renderer';
import {timeOf,type World} from './survival-engine';
import {workerAnimation} from './worker-animation';
import {SURVIVOR_ART} from './survivor-art';
import {runnerCycle,runnerFacing} from './runner-cycles';
import {runnerLegView,drawRunnerLegs,drawRunnerTorso} from './runner-leg-motion';
import type {Atlas} from './packaging-renderer';
import {drawMovingSwordThrust} from './runner-thrust-renderer';
import {drawRunnerAxeAttack} from './runner-axe-renderer';
import {torchPose,drawTorch} from './torch';
import {knifePose,drawKnife,drawKnifeGrip} from './knives';
import {swordPose,drawSword} from './swords';
import {spearPose,drawSpear} from './spears';
import {drawWeaponGrip} from './weapon-grip';
import {heldMeal} from './food-items';

/** Character rendering shared by gameplay, world editor and art yard. */
export function drawWorker(ctx:CanvasRenderingContext2D,imgs:Record<string,HTMLImageElement>,w:World,_atlas?:Atlas,held?:{x:number;y:number;tilt?:number}){
 const p=w.player,t=timeOf(w),animation=held?{direction:p.direction,pose:'idle' as const}:workerAnimation(w);
 const engineer=w.survivorRole==='engineer';
 const facing=engineer?{view:animation.direction,mirror:false}:runnerFacing(animation.direction);
 const art=engineer?ENGINEER_ART[animation.direction]:SURVIVOR_ART[facing.view];
 const swordMoving=isSword(p.equipped)&&!!w.swordThrust&&p.moving;
 const moving=(animation.pose==='walk'||animation.pose==='run'||swordMoving||isPickaxe(p.equipped)&&!!w.axeSwing&&p.moving)&&!p.downedUntil;
 const running=!w.swordThrust&&(p.runBlend??0)>.45;
 const cycle=moving?(engineer?engineerCycle(animation.direction,p.walkDistance,running):runnerCycle(animation.direction,p.walkDistance,running)):undefined;
 const f=animation.pose==='punch'?art.punch:cycle?.sprite??art.idle;
 const image=imgs[f.sheet];if(!image)return;
 const [sx,sy,sw,sh]=f.crop,k=f.scale;
 ctx.save();ctx.translate(held?.x??p.x,held?.y??p.y-(w.bruteGrab?.lift??0));
 if(held){if(held.tilt)ctx.rotate(held.tilt);if(facing.mirror)ctx.scale(-1,1);ctx.drawImage(image,sx,sy,sw,sh,-f.anchor[0]*k,-f.anchor[1]*k,sw*k,sh*k);ctx.restore();return}
 if(p.hurtUntil>t&&!w.weather?.reducedMotion&&Math.floor(t*18)%2===0)ctx.globalAlpha=.5;
 if(p.downedUntil)ctx.scale(1,87/142);
 if(!engineer&&drawRunnerBow(ctx,imgs,w)){ctx.restore();return}
 if(!engineer&&!isPickaxe(p.equipped)&&drawRunnerAxeAttack(ctx,imgs,w)){ctx.restore();return}
 if(facing.mirror)ctx.scale(-1,1);
 if(cycle)ctx.translate(0,cycle.bob*(p.walkBlend??1));
 const hammer=p.equipped==='repairHammer',pickaxe=isPickaxe(p.equipped),axeImage=imgs[hammer?'repairHammer':pickaxe?p.equipped as string:p.equipped==='woodenAxe'?'woodenAxe':'campAxe'];
 const axe=(isAxe(p.equipped)||pickaxe||hammer)&&!p.downedUntil&&axeImage?axeAttachment(w,cycle?animation.direction:facing.view,animation.pose,cycle):undefined;
 if(hammer&&axe&&w.buildingRepair?.held&&!w.weather?.reducedMotion)axe.angle+=Math.sin((t-w.buildingRepair.started)/.65*Math.PI*2)*.9;
 const provision=heldProvision(w),food=heldMeal(w),mealImage=provision?imgs[provisionImageKey(provision)]:imgs[food==='venison'?'venisonCooked':food==='rabbit'?'rabbitCooked':'bonfireCooked'];
 const meal=(food||provision)&&!p.downedUntil&&mealImage?axeAttachment(w,cycle?animation.direction:facing.view,animation.pose,cycle):undefined;
 const drawMeal=()=>{if(meal)ctx.drawImage(mealImage,meal.hand[0]-12,meal.hand[1]-17,24,20)};
 const knife=knifePose(w),knifeImage=knife?imgs[knife.item]:undefined;
 if(knife?.behind&&knifeImage)drawKnife(ctx,knifeImage,knife);
 const sword=swordPose(w),swordImage=sword?imgs[sword.item]:undefined;
 if(sword?.behind&&swordImage)drawSword(ctx,swordImage,sword);
 const spear=spearPose(w),spearImage=spear?imgs[spear.item]:undefined;
 if(spear&&spearImage)drawSpear(ctx,spearImage,spear,spear.behind?'whole':'tail');
 const torch=imgs.torch?torchPose(w):undefined;
 const bow=imgs.bowCarry?bowCarryPose(w):undefined;
 if(bow?.behind)drawBowCarry(ctx,imgs.bowCarry,bow);
 if(torch?.behind)drawTorch(ctx,imgs.torch,torch,w.torchOn);
 if(axe?.behind)(hammer?drawRepairHammer:pickaxe?drawPickaxe:drawAxe)(ctx,axeImage,axe);
 if(meal?.behind)drawMeal();
 const legView=cycle&&runnerLegView(animation.direction,running);
 if(!engineer&&sword?.active&&cycle&&animation.pose==='punch')drawMovingSwordThrust(ctx,imgs,f,animation.direction,cycle,p.walkDistance);
 else if(!engineer&&legView&&imgs.runnerLegLayers){
  drawRunnerLegs(ctx,imgs.runnerLegLayers,legView,p.walkDistance,running);
  drawRunnerTorso(ctx,image,f,legView,running,cycle!.frame);
 }else ctx.drawImage(image,sx,sy,sw,sh,-f.anchor[0]*k,-f.anchor[1]*k,sw*k,sh*k);
 if(torch&&!torch.behind){drawTorch(ctx,imgs.torch,torch,w.torchOn);drawAxeGrip(ctx,image,f,torch.hand)}
 if(bow&&!bow.behind){drawBowCarry(ctx,imgs.bowCarry,bow);drawWeaponGrip(ctx,image,f,bow)}
 if(knife&&!knife.behind&&knifeImage){drawKnife(ctx,knifeImage,knife);drawKnifeGrip(ctx,image,f,knife)}
 if(sword&&!sword.behind&&swordImage){drawSword(ctx,swordImage,sword);drawWeaponGrip(ctx,image,f,sword)}
 if(spear&&!spear.behind&&spearImage){drawSpear(ctx,spearImage,spear,'tip');drawWeaponGrip(ctx,image,f,spear)}
 if(axe&&!axe.behind){(hammer?drawRepairHammer:pickaxe?drawPickaxe:drawAxe)(ctx,axeImage,axe);drawAxeGrip(ctx,image,f,axe.hand)}
 if(meal&&!meal.behind){drawMeal();drawAxeGrip(ctx,image,f,meal.hand)}
 ctx.restore();
}
