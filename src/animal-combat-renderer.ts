import {timeOf,type World} from './survival-engine';

type View={x:number;y:number;width:number;height:number;scale:number};
type HudAnimal=World['animals'][number]&{maxHp?:number;healthFrom?:number;lastHitAt?:number};
type HitEffect=World['effects'][number]&{target?:'animal'|'player';amount?:number;lethal?:boolean};
const clamp=(n:number)=>Math.max(0,Math.min(1,n));
const cssScale=(scale:number)=>Math.max(.05,Math.min(4,scale||1));
const ink='#12352f',rim='#d7bd86',gold='#ffe0a0',coral='#ff9b85',healthRed='#d95f54',healthHighlight='#f4a18d';

function bevel(ctx:CanvasRenderingContext2D,x:number,y:number,width:number,height:number,cut:number){
 ctx.beginPath();ctx.moveTo(x+cut,y);ctx.lineTo(x+width-cut,y);ctx.lineTo(x+width,y+cut);ctx.lineTo(x+width,y+height-cut);ctx.lineTo(x+width-cut,y+height);ctx.lineTo(x+cut,y+height);ctx.lineTo(x,y+height-cut);ctx.lineTo(x,y+cut);ctx.closePath();
}
function diamond(ctx:CanvasRenderingContext2D,x:number,y:number,r:number){
 ctx.beginPath();ctx.moveTo(x,y-r);ctx.lineTo(x+r,y);ctx.lineTo(x,y+r);ctx.lineTo(x-r,y);ctx.closePath();
}

/** Screen-sized field-kit bars for recently hit or retaliating wildlife.
 * No image jobs, persistent animation state, collision queries or UI nodes. */
export function drawAnimalHealth(ctx:CanvasRenderingContext2D,w:World,view:View){
 const t=timeOf(w),s=cssScale(view.scale),reduced=w.weather?.reducedMotion;
 for(const source of w.animals){
  const a=source as HudAnimal;if(a.hp<=0||Math.hypot(a.x-w.player.x,a.y-w.player.y)>900)continue;
  const isDeer=!!a.deer,stag=a.deer?.kind==='stag',age=a.lastHitAt===undefined?Infinity:t-a.lastHitAt,recent=age>=0&&age<3.5,angry=(stag&&!!a.deer?.retaliation)||!!a.predator?.engaged;
  if(!recent&&!angry)continue;
  const head=a.predator?100:stag?142:isDeer?124:a.rabbit?66:65;
  const width=(isDeer||a.predator?40:32)/s,height=6/s,x=a.x-width/2,y=a.y-head-10/s;
  if(x+width<view.x-8/s||x>view.x+view.width+8/s||y+height<view.y-20/s||y>view.y+view.height+20/s)continue;
  const max=a.maxHp&&a.maxHp>0?a.maxHp:stag?96:isDeer?64:a.chicken||a.rabbit?32:48;
  const hp=clamp(a.hp/max);
  const old=clamp((a.healthFrom??a.hp)/max),lag=reduced?hp:hp+Math.max(0,old-hp)*(1-clamp((age-.12)/.48));
  ctx.save();ctx.globalAlpha*=angry?1:clamp((3.5-age)/.5);
  bevel(ctx,x-1/s,y-1/s,width+2/s,height+2/s,2/s);ctx.fillStyle=ink;ctx.fill();ctx.lineWidth=1/s;ctx.strokeStyle=rim;ctx.stroke();
  const inner=width-4/s;
  if(lag>hp){ctx.fillStyle='#ecd29b';ctx.fillRect(x+2/s,y+1/s,inner*lag,height-2/s)}
  ctx.fillStyle=healthRed;ctx.fillRect(x+2/s,y+1/s,inner*hp,height-2/s);
  if(hp>0){ctx.fillStyle=healthHighlight;ctx.fillRect(x+2/s,y+1/s,inner*hp,1/s)}
  diamond(ctx,x-3/s,y+height/2,3.5/s);ctx.fillStyle=ink;ctx.fill();ctx.strokeStyle=angry?gold:rim;ctx.stroke();
  if(recent||angry){
   const wolfTell=a.predator?.kind==='wolf'&&a.predator.state==='warn'?(a.predator.wolf?.attack==='bite'?' · BITE':' · LUNGE'):'';
   const boarTell=a.predator?.kind==='boar'&&a.predator.state==='warn'?(a.predator.boar?.attack==='gore'?' · TUSK':' · CHARGE'):'';
   const name=a.predator?.kind==='boar'?'BOAR'+boarTell:a.predator?.kind==='wolf'?'WOLF'+wolfTell:stag?'STAG':isDeer?'DOE':a.rabbit?'RABBIT':a.chicken?'CHICKEN':'WILDLIFE',label=`${name}  ${Math.ceil(a.hp)}/${max}`;
   ctx.font=`900 ${9/s}px 'Barlow Condensed'`;ctx.textAlign='center';ctx.lineWidth=3/s;ctx.strokeStyle=ink;ctx.fillStyle=angry?gold:'#f4e5c5';ctx.strokeText(label,a.x,y-4/s);ctx.fillText(label,a.x,y-4/s);
  }
  ctx.restore();
 }
}

/** Warm broken-cross strikes for dealt damage; coral claw marks for received
 * damage. Reuses the bounded simulation effect queue and actual applied values. */
export function drawAnimalHitFeedback(ctx:CanvasRenderingContext2D,w:World,scale:number){
 const t=timeOf(w),s=cssScale(scale),reduced=w.weather?.reducedMotion;
 for(let i=Math.max(0,w.effects.length-32);i<w.effects.length;i++){
  const e=w.effects[i] as HitEffect,age=t-e.born;
  if((e.target!=='animal'&&e.target!=='player')||!Number.isFinite(e.amount)||!(e.amount!>0)||age<0||age>.85)continue;
  const incoming=e.target==='player',colour=incoming?coral:e.lethal?'#fff0bd':gold;
  const x=e.x,y=e.y-(incoming?48:38),angle=e.angle??0;
  ctx.save();
  if(age<.3){
   const progress=clamp(age/.3),travel=reduced?0:progress*4/s;ctx.globalAlpha*=1-progress;
   ctx.beginPath();
   if(incoming){
    for(let k=-1;k<=1;k++){const side=k*6/s,c=Math.cos(angle+Math.PI/4),sn=Math.sin(angle+Math.PI/4),cx=x-Math.sin(angle)*side,cy=y+Math.cos(angle)*side;
     ctx.moveTo(cx-c*(6/s+travel),cy-sn*(6/s+travel));ctx.lineTo(cx+c*(7/s+travel),cy+sn*(7/s+travel));
    }
   }else{
    for(let k=0;k<4;k++){const a=angle+Math.PI/4+k*Math.PI/2,c=Math.cos(a),sn=Math.sin(a),inner=4/s+travel,outer=(e.lethal?13:10)/s+travel;
     ctx.moveTo(x+c*inner,y+sn*inner);ctx.lineTo(x+c*outer,y+sn*outer);
    }
   }
   ctx.strokeStyle=ink;ctx.lineWidth=5/s;ctx.stroke();ctx.strokeStyle=colour;ctx.lineWidth=2.3/s;ctx.stroke();
   if(!incoming){diamond(ctx,x,y,(e.lethal?3.5:2.5)/s);ctx.fillStyle=colour;ctx.fill()}
  }
  const fade=clamp((.85-age)/.25),rise=reduced?0:clamp(age/.65)*14/s,offset=reduced?0:((e.id%3)-1)*5/s;
  ctx.globalAlpha=fade;ctx.font=`900 ${(incoming?20:17)/s}px 'Barlow Condensed'`;ctx.textAlign='center';ctx.lineWidth=3.5/s;ctx.strokeStyle=ink;ctx.fillStyle=colour;
  const label=`−${Math.round(e.amount!*10)/10}`,numberX=x+offset,numberY=y-17/s-rise;
  ctx.strokeText(label,numberX,numberY);ctx.fillText(label,numberX,numberY);
  if(e.lethal&&!incoming){ctx.font=`900 ${9/s}px 'Barlow Condensed'`;ctx.lineWidth=2.5/s;ctx.strokeText('DOWN',numberX,numberY+11/s);ctx.fillText('DOWN',numberX,numberY+11/s)}
  ctx.restore();
 }
}
