import {PaintStyle,TileMode,FilterMode,MipmapMode,ClipOp} from '@shopify/react-native-skia/lib/module/skia/types';
import type {SkCanvas,Skia as SkiaApi,SkImage,SkShader} from '@shopify/react-native-skia';
import type {WeatherState} from './weather-model';
export type WeatherView={x:number;y:number;width:number;height:number;scale:number;pixelRatio:number};
export const MAX_RAIN_STREAKS=180,MAX_HEAVY_RAIN_STREAKS=320,MAX_RAIN_SPLASHES=24;
const fract=(v:number)=>v-Math.floor(v),noise=(i:number)=>fract(Math.sin(i*127.1+311.7)*43758.5453);
/** Persistent paints/paths, one 128px fog tile and bounded batches. No particle
 * objects, React updates, per-frame textures, blur filters or screen-size buffers. */
export function createWeatherRenderer(Skia:Pick<typeof SkiaApi,'Paint'|'Path'|'Shader'|'Surface'|'Matrix'|'XYWHRect'|'Color'>){
 const rain=Skia.Paint(),wash=Skia.Paint(),mist=Skia.Paint();
 rain.setStyle(PaintStyle.Stroke);rain.setAntiAlias(true);rain.setColor(Skia.Color('#c7dce1'));
 const streaks=Skia.Path.Make(),shelter=Skia.Path.Make();
 let fogImage:SkImage|undefined,fogShader:SkShader|undefined,disposed=false,tileBuilds=0,previousShelters:readonly (readonly [number,number][])[]|undefined;
 const makeFog=()=>{
  if(fogImage)return;const surface=Skia.Surface.Make(128,128);if(!surface)return;
  const c=surface.getCanvas(),p=Skia.Paint();c.clear(Skia.Color('transparent'));
  // Periodic soft clouds wrap across every edge, so the drifting tile has no seams.
  for(let i=0;i<14;i++){
   const x=noise(i+1)*128,y=noise(i+29)*128,r=24+noise(i+53)*38;
   for(let dx=-1;dx<=1;dx++)for(let dy=-1;dy<=1;dy++){
    const shader=Skia.Shader.MakeRadialGradient({x:x+dx*128,y:y+dy*128},r,[new Float32Array([.69,.76,.73,.28]),new Float32Array([.69,.76,.73,.12]),new Float32Array([.69,.76,.73,0])],[0,.45,1],TileMode.Clamp);
    p.setShader(shader);c.drawRect(Skia.XYWHRect(0,0,128,128),p);p.setShader(null);shader.dispose();
   }
  }
  surface.flush();fogImage=surface.makeImageSnapshot();const matrix=Skia.Matrix().scale(10,10);
  fogShader=fogImage.makeShaderOptions(TileMode.Repeat,TileMode.Repeat,FilterMode.Linear,MipmapMode.None,matrix);mist.setShader(fogShader);matrix.dispose();p.dispose();surface.dispose();tileBuilds++;
 };
 return{
  get tileBuilds(){return tileBuilds},
  draw(canvas:SkCanvas,state:WeatherState|undefined,view:WeatherView,night:number,shelters:readonly (readonly [number,number][])[]=[]){
   if(disposed||!state||(!state.rain&&!state.fog&&!state.flash))return;
   const {x,y,width,height,scale,pixelRatio}=view,t=state.time;
   canvas.save();
   if(state.fog){
    makeFog();if(fogImage){
     // World anchored mist remains the same scale when the editor zoom changes.
     const drift=state.reducedMotion?0:t*9;
     canvas.save();canvas.translate(drift,-drift*.28);mist.setAlphaf(state.fog*(.55-night*.16));canvas.drawRect(Skia.XYWHRect(x-drift,y+drift*.28,width,height),mist);canvas.restore();
    }
   }
   if(state.rain){
    // Only falling rain is sheltered. Atmospheric fog must not reveal a hard-edged interior rectangle.
    if(shelters.length){if(previousShelters!==shelters){shelter.reset();for(const polygon of shelters){polygon.forEach(([px,py],i)=>i?shelter.lineTo(px,py):shelter.moveTo(px,py));shelter.close()}previousShelters=shelters}canvas.clipPath(shelter,ClipOp.Difference,true)}
    // Screen-space streak sizes and a fixed budget: zooming out never explodes the count.
    const unit=pixelRatio/scale,sw=width/unit,sh=height/unit;
    const heavy=state.heavy,softCount=Math.min(MAX_RAIN_STREAKS,Math.max(45,Math.round(sw*sh/2800))),count=Math.min(MAX_HEAVY_RAIN_STREAKS,Math.round(softCount*(1+heavy*1.5)));
    streaks.reset();
    for(let i=0;i<count;i++){
     const layer=i%2,travel=state.rainTravel*(.7+layer*.45),length=(9+noise(i+100)*13)*(1+heavy*.55);
     const px=fract(noise(i+1)-(travel*.2+x/unit*.15)/(sw+60))*(sw+60)-30;
     const py=fract(noise(i+401)+(travel-y/unit*.15)/(sh+60))*(sh+60)-30;
     const path=streaks;path.moveTo(x+px*unit,y+py*unit);path.lineTo(x+(px-length*.24)*unit,y+(py+length)*unit);
    }
    // Sparse short ripples, batched in one draw. Keep drops readable around the bonfire.
    for(let i=0;i<Math.round(MAX_RAIN_SPLASHES*(1+heavy));i++){
     const age=fract(t*.8+noise(i+702));if(age>.38)continue;
     const px=fract(noise(i+804)-x/width)*width+x,py=fract(noise(i+930)-y/height)*height+y,r=(1+age*10)*unit;
     streaks.addOval(Skia.XYWHRect(px-r,py-r*.35,r*2,r*.7));
    }
    rain.setStrokeWidth((.8+heavy*.2)*unit);rain.setAlphaf(state.rain*(.48+heavy*.12));canvas.drawPath(streaks,rain);
   }
   canvas.restore();
   // Broad distant lightning lights the scene, including roofs, without rebuilding night lighting.
   if(state.flash){wash.setColor(Skia.Color('#c8d9f5'));wash.setAlphaf(state.flash*(.55+night*.45));canvas.drawRect(Skia.XYWHRect(x,y,width,height),wash)}
  },
  dispose(){if(disposed)return;disposed=true;rain.dispose();wash.dispose();mist.dispose();streaks.dispose();shelter.dispose();fogShader?.dispose();fogImage?.dispose()},
 };
}
