import type {MenuInsets,MenuRect} from './station-menu-layout';

const clamp=(n:number,min:number,max:number)=>Math.max(min,Math.min(n,max));
const right=(r:MenuRect)=>r.x+r.width;
const bottom=(r:MenuRect)=>r.y+r.height;
const overlap=(a:MenuRect,b:MenuRect)=>
 Math.max(0,Math.min(right(a),right(b))-Math.max(a.x,b.x))*
 Math.max(0,Math.min(bottom(a),bottom(b))-Math.max(a.y,b.y));

/** All dimensions are in screen points, independent of world zoom or render resolution. */
export function conversationBubbleMetrics(width:number,height:number,safe:MenuInsets,replyTop:number,fontScale=1){
 const scale=clamp(Math.min(width/844,height/390),.94,1.4);
 const font=Math.round(17*scale*clamp(fontScale,1,1.4));
 const lineHeight=Math.ceil(font*1.26),padX=Math.round(22*scale),padY=Math.round(12*scale);
 const headerHeight=Math.round(font*1.69);
 const usableWidth=Math.max(1,width-safe.left-safe.right-20);
 // A compact landscape screen needs room beside the subjects when there is
 // too little headroom for the measured page (e.g. the 568-point SE).
 const minWidth=width>height?Math.min(272*scale,usableWidth*.40):272*scale;
 const bubbleWidth=Math.min(usableWidth,Math.round(clamp(width*.337,minWidth,456*scale)));
 const stageHeight=Math.max(1,replyTop-safe.top-20);
 const maxLines=clamp(Math.floor((stageHeight*.49-2*padY-headerHeight)/lineHeight),1,4);
 return {width:bubbleWidth,font,lineHeight,padX,padY,headerHeight,maxLines};
}

export type ConversationBubble=MenuRect&{
 edge:'top'|'bottom'|'left'|'right';tailX:number;tailY:number;tipX:number;tipY:number;
};

/** Try the upper shoulders first. Clamping every candidate *before* scoring lets
 * a side placement win when the notch or the top of the screen would hide a face. */
export function placeConversationBubble(width:number,height:number,safe:MenuInsets,replyTop:number,
 patch:MenuRect,survivor:MenuRect,bubbleWidth:number,bubbleHeight:number):ConversationBubble{
 const left=safe.left+9,top=safe.top+8,limitX=width-safe.right-9,limitY=Math.min(replyTop-9,height-safe.bottom-9);
 const w=Math.min(bubbleWidth,Math.max(1,limitX-left)),h=bubbleHeight;
 const x=patch.x+patch.width*.5,y=patch.y+Math.min(patch.height*.08,9);
 const head=Math.min(patch.y,survivor.y);
 const gap=12;
 const candidates=[
  [x+32,patch.y-gap-h], [x-w-12,patch.y-gap-h],
  [x+32,head-gap-h],[x-w-12,head-gap-h],
  [x-w*.5,head-gap-h],
  [right(patch)+gap,y-h*.78],[patch.x-gap-w,y-h*.78],
  [Math.max(right(patch),right(survivor))+gap,y-h*.78],[Math.min(patch.x,survivor.x)-gap-w,y-h*.78],
  [limitX-w,top],[left,top],
  [x+10,Math.max(bottom(survivor),bottom(patch))+gap],
  [x-10-w,Math.max(bottom(survivor),bottom(patch))+gap],
 ];
 let best:MenuRect={x:left,y:top,width:w,height:h},bestScore=Infinity;
 for(const [i,[cx,cy]] of candidates.entries()){
  const rect={x:Math.round(clamp(cx,left,limitX-w)),y:Math.round(clamp(cy,top,limitY-h)),width:w,height:h};
  const dist=Math.hypot(x-clamp(x,rect.x,right(rect)),y-clamp(y,rect.y,bottom(rect)));
  const clipped=Math.hypot(rect.x-cx,rect.y-cy);
  // Favor the upper right while it is clear. A few extra points of tail
  // distance here keep the rescue shelter visible over his left shoulder.
  const aboveRight=bottom(rect)<=patch.y&&rect.x>=x-20;
  const preference=aboveRight?Math.min(55,width*.065):0;
  const cost=4*(overlap(rect,patch)+overlap(rect,survivor))+dist+.3*clipped+i*3-preference;
  if(cost<bestScore){best=rect;bestScore=cost}
 }
 const targetX=x-best.x,targetY=y-best.y;
 const edge=targetY>=h?'bottom':targetY<=0?'top':targetX>=w?'right':'left';
 const horizontal=edge==='top'||edge==='bottom';
 const tailX=horizontal?clamp(targetX,17,w-17):edge==='left'?0:w;
 let tailY=horizontal?(edge==='top'?0:h):clamp(targetY,15,h-15);
 if(!horizontal){
  // If the only open side is beyond the survivor, point across their head.
  // A horizontal tail in this pose would point directly into their face.
  const baseX=best.x+tailX,toRight=baseX>x;
  const between=survivor.x<Math.max(x,baseX)&&right(survivor)>Math.min(x,baseX);
  if(between&&Math.abs(baseX-x)>1&&y>=survivor.y-5&&y<=bottom(survivor)){
   const nearEdge=toRight?survivor.x:right(survivor);
   const fraction=clamp((nearEdge-x)/(baseX-x),.05,1);
   const aboveSurvivor=y+(survivor.y-5-y)/fraction;
   tailY=clamp(Math.min(tailY,aboveSurvivor-best.y),15,h-15);
  }
 }
 const dx=targetX-tailX,dy=targetY-tailY;
 const reach=Math.min(.92,34/Math.max(1,Math.hypot(dx,dy)));
 return {...best,edge,tailX,tailY,tipX:tailX+dx*reach,tipY:tailY+dy*reach};
}

/** Fit the tail over the painted lip. Coordinates follow the slightly bowed
 * edges of the text-free 434 × 151 enamel artwork, including its lower-left seam. */
export function conversationBubbleTail(b:ConversationBubble){
 const {edge,width:w,height:h,tailX:x,tailY:y,tipX:tx,tipY:ty}=b;
 // On the preferred upper shoulder the left rail flows straight into the
 // pointer, just like the painted plate. Cover the short corner seam.
 if(edge==='bottom'&&tx<3){
  const joinX=w*.004,joinY=h*.80,footX=Math.min(17,w*.065),footY=h*.94;
  const outline=`M ${joinX} ${joinY} L ${tx} ${ty} L ${footX} ${footY}`;
  const fill=outline+` l 1 -2.5 L ${joinX+2} ${joinY-1} Z`;
  return {outline,fill};
 }
 const horizontal=edge==='bottom'||edge==='top';
 const inset=edge==='top'||edge==='left'?1:-1;
 const lip=(offset:number)=>{
  if(horizontal){
   const u=(x+offset)/w;
   const v=edge==='bottom' ? .936+.058*u : .015+.021*Math.pow(Math.sin(u*Math.PI),4);
   return {x:x+offset,y:h*v};
  }
  const v=(y+offset)/h;
  return {x:w*(edge==='left' ? .015*(1-v) : 1-.014*v),y:y+offset};
 };
 const a=lip(-7),c=lip(7);
 const outline=`M ${a.x} ${a.y} L ${tx} ${ty} L ${c.x} ${c.y}`;
 const sealX=horizontal?0:2.4*inset,sealY=horizontal?2.4*inset:0;
 const fill=outline+` l ${sealX} ${sealY} L ${a.x+sealX} ${a.y+sealY} Z`;
 return {outline,fill};
}
