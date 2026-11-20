import {drawBurningHearth,hasPaintedHearthAnimation} from './hearth-animation-art';
import {drawBuildingCondition} from './building-condition-renderer';
import {lootChestDrawables,drawLootChestGround} from './loot-chest-renderer';
import {headquartersCutawayAmount,clipHeadquartersDoorway,drawHeadquartersExterior} from './headquarters-cutaway';
import {HQ_SOUTH_INTERIOR} from './headquarters-south-art';
import {headquartersRoofBottom,withinRoofApproach,headquartersRaidVisible} from './headquarters-roof';
import {campBuildingArt} from './camp-restoration';
import {drawBomberGround,drawBomberEmissives} from './bomber-renderer';
import {drawCampFurnace} from './furnace-renderer';
import {drawRockGround} from './rock-ground';
import {drawRockFace,rockMaterials,type RockMaterial} from './rock-surface';
import {drawMineableRock} from './rock-mining';
import {stoneDrawables} from './mining-renderer';
import {drawForagePlant} from './forage-renderer';
import {potatoPatchDrawables} from './potato-patch-renderer';
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
import {clampPlayZoom,FULL_PLAY_ZOOM,MIN_PLAY_ZOOM} from './play-zoom';
import {drawFieldKitTarget,getFieldKitTarget} from './field-kit-target';
import {gateDrawables} from './camp-gate-renderer';
import {drawTree} from './tree-chopping';
import {drawTreeShade,treeShadeFrames} from './tree-shade';
import {worldBounds} from './world-bounds';
import {drawCampContact,drawCampGroundContact,hasCampGroundContact} from './camp-contact-renderer';
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
import {ASSET_BY_ID,assetImageKey,type WorldAsset} from './world-assets';
import {placedAnimationFrame} from './step-on-animation';
import {compareWorldDrawables,placementGeometryAsset,placementBounds,placementPoint,placementBodies,type Placement,type WorldLayout} from './world-layout';
import {timeOf,type World} from './survival-engine';
import {MAP_WIDTH,MAP_HEIGHT} from './factory-map';
import {drawWorker} from './worker-renderer';
import {brutePlayerCarried} from './brute-control';
import {bowArrowDrawables} from './bow-art';
import {playerOutlinePass} from './foliage-visibility';
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
type CampGroundContact={placement:Placement;asset:WorldAsset;source:string;canopy?:number;rock?:RockMaterial};
function drawCampGroundContacts(ctx:CanvasRenderingContext2D,contacts:readonly CampGroundContact[],w:World,shade?:HTMLImageElement,hideFoliage=false){
 const overcast=Math.max(w.weather?.rain??0,w.weather?.fog??0);
 const daylight=(1-nightStrength(w))*(1-.65*overcast);
 for(const {placement:p,asset,source,canopy,rock} of contacts){
  if(canopy!==undefined){
   if(shade)drawTreeShade(ctx,shade,w,p,canopy,daylight);
   continue;
  }
  ctx.save();
  if(p.rotation||p.flipX||p.flipY)rotatePlacement(ctx,p);
  if(rock)drawRockGround(ctx,p,asset,placementBounds(p),rock,hideFoliage);
  else drawCampGroundContact(ctx,p,asset,source);
  ctx.restore();
 }
}
export function placedDrawables(ctx:CanvasRenderingContext2D,imgs:Record<string,HTMLImageElement>,w:World,editor=false,viewport?:FoliageViewport,hideFoliage=false,contacts?:CampGroundContact[],outline?:ReturnType<typeof playerOutlinePass>){
 const out:{roof?:boolean;layer?:number;y:number;draw:()=>void}[]=[];if(!w.layout)return out;
 const circular:CircularWallDraw[]=[];
 for(const p of visiblePlacements(w.layout,viewport)){const a=ASSET_BY_ID.get(p.assetId);if(!a)continue;if(!editor&&['animal','enemySpawn'].includes(p.role))continue;if(!editor&&['scrap','fuel','pallets'].includes(p.role)&&!w.loot.some(l=>l.placementId===p.id))continue;if(!editor&&p.role==='crate'&&!w.breakables.some(b=>b.placementId===p.id&&b.hp>0))continue;
  if(hideFoliage&&isFoliageAsset(a)||a.foliage&&!foliageVisible(p,viewport))continue;
  const add=(d:typeof out[number],ground=false)=>{
   out.push(d);
   if(!ground&&outline?.placements.has(p)){
    outline.covers.push(d);if(a.foliage)outline.leaves.add(d);
   }
  };
  if(a.gate&&viewport&&!p.rotation&&!p.flipX&&!p.flipY){
   const b=placementBounds(p);
   if(b.x+b.width<viewport.x||b.x>viewport.x+viewport.width||b.y+b.height<viewport.y||b.y>viewport.y+viewport.height)continue;
  }
  const parts=a.gate?gateDrawables(ctx,imgs,w,p,a):potatoPatchDrawables(ctx,imgs,w,p);
  if(parts){
   for(const part of parts){
    const ground='ground' in part&&part.ground===true;
    add({y:part.y,layer:ground?Math.min(0,p.layer??0):p.layer??0,draw:()=>{
     ctx.save();rotatePlacement(ctx,p);part.draw();ctx.restore();
    }},ground);
   }
   continue;
  }
  const first=out.length,restoration=campBuildingArt(w,p.assetId);
  // Hold the approved first pose until the complete cycle arrives. A delayed
  // animation frame must never make an object disappear or flicker in Build.
  const frames=restoration?undefined:a.openFrames?.length?a.openFrames:a.frames;
  const animationReady=frames?.every(url=>!!imgs[assetImageKey(url)]);
  const frame=animationReady?(a.openFrames?.length?chestFrame(w,p.id,frames!.length):placedAnimationFrame(w,p,a)):0;
  const requestedSource=restoration?.image||frames?.[frame]||a.image,requestedImage=imgs[assetImageKey(requestedSource)];
  const b=placementBounds(p),im=requestedImage||imgs[assetImageKey(a.image)];if(!im)continue;
  const rock=rockMaterials.get(a.id);
  if(contacts){
   const canopy=treeShadeFrames.get(a.image);
   if(canopy!==undefined||hasCampGroundContact(a)||(rock&&!a.groundDetail&&w.rockMining?.[p.id]?.hp!==0))contacts.push({placement:p,asset:a,source:restoration&&requestedImage?restoration.image:a.image,canopy,rock});
  }
  const southHQ=a.image===HQ_SOUTH_INTERIOR&&!!a.interior;
  const cutaway=southHQ?headquartersCutawayAmount(p,w):0;
  // The full HQ facade is a background layer when the survivor's feet are
  // outside its south entrance. It only occludes a survivor behind the facade.
  const [,playerLocalY]=southHQ?placementPoint(p,w.player.x,w.player.y,true):[0,0];
  const playerInFrontOfHQ=southHQ&&p.roof==='auto'&&playerLocalY>=b.y+b.height*.79;
  const revealRoof=!!(restoration?.roof||a.roof)&&(p.allowTransparency??placementGeometryAsset(p)?.allowTransparency)!==false&&p.roof==='auto'&&(withinRoofApproach(p,w.player.x,w.player.y)||headquartersRaidVisible(p,w));
  const roofImage=(restoration?.roof||a.roof)&&imgs[assetImageKey(restoration?.roof||a.roof!)];
  const segment=a.perimeter==='wall'?a.segments?.[0]:undefined;
  const curve=a.perimeterCurve??(segment?[[segment.x,segment.y],[segment.ex,segment.ey]]:undefined);
  if(curve?.length){
   const transformed=!!(p.rotation||p.flipX||p.flipY);
   if(viewport&&!transformed&&(b.x+b.width<viewport.x||b.x>viewport.x+viewport.width||b.y+b.height<viewport.y||b.y>viewport.y+viewport.height))continue;
   // Sort the complete painted bay at its ground line in the survivor's column.
   // Rotated and mirrored wall placements use the same world-space comparison.
   const ground=transformed?curve.map(([x,y])=>{
    const [wx,wy]=placementPoint(p,p.x+x*p.scale,p.y+y*p.scale);
    return [(wx-p.x)/p.scale,(wy-p.y)/p.scale];
   }):curve;
   const depth=circularWallDepth(ground,{x:(w.player.x-p.x)/p.scale,y:(w.player.y-p.y)/p.scale},a.perimeterRise??(a.perimeterCurve?180:235));
   const distant=a.perimeterCurve?0:(ground[0][1]+ground[1][1])*.5;
   const drawable={layer:p.layer??0,y:p.y+(depth.near?depth.depth:distant)*p.scale,draw:()=>{
    if(transformed){ctx.save();rotatePlacement(ctx,p)}
    ctx.drawImage(im,...a.crop as [number,number,number,number],b.x,b.y,b.width,b.height);
    if(transformed)ctx.restore();
   }};
   add(drawable);
   if(a.perimeterCurve&&!transformed)circular.push({drawable,order:a.perimeterDrawOrder??0,priority:depth.near?1000:1,group:circularWallGroup(curve,p)});
   continue;
  }
  // Only contacted/recovering plants need deformed geometry. All idle plants
  // retain their original pixels through the ordinary image path.
  const animatePlant=!!a.foliage&&(viewport?.scale??1)>=.42&&!!w.foliageMotions?.[p.id];
  const drawBase=()=>{if(southHQ){
   // All four HQ sprites use the same canvas, footprint, table and stairs.
   // Draw one complete interior below actors; never splice mismatched upper/lower
   // image regions (the former hard seam left a square cut out of the façade).
   drawCampContact(ctx,p,a);
   ctx.drawImage(im,b.x,b.y,b.width,b.height);
   return;
  }if(restoration){const ruin=imgs[assetImageKey(restoration.image)];if(ruin){ctx.drawImage(ruin,b.x,b.y,b.width,b.height);return}}if(drawCampFurnace(ctx,imgs,w,p))return;if(drawWarehouse(ctx,imgs,w,p))return;if(drawForagePlant(ctx,imgs,w,p,animatePlant))return;if(drawTree(ctx,im,w,p))return;if(drawMineableRock(ctx,im,w,p,a.crop))return;if(a.puddle){drawPuddle(ctx,im,w,p,a);return}if(a.foliage){drawFoliage(ctx,im,w,p,a,animatePlant);return}drawCampContact(ctx,p,a);ctx.save();
   if(p.role==='hearth'&&!placedFireLit(w,p)&&a.unlit){const off=imgs[assetImageKey(a.unlit)];if(off){const anchor=a.unlitAnchor||[627,1190],size=a.unlitSize||[1254,1254];ctx.drawImage(off,p.frame?b.x:p.x-anchor[0]/size[0]*b.width,p.frame?b.y:p.y-anchor[1]/size[1]*b.height,b.width,b.height)}else ctx.drawImage(im,...a.crop as [number,number,number,number],b.x,b.y,b.width,b.height)}
   else if(rock)drawRockFace(ctx,im,a.crop,b,rock,!!a.groundDetail);
   else if(hasPaintedHearthAnimation(a))drawBurningHearth(ctx,imgs,imgs[assetImageKey(a.image)]||im,b,timeOf(w),!!w.weather?.reducedMotion);
   else ctx.drawImage(im,...a.crop as [number,number,number,number],b.x,b.y,b.width,b.height);ctx.restore()};
  // The north stockade is behind the HQ on the map. Paint the complete
  // HQ interior AFTER the rear wall and distant tree, but BEFORE actors in
  // the room. The sprite's own alpha hides only what it actually covers;
  // no polygon punches a gap through the surrounding palisade.
  // Rear wall feet begin at v=.34; indoor player feet start at v>.36.
  const hallFloorDepth=b.y+b.height*.35;
  add({y:southHQ?hallFloorDepth:a.interior?-10000:a.id==='art_hq_woven_rug'?-9999:placementPoint(p,p.x,p.y)[1],draw:drawBase});
  for(const f of southHQ||restoration?[]:a.foreground||[])add({y:placementPoint(p,b.x+(f[0]+f[2]/2)/a.crop[2]*b.width,b.y+(f[1]+f[3])/a.crop[3]*b.height)[1],draw:()=>ctx.drawImage(im,a.crop[0]+f[0],a.crop[1]+f[1],f[2],f[3],b.x+f[0]/a.crop[2]*b.width,b.y+f[1]/a.crop[3]*b.height,f[2]/a.crop[2]*b.width,f[3]/a.crop[3]*b.height)});
  // The fixed foundation remains below actors; roof and front panels fade
  // continuously over the revealed room and disappear completely indoors.
  if(roofImage&&p.roof!=='hidden'&&!(southHQ&&cutaway===1)){
   const rect=a.roofRect||[0,0,a.crop[2],a.crop[3]];
   add({roof:!playerInFrontOfHQ,layer:playerInFrontOfHQ?0:undefined,y:playerInFrontOfHQ?b.y+b.height*.79:100000,draw:()=>{
    ctx.save();
    if(southHQ){
     ctx.save();
     ctx.globalAlpha*=1-cutaway;
     clipHeadquartersDoorway(ctx,b,!!restoration?.roof);
     ctx.fillStyle='rgba(0,0,0,0.16)';
     ctx.fillRect(b.x,b.y,b.width,b.height);
     ctx.restore();
     drawHeadquartersExterior(ctx,roofImage,b,cutaway);
     ctx.restore();
     return;
    }
    ctx.globalAlpha=revealRoof?.08:1;
    const bottom=headquartersRoofBottom(p);
    if(bottom!==undefined){ctx.beginPath();ctx.moveTo(b.x,b.y);ctx.lineTo(b.x+b.width,b.y);ctx.lineTo(b.x+b.width,bottom);ctx.lineTo(b.x,bottom);ctx.closePath();ctx.clip()}
    ctx.drawImage(roofImage,b.x+rect[0]/a.crop[2]*b.width,b.y+rect[1]/a.crop[3]*b.height,rect[2]/a.crop[2]*b.width,rect[3]/a.crop[3]*b.height);ctx.restore();
   }});
  }
  for(let i=first;i<out.length;i++){
   // HQ interior uses world depth regardless of the saved building editor
   // layer. It follows the back wall but precedes valid indoor actors.
   out[i].layer=southHQ&&i===first?0:(out[i].layer??p.layer??0);
  }
  if(p.rotation||p.flipX||p.flipY)for(let i=first;i<out.length;i++){const draw=out[i].draw;out[i].draw=()=>{ctx.save();rotatePlacement(ctx,p);draw();ctx.restore()}}
 }
 orderCircularWallDraws(circular);
 return out;
}
function rotatePlacement(ctx:CanvasRenderingContext2D,p:Placement){ctx.translate(p.x,p.y);ctx.rotate((p.rotation||0)*Math.PI/180);ctx.translate(-p.x,-p.y);if(p.flipX||p.flipY){const b=placementBounds(p),cx=b.x+b.width/2,cy=b.y+b.height/2;ctx.translate(cx,cy);ctx.scale(p.flipX?-1:1,p.flipY?-1:1);ctx.translate(-cx,-cy)}}
export type EditorView={x:number;y:number;zoom:number;follow:boolean;grid:boolean;collision:boolean;selected:string|null;ghost:Placement|null;placingSpawn:boolean;playing?:boolean;fullZoom?:boolean;hideFoliage?:boolean};
export function editorCamera(width:number,height:number,w:World,view:EditorView,pixelRatio=Math.min(2,globalThis.devicePixelRatio||1),now=menuClock()){
 const lw=width/pixelRatio,lh=height/pixelRatio;
 const scale=Math.max(width/1800,height/900)*(view.playing?clampPlayZoom(view.zoom,view.fullZoom?FULL_PLAY_ZOOM:MIN_PLAY_ZOOM):view.zoom);
 const vw=width/scale,vh=height/scale;
 let x=view.follow?w.player.x-vw/2:view.x-vw/2,y=view.follow?w.player.y-vh*.53:view.y-vh/2;
 // Clamp the ordinary camera first. Menu framing may reveal the map's faded
 // edge behind the panel so the player is still visible at world boundaries.
 if(view.follow){const b=worldBounds(w);x=vw>b.width?b.left+(b.width-vw)/2:Math.max(b.left,Math.min(b.right-vw,x));y=vh>b.height?b.top+(b.height-vh)/2:Math.max(b.top,Math.min(b.bottom-vh,y))}
 const pan=stationMenuPan(w,lw,lh,{x,y,scale:scale/pixelRatio},!!(view.playing&&view.follow),now);return{scale,x:x+pan.x,y:y+pan.y};
}
export function drawWorldEditor(ctx:CanvasRenderingContext2D,atlas:Atlas,imgs:Record<string,HTMLImageElement>,w:World,view:EditorView,fade=0,peers:readonly import('./coop-protocol').CoopPeer[]=[]){
 const c=editorCamera(ctx.canvas.width,ctx.canvas.height,w,view,Math.min(2,(ctx as CanvasRenderingContext2D&{pixelRatio?:number}).pixelRatio||globalThis.devicePixelRatio||1));
 const viewport={x:c.x,y:c.y,width:ctx.canvas.width/c.scale,height:ctx.canvas.height/c.scale,scale:c.scale};
 clearTerrainViewport(ctx);if(w.scene){ctx.fillStyle=w.scene.background;ctx.fillRect(0,0,ctx.canvas.width,ctx.canvas.height)}ctx.save();ctx.scale(c.scale,c.scale);ctx.translate(-c.x,-c.y);if(w.combatTest&&!w.weather?.reducedMotion){const t=timeOf(w),amount=Math.min(1,Math.max(0,(w.shakeUntil-t)/.12));if(amount)ctx.translate(Math.sin(t*139)*2*amount/c.scale,Math.cos(t*113)*1.5*amount/c.scale)}if(w.scene)drawSceneTerrain(ctx,imgs,w.scene);else drawHomeTerrain(ctx,imgs,w.layout?.terrainImage,w.layout?.terrainBorder,viewport);
 drawPlacedGround(ctx,imgs,w.layout,view.hideFoliage,viewport);
 const campContacts=w.scene?undefined:[] as CampGroundContact[];
 const outline=(view.playing||view.follow)&&!brutePlayerCarried(w)?playerOutlinePass(ctx,imgs,w,c.scale):undefined;
 const placed=placedDrawables(ctx,imgs,w,true,viewport,view.hideFoliage,campContacts,outline);
 if(campContacts)drawCampGroundContacts(ctx,campContacts,w,imgs.treeCanopyShade,view.hideFoliage);
 const pickupScale=c.scale/Math.min(2,(ctx as CanvasRenderingContext2D&{pixelRatio?:number}).pixelRatio||globalThis.devicePixelRatio||1);
 if(view.playing)drawLootChestGround(ctx,imgs,w,{x:c.x,y:c.y,width:ctx.canvas.width/c.scale,height:ctx.canvas.height/c.scale});
 // Chest and effects now share one depth-sorted drawable, behind players in front.
 const pickupCues=view.playing?visiblePickupCues(w,{x:c.x,y:c.y,width:ctx.canvas.width/c.scale,height:ctx.canvas.height/c.scale,scale:c.scale}):[];
 const groundLoot=[...stoneDrawables(ctx,imgs,w,viewport),...scrapDrawables(ctx,imgs,w,viewport),...treeLogDrawables(ctx,imgs,w,viewport)];
 const chests=view.playing?lootChestDrawables(ctx,imgs,w,viewport):[];
 if(outline){
  for(const loot of groundLoot){
   if(Math.abs(loot.x-w.player.x)<110&&Math.abs(loot.y-w.player.y)<160)outline.covers.push(loot);
  }
  for(const chest of chests){
   if(Math.abs(chest.x-w.player.x)<160&&Math.abs(chest.y-w.player.y)<250)outline.covers.push({y:chest.y,draw:chest.mask});
  }
 }
 const draws=[...groundLoot,...predatorDrawables(ctx,imgs,w,viewport),...placed,...chests,...bonfireFoodDrawables(ctx,imgs,w),...combatDrawables(ctx,imgs,w),...chickenDrawables(ctx,imgs,w,viewport),...deerDrawables(ctx,imgs,w,viewport),...rabbitDrawables(ctx,imgs,w,viewport)];if(!brutePlayerCarried(w))draws.push({y:w.player.y,draw:()=>drawWorker(ctx,imgs,w,atlas)});
 draws.push(...bowArrowDrawables(ctx,imgs,w));
 // Co-op phase 1: visual peers only. No peer is inserted into the local simulation.
 for(const peer of peers){
  if(peer.sceneId!==(w.scene?.id||'camp'))continue;
  const other:World={...w,survivorRole:peer.role,player:{...w.player,x:peer.x,y:peer.y,direction:peer.direction,moving:peer.moving,sprinting:peer.sprinting,walkDistance:peer.walkDistance,walkBlend:peer.moving?1:0,runBlend:peer.sprinting?1:0,equipped:null,downedUntil:0,hurtUntil:0},attackReady:0,axeSwing:undefined,spearThrust:undefined,swordThrust:undefined,bowShot:undefined,bruteGrab:undefined,buildingRepair:undefined,repairHammerUntil:undefined};
  draws.push({y:peer.y,draw:()=>drawWorker(ctx,imgs,other,atlas)});
 }
 if(w.scene){
  const scene=w.scene;
  for(const polygon of scene.foreground){
   const face={roof:true,layer:Infinity,y:0,draw:()=>{
    ctx.save();ctx.beginPath();polygon.forEach(([x,y],i)=>i?ctx.lineTo(x,y):ctx.moveTo(x,y));
    ctx.closePath();ctx.clip();drawSceneTerrain(ctx,imgs,scene);ctx.restore();
   }};
   draws.push(face);
   if(outline&&!polygon.every(([x])=>x<outline.bounds.x)&&!polygon.every(([x])=>x>outline.bounds.x+outline.bounds.width)&&
    !polygon.every(([,y])=>y<outline.bounds.y)&&!polygon.every(([,y])=>y>outline.bounds.y+outline.bounds.height))outline.covers.push(face);
  }
 }
 const edge=outline?.drawable();if(edge)draws.push(edge);
 draws.sort(compareWorldDrawables).forEach(o=>o.draw());
 drawCampLighting(ctx,w,{x:c.x,y:c.y,width:ctx.canvas.width/c.scale,height:ctx.canvas.height/c.scale},imgs);
 if(w.scene?.weather!=='sheltered'&&w.scene?.lighting!=='baked'&&w.weather){const weatherCtx=ctx as CanvasRenderingContext2D&{artworkSilhouette?:(image:HTMLImageElement,crop?:readonly number[])=>ShelterOutline;drawWeather?:(s:WeatherState,v:WeatherView,n:number,shelters:readonly (readonly [number,number][])[])=>void};weatherCtx.drawWeather?.(w.weather,{x:c.x,y:c.y,width:ctx.canvas.width/c.scale,height:ctx.canvas.height/c.scale,scale:c.scale,pixelRatio:Math.min(2,(ctx as CanvasRenderingContext2D&{pixelRatio?:number}).pixelRatio||globalThis.devicePixelRatio||1)},nightStrength(w),w.weather.rain&&weatherCtx.artworkSilhouette?weatherShelters(w,imgs,(im,crop)=>weatherCtx.artworkSilhouette!(im,crop)):[])}
 if(w.weather){const strike=groundLightning(w,{x:c.x,y:c.y,width:ctx.canvas.width/c.scale,height:ctx.canvas.height/c.scale});if(strike)(ctx as CanvasRenderingContext2D&{drawGroundLightning?:(strike:GroundStrike,age:number,reduced:boolean)=>void}).drawGroundLightning?.(strike,w.weather.strikeAge,w.weather.reducedMotion)}
 // These are light sources: darkness and weather must not dim their cores.
 if(w.combatTest){drawCombatGround(ctx,w,imgs);drawBomberGround(ctx,w);drawWalkerEmissives(ctx,w);drawBomberEmissives(ctx,w)}
 if(view.playing)drawResourceOutlines(ctx,imgs,w,{x:c.x,y:c.y,width:ctx.canvas.width/c.scale,height:ctx.canvas.height/c.scale,scale:pickupScale},view.hideFoliage,pickupCues);
 drawCombatFeedback(ctx,w,imgs);
 if(view.playing){drawAnimalHealth(ctx,w,{x:c.x,y:c.y,width:ctx.canvas.width/c.scale,height:ctx.canvas.height/c.scale,scale:pickupScale});drawAnimalHitFeedback(ctx,w,pickupScale)}
 if(view.playing)drawPickupGlints(ctx,pickupCues,pickupScale,timeOf(w),getFieldKitTarget(w),!!w.weather?.reducedMotion);
 if(view.playing)drawFieldKitTarget(ctx,w,pickupScale);
 if(view.playing){drawBuildingCondition(ctx,w,pickupScale,{x:c.x,y:c.y,width:ctx.canvas.width/c.scale,height:ctx.canvas.height/c.scale})}
 if(view.playing)drawCampfireHud(ctx,imgs,w,pickupScale);
 if(view.playing)drawBowLock(ctx,w,{x:c.x,y:c.y,width:ctx.canvas.width/c.scale,height:ctx.canvas.height/c.scale,scale:pickupScale});
 if(view.playing)drawWorldWaypoint(ctx,w,{x:c.x,y:c.y,width:ctx.canvas.width/c.scale,height:ctx.canvas.height/c.scale,scale:pickupScale});
 if(view.grid&&!view.playing&&!w.scene){ctx.strokeStyle=nightStrength(w)>.5?'#a4c6c344':'#153d4430';ctx.lineWidth=1/c.scale;ctx.beginPath();const bounds=worldBounds(w);for(let x=Math.ceil(bounds.left/80)*80;x<bounds.right;x+=80){ctx.moveTo(x,bounds.top);ctx.lineTo(x,bounds.bottom)}for(let y=Math.ceil(bounds.top/80)*80;y<bounds.bottom;y+=80){ctx.moveTo(bounds.left,y);ctx.lineTo(bounds.right,y)}ctx.stroke()}
 if(view.collision&&!view.playing)for(const p of w.layout?.items||[])for(const b of placementBodies(p)){ctx.fillStyle='#ff6c4130';ctx.strokeStyle='#ff805d';ctx.lineWidth=2/c.scale;if(b.shape==='rect'){ctx.fillRect(b.x-b.hw,b.y-b.hh,b.hw*2,b.hh*2);ctx.strokeRect(b.x-b.hw,b.y-b.hh,b.hw*2,b.hh*2)}else if(b.shape==='polygon'){ctx.beginPath();b.points.forEach(([x,y],i)=>i?ctx.lineTo(x,y):ctx.moveTo(x,y));ctx.closePath();ctx.fill();ctx.stroke()}else if(b.shape==='segment'){ctx.lineWidth=b.r*2;ctx.globalAlpha=.5;ctx.beginPath();ctx.moveTo(b.x,b.y);ctx.lineTo(b.ex,b.ey);ctx.stroke();ctx.globalAlpha=1}}
 const selection=w.layout?.items.find(p=>p.id===view.selected);if(selection&&!view.playing&&!w.scene&&!(view.hideFoliage&&isFoliageAsset(ASSET_BY_ID.get(selection.assetId)))){const b=placementBounds(selection);ctx.save();rotatePlacement(ctx,selection);ctx.strokeStyle=selection.locked?'#a2ecdf':'#ffe3a3';ctx.lineWidth=2.5/c.scale;ctx.setLineDash([8/c.scale,5/c.scale]);ctx.strokeRect(b.x,b.y,b.width,b.height);ctx.restore();ctx.setLineDash([]);ctx.fillStyle='#ffcf62';ctx.beginPath();ctx.arc(selection.x,selection.y,7/c.scale,0,Math.PI*2);ctx.fill();if(['generator','hearth','well','storage'].includes(selection.role)){ctx.strokeStyle='#8ae0d0';ctx.beginPath();ctx.arc(selection.x,selection.y+(selection.role==='generator'?85:65),19,0,Math.PI*2);ctx.stroke()}}
 if(view.ghost&&!view.playing&&!w.scene){
  const p=view.ghost,a=ASSET_BY_ID.get(p.assetId),im=a&&imgs[assetImageKey(a.image)];
  if(a&&im&&!(view.hideFoliage&&isFoliageAsset(a))){
   const b=placementBounds(p),rock=rockMaterials.get(a.id);
   ctx.save();rotatePlacement(ctx,p);ctx.globalAlpha=.65;
   if(rock){
    drawRockGround(ctx,p,a,b,rock,view.hideFoliage);
    drawRockFace(ctx,im,a.crop,b,rock,!!a.groundDetail);
   }else if(!drawTree(ctx,im,w,p,'preview'))ctx.drawImage(im,...a.crop as [number,number,number,number],b.x,b.y,b.width,b.height);
   ctx.restore();
  }
 }
 const spawn=w.layout?.spawn;if(spawn&&!view.playing&&!w.scene){ctx.strokeStyle='#a2ecdf';ctx.lineWidth=2/c.scale;ctx.beginPath();ctx.arc(spawn.x,spawn.y,24,0,Math.PI*2);ctx.moveTo(spawn.x-33,spawn.y);ctx.lineTo(spawn.x+33,spawn.y);ctx.moveTo(spawn.x,spawn.y-33);ctx.lineTo(spawn.x,spawn.y+33);ctx.stroke();ctx.fillStyle='#133338';ctx.fillRect(spawn.x-45,spawn.y+32,90,24);ctx.fillStyle='#b7ecdf';ctx.font="900 18px 'Barlow Condensed'";ctx.textAlign='center';ctx.fillText('SPAWN',spawn.x,spawn.y+50)}ctx.restore();
 drawCombatScreenFeedback(ctx,w);
 if(fade>0){ctx.save();ctx.globalAlpha=Math.min(1,fade);ctx.fillStyle='#100e0c';ctx.fillRect(0,0,ctx.canvas.width,ctx.canvas.height);ctx.restore()}
}
