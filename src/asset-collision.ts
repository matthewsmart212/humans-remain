/** Points are fractions of the sprite canvas, independent of display or world size. */
export type CollisionPoint=[number,number];
export type CollisionPath={points:CollisionPoint[];closed:boolean};
export type AssetCollision={paths:CollisionPath[];lineWidth:number};
export const emptyCollision=():AssetCollision=>({paths:[],lineWidth:.012});
export function collisionError(value:unknown):string{
 const c=value as AssetCollision;
 if(!c||!Array.isArray(c.paths)||c.paths.length>16||!Number.isFinite(c.lineWidth)||c.lineWidth<.002||c.lineWidth>.1)return 'Use up to 16 blocker shapes and a line width between 0.2% and 10%.';
 if(c.paths.reduce((n,p)=>n+(Array.isArray(p?.points)?p.points.length:0),0)>256)return 'Use at most 256 points per asset.';
 for(const path of c.paths){
  if(!path||typeof path.closed!=='boolean'||!Array.isArray(path.points)||path.points.length<(path.closed?3:2)||path.points.length>64||path.points.some(p=>!Array.isArray(p)||p.length!==2||p.some(n=>typeof n!=='number'||!Number.isFinite(n)||n<0||n>1)))return 'Each wall needs 2–64 points; a solid outline needs 3–64 points within the image.';
  const points=path.points,count=points.length,edges=count-(path.closed?0:1);
  for(let i=0;i<edges;i++){const a=points[i],b=points[(i+1)%count];if(Math.hypot(a[0]-b[0],a[1]-b[1])<.0001)return 'Move overlapping points apart.';}
  if(path.closed){
   const area=Math.abs(points.reduce((n,a,i)=>{const b=points[(i+1)%count];return n+a[0]*b[1]-b[0]*a[1]},0));
   if(area<.00001)return 'A solid outline must enclose an area.';
   const cross=(a:CollisionPoint,b:CollisionPoint,c:CollisionPoint)=>(b[0]-a[0])*(c[1]-a[1])-(b[1]-a[1])*(c[0]-a[0]);
   for(let i=0;i<count;i++)for(let j=i+2;j<count;j++){if(i===0&&j===count-1)continue;const a=points[i],b=points[(i+1)%count],c=points[j],d=points[(j+1)%count];if(cross(a,b,c)*cross(a,b,d)<0&&cross(c,d,a)*cross(c,d,b)<0)return 'The solid outline crosses itself. Move its points or split it into separate shapes.';}
  }
 }
 return '';
}
