import type {MenuRect,MenuInsets} from './station-menu-layout';

type Anchor={x:number;head:number;feet:number;halfWidth:number};
type DialoguePage={speaker:string;pageIndex:number;pageCount:number};
type Dock=MenuRect&{safe?:MenuInsets};
type Card=MenuRect&{lines:string[]};
const clamp=(value:number,min:number,max:number)=>Math.max(min,Math.min(value,max));
const bottom=(r:MenuRect)=>r.y+r.height;
const right=(r:MenuRect)=>r.x+r.width;
const overlap=(a:MenuRect,b:MenuRect)=>Math.max(0,Math.min(right(a),right(b))-Math.max(a.x,b.x))*Math.max(0,Math.min(bottom(a),bottom(b))-Math.max(a.y,b.y));

function wrapSpeech(text:string,maxWidth:number,measure:(text:string)=>number,brief:boolean){
 const lines:string[]=[];let line='';
 for(const word of text.trim().split(/\s+/)){
  const next=line?line+' '+word:word;
  if(line&&(measure(next)>maxWidth||brief&&next.length>22)){
   lines.push(line);line=word;
  }else line=next;
 }
 if(line)lines.push(line);
 return lines;
}

/** Lay out in logical screen pixels. The tail follows the robot at any zoom.
 * Search the open space above and beside the actual choices on this device. */
export function patchBubbleLayout(text:string,page:DialoguePage|undefined,actor:Anchor,width:number,height:number,dock:Dock|undefined,measure:(text:string)=>number){
 const safe=dock?.safe;
 const side=page&&!safe&&width>height&&width<=960?38:0;
 const x=8+(safe?.left??side),y=8+(safe?.top??0);
 const bounds={x,y,width:Math.max(1,width-x-8-(safe?.right??side)),height:Math.max(1,height-y-8-(safe?.bottom??0))};
 const regions:MenuRect[]=dock&&overlap(bounds,dock)?[
  {...bounds,height:dock.y-10-y},
  {...bounds,width:dock.x-10-x},
  {...bounds,x:right(dock)+10,width:right(bounds)-right(dock)-10},
 ]:[bounds];
 const body={x:actor.x-actor.halfWidth,y:actor.head,width:2*actor.halfWidth,height:Math.max(1,actor.feet-actor.head)};
 const faceY=actor.head+body.height*.34;
 // The compact vitals HUD occupies the upper left during field dialogue.
 const hud={x:bounds.x,y:bounds.y,width:Math.min(232,width*.35),height:48};
 let best:Card|undefined,cost=Infinity;
 for(const region of regions){
  if(region.width<100||region.height<36)continue;
  const limit=Math.min(region.width,page?306:244),padding=page?14:11;
  const lines=wrapSpeech(text,limit-2*padding,measure,!page);
  const widest=Math.max(...lines.map(measure));
  const w=Math.min(limit,Math.max(page?135:84,Math.ceil(widest)+2*padding));
  const h=lines.length*(page?21:19)+(page?33:16);
  if(h>region.height)continue;
  // Above the lamp, beside either shoulder, then below the planted feet.
  const candidates=[
   [actor.x-w/2,actor.head-9-h,0],
   [right(body)+11,faceY-h*.5,6],
   [body.x-11-w,faceY-h*.5,6],
   [actor.x-w/2,actor.feet+10,14],
  ];
  for(const [idealX,idealY,rank] of candidates){
   const card={x:clamp(idealX,region.x,right(region)-w),y:clamp(idealY,region.y,bottom(region)-h),width:w,height:h,lines};
   const score=rank+Math.hypot(card.x-idealX,card.y-idealY)+overlap(card,body)*.25+(page?overlap(card,hud)*.1:0);
   if(score<cost){cost=score;best=card}
  }
 }
 return best;
}

/** Canvas and both Skia targets use the same painted card and glyph widths. */
export function drawPatchBubble(ctx:CanvasRenderingContext2D,text:string,page:DialoguePage|undefined,actor:Anchor,width:number,height:number,dock?:Dock){
 ctx.save();
 const font=page?"500 17px 'Barlow'":"600 16px 'Barlow Condensed'";
 ctx.font=font;
 const card=patchBubbleLayout(text,page,actor,width,height,dock,line=>ctx.measureText(line).width);
 if(!card){ctx.restore();return}
 const {x,y,lines}=card,r=right(card),b=bottom(card),center=actor.x,face=actor.head+(actor.feet-actor.head)*.34;
 // Clip the tail to its own local edge even with the robot against a notch.
 let edge:'top'|'right'|'bottom'|'left'='bottom';
 if(b<=actor.head+3)edge='bottom';
 else if(y>=actor.feet-3)edge='top';
 else if(x>=center)edge='left';
 else if(r<=center)edge='right';
 else if(face<y+card.height/2)edge='top';
 const tx=clamp(center,x+14,r-14),ty=clamp(face,y+12,b-12);
 const outline=()=>{
  ctx.beginPath();ctx.moveTo(x+6,y);
  if(edge==='top'){ctx.lineTo(tx-6,y);ctx.lineTo(tx,Math.max(2,y-8));ctx.lineTo(tx+6,y)}
  ctx.lineTo(r-6,y);ctx.lineTo(r,y+6);
  if(edge==='right'){ctx.lineTo(r,ty-5);ctx.lineTo(Math.min(width-2,r+8),ty);ctx.lineTo(r,ty+5)}
  ctx.lineTo(r,b-5);ctx.lineTo(r-5,b);
  if(edge==='bottom'){ctx.lineTo(tx+6,b);ctx.lineTo(tx,Math.min(height-2,b+8));ctx.lineTo(tx-6,b)}
  ctx.lineTo(x+5,b);ctx.lineTo(x,b-5);
  if(edge==='left'){ctx.lineTo(x,ty+5);ctx.lineTo(Math.max(2,x-8),ty);ctx.lineTo(x,ty-5)}
  ctx.lineTo(x,y+6);ctx.closePath();
 };
 outline();ctx.fillStyle='#19221df7';ctx.fill();ctx.strokeStyle='#b29b71';ctx.lineWidth=1;ctx.stroke();
 ctx.textBaseline='alphabetic';
 if(page){
  ctx.font="700 12px 'Barlow Condensed'";ctx.fillStyle='#edbf79';ctx.textAlign='left';
  ctx.fillText(page.speaker,x+14,y+17);
  if(page.pageCount>1){
   ctx.textAlign='right';ctx.fillStyle='#c1bca8';
   ctx.fillText((page.pageIndex+1)+' / '+page.pageCount,r-14,y+17);
  }
 }
 ctx.font=font;ctx.fillStyle='#fff3d8';ctx.textAlign=page?'left':'center';
 lines.forEach((line,i)=>ctx.fillText(line,page?x+14:x+card.width/2,y+(page?37:22)+i*(page?21:19)));
 ctx.restore();
}
