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
 // Collision asks this for every body substep. Only rectangles in the point's
 // bucket and edges near the circle can decide the answer, so bucket both.
 const left=xs[0],top=ys[0],right=xs.at(-1)!,bottom=ys.at(-1)!,size=256,columns=Math.floor((right-left)/size)+1,rows=Math.floor((bottom-top)/size)+1;
 const column=(x:number)=>Math.max(0,Math.min(columns-1,Math.floor((x-left)/size))),row=(y:number)=>Math.max(0,Math.min(rows-1,Math.floor((y-top)/size)));
 const rectBuckets:GroundRect[][]=Array.from({length:columns*rows},()=>[]),edgeBuckets:(typeof edges)[]=Array.from({length:columns*rows},()=>[]);
 for(const t of rects)for(let j=row(t.y);j<=row(t.y+t.height);j++)for(let i=column(t.x);i<=column(t.x+t.width);i++)rectBuckets[j*columns+i].push(t);
 for(const e of edges)for(let j=row(e[1]);j<=row(e[3]);j++)for(let i=column(e[0]);i<=column(e[2]);i++)edgeBuckets[j*columns+i].push(e);
 const contains=(x:number,y:number,r=0)=>{
  if(!(x>=left&&x<=right&&y>=top&&y<=bottom))return false;
  if(!rectBuckets[row(y)*columns+column(x)].some(t=>inside(t,x,y)))return false;
  if(r<=0)return true;
  if(r!==r)return !edges.length;
  const limit=r*r-1e-7;
  for(let j=row(y-r),j1=row(y+r);j<=j1;j++)for(let i=column(x-r),i1=column(x+r);i<=i1;i++)for(const [ax,ay,bx,by] of edgeBuckets[j*columns+i]){
   const dx=x-clamp(x,ax,bx),dy=y-clamp(y,ay,by);if(!(dx*dx+dy*dy>=limit))return false;
  }
  return true;
 };
 const bound=(p:Point):Point=>{
  if(contains(p.x,p.y))return p;
  let best=p,distance=Infinity;
  for(const t of rects){const q={x:clamp(p.x,t.x,t.x+t.width),y:clamp(p.y,t.y,t.y+t.height)},d=(p.x-q.x)**2+(p.y-q.y)**2;if(d<distance){distance=d;best=q}}
  return best;
 };
 return{contains,bound,bounds:{x:xs[0],y:ys[0],width:xs.at(-1)!-xs[0],height:ys.at(-1)!-ys[0]}};
}
