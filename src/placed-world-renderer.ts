import {drawBuildingCondition} from './building-condition-renderer';
import {headquartersCutawayAmount,clipHeadquartersLayer} from './headquarters-cutaway';
import {HQ_INTERIOR_PROP_IDS} from './headquarters-interior';
import {headquartersWallMasks,clipWallsOutsideHeadquarters} from './headquarters-wall-mask';
import {HQ_SOUTH_INTERIOR} from './headquarters-south-art';
import {headquartersRoofBottom,withinRoofApproach,headquartersRaidVisible} from './headquarters-roof';
import {campBuildingArt} from './camp-restoration';
import {drawProgressionMarkers} from './progression-renderer';
import {drawBomberGround,drawBomberEmissives} from './bomber-renderer';
import {drawCampFurnace} from './furnace-renderer';
import {drawMineableRock} from './rock-mining';
import {stoneDrawables} from './mining-renderer';
import {drawForagePlant} from './forage-renderer';
import {drawBowLock} from './bow-lock-renderer';
import {scrapDrawables} from './scrap-salvage';
import {drawWarehouse} from './warehouse-renderer';
import {drawWorldWaypoint} from './waypoint-renderer';
import {drawAnimalHealth,drawAnimalHitFeedback} from './animal-combat-renderer';
import {chickenDrawables} from './chicken-renderer';
import {deerDrawables} from './deer-renderer';
import {predatorDrawables} from './predator-renderer';
import {rabbitDrawables} from './rabbit-renderer';
import {visiblePickupCues,drawPickupGlints} from './pickup-visibility';
import {drawResourceOutlines} from './resource-outlines';
import {treeLogDrawables} from './tree-log-renderer';
import {clampPlayZoom} from './play-zoom';
import {drawFieldKitTarget,getFieldKitTarget} from './field-kit-target';
import {gateDrawables} from './camp-gate-renderer';
import {drawTree} from './tree-chopping';
import {worldBounds} from './world-bounds';
import {drawCampContact} from './camp-contact-renderer';
import {drawPuddle} from './puddle-renderer';
import {visibleGroundPlacements,visiblePlacements} from './layout-views';
import {groundLightning,type GroundStrike} from './ground-lightning';
import {combatDrawables,drawCombatGround,drawCombatFeedback,drawCombatScreenFeedback,drawWalkerEmissives} from './combat-renderer';
import {weatherShelters} from './weather-shelters';
import type {ShelterOutline} from './weather-silhouette';
import type {WeatherState} from './weather-model';
import type {WeatherView} from './weather-skia';
import {drawCampLighting,placedFireLit,nightStrength} from './camp-lighting';
import {bonfireFoodDrawables,drawCampfireHud} from './bonfire-food-renderer';
import {stationMenuPan,menuClock} from './station-menu-layout';
import {chestFrame} from './chest-animation';
import {ASSET_BY_ID,assetImageKey} from './world-assets';
import {placedAnimationFrame} from './step-on-animation';
import {compareWorldDrawables,placementGeometryAsset,placementBounds,placementPoint,placementBodies,type Placement,type WorldLayout} from './world-layout';
import {timeOf,type World} from './survival-engine';
import {MAP_WIDTH,MAP_HEIGHT} from './factory-map';
import {drawWorker} from './worker-renderer';
import {brutePlayerCarried} from './brute-control';
import {bowArrowDrawables} from './bow-art';
import {foliagePlayerOutline} from './foliage-visibility';
import {isFoliageAsset} from './foliage-display';
import type {Atlas} from './packaging-renderer';
import {clearTerrainViewport,drawHomeTerrain} from './terrain-renderer';
import {drawFoliage,foliageVisible,type FoliageViewport} from './foliage-renderer';
import {drawSceneTerrain} from './scene-terrain';
import {circularWallDepth,circularWallGroup,orderCircularWallDraws,type CircularWallDraw} from './circular-wall-depth';

/** A separate terrain pass keeps ground below every asset and the player, even on negative layers. */
export function drawPlacedGround(ctx:CanvasRenderingContext2D,imgs:Record<string,HTMLImageElement>,layout?:WorldLayout,hideFoliage=false,viewport?:FoliageViewport){
 if(!layout)return;
 for(const p of visibleGroundPlacements(layout,viewport)){const asset=ASSET_BY_ID.get(p.assetId);if(hideFoliage&&isFoliageAsset(asset))continue;const ground=asset?.ground,im=ground&&imgs[assetImageKey(ground.image)];if(!ground||!im)continue;
  const b=placementBounds(p),[x,y,width,height]=ground.rect;ctx.save();rotatePlacement(ctx,p);
  ctx.drawImage(im,b.x+x*b.width,b.y+y*b.height,width*b.width,height*b.height);ctx.restore();
 }
}
export function placedDrawables(ctx:CanvasRenderingContext2D,imgs:Record<string,HTMLImageElement>,w:World,editor=false,viewport?:FoliageViewport,hideFoliage=false){
 const out:{roof?:boolean;layer?:number;y:number;draw:()=>void}[]=[];if(!w.layout)return out;
 const circular:CircularWallDraw[]=[],roomMasks=headquartersWallMasks(w.layout);
 const hqMasks=roomMasks;
 const hqReveal=Math.max(0,...roomMasks.map(({placement:p})=>headquartersCutawayAmount(p,w)));
 const hideHQProps=roomMasks.length>0&&hqReveal===0;
 for(const p of visiblePlacements(w.layout,viewport)){if(hideHQProps&&HQ_INTERIOR_PROP_IDS.has(p.id))continue;const a=ASSET_BY_ID.get(p.assetId);if(!a)continue;if(!editor&&['animal','enemySpawn'].includes(p.role))continue;if(!editor&&['scrap','fuel','pallets'].includes(p.role)&&!w.loot.some(l=>l.placementId===p.id))continue;if(!editor&&p.role==='crate'&&!w.breakables.some(b=>b.placementId===p.id&&b.hp>0))continue;
  if(hideFoliage&&isFoliageAsset(a)||a.foliage&&!foliageVisible(p,viewport))continue;
  if(a.gate){const bounds=placementBounds(p);if(viewport&&!p.rotation&&!p.flipX&&!p.flipY&&(bounds.x+bounds.width<viewport.x||bounds.x>viewport.x+viewport.width||bounds.y+bounds.height<viewport.y||bounds.y>viewport.y+viewport.height))continue;for(const v of gateDrawables(ctx,imgs,w,p,a)){const draw=v.draw;out.push({...v,layer:p.layer??0,draw:()=>{ctx.save();rotatePlacement(ctx,p);draw();ctx.restore()}})}continue;}
  const first=out.length,restoration=campBuildingArt(w,p.assetId);
  // Hold the approved first pose until the complete cycle arrives. A delayed
  // animation frame must never make an object disappear or flicker in Build.
  const frames=restoration?undefined:a.openFrames?.length?a.openFrames:a.frames;
  const animationReady=frames?.every(url=>!!imgs[assetImageKey(url)]);
  const frame=animationReady?(a.openFrames?.length?chestFrame(w,p.id,frames!.length):placedAnimationFrame(w,p,a)):0;
  const b=placementBounds(p),im=imgs[assetImageKey(restoration?.image||frames?.[frame]||a.image)]||imgs[assetImageKey(a.image)];if(!im)continue;
  const southHQ=a.image===HQ_SOUTH_INTERIOR&&!!a.interior;
  const cutaway=southHQ?headquartersCutawayAmount(p,w):0;
  const revealRoof=!!(restoration?.roof||a.roof)&&(p.allowTransparency??placementGeometryAsset(p)?.allowTransparency)!==false&&p.roof==='auto'&&(withinRoofApproach(p,w.player.x,w.player.y)||headquartersRaidVisible(p,w));
  const roofImage=(restoration?.roof||a.roof)&&imgs[assetImageKey(restoration?.roof||a.roof!)];
  if(a.perimeterCurve?.length&&!p.rotation&&!p.flipX&&!p.flipY){
   if(viewport&&(b.x+b.width<viewport.x||b.x>viewport.x+viewport.width||b.y+b.height<viewport.y||b.y>viewport.y+viewport.height))continue;
   const depth=circularWallDepth(a.perimeterCurve,{x:(w.player.x-p.x)/p.scale,y:(w.player.y-p.y)/p.scale},a.perimeterRise??180);
   const drawable={layer:p.layer??0,y:p.y+(depth.near?depth.depth*p.scale:0),draw:()=>{ctx.save();clipWallsOutsideHeadquarters(ctx,hqMasks,b);if((p.allowTransparency??a.allowTransparency)!==false&&depth.obscuresPlayer)ctx.globalAlpha=.48;ctx.drawImage(im,...a.crop as [number,number,number,number],b.x,b.y,b.width,b.height);ctx.restore()}};
   out.push(drawable);circular.push({drawable,order:a.perimeterDrawOrder??0,priority:depth.near?1000:1,group:circularWallGroup(a.perimeterCurve,p)});
   continue;
  }
  if(a.perimeter==='wall'&&a.segments?.[0]&&!p.rotation&&!p.flipX&&!p.flipY){
   if(viewport&&(b.x+b.width<viewport.x||b.x>viewport.x+viewport.width||b.y+b.height<viewport.y||b.y>viewport.y+viewport.height))continue;
   // A painted bay is one volume. Slicing adjacent bays in screen columns made
   // steep walls interleave their timber faces and leave visible vertical cuts.
   const segment=a.segments[0],y=p.y+(segment.y+segment.ey)*.5*p.scale,ax=p.x+segment.x*p.scale,ay=p.y+segment.y*p.scale,bx=p.x+segment.ex*p.scale,by=p.y+segment.ey*p.scale,rise=(a.perimeterRise??235)*p.scale;
   const vertical=Math.abs(by-ay)>Math.abs(bx-ax),t=vertical?Math.max(0,Math.min(1,(w.player.y+rise*.4-ay)/(by-ay||1))):Math.max(0,Math.min(1,(w.player.x-ax)/(bx-ax||1))),groundX=ax+(bx-ax)*t,groundY=ay+(by-ay)*t;
   const obscuresPlayer=Math.abs(w.player.x-groundX)<65*p.scale&&w.player.y<groundY&&w.player.y>groundY-rise-20;
   out.push({layer:p.layer??0,y,draw:()=>{ctx.save();clipWallsOutsideHeadquarters(ctx,hqMasks,b);if(p.allowTransparency!==false&&obscuresPlayer)ctx.globalAlpha=.48;ctx.drawImage(im,...a.crop as [number,number,number,number],b.x,b.y,b.width,b.height);ctx.restore()}});
   continue;
  }
  // Only contacted/recovering plants need deformed geometry. All idle plants
  // retain their original pixels through the ordinary image path.
  const animatePlant=!!a.foliage&&(viewport?.scale??1)>=.42&&!!w.foliageMotions?.[p.id];
  const drawBase=()=>{if(southHQ){
   drawCampContact(ctx,p,a);
   if(!roofImage){ctx.drawImage(im,b.x,b.y,b.width,b.height);return}
   ctx.save();clipHeadquartersLayer(ctx,b,false);ctx.drawImage(roofImage,b.x,b.y,b.width,b.height);ctx.restore();
   if(cutaway>0){ctx.save();clipHeadquartersLayer(ctx,b,true);ctx.drawImage(im,b.x,b.y,b.width,b.height);ctx.restore()}
   return;
  }if(restoration){const ruin=imgs[assetImageKey(restoration.image)];if(ruin){ctx.drawImage(ruin,b.x,b.y,b.width,b.height);return}}if(drawCampFurnace(ctx,imgs,w,p))return;if(drawWarehouse(ctx,imgs,w,p))return;if(drawForagePlant(ctx,imgs,w,p))return;if(drawTree(ctx,im,w,p))return;if(drawMineableRock(ctx,im,w,p,a.crop))return;if(a.puddle){drawPuddle(ctx,im,w,p,a);return}if(a.foliage){drawFoliage(ctx,im,w,p,a,animatePlant);return}drawCampContact(ctx,p,a);ctx.save();const [px,py]=placementPoint(p,w.player.x,w.player.y,true);if((p.allowTransparency??placementGeometryAsset(p)?.allowTransparency)!==false&&!a.interior&&py<p.y&&py>b.y&&Math.abs(px-p.x)<b.width*.3)ctx.globalAlpha=.6;
   if(p.role==='hearth'&&!placedFireLit(w,p)&&a.unlit){const off=imgs[assetImageKey(a.unlit)];if(off){const anchor=a.unlitAnchor||[627,1190],size=a.unlitSize||[1254,1254];ctx.drawImage(off,p.frame?b.x:p.x-anchor[0]/size[0]*b.width,p.frame?b.y:p.y-anchor[1]/size[1]*b.height,b.width,b.height)}else ctx.drawImage(im,...a.crop as [number,number,number,number],b.x,b.y,b.width,b.height)}
   else ctx.drawImage(im,...a.crop as [number,number,number,number],b.x,b.y,b.width,b.height);ctx.restore()};
  // The room floor stays below actors and furniture. Palisade pixels are
  // clipped out of its envelope independently of automatic wall depth.
  out.push({y:a.interior?-10000:a.id==='art_hq_woven_rug'?-9999:p.y,draw:drawBase});
  for(const f of southHQ||restoration?[]:a.foreground||[])out.push({y:placementPoint(p,b.x+(f[0]+f[2]/2)/a.crop[2]*b.width,b.y+(f[1]+f[3])/a.crop[3]*b.height)[1],draw:()=>ctx.drawImage(im,a.crop[0]+f[0],a.crop[1]+f[1],f[2],f[3],b.x+f[0]/a.crop[2]*b.width,b.y+f[1]/a.crop[3]*b.height,f[2]/a.crop[2]*b.width,f[3]/a.crop[3]*b.height)});
  // The fixed foundation remains below actors; roof and front panels fade
  // continuously over the revealed room and disappear completely indoors.
  if(roofImage&&p.roof!=='hidden'&&!(southHQ&&cutaway===1)){
   const rect=a.roofRect||[0,0,a.crop[2],a.crop[3]];
   out.push({roof:true,y:100000,draw:()=>{
    ctx.save();ctx.globalAlpha=southHQ?1-cutaway:revealRoof?.08:1;
    if(southHQ)clipHeadquartersLayer(ctx,b,true);
    const bottom=southHQ?undefined:headquartersRoofBottom(p);
    if(bottom!==undefined){ctx.beginPath();ctx.moveTo(b.x,b.y);ctx.lineTo(b.x+b.width,b.y);ctx.lineTo(b.x+b.width,bottom);ctx.lineTo(b.x,bottom);ctx.closePath();ctx.clip()}
    ctx.drawImage(roofImage,b.x+rect[0]/a.crop[2]*b.width,b.y+rect[1]/a.crop[3]*b.height,rect[2]/a.crop[2]*b.width,rect[3]/a.crop[3]*b.height);ctx.restore();
   }});
  }
  for(let i=first;i<out.length;i++){
   out[i].layer=p.layer??0;
   if(HQ_INTERIOR_PROP_IDS.has(p.id)&&hqReveal<1){const draw=out[i].draw;out[i].draw=()=>{ctx.save();ctx.globalAlpha*=hqReveal;draw();ctx.restore()}}
  }
  if(p.rotation||p.flipX||p.flipY)for(let i=first;i<out.length;i++){const draw=out[i].draw;out[i].draw=()=>{ctx.save();rotatePlacement(ctx,p);draw();ctx.restore()}}
 }
 orderCircularWallDraws(circular);
 return out;
}
function rotatePlacement(ctx:CanvasRenderingContext2D,p:Placement){ctx.translate(p.x,p.y);ctx.rotate((p.rotation||0)*Math.PI/180);ctx.translate(-p.x,-p.y);if(p.flipX||p.flipY){const b=placementBounds(p),cx=b.x+b.width/2,cy=b.y+b.height/2;ctx.translate(cx,cy);ctx.scale(p.flipX?-1:1,p.flipY?-1:1);ctx.translate(-cx,-cy)}}
export type EditorView={x:number;y:number;zoom:number;follow:boolean;grid:boolean;collision:boolean;selected:string|null;ghost:Placement|null;placingSpawn:boolean;playing?:boolean;hideFoliage?:boolean};
export function editorCamera(width:number,height:number,w:World,view:EditorView,pixelRatio=Math.min(2,globalThis.devicePixelRatio||1),now=menuClock()){
 const lw=width/pixelRatio,lh=height/pixelRatio;
 const scale=Math.max(width/1800,height/900)*(view.playing?clampPlayZoom(view.zoom):view.zoom);
 const vw=width/scale,vh=height/scale;
 let x=view.follow?w.player.x-vw/2:view.x-vw/2,y=view.follow?w.player.y-vh*.53:view.y-vh/2;
 // Clamp the ordinary camera first. Menu framing may reveal the map's faded
 // edge behind the panel so the player is still visible at world boundaries.
 if(view.follow){const b=worldBounds(w);x=vw>b.width?b.left+(b.width-vw)/2:Math.max(b.left,Math.min(b.right-vw,x));y=vh>b.height?b.top+(b.height-vh)/2:Math.max(b.top,Math.min(b.bottom-vh,y))}
 const pan=stationMenuPan(w,lw,lh,{x,y,scale:scale/pixelRatio},!!(view.playing&&view.follow),now);return{scale,x:x+pan.x,y:y+pan.y};
}
export function drawWorldEditor(ctx:CanvasRenderingContext2D,atlas:Atlas,imgs:Record<string,HTMLImageElement>,w:World,view:EditorView,fade=0){
 const c=editorCamera(ctx.canvas.width,ctx.canvas.height,w,view,Math.min(2,(ctx as CanvasRenderingContext2D&{pixelRatio?:number}).pixelRatio||globalThis.devicePixelRatio||1));clearTerrainViewport(ctx);if(w.scene){ctx.fillStyle=w.scene.background;ctx.fillRect(0,0,ctx.canvas.width,ctx.canvas.height)}ctx.save();ctx.scale(c.scale,c.scale);ctx.translate(-c.x,-c.y);if(w.combatTest&&!w.weather?.reducedMotion){const t=timeOf(w),amount=Math.min(1,Math.max(0,(w.shakeUntil-t)/.12));if(amount)ctx.translate(Math.sin(t*139)*2*amount/c.scale,Math.cos(t*113)*1.5*amount/c.scale)}if(w.scene)drawSceneTerrain(ctx,imgs,w.scene);else drawHomeTerrain(ctx,imgs,w.layout?.terrainImage,w.layout?.terrainBorder,{x:c.x,y:c.y,width:ctx.canvas.width/c.scale,height:ctx.canvas.height/c.scale});drawPlacedGround(ctx,imgs,w.layout,view.hideFoliage,{x:c.x,y:c.y,width:ctx.canvas.width/c.scale,height:ctx.canvas.height/c.scale,scale:c.scale});
 const pickupScale=c.scale/Math.min(2,(ctx as CanvasRenderingContext2D&{pixelRatio?:number}).pixelRatio||globalThis.devicePixelRatio||1);
 if(view.playing)drawFieldKitTarget(ctx,w,pickupScale);
 const pickupCues=view.playing?visiblePickupCues(w,{x:c.x,y:c.y,width:ctx.canvas.width/c.scale,height:ctx.canvas.height/c.scale,scale:c.scale}):[];
 const draws=[...stoneDrawables(ctx,imgs,w,{x:c.x,y:c.y,width:ctx.canvas.width/c.scale,height:ctx.canvas.height/c.scale}),...scrapDrawables(ctx,imgs,w,{x:c.x,y:c.y,width:ctx.canvas.width/c.scale,height:ctx.canvas.height/c.scale}),...predatorDrawables(ctx,imgs,w,{x:c.x,y:c.y,width:ctx.canvas.width/c.scale,height:ctx.canvas.height/c.scale,scale:c.scale}),...placedDrawables(ctx,imgs,w,true,{x:c.x,y:c.y,width:ctx.canvas.width/c.scale,height:ctx.canvas.height/c.scale,scale:c.scale},view.hideFoliage),...bonfireFoodDrawables(ctx,imgs,w),...treeLogDrawables(ctx,imgs,w,{x:c.x,y:c.y,width:ctx.canvas.width/c.scale,height:ctx.canvas.height/c.scale}),...combatDrawables(ctx,imgs,w),...chickenDrawables(ctx,imgs,w,{x:c.x,y:c.y,width:ctx.canvas.width/c.scale,height:ctx.canvas.height/c.scale,scale:c.scale}),...deerDrawables(ctx,imgs,w,{x:c.x,y:c.y,width:ctx.canvas.width/c.scale,height:ctx.canvas.height/c.scale,scale:c.scale}),...rabbitDrawables(ctx,imgs,w,{x:c.x,y:c.y,width:ctx.canvas.width/c.scale,height:ctx.canvas.height/c.scale,scale:c.scale})];if(!brutePlayerCarried(w))draws.push({y:w.player.y,draw:()=>drawWorker(ctx,imgs,w,atlas)});
 draws.push(...bowArrowDrawables(ctx,imgs,w));
 const outline=!brutePlayerCarried(w)&&!view.hideFoliage&&(view.playing||view.follow)&&foliagePlayerOutline(ctx,imgs,w,c.scale);if(outline)draws.push(outline);
 draws.sort(compareWorldDrawables).forEach(o=>o.draw());
 if(w.scene)for(const polygon of w.scene.foreground){ctx.save();ctx.beginPath();polygon.forEach(([x,y],i)=>i?ctx.lineTo(x,y):ctx.moveTo(x,y));ctx.closePath();ctx.clip();drawSceneTerrain(ctx,imgs,w.scene);ctx.restore()}
 drawCampLighting(ctx,w,{x:c.x,y:c.y,width:ctx.canvas.width/c.scale,height:ctx.canvas.height/c.scale});
 if(w.scene?.weather!=='sheltered'&&w.scene?.lighting!=='baked'&&w.weather){const weatherCtx=ctx as CanvasRenderingContext2D&{artworkSilhouette?:(image:HTMLImageElement,crop?:readonly number[])=>ShelterOutline;drawWeather?:(s:WeatherState,v:WeatherView,n:number,shelters:readonly (readonly [number,number][])[])=>void};weatherCtx.drawWeather?.(w.weather,{x:c.x,y:c.y,width:ctx.canvas.width/c.scale,height:ctx.canvas.height/c.scale,scale:c.scale,pixelRatio:Math.min(2,(ctx as CanvasRenderingContext2D&{pixelRatio?:number}).pixelRatio||globalThis.devicePixelRatio||1)},nightStrength(w),w.weather.rain&&weatherCtx.artworkSilhouette?weatherShelters(w,imgs,(im,crop)=>weatherCtx.artworkSilhouette!(im,crop)):[])}
 if(w.weather){const strike=groundLightning(w,{x:c.x,y:c.y,width:ctx.canvas.width/c.scale,height:ctx.canvas.height/c.scale});if(strike)(ctx as CanvasRenderingContext2D&{drawGroundLightning?:(strike:GroundStrike,age:number,reduced:boolean)=>void}).drawGroundLightning?.(strike,w.weather.strikeAge,w.weather.reducedMotion)}
 // These are light sources: darkness and weather must not dim their cores.
 if(w.combatTest){drawCombatGround(ctx,w,imgs);drawBomberGround(ctx,w);drawWalkerEmissives(ctx,w);drawBomberEmissives(ctx,w)}
 if(view.playing)drawResourceOutlines(ctx,imgs,w,{x:c.x,y:c.y,width:ctx.canvas.width/c.scale,height:ctx.canvas.height/c.scale,scale:pickupScale},view.hideFoliage,pickupCues);
 drawCombatFeedback(ctx,w,imgs);
 if(view.playing){drawAnimalHealth(ctx,w,{x:c.x,y:c.y,width:ctx.canvas.width/c.scale,height:ctx.canvas.height/c.scale,scale:pickupScale});drawAnimalHitFeedback(ctx,w,pickupScale)}
 if(view.playing)drawPickupGlints(ctx,pickupCues,pickupScale,timeOf(w),getFieldKitTarget(w),!!w.weather?.reducedMotion);
 if(view.playing){drawProgressionMarkers(ctx,w,pickupScale);drawBuildingCondition(ctx,w,pickupScale,{x:c.x,y:c.y,width:ctx.canvas.width/c.scale,height:ctx.canvas.height/c.scale})}
 if(view.playing)drawCampfireHud(ctx,imgs,w,pickupScale);
 if(view.playing)drawBowLock(ctx,w,{x:c.x,y:c.y,width:ctx.canvas.width/c.scale,height:ctx.canvas.height/c.scale,scale:pickupScale});
 if(view.playing)drawWorldWaypoint(ctx,w,{x:c.x,y:c.y,width:ctx.canvas.width/c.scale,height:ctx.canvas.height/c.scale,scale:pickupScale});
 if(view.grid&&!view.playing&&!w.scene){ctx.strokeStyle=nightStrength(w)>.5?'#a4c6c344':'#153d4430';ctx.lineWidth=1/c.scale;ctx.beginPath();const bounds=worldBounds(w);for(let x=Math.ceil(bounds.left/80)*80;x<bounds.right;x+=80){ctx.moveTo(x,bounds.top);ctx.lineTo(x,bounds.bottom)}for(let y=Math.ceil(bounds.top/80)*80;y<bounds.bottom;y+=80){ctx.moveTo(bounds.left,y);ctx.lineTo(bounds.right,y)}ctx.stroke()}
 if(view.collision&&!view.playing)for(const p of w.layout?.items||[])for(const b of placementBodies(p)){ctx.fillStyle='#ff6c4130';ctx.strokeStyle='#ff805d';ctx.lineWidth=2/c.scale;if(b.shape==='rect'){ctx.fillRect(b.x-b.hw,b.y-b.hh,b.hw*2,b.hh*2);ctx.strokeRect(b.x-b.hw,b.y-b.hh,b.hw*2,b.hh*2)}else if(b.shape==='polygon'){ctx.beginPath();b.points.forEach(([x,y],i)=>i?ctx.lineTo(x,y):ctx.moveTo(x,y));ctx.closePath();ctx.fill();ctx.stroke()}else if(b.shape==='segment'){ctx.lineWidth=b.r*2;ctx.globalAlpha=.5;ctx.beginPath();ctx.moveTo(b.x,b.y);ctx.lineTo(b.ex,b.ey);ctx.stroke();ctx.globalAlpha=1}}
 const selection=w.layout?.items.find(p=>p.id===view.selected);if(selection&&!view.playing&&!w.scene&&!(view.hideFoliage&&isFoliageAsset(ASSET_BY_ID.get(selection.assetId)))){const b=placementBounds(selection);ctx.save();rotatePlacement(ctx,selection);ctx.strokeStyle=selection.locked?'#a2ecdf':'#ffe3a3';ctx.lineWidth=2.5/c.scale;ctx.setLineDash([8/c.scale,5/c.scale]);ctx.strokeRect(b.x,b.y,b.width,b.height);ctx.restore();ctx.setLineDash([]);ctx.fillStyle='#ffcf62';ctx.beginPath();ctx.arc(selection.x,selection.y,7/c.scale,0,Math.PI*2);ctx.fill();if(['generator','hearth','well','storage'].includes(selection.role)){ctx.strokeStyle='#8ae0d0';ctx.beginPath();ctx.arc(selection.x,selection.y+(selection.role==='generator'?85:65),19,0,Math.PI*2);ctx.stroke()}}
 if(view.ghost&&!view.playing&&!w.scene){const p=view.ghost,a=ASSET_BY_ID.get(p.assetId),im=a&&imgs[assetImageKey(a.image)];if(a&&im&&!(view.hideFoliage&&isFoliageAsset(a))){const b=placementBounds(p);ctx.save();rotatePlacement(ctx,p);ctx.globalAlpha=.65;ctx.drawImage(im,...a.crop as [number,number,number,number],b.x,b.y,b.width,b.height);ctx.restore()}}
 const spawn=w.layout?.spawn;if(spawn&&!view.playing&&!w.scene){ctx.strokeStyle='#a2ecdf';ctx.lineWidth=2/c.scale;ctx.beginPath();ctx.arc(spawn.x,spawn.y,24,0,Math.PI*2);ctx.moveTo(spawn.x-33,spawn.y);ctx.lineTo(spawn.x+33,spawn.y);ctx.moveTo(spawn.x,spawn.y-33);ctx.lineTo(spawn.x,spawn.y+33);ctx.stroke();ctx.fillStyle='#133338';ctx.fillRect(spawn.x-45,spawn.y+32,90,24);ctx.fillStyle='#b7ecdf';ctx.font="900 18px 'Barlow Condensed'";ctx.textAlign='center';ctx.fillText('SPAWN',spawn.x,spawn.y+50)}ctx.restore();
 drawCombatScreenFeedback(ctx,w);
 if(fade>0){ctx.save();ctx.globalAlpha=Math.min(1,fade);ctx.fillStyle='#100e0c';ctx.fillRect(0,0,ctx.canvas.width,ctx.canvas.height);ctx.restore()}
}
