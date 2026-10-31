/** Complete painted road sections, including soil shoulders and intact edge stones. */
export const WORLD_ROAD_MATERIALS=[
 {key:'roadCampStone',name:'Bedded camp stone',file:'camp-stone'},
 {key:'roadDryEarth',name:'Worn earth trail',file:'dry-earth'},
 {key:'roadDarkEarth',name:'Woodland earth track',file:'dark-earth'},
 {key:'roadWorksGravel',name:'Factory gravel track',file:'works-gravel'},
 {key:'roadSalvageGravel',name:'Salvage earth track',file:'salvage-gravel'},
] as const;
export const WORLD_ROAD_MATERIAL_SOURCES:Record<string,string>=Object.fromEntries(WORLD_ROAD_MATERIALS.map(m=>[m.key,`/survival/road-sections-v2/${m.file}.webp`]));
export const ROAD_ART_CORE=.42;
// The outer soil is translucent while the separately painted edge stones stay
// intact. Existing terrain shows through between chips instead of a brown band.
export const WORLD_ROAD_SECTION_SHADER=`
uniform shader artwork;
uniform float3 grade;
half4 main(float2 uv){
 half4 c=artwork.eval(uv);
 float3 rgb=float3(c.rgb)/max(float(c.a),.001);
 float hi=max(rgb.r,max(rgb.g,rgb.b)),lo=min(rgb.r,min(rgb.g,rgb.b));
 float stone=1.-smoothstep(.28,.54,(hi-lo)/max(hi,.001));
 float shoulder=smoothstep(.17,.39,abs(uv.x-.5));
 float opacity=mix(1.,.10+.84*stone,shoulder);
 return half4(c.rgb*grade,c.a)*opacity;
}`;
export const ROAD_SECTION_GRADES=[[1,1,1],[.97,.96,.94],[.68,.78,.90],[.87,.92,.98],[.76,.84,.96]];
const smooth=(a:number,b:number,v:number)=>{const t=Math.max(0,Math.min(1,(v-a)/(b-a)));return t*t*(3-2*t)};
const region=(x:number,y:number,cx:number,cy:number,sx:number,sy:number,a:number,b:number)=>1-smooth(a,b,Math.hypot((x-cx)/sx,(y-cy)/sy));
/** A continuous district field, sampled once at road vertices. */
export function roadMaterialWeights(x:number,y:number):number[]{
 const qx=x+100*Math.sin(y*.0017),qy=y+90*Math.sin(x*.0013);
 const dark=Math.max(region(qx,qy,-5300,-1800,1,1.1,1900,6400),region(qx,qy,-3900,8000,1,1,1000,3800));
 const works=region(qx,qy,10000,-2300,1,1.1,1400,4700),salvage=region(qx,qy,8100,8400,1.2,1,1500,4400);
 const camp=1-smooth(2650,3500,Math.max(Math.abs(x-2400),Math.abs(y-2400)));
 const village=region(qx,qy,4300,-2100,1.15,.95,1050,2500);
 const stone=smooth(.32,.72,Math.max(camp,village));
 return [stone,(1-stone)*(1-salvage)*(1-works)*(1-dark),(1-stone)*(1-salvage)*(1-works)*dark,(1-stone)*(1-salvage)*works,(1-stone)*salvage];
}
