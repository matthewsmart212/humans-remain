import type {Direction,World} from './survival-engine';

/**
 * Engineer identity layer follows the original survivor's measured motion rig.
 * The base sprite (including walking, running, punching and weapon art) stays
 * unchanged; accessories render without introducing loading-time textures.
 * Replace this pass with the final painted engineer atlases when they are bundled.
 */
export function drawEngineerIdentity(ctx:CanvasRenderingContext2D,w:World,view:Direction){
 if(w.survivorRole!=='engineer')return;
 const rear=view==='up'||view==='up-right'||view==='up-left';
 const side=view==='right'||view==='left';
 const offset=w.player.moving?Math.sin(w.player.walkDistance/18)*.45:0;
 ctx.save();ctx.translate(0,offset);
 const circle=(x:number,y:number,r:number,color:string)=>{
  ctx.fillStyle=color;ctx.beginPath();ctx.arc(x,y,r,0,Math.PI*2);ctx.fill();
 };
 const stroke=(color:string,width:number,ax:number,ay:number,bx:number,by:number)=>{
  ctx.strokeStyle=color;ctx.lineWidth=width;ctx.beginPath();ctx.moveTo(ax,ay);ctx.lineTo(bx,by);ctx.stroke();
 };
 // Sewn leather overalls and strong shoulder straps.
 ctx.globalAlpha=.93;
 if(!rear){
  ctx.fillStyle='#473323';ctx.fillRect(-19,-49,38,6);
  stroke('#34291f',7,-17,-62,-8,-36);
  stroke('#94663d',4,-17,-62,-8,-36);
  stroke('#34291f',7,17,-62,8,-36);
  stroke('#94663d',4,17,-62,8,-36);
  circle(-8,-40,2.4,'#d5a564');circle(8,-40,2.4,'#d5a564');
 }else{
  stroke('#34291f',7,-18,-62,13,-34);
  stroke('#94663d',4,-18,-62,13,-34);
  stroke('#34291f',7,18,-62,-13,-34);
  stroke('#94663d',4,18,-62,-13,-34);
 }
 // Belt pouches and visible hanging spanner mark the role at game zoom.
 ctx.fillStyle='#593923';ctx.fillRect(-26,-37,16,14);ctx.fillRect(10,-38,17,15);
 ctx.strokeStyle='#271f1b';ctx.lineWidth=2;
 ctx.strokeRect(-26,-37,16,14);ctx.strokeRect(10,-38,17,15);
 ctx.fillStyle='#bb8b4d';ctx.fillRect(-22,-34,9,3);ctx.fillRect(13,-35,10,3);
 const wx=rear?21:23,wy=-29;
 stroke('#292b2a',4,wx,wy-10,wx-3,wy+8);
 stroke('#b9b6a5',2.7,wx,wy-10,wx-3,wy+8);
 ctx.strokeStyle='#b9b6a5';ctx.lineWidth=3;ctx.beginPath();ctx.arc(wx+1,wy-12,5,.1,Math.PI-.25);ctx.stroke();
 // Goggle strap sits on the hairline, with lenses kept above the eyes.
 const gy=side?-91:-94,shift=side?8:0;
 stroke('#4a3023',7,-31+shift,gy,31+shift,gy+2);
 stroke('#a27342',3.5,-31+shift,gy,31+shift,gy+2);
 if(!rear){
  const centers=side?[[-9,gy-1],[12,gy-1]]:[[-14,gy-1],[14,gy-1]];
  for(const [x,y] of centers){
   circle(x+shift,y,11,'#30261f');
   circle(x+shift,y,8.8,'#a36d3b');
   circle(x+shift,y,6.3,'#526466');
   circle(x+shift-2.2,y-2.4,2.5,'#c7dad0');
   circle(x+shift+2.5,y+2.7,1.3,'#768f87');
  }
 }else{
  circle(-18+shift,gy,4,'#a8733d');
  circle(19+shift,gy+1,4,'#a8733d');
 }
 ctx.restore();
}
