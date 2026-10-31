import {gateLocal,gatePose,gateAmount} from './camp-gates';
import {assetImageKey,type WorldAsset} from './world-assets';
import {placementPoint,placementBounds,type Placement} from './world-layout';
import type {World} from './survival-engine';
/** Project the painted timber onto hinged vertical leaves; posts stay rooted. */
export function gateDrawables(ctx:CanvasRenderingContext2D,imgs:Record<string,HTMLImageElement>,w:World,p:Placement,a:WorldAsset){
 if(a.gate?.states){
  const g=a.gate,b=placementBounds(p),open=gateAmount(w,p.id)>=.5,im=imgs[assetImageKey(open?g.states!.open:g.states!.closed)];if(!im)return [];
  const q=gateLocal(p,a,0);
  // Each state is already painted and registered. No leaf slicing, rotation,
  // deformation or changing silhouette transforms during interaction.
  return [{y:placementPoint(p,(q.a.x+q.b.x)/2,(q.a.y+q.b.y)/2)[1],draw:()=>ctx.drawImage(im,b.x,b.y,b.width,b.height)}];
 }
 const g=a.gate!,q=gateLocal(p,a,gatePose(w,p.id)),leaf=imgs[assetImageKey(g.leaf)],post=imgs[assetImageKey(g.post)];if(!leaf||!post)return [];
 const leafDraw=(A:{x:number;y:number},B:{x:number;y:number})=>{
  const cuts=[0,.195,.39,.585,.785,1],dx=B.x-A.x,dy=B.y-A.y,len=Math.hypot(dx,dy);
  return cuts.slice(0,-1).map((left,i)=>{const right=cuts[i+1],middle=(left+right)/2,x=A.x+dx*middle,y=A.y+dy*middle;
   return {y:placementPoint(p,x,y)[1],draw:()=>{
    // Each round log retains its diameter when the gate turns edge-on. Project
    // five timber columns individually instead of flattening a paper panel.
    const width=dx*(right-left)+(dx<0?-1:1)*Math.abs(dy/len)*32*p.scale;
    const sourceX=left*g.leafSize[0],sourceW=(right-left)*g.leafSize[0];
    ctx.save();ctx.transform(width/sourceW,dy*(right-left)/sourceW,0,q.height/g.leafSize[1],x-width/2,y-q.height-dy*(right-left)/2);
    ctx.drawImage(leaf,sourceX,0,sourceW,g.leafSize[1],0,0,sourceW,g.leafSize[1]);ctx.restore();
   }};
  });
 };
 const anchor=g.postAnchor??[.51,.92];
 const postDraw=(v:{x:number;y:number})=>({y:placementPoint(p,v.x,v.y)[1]+1,draw:()=>ctx.drawImage(post,v.x-q.postWidth*anchor[0],v.y-q.postHeight*anchor[1],q.postWidth,q.postHeight)});
 return [...leafDraw(q.a,q.ae),...leafDraw(q.b,q.be),postDraw(q.a),postDraw(q.b)];
}
