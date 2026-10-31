import {HOME_TERRAIN,HOME_TERRAIN_TILES,terrainWorldRect,usesPaintedHomeTerrain} from './terrain-art';
import {MAP_WIDTH,MAP_HEIGHT} from './factory-map';
import {assetImageKey} from './world-assets';
import {OUTDOOR_TILES,terrainIntersects,terrainPaintRegion,type TerrainView} from './outdoor-terrain';
import {EAST_TERRAIN_SCALE} from './east-approach';
import {drawWorldRoads} from './world-road-renderer';
import {drawRoadPilot} from './world-road-pilot';
import {drawRiverTerrain} from './river-art';
import {CAMP_CHUNKS} from './terrain-stream-art';

export function clearTerrainViewport(ctx:CanvasRenderingContext2D){
 // This opaque fill already replaces the previous frame.
 ctx.fillStyle=HOME_TERRAIN.outsideColor;
 ctx.fillRect(0,0,ctx.canvas.width,ctx.canvas.height);
}

/** Saved objects and custom terrain keep their original coordinate scale. */
export function drawHomeTerrain(ctx:CanvasRenderingContext2D,imgs:Record<string,HTMLImageElement>,custom?:{url:string;width?:number;height?:number},border=0,view?:TerrainView){
 const painted=usesPaintedHomeTerrain(custom);
 // The interior of the camp painting is completely opaque. Do not shade the
 // outdoor world underneath it, then immediately paint over those pixels.
 // Keep the original feathered perimeter; it still needs the outdoor ground.
 const opaque=terrainWorldRect(340,340,4120,4120,MAP_WIDTH,MAP_HEIGHT);
 const covered=painted&&!!imgs.homeGround&&!!view&&view.x>=opaque.x&&view.y>=opaque.y&&view.x+view.width<=opaque.x+opaque.width&&view.y+view.height<=opaque.y+opaque.height;
 const underlay=ctx as CanvasRenderingContext2D&{clipOutsideRect?:(x:number,y:number,width:number,height:number)=>void};
 ctx.save();
 if(painted&&imgs.homeGround)underlay.clipOutsideRect?.(opaque.x,opaque.y,opaque.width,opaque.height);
 if(painted&&!covered)for(const t of OUTDOOR_TILES){
  const image=imgs[t.key];if(!image||view&&!terrainIntersects(t,view))continue;
  const region={...terrainPaintRegion(t,key=>!!imgs[key]),groundMaterials:imgs.worldGroundBrown&&imgs.worldGroundClear?{brown:imgs.worldGroundBrown,clear:imgs.worldGroundClear,scale:EAST_TERRAIN_SCALE}:undefined};
  const tileContext=ctx as CanvasRenderingContext2D&{drawTerrainTile?:(image:HTMLImageElement,tile:typeof region)=>void};
  if(tileContext.drawTerrainTile)tileContext.drawTerrainTile(image,region);
  else ctx.drawImage(image,t.x,t.y,t.width,t.height);
 }
 // Camp artwork masks the surveyed portions inside camp. Only the connected
 // extensions emerge through its existing edge feather; the stone paths stay intact.
 if(painted&&!covered&&imgs.worldGroundWarm)drawWorldRoads(ctx,imgs,view);
 ctx.restore();
 const draw=(im:HTMLImageElement,x:number,y:number,width:number,height:number)=>{
  const r=terrainWorldRect(x,y,width,height,MAP_WIDTH,MAP_HEIGHT);
  if(view&&!terrainIntersects(r,view))return;
  if(painted){
   const maskBounds=terrainWorldRect(120,120,4560,4560,MAP_WIDTH,MAP_HEIGHT),fade=220*EAST_TERRAIN_SCALE;
   const t={...r,maskBounds,paintTop:0,paintWidth:r.width,paintHeight:r.height,fadeTop:fade,fadeBottom:fade,fadeLeft:fade,fadeRight:fade};
   const tileContext=ctx as CanvasRenderingContext2D&{drawTerrainTile?:(image:HTMLImageElement,tile:typeof t)=>void};
   if(tileContext.drawTerrainTile){tileContext.drawTerrainTile(im,t);return}
  }
  ctx.drawImage(im,r.x,r.y,r.width,r.height);
 };
 const stream=ctx as CanvasRenderingContext2D&{requestCampArtwork?:(v:TerrainView)=>void;drawTerrainTile?:(image:HTMLImageElement,tile:any)=>void};
 if(painted&&stream.requestCampArtwork&&view){
  stream.requestCampArtwork(view);
  const maskBounds=terrainWorldRect(120,120,4560,4560,MAP_WIDTH,MAP_HEIGHT),fade=220*EAST_TERRAIN_SCALE;
  for(const t of CAMP_CHUNKS){
   const core=terrainWorldRect(t.x,t.y,t.width,t.height,MAP_WIDTH,MAP_HEIGHT);if(!terrainIntersects(core,view))continue;
   const detail=t.levels.map(l=>imgs[l.key]).find(Boolean),image=detail||imgs.homeGround;if(!image)continue;
   const sample=detail?t.sample:{x:0,y:0,width:4800,height:4800},r=terrainWorldRect(sample.x,sample.y,sample.width,sample.height,MAP_WIDTH,MAP_HEIGHT);
   stream.drawTerrainTile?.(image,{...r,maskBounds,paintLeft:core.x-r.x,paintTop:core.y-r.y,paintWidth:core.width,paintHeight:core.height,fadeTop:fade,fadeBottom:fade,fadeLeft:fade,fadeRight:fade});
  }
 }else{
 if(!HOME_TERRAIN_TILES.every(t=>imgs[t.key])&&imgs.homeGround){
  draw(imgs.homeGround,0,0,HOME_TERRAIN.fullSize,HOME_TERRAIN.fullSize);
 }
 // Open with the complete overview; each original full-resolution tile sharpens in place as it arrives.
 for(const t of HOME_TERRAIN_TILES)if(imgs[t.key])draw(imgs[t.key],t.x,t.y,t.width,t.height);
 }
 if(painted&&imgs.worldGroundWarm)drawRoadPilot(ctx,imgs,view);
 if(painted&&imgs.worldGroundWarm)drawRiverTerrain(ctx,imgs,view);
 // Replacing artwork must never silently resize a user's previously built world.
 const replacement=custom&&!usesPaintedHomeTerrain(custom)&&imgs[assetImageKey(custom.url)];
 if(replacement){
  const width=custom!.width||0,height=custom!.height||0;
  if(border>0&&width>2*border&&height>2*border){
   const scaleX=MAP_WIDTH/(width-2*border),scaleY=MAP_HEIGHT/(height-2*border);
   ctx.drawImage(replacement,-border*scaleX,-border*scaleY,width*scaleX,height*scaleY);
  }else ctx.drawImage(replacement,0,0,MAP_WIDTH,MAP_HEIGHT);
 }
}
