import {placementBounds,placementFrame,type Placement} from './world-layout';
import type {WorldAsset} from './world-assets';
import type {World} from './survival-engine';

export type FoliageViewport={x:number;y:number;width:number;height:number;scale?:number};
type Mesh={positions:{x:number;y:number}[];uv:{x:number;y:number}[];indices:number[]};
type FoliageContext=CanvasRenderingContext2D&{drawTexturedMesh?:(image:HTMLImageElement,mesh:Mesh)=>void};
type Geometry={mesh:Mesh;u:number[];v:number[];weight:number[];signature:string};
const meshes=new WeakMap<Placement,Geometry>();

/** Conservative even after rotation and bending, with no image-pixel reads. */
export function foliageVisible(p:Placement,view?:FoliageViewport){
 if(!view)return true;const b=placementBounds(p),radius=Math.hypot(b.width,b.height)*1.2;
 return p.x+radius>=view.x&&p.x-radius<=view.x+view.width&&p.y+radius>=view.y&&p.y-radius<=view.y+view.height;
}

export function foliageMesh(p:Placement,a:WorldAsset,motion:{x:number;y:number},_time:number,reduced=false):Mesh{
 const b=placementBounds(p),anchor=placementFrame(p).anchor[1];
 const signature=[...a.crop,anchor].join(',');let g=meshes.get(p);
 if(!g||g.signature!==signature){
  const rows=[0,anchor*.2,anchor*.4,anchor*.6,anchor*.8,anchor,1];
  g={mesh:{positions:[],uv:[],indices:[]},u:[],v:[],weight:[],signature};
  for(const v of rows)for(let col=0;col<=4;col++){
   const u=col/4;g.u.push(u);g.v.push(v);g.weight.push(Math.pow(Math.max(0,(anchor-v)/Math.max(.01,anchor)),1.5));
   g.mesh.positions.push({x:0,y:0});g.mesh.uv.push({x:a.crop[0]+u*a.crop[2],y:a.crop[1]+v*a.crop[3]});
  }
  for(let row=0;row<rows.length-1;row++)for(let col=0;col<4;col++){const i=row*5+col;g.mesh.indices.push(i,i+1,i+5,i+1,i+6,i+5)}
  meshes.set(p,g);
 }
 const angle=(p.rotation||0)*Math.PI/180,c=Math.cos(angle),s=Math.sin(angle);
 // Simulation pushes in world directions; transform back to the sprite's axes.
 const mx=reduced?0:(motion.x*c+motion.y*s)*(p.flipX?-1:1),my=reduced?0:(-motion.x*s+motion.y*c)*(p.flipY?-1:1);
 const bx=b.width*mx*.22,by=b.height*(my*.17+Math.abs(mx)*.045);
 for(let i=0;i<g.mesh.positions.length;i++){
  const v=g.mesh.positions[i],weight=g.weight[i];
  v.x=b.x+g.u[i]*b.width+bx*weight;
  v.y=b.y+g.v[i]*b.height+by*weight;
 }
 return g.mesh;
}

export function drawFoliage(ctx:FoliageContext,image:HTMLImageElement,w:World,p:Placement,a:WorldAsset,animate=true){
 const reduced=!!w.weather?.reducedMotion,b=placementBounds(p),motion=w.foliageMotions?.[p.id];
 if(!ctx.drawTexturedMesh||reduced||!animate||!motion){ctx.drawImage(image,...a.crop as [number,number,number,number],b.x,b.y,b.width,b.height);return}
 ctx.drawTexturedMesh(image,foliageMesh(p,a,motion,w.tick/60));
}
