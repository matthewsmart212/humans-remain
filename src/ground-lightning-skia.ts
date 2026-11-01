import {PaintStyle,TileMode} from '@shopify/react-native-skia/lib/module/skia/types';
import {createDrawingPath} from './skia-drawing-path';
import type {SkCanvas,Skia as SkiaApi} from '@shopify/react-native-skia';
import type {GroundStrike} from './ground-lightning';
/** A single cached jagged bolt, a small radial ground light and an impact ring.
 * No blur, new textures, full-screen buffers or gameplay mutations. */
export function createGroundLightningRenderer(Skia:Pick<typeof SkiaApi,'Paint'|'Path'|'Shader'|'XYWHRect'|'Color'>){
 const bolt=createDrawingPath(Skia),stroke=Skia.Paint(),glow=Skia.Paint();stroke.setStyle(PaintStyle.Stroke);stroke.setAntiAlias(true);glow.setAntiAlias(true);
 const shader=Skia.Shader.MakeRadialGradient({x:0,y:0},85,[new Float32Array([.65,.86,1,.8]),new Float32Array([.35,.67,1,.35]),new Float32Array([.2,.5,1,0])],[0,.3,1],TileMode.Clamp);glow.setShader(shader);
 let previous:GroundStrike|undefined,disposed=false,builds=0;
 const rand=(i:number)=>{const v=Math.sin((previous!.seed+i*733)*.0017)*43758.5453;return v-Math.floor(v)};
 return{
  get builds(){return builds},
  draw(canvas:SkCanvas,strike:GroundStrike|undefined,age:number,reduced=false){
   if(disposed||!strike||age<0||age>=1)return;
   if(previous!==strike){previous=strike;builds++;bolt.reset();bolt.moveTo(0,0);
    for(let i=1;i<=14;i++){const y=-strike.height*i/14,x=(rand(i)-.5)*strike.height*.12+i*strike.height*.003;bolt.lineTo(x,y);if(i===5||i===9){bolt.moveTo(x,y);bolt.lineTo(x+(rand(i+30)>.5?1:-1)*strike.height*.075,y-strike.height*.07);bolt.lineTo(x+(rand(i+30)>.5?1:-1)*strike.height*.15,y-strike.height*.13);bolt.moveTo(x,y)}}
   }
   const strength=reduced?.4:1,impact=Math.min(1,age/.04)*Math.exp(-age*4)*strength,envelope=Math.min(1,age/.035)*Math.exp(-age*(reduced?6:10))*strength;
   canvas.save();canvas.translate(strike.x,strike.y);
   canvas.save();canvas.scale(1,.42);glow.setAlphaf(impact);canvas.drawRect(Skia.XYWHRect(-85,-85,170,170),glow);canvas.restore();
   if(age<.7){stroke.setColor(Skia.Color('#aadfff'));stroke.setStrokeWidth(2);stroke.setAlphaf((1-age/.7)*.65*strength);const radius=9+age*70;canvas.drawOval(Skia.XYWHRect(-radius,-radius*.4,radius*2,radius*.8),stroke)}
   if(age<(reduced?.65:.38)){
    stroke.setColor(Skia.Color('#65a9ff'));stroke.setStrokeWidth(19);stroke.setAlphaf(envelope*.14);canvas.drawPath(bolt.path(),stroke);
    stroke.setColor(Skia.Color('#8dccff'));stroke.setStrokeWidth(7);stroke.setAlphaf(envelope*.7);canvas.drawPath(bolt.path(),stroke);
    stroke.setColor(Skia.Color('#f0fbff'));stroke.setStrokeWidth(2.5);stroke.setAlphaf(envelope);canvas.drawPath(bolt.path(),stroke);
   }
   canvas.restore();
  },
  dispose(){if(disposed)return;disposed=true;bolt.dispose();stroke.dispose();glow.dispose();shader.dispose()},
 };
}
