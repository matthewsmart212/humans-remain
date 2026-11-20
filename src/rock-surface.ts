import rockArt from './world-rock-art.json';
import {IRON_BOULDER_ID} from './ironworks-data';

export type RockMaterial='woodland'|'river'|'dry'|'exposed'|'iron';
const zones:Record<string,RockMaterial>={'Woodland rocks':'woodland','River rocks':'river','Dryland rocks':'dry','Exposed rocks':'exposed'};
export const rockMaterials=new Map<string,RockMaterial>([
 ...rockArt.map(a=>[a.id,zones[a.zone]] as const),
 ['art_scenery_mossy_boulder_cluster','woodland'],['art_scenery_slate_ridge','exposed'],['art_scenery_ochre_crag','dry'],[IRON_BOULDER_ID,'iron'],
]);

// Reflected sky, lit-plane colour balance, saturation, lichen and iron-oxide weights.
export const rockGrades:Record<RockMaterial,number[]>={
 woodland:[.88,.96,.99,.82,.21,0],
 river:[.80,.92,1.04,.70,0,0],
 dry:[.94,.93,.97,.85,.03,0],
 exposed:[.88,.93,1.02,.75,.08,0],
 iron:[.88,.92,.99,.80,.08,1],
};

export const ROCK_SURFACE_SHADER=`
uniform shader artwork;
uniform float4 crop;
uniform float3 gain;
uniform float saturation;
uniform float lichen;
uniform float ore;
uniform float spread;
float coverage(float2 uv){
 if(uv.x<0. || uv.y<0. || uv.x>1. || uv.y>1.) return 0.;
 return artwork.eval(crop.xy+uv*crop.zw).a;
}
half4 main(float2 uv){
 half4 pixel=half4(0);
 if(uv.x>=0. && uv.y>=0. && uv.x<=1. && uv.y<=1.) pixel=artwork.eval(crop.xy+uv*crop.zw);
 float3 src=float3(pixel.rgb)/max(.001,float(pixel.a));
 float value=dot(src,float3(.26,.60,.14));
 float low=smoothstep(.53,1.0,uv.y);
 float3 face=mix(float3(value),src,saturation)*gain;
 // Green the original mustard lichen while leaving the adjacent warm stone visible.
 float moss=smoothstep(.035,.16,src.g-src.b)*smoothstep(-.12,.015,src.g-src.r)*lichen;
 face=mix(face,src*float3(.68,.90,.65),moss);
 // Preserve rusty fissures in a cooler, mica-flecked host rock.
 float oxide=smoothstep(.08,.28,src.r-src.g)*ore;
 face=mix(face,src*float3(.97,.92,.85),oxide*.76);
 face+=float3(.046,.057,.064)*ore*smoothstep(.51,.79,value)*(1.-oxide);
 face=mix(face,face*float3(.80,.85,.89)+float3(.018,.019,.012),low);
 face+=float3(.010,.014,.020)*(1.-smoothstep(.06,.48,value));
 // Earth bounce softens the dark painted outline where stone touches soil.
 if(low>.0 && pixel.a>.0){
  float toe=low*(1.-coverage(uv+float2(0.,.016)));
  face=mix(face,face*.77+float3(.125,.107,.070),toe*.76);
 }
 // Squash the source silhouette into a short soft ground contact. Loose
 // pebble groups keep their individual footprints and open ground between them.
 float contact=0.;
 if(pixel.a < .999 && uv.y > .12){
  float2 foot=float2((uv.x-.514)/1.055+.5,(uv.y-.94)/spread+.90);
  float2 d=float2(.024,.035)/float2(1.,spread);
  contact=.30*coverage(foot)+.175*(coverage(foot+float2(d.x,0))+coverage(foot-float2(d.x,0))+coverage(foot+float2(0,d.y))+coverage(foot-float2(0,d.y)));
 }
 float shadow=.32*contact*(1.-float(pixel.a));
 return half4(clamp(face,0.,1.)*pixel.a+shadow*float3(.13,.115,.081),pixel.a+shadow);
}
`;

export type RockBounds={x:number;y:number;width:number;height:number};
type RockContext=CanvasRenderingContext2D&{drawRockSurface?:(image:HTMLImageElement,crop:readonly number[],b:RockBounds,material:RockMaterial,loose:boolean)=>void};
export function drawRockFace(ctx:RockContext,image:HTMLImageElement,crop:readonly number[],b:RockBounds,material:RockMaterial,loose=false){
 if(ctx.drawRockSurface){ctx.drawRockSurface(image,crop,b,material,loose);return}
 ctx.drawImage(image,...crop as [number,number,number,number],b.x,b.y,b.width,b.height);
}
