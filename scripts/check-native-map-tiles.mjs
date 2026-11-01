// The iOS map draws its engraved layer from raster tiles. Each tile must match
// the shapes drawn directly, tiles must meet without seams or double blending
// at every zoom, and missing tiles must fall back without covering twice.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {createRequire} from 'node:module';
import {build} from 'esbuild';
const require=createRequire(import.meta.url),temp=fs.mkdtempSync(path.join(os.tmpdir(),'map-tiles-'));
try{
 const skia=path.resolve('native/node_modules/@shopify/react-native-skia'),out=path.join(temp,'tiles.cjs');
 await build({stdin:{contents:`export {default as snapshot} from './native/assets/world-snapshot.json';
  export {installImportedArt} from './src/imported-art';
  export {validateLayout} from './src/world-layout';
  export {prepareAuthoredWorld} from './src/authored-world';
  export {createCampPlaySession} from './src/studio-play';
  export {playerMapScene,playerMapFeatures,playerMapView} from './src/player-map';
  export {continuousMapCamera} from './src/continuous-zoom';
  export {createMapTiles,MAP_TILE_SIZE,MAP_TILE_MIN_TEXELS} from './native/map-tiles';
  export {JsiSkApi} from ${JSON.stringify(path.join(skia,'lib/module/skia/web/JsiSkia.js'))};`,resolveDir:process.cwd()},bundle:true,platform:'node',format:'cjs',outfile:out,loader:{'.webp':'empty','.png':'empty','.ttf':'empty'},logLevel:'error'});
 const m=require(out),kitRequire=createRequire(path.join(skia,'package.json'));
 const kit=await kitRequire('canvaskit-wasm')({locateFile:f=>path.join(path.dirname(kitRequire.resolve('canvaskit-wasm')),f)});
 const Skia=m.JsiSkApi(kit),T=m.MAP_TILE_SIZE;
 assert(Skia.PathBuilder,'The installed iOS Skia API is under test');

 m.installImportedArt(m.snapshot.records);
 const layout=m.prepareAuthoredWorld(m.validateLayout(m.snapshot.layout).layout),world=m.createCampPlaySession(layout,undefined,'survival');
 const scene=m.playerMapScene(world),area=scene.bounds,features=m.playerMapFeatures(world.layout);
 assert(features.paths.length>=8&&features.paths.every(p=>p.parts&&p.bounds),'Every engraved batch carries its subpaths and bounds');

 // Premultiplied, as composited: unpremultiplied reads magnify near-transparent texels.
 const pixels=(w,h,draw)=>{const surface=Skia.Surface.Make(w,h),canvas=surface.getCanvas();canvas.clear(Skia.Color('transparent'));draw(canvas);const image=surface.makeImageSnapshot(),data=image.readPixels(0,0,{width:w,height:h,colorType:4,alphaType:2});image.dispose();surface.dispose();return data};
 const settle=(tiles,view,ratio,limit=4096)=>{tiles.want(view,ratio,limit);let units=0;while(tiles.pending()){tiles.step(0,true,limit);units++;assert(units<20000,'Tile rendering finishes')}return units};
 const viewAt=(x,y,width,height,scale)=>({x,y,width:width/scale,height:height/scale,scale});
 const compose=(tiles,view,ratio,w,h,clip=true)=>{const picture=tiles.picture(view,ratio);return pixels(w,h,canvas=>{canvas.scale(view.scale*ratio,view.scale*ratio);canvas.translate(-view.x,-view.y);if(clip)canvas.clipRect({x:area.left,y:area.top,width:area.width,height:area.height},1,true);if(picture)canvas.drawPicture(picture)})};
 const compare=(a,b)=>{let max=0,sum=0,over=0,large=0;for(let k=0;k<a.length;k++){const d=Math.abs(a[k]-b[k]);sum+=d;if(d>max)max=d;if(d>2)over++;if(d>24)large++}return{max,mean:sum/a.length,over,large}};

 // 1. Every subpath whose ink reaches a tile is drawn into it: Skia's own fill
 // and miter-joined stroke bounds, plus the texel anti-aliasing can touch.
 const tiles=m.createMapTiles(Skia,features.paths,area),extent=Math.max(area.width,area.height),base=T/extent;
 const ink=features.paths.map(item=>item.parts.map(d=>{
  const p=Skia.Path.MakeFromSVGString(d);if(!p)return null;let r=p.computeTightBounds();r={l:r.x,t:r.y,r:r.x+r.width,b:r.y+r.height};
  if(item.stroke&&item.strokeWidth){const s=Skia.Path.Stroke(p,{width:item.strokeWidth,miter_limit:4,join:0,cap:0});if(s){const q=s.computeTightBounds();r={l:Math.min(r.l,q.x),t:Math.min(r.t,q.y),r:Math.max(r.r,q.x+q.width),b:Math.max(r.b,q.y+q.height)};s.dispose()}}
  p.dispose();return r;
 }));
 let selectedTiles=0,requiredParts=0;
 for(let level=0;level<=5;level++){
  const span=extent/2**level,density=base*2**level,cols=Math.ceil(area.width/span-1e-9),rows=Math.ceil(area.height/span-1e-9),reach=1.5/density;
  for(let index=0;index<cols*rows;index++){
   const i=index%cols,j=Math.floor(index/cols),l=area.left+i*span-reach,t=area.top+j*span-reach,r=area.left+(i+1)*span+reach,b=area.top+(j+1)*span+reach;
   const chosen=tiles.selection(level,i,j).map(list=>new Set(list));
   ink.forEach((parts,batch)=>parts.forEach((box,k)=>{if(box&&box.l<=r&&box.r>=l&&box.t<=b&&box.b>=t){requiredParts++;assert(chosen[batch].has(k),`Level ${level} tile ${i},${j} draws ${features.paths[batch].id} part ${k}`)}}));
   selectedTiles++;
  }
 }

 // 2. Composed tiles match the shapes drawn directly. Skia's CPU anti-aliasing
 // of many overlapping subpaths depends on which others share a row, so the
 // two disagree at isolated texels; there, both are measured against the same
 // shapes point-sampled 16x16 per texel.
 // The previous renderer: every batch drawn whole, fill then stroke.
 const parsed=features.paths.map(item=>({item,path:Skia.Path.MakeFromSVGString(item.path)}));
 const drawParsed=(canvas,antiAlias=true)=>{const paint=Skia.Paint();paint.setAntiAlias(antiAlias);for(const {item,path:p} of parsed){if(!p)continue;if(item.fill!=='transparent'){paint.setStyle(0);paint.setColor(Skia.Color(item.fill));canvas.drawPath(p,paint)}if(item.stroke&&item.strokeWidth){paint.setStyle(1);paint.setColor(Skia.Color(item.stroke));paint.setStrokeWidth(item.strokeWidth);canvas.drawPath(p,paint)}}paint.dispose()};
 const S=16,truthAt=(view,density,x,y)=>{const big=pixels(S,S,canvas=>{canvas.scale(density*S,density*S);canvas.translate(-(view.x+x/density),-(view.y+y/density));drawParsed(canvas,false)});return[0,1,2,3].map(c=>{let sum=0;for(let q=0;q<S*S;q++)sum+=big[q*4+c];return sum/(S*S)})};
 const error=(a,p,truth)=>Math.max(...[0,1,2,3].map(c=>Math.abs(a[p*4+c]-truth[c])));
 const camp={x:1700,y:1550},timing={},disputed={texels:0,tiles:0,direct:0,tilesWorst:0,directWorst:0},agreed={texels:0,tiles:0,direct:0};
 let views=0;
 for(const level of [0,1,2,3,4,5]){
  const density=base*2**level,span=extent/2**level,ratio=2;
  for(const [ox,oy] of [[0,0],[.5,0],[0,.5],[-.5,-.5]]){
   const cols=Math.ceil(area.width/span-1e-9),rows=Math.ceil(area.height/span-1e-9);
   const i=Math.min(cols-1,Math.max(0,Math.floor((camp.x+ox*span*2-area.left)/span))),j=Math.min(rows-1,Math.max(0,Math.floor((camp.y+oy*span*2-area.top)/span)));
   const w=Math.min(2*T,Math.ceil((area.width-i*span)*density)),h=Math.min(2*T,Math.ceil((area.height-j*span)*density));
   const view=viewAt(area.left+i*span,area.top+j*span,w/ratio,h/ratio,density/ratio);
   const started=performance.now(),units=settle(tiles,view,ratio);timing[level]=(timing[level]??0)+(performance.now()-started);
   const got=compose(tiles,view,ratio,w,h,false),want=pixels(w,h,canvas=>{canvas.scale(density,density);canvas.translate(-view.x,-view.y);drawParsed(canvas)});
   const diff=compare(got,want);
   assert(diff.mean<.02&&diff.large<=w*h*4*2e-5,`Level ${level} tile ${i},${j} matches the direct shapes (mean ${diff.mean.toFixed(4)}, ${diff.large} channels over 24, ${units} units)`);
   const worst=[],edges=[];
   for(let k=0;k<got.length;k+=4){const d=Math.max(...[0,1,2,3].map(c=>Math.abs(got[k+c]-want[k+c])));if(d>12)worst.push([d,k/4]);else if(k%(4*7919)===0&&got[k+3]>0&&got[k+3]<250)edges.push(k/4)}
   for(const [,p] of worst.sort((a,b)=>b[0]-a[0]).slice(0,12)){
    const truth=truthAt(view,density,p%w,Math.floor(p/w)),t=error(got,p,truth),d=error(want,p,truth);
    disputed.texels++;disputed.tiles+=t;disputed.direct+=d;disputed.tilesWorst=Math.max(disputed.tilesWorst,t);disputed.directWorst=Math.max(disputed.directWorst,d);
   }
   for(const p of edges.slice(0,6)){const truth=truthAt(view,density,p%w,Math.floor(p/w));agreed.texels++;agreed.tiles+=error(got,p,truth);agreed.direct+=error(want,p,truth)}
   views++;
  }
 }
 assert(disputed.texels>0&&disputed.tiles<=disputed.direct&&disputed.tilesWorst<=disputed.directWorst,`Where the two disagree, tiles are no less accurate (total error ${disputed.tiles.toFixed(0)} against ${disputed.direct.toFixed(0)} over ${disputed.texels} texels, worst ${disputed.tilesWorst.toFixed(0)} against ${disputed.directWorst.toFixed(0)})`);
 assert(agreed.texels>=24&&Math.abs(agreed.tiles-agreed.direct)/agreed.texels<1,`Ordinary edge texels are equally accurate (mean error ${(agreed.tiles/agreed.texels).toFixed(2)} against ${(agreed.direct/agreed.texels).toFixed(2)})`);
 const stats=tiles.stats();tiles.dispose();

 // 2. Tiles meet without seams or double blending at arbitrary zooms, offsets
 // and with fallbacks: a uniform translucent layer must stay uniform.
 const sheet=[{id:'sheet',fill:'#80406080',path:`M${area.left} ${area.top}L${area.right} ${area.top}L${area.right} ${area.bottom}L${area.left} ${area.bottom}Z`,parts:[`M${area.left} ${area.top}L${area.right} ${area.top}L${area.right} ${area.bottom}L${area.left} ${area.bottom}Z`],bounds:[area.left,area.top,area.right,area.bottom]}];
 let seed=7;const random=()=>{seed=(seed*1103515245+12345)&0x7fffffff;return seed/0x7fffffff};
 const fit=m.playerMapView(area,932,430,1).scale;
 let uniformViews=0,fallbackViews=0;
 for(let n=0;n<14;n++){
  const sheetTiles=m.createMapTiles(Skia,sheet,area),ratio=n%2?3:2,zoom=1+random()*19,scale=fit*zoom,w=360,h=240;
  const view=viewAt(area.left+random()*(area.width-w/scale),area.top+random()*(area.height-h/scale),w/ratio,h/ratio,scale);
  // Partial readiness: the base level plus a random share of the rest.
  sheetTiles.want(view,ratio,4096);const share=n<4?1:random();let units=0;
  while(!sheetTiles.stats().ready){sheetTiles.step(0,true,4096);units++}
  while(sheetTiles.pending()&&random()<share){sheetTiles.step(0,true,4096);units++}
  if(sheetTiles.pending())fallbackViews++;
  const got=compose(sheetTiles,view,ratio,w,h);
  const plan=sheetTiles.plan(view,ratio),levels=new Set(plan.map(d=>d.level));
  // Interior pixels only: the sheet's own outer edge is soft, most of all in the base tile.
  const edge=4/base+2/scale;let ref,interior=0;
  for(let y=0;y<h;y++)for(let x=0;x<w;x++){
   const wx=view.x+(x+.5)/(scale*ratio),wy=view.y+(y+.5)/(scale*ratio);
   if(wx<area.left+edge||wx>area.right-edge||wy<area.top+edge||wy>area.bottom-edge)continue;
   const k=(y*w+x)*4;ref??=[got[k],got[k+1],got[k+2],got[k+3]];interior++;
   for(let c=0;c<4;c++)assert(Math.abs(got[k+c]-ref[c])<=1,`No seam or double blend at ${x},${y} (zoom ${zoom.toFixed(2)}, levels ${[...levels].join('/')})`);
  }
  assert(interior>0&&ref[3]>100&&ref[3]<160,'The translucent layer is drawn exactly once');
  // The plan covers the view's tiles exactly once.
  const covered=plan.reduce((sum,d)=>sum+d.dst.width*d.dst.height,0);
  for(let a=0;a<plan.length;a++)for(let b=a+1;b<plan.length;b++){const p=plan[a].dst,q=plan[b].dst;assert(!(p.x<q.x+q.width-1e-6&&q.x<p.x+p.width-1e-6&&p.y<q.y+q.height-1e-6&&q.y<p.y+p.height-1e-6),'Tile draws never overlap')}
  assert(covered>0,'The view is covered');
  sheetTiles.dispose();uniformViews++;
 }
 assert(fallbackViews>=4,'Fallback compositing is exercised');

 // 3. Real gameplay entry views stay close to the direct shapes on a 3x screen.
 const entryTiles=m.createMapTiles(Skia,features.paths,area);let entryUnits=0,entryWorst=0;
 for(const [sw,sh] of [[932,430],[430,932]]){
  const c=m.continuousMapCamera(world,{x:0,y:0,zoom:1,follow:true,grid:false,collision:false,selected:null,ghost:null,placingSpawn:false,playing:true,hideFoliage:false},sw,sh,.7);
  const view=m.playerMapView(area,sw,sh,c.zoom,c.focus,Math.max(12,c.entry)),ratio=3,w=Math.round(sw*ratio),h=Math.round(sh*ratio);
  const started=performance.now();entryUnits+=settle(entryTiles,view,ratio);timing.entry=(timing.entry??0)+performance.now()-started;
  const plan=entryTiles.plan(view,ratio);
  assert(plan.length<=40,`An entry view needs a bounded number of tiles (${plan.length})`);
  const got=compose(entryTiles,view,ratio,w,h),want=pixels(w,h,canvas=>{canvas.scale(view.scale*ratio,view.scale*ratio);canvas.translate(-view.x,-view.y);canvas.clipRect({x:area.left,y:area.top,width:area.width,height:area.height},1,true);drawParsed(canvas)});
  const diff=compare(got,want);entryWorst=Math.max(entryWorst,diff.mean);
  assert(diff.mean<1.5,`Entry view resampling stays close to the vector shapes (mean ${diff.mean.toFixed(3)})`);
 }
 // A bounded cache releases tiles the current view no longer uses.
 const before=entryTiles.stats().tiles,far=m.playerMapView(area,932,430,8,{x:area.left+area.width*.85,y:area.top+area.height*.85},12);
 entryTiles.want(far,3,24);while(entryTiles.pending())entryTiles.step(0,true,24);
 const after=entryTiles.stats().tiles,farPlan=entryTiles.plan(far,3);
 assert(before>24&&after<=24,`The tile cache is trimmed to its limit (${before} to ${after})`);
 assert(farPlan.every(d=>d.src.width===T),'The new view is drawn from its own complete tiles');
 entryTiles.dispose();for(const {path:p} of parsed)p?.dispose();
 console.log(JSON.stringify({passed:true,selectedTiles,requiredParts,comparedViews:views,disputedTexels:disputed.texels,disputedError:{tiles:Math.round(disputed.tiles),direct:Math.round(disputed.direct)},levelsRendered:stats.ready,uniformViews,fallbackViews,entryUnits,entryMeanDifference:+entryWorst.toFixed(3),canvasKitMs:Object.fromEntries(Object.entries(timing).map(([k,v])=>[k,Math.round(v)]))}));
}finally{fs.rmSync(temp,{recursive:true,force:true})}
