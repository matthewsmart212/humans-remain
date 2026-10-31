/** A union of registered ground rectangles, including concave corners and holes. */
export type GroundRect={x:number;y:number;width:number;height:number};
type Point={x:number;y:number};
const inside=(r:GroundRect,x:number,y:number)=>x>=r.x&&x<=r.x+r.width&&y>=r.y&&y<=r.y+r.height;
const clamp=(n:number,lo:number,hi:number)=>Math.max(lo,Math.min(hi,n));
export function groundFootprint(rects:readonly GroundRect[]){
 const xs=[...new Set(rects.flatMap(r=>[r.x,r.x+r.width]))].sort((a,b)=>a-b);
 const ys=[...new Set(rects.flatMap(r=>[r.y,r.y+r.height]))].sort((a,b)=>a-b);
 const cells=ys.slice(1).map((_,j)=>xs.slice(1).map((_,i)=>rects.some(r=>inside(r,(xs[i]+xs[i+1])/2,(ys[j]+ys[j+1])/2))));
 const edges:[number,number,number,number][]=[];
 for(let j=0;j<ys.length-1;j++)for(let i=0;i<xs.length-1;i++)if(cells[j][i]){
  if(!cells[j-1]?.[i])edges.push([xs[i],ys[j],xs[i+1],ys[j]]);
  if(!cells[j+1]?.[i])edges.push([xs[i],ys[j+1],xs[i+1],ys[j+1]]);
  if(!cells[j]?.[i-1])edges.push([xs[i],ys[j],xs[i],ys[j+1]]);
  if(!cells[j]?.[i+1])edges.push([xs[i+1],ys[j],xs[i+1],ys[j+1]]);
 }
 const contains=(x:number,y:number,r=0)=>rects.some(t=>inside(t,x,y))&&(r<=0||edges.every(([ax,ay,bx,by])=>{
  const dx=x-clamp(x,ax,bx),dy=y-clamp(y,ay,by);return dx*dx+dy*dy>=r*r-1e-7;
 }));
 const bound=(p:Point):Point=>{
  if(contains(p.x,p.y))return p;
  let best=p,distance=Infinity;
  for(const t of rects){const q={x:clamp(p.x,t.x,t.x+t.width),y:clamp(p.y,t.y,t.y+t.height)},d=(p.x-q.x)**2+(p.y-q.y)**2;if(d<distance){distance=d;best=q}}
  return best;
 };
 return{contains,bound,bounds:{x:xs[0],y:ys[0],width:xs.at(-1)!-xs[0],height:ys.at(-1)!-ys[0]}};
}
