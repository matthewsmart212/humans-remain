import type {MenuRect} from './station-menu-layout';

type Anchor={x:number;head:number;feet:number;halfWidth:number};
type Card=MenuRect&{lines:string[]};
const clamp=(value:number,min:number,max:number)=>Math.max(min,Math.min(value,max));
const bottom=(r:MenuRect)=>r.y+r.height;
const right=(r:MenuRect)=>r.x+r.width;
const overlap=(a:MenuRect,b:MenuRect)=>Math.max(0,Math.min(right(a),right(b))-Math.max(a.x,b.x))*Math.max(0,Math.min(bottom(a),bottom(b))-Math.max(a.y,b.y));

function wrapSpeech(text:string,maxWidth:number,measure:(text:string)=>number){
 const lines:string[]=[];let line='';
 for(const word of text.trim().split(/\s+/)){
  const next=line?line+' '+word:word;
  if(line&&(measure(next)>maxWidth||next.length>22)){
   lines.push(line);line=word;
  }else line=next;
 }
 if(line)lines.push(line);
 return lines;
}

// Commands and survival barks are short and tied to the moving actor; the
// longer meeting dialogue uses the cinematic subtitle layer.
function patchBubbleLayout(text:string,actor:Anchor,width:number,height:number,measure:(text:string)=>number){
 const bounds={x:8,y:8,width:Math.max(100,width-16),height:Math.max(36,height-16)};
 const lines=wrapSpeech(text,Math.min(bounds.width,244)-22,measure);
 const body={x:actor.x-actor.halfWidth,y:actor.head,width:2*actor.halfWidth,height:Math.max(1,actor.feet-actor.head)};
 const faceY=actor.head+body.height*.34;
 const w=Math.min(bounds.width,Math.max(84,Math.ceil(Math.max(...lines.map(measure)))+22));
 const h=lines.length*19+16;
 let best:Card|undefined,cost=Infinity;
 for(const [idealX,idealY,rank] of [
  [actor.x-w/2,actor.head-9-h,0],[right(body)+11,faceY-h*.5,6],
  [body.x-11-w,faceY-h*.5,6],[actor.x-w/2,actor.feet+10,14],
 ]){
  const card={x:clamp(idealX,bounds.x,right(bounds)-w),y:clamp(idealY,bounds.y,bottom(bounds)-h),width:w,height:h,lines};
  const score=rank+Math.hypot(card.x-idealX,card.y-idealY)+overlap(card,body)*.25;
  if(score<cost){cost=score;best=card}
 }
 return best;
}

/** Canvas and both Skia targets use the same painted card and glyph widths. */
export function drawPatchBubble(ctx:CanvasRenderingContext2D,text:string,actor:Anchor,width:number,height:number){
 ctx.save();
 const font="600 16px 'Barlow Condensed'";
 ctx.font=font;
 const card=patchBubbleLayout(text,actor,width,height,line=>ctx.measureText(line).width);
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
 ctx.fillStyle='#fff3d8';ctx.textAlign='center';
 lines.forEach((line,i)=>ctx.fillText(line,x+card.width/2,y+22+i*19));
 ctx.restore();
}
