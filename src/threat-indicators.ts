/** Offscreen threats grouped by direction, never fabricated from a spawn timer. */
export function threatIndicators(width:number,height:number,cam:{x:number;y:number;scale:number},player:{x:number;y:number},enemies:{x:number;y:number}[]){
 const buckets=new Map<number,{x:number;y:number;angle:number;count:number;distance:number}>(),wide=width>height,side=wide?64:20,top=wide?69:148,bottom=height-34;
 const cx=Math.max(side+8,Math.min(width-side-8,(player.x-cam.x)*cam.scale)),cy=Math.max(top+8,Math.min(bottom-8,(player.y-cam.y)*cam.scale));
 for(const e of enemies){const x=(e.x-cam.x)*cam.scale,y=(e.y-cam.y)*cam.scale;if(x>=8&&x<=width-8&&y>=top&&y<=height-8)continue;
  const dx=x-cx,dy=y-cy,angle=Math.atan2(dy,dx),key=(Math.round(angle/(Math.PI/8))+16)%16,d=Math.hypot(e.x-player.x,e.y-player.y);
  const edge=Math.min(dx>0?(width-side-cx)/dx:dx<0?(side-cx)/dx:Infinity,dy>0?(bottom-cy)/dy:dy<0?(top-cy)/dy:Infinity);
  const old=buckets.get(key);if(old){old.count++;if(d<old.distance){old.distance=d;old.angle=angle}}else buckets.set(key,{x:cx+dx*Math.max(0,edge),y:cy+dy*Math.max(0,edge),angle,count:1,distance:d});
 }
 return [...buckets.values()].sort((a,b)=>a.distance-b.distance).slice(0,6);
}
