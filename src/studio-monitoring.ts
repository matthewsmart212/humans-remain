import {STEP,type World} from './survival-engine';
import {emptyCombatStats} from './combat-model';

export type RenderStats={fps:number|null;frameMs:number|null;drawMs:number|null};
const unavailable=():RenderStats=>({fps:null,frameMs:null,drawMs:null});

/** Counts completed animation frames using wall time, independent of physics.
 * Draw time measures CPU submission, not GPU execution. Publish twice a second. */
export class RenderFrameMeter{
 private last:number|null=null;
 private elapsed=0;
 private frames=0;
 private drawTotal=0;
 private stats=unavailable();
 reset(){this.last=null;this.elapsed=0;this.frames=0;this.drawTotal=0;this.stats=unavailable()}
 record(now:number,drawMs:number,visible=true){
  if(!visible){this.reset();return}
  const previous=this.last;this.last=now;
  if(previous===null||now<=previous)return;
  this.elapsed+=now-previous;this.frames++;this.drawTotal+=Math.max(0,drawMs);
  if(this.elapsed<500)return;
  this.stats={fps:1000*this.frames/this.elapsed,frameMs:this.elapsed/this.frames,drawMs:this.drawTotal/this.frames};
  this.elapsed=0;this.frames=0;this.drawTotal=0;
 }
 read(now:number):RenderStats{return this.last===null||now-this.last>2000?unavailable():this.stats}
}

type Surface=Pick<HTMLCanvasElement,'clientWidth'|'clientHeight'|'width'|'height'|'dataset'>;
export function readPlayMonitor(world:World,surface:Surface|null,render:RenderStats){
 const p=world.player;
 return {
  ...render,lighting:world.scene?.lighting==='baked'?'Indoor':world.phase==='night'?'Night':'Day',location:world.scene?.name||'Camp',seconds:world.tick*STEP,health:p.hp,stamina:p.stamina,food:world.hunger,water:world.thirst,
  x:Math.round(p.x),y:Math.round(p.y),direction:p.direction,
  action:world.dodge?'Dodging':world.axeSwing?(world.axeSwing.cut===2?'Axe return cut':'Axe cut'):p.sprinting?'Sprinting':p.moving?'Walking':'Standing',
  combat:world.combatStats??emptyCombatStats(),
  equipped:p.equipped==='axe'?'Axe':'None',raw:world.bag.rawMeat,cooked:world.cooked,logs:world.bag.pallets,
  objects:world.layout?.items.length??0,drops:world.loot.length,
  creatures:world.enemies.length+world.animals.length,effects:world.effects.length,enemies:world.enemies.length,kills:world.kills,downed:!!p.downedUntil,
  viewport:surface?`${surface.clientWidth} × ${surface.clientHeight}`:'—',
  buffer:surface?`${surface.width} × ${surface.height}`:'—',
  renderer:surface?.dataset.skiaBackend==='webgl'?'WebGL':surface?.dataset.skiaBackend==='software'?'Software':'Starting',
 };
}
export type PlayMonitorSnapshot=ReturnType<typeof readPlayMonitor>;
