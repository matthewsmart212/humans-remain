import {FilterMode,MipmapMode} from '@shopify/react-native-skia/lib/module/skia/types';
import type {SkImage,Skia as SkiaApi} from '@shopify/react-native-skia';
import type {GamePerformanceRecorder} from './performance-recording';
export type ShelterOutline=readonly (readonly [number,number])[];
const SIZE=192;
/** A tiny one-time alpha readback follows painted walls/floors, not the rectangular
 * inside-building trigger. No source texture is retained and no pixels are read
 * during walking, rain animation, camera movement or ordinary redraws. */
export function createArtworkSilhouettes(Skia:Pick<typeof SkiaApi,'Paint'|'Surface'|'XYWHRect'>,diagnostics?:GamePerformanceRecorder){
 const cache=new WeakMap<SkImage,Map<string,ShelterOutline>>();let builds=0;
 return{
  get builds(){return builds},
  outline(image:SkImage,crop:readonly number[]=[0,0,image.width(),image.height()]):ShelterOutline{
   let entries=cache.get(image);if(!entries){entries=new Map();cache.set(image,entries)}
   const key=crop.join(','),cached=entries.get(key);if(cached)return cached;
   const started=diagnostics?.tracing?performance.now():undefined;
   let points:[number,number][]=[];const surface=Skia.Surface.Make(SIZE,SIZE);
   if(surface){
    const paint=Skia.Paint(),canvas=surface.getCanvas();canvas.clear(new Float32Array([0,0,0,0]));
    canvas.drawImageRectOptions(image,Skia.XYWHRect(crop[0],crop[1],crop[2],crop[3]),Skia.XYWHRect(0,0,SIZE,SIZE),FilterMode.Linear,MipmapMode.None,paint);surface.flush();
    const snapshot=surface.makeImageSnapshot();let pixels:Float32Array|Uint8Array|null=null;
    try{pixels=snapshot.readPixels()}finally{snapshot.dispose();paint.dispose();surface.dispose()}
    if(pixels){
     const left:[number,number][]=[],right:[number,number][]=[];
     for(let y=0;y<SIZE;y++){
      let first=-1,last=-1;for(let x=0;x<SIZE;x++)if(pixels[(y*SIZE+x)*4+3]>=160){if(first<0)first=x;last=x}
      // Ignore isolated wisps/shadow pixels. The opaque floor fills the interior.
      if(last-first<2)continue;
      left.push([first/SIZE,(y+.5)/SIZE]);right.push([(last+1)/SIZE,(y+.5)/SIZE]);
     }
     points=[...left,...right.reverse()];
    }
   }
   // Missing/opaque rectangular artwork never falls back to the trigger box.
   // Source images normally include transparent margins around the building.
   entries.set(key,points);builds++;
   if(started!==undefined){const ms=performance.now()-started;diagnostics!.phase('silhouetteBuildMs',ms);diagnostics!.trace(started,'silhouette-build',ms,{width:image.width(),height:image.height(),crop:key})}
   return points;
  },
 };
}
