import {layoutViews} from './layout-views';
import {ASSET_BY_ID,assetImageKey,type WorldAsset} from './world-assets';
import {insideBuilding,placementBounds,placementPoint,placementGeometryAsset,type Placement,type WorldLayout} from './world-layout';
import type {World} from './survival-engine';
import type {ShelterOutline} from './weather-silhouette';
type Source={placement:Placement;asset:WorldAsset;image:HTMLImageElement;roof:boolean};
type Tracer=(image:HTMLImageElement,crop?:readonly number[])=>ShelterOutline;
let previousLayout:WorldLayout|undefined,previous:Source[]=[],polygons:[number,number][][]=[];
/** Keep visibility in sync with the actual roof draw, including locked tier frames,
 * shared artwork replacements, rotation, flipping and manual roof visibility. */
export function weatherShelters(w:World,images:Record<string,HTMLImageElement>,trace:Tracer){
 const sources:Source[]=[];
 for(const p of layoutViews(w.layout).shelters){
  const a=ASSET_BY_ID.get(p.assetId);if(!a?.interior)continue;
  const cutaway=(p.allowTransparency??placementGeometryAsset(p)?.allowTransparency)!==false&&p.roof==='auto'&&insideBuilding(p,w.player.x,w.player.y);
  const roof=!!a.roof&&p.roof!=='hidden'&&!cutaway,image=images[assetImageKey(roof?a.roof!:a.image)];
  if(image)sources.push({placement:p,asset:a,image,roof});
 }
 if(w.layout===previousLayout&&sources.length===previous.length&&sources.every((s,i)=>s.placement===previous[i].placement&&s.asset===previous[i].asset&&s.image===previous[i].image&&s.roof===previous[i].roof))return polygons;
 previousLayout=w.layout;previous=sources;polygons=[];
 for(const {placement:p,asset:a,image,roof} of sources){
  const b=placementBounds(p),rect=roof?(a.roofRect||[0,0,a.crop[2],a.crop[3]]):[0,0,a.crop[2],a.crop[3]];
  const outline=trace(image,roof?undefined:a.crop);if(outline.length<3)continue;
  polygons.push(outline.map(([u,v])=>placementPoint(p,b.x+(rect[0]+u*rect[2])/a.crop[2]*b.width,b.y+(rect[1]+v*rect[3])/a.crop[3]*b.height)));
 }
 return polygons;
}
