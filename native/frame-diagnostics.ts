import {ATLAS_FULL_ZOOM} from '../src/continuous-zoom-state';
import type {GamePerformanceRecorder} from '../src/performance-recording';

/** Only an opaque, ready atlas can cover a retained gameplay frame. */
export const nativeMapCoversWorld=(zoom:number,ready:boolean)=>ready&&zoom<=ATLAS_FULL_ZOOM;
export type NativeFrameDetail={atlasZoom:number;mapVisible:boolean;mapReady:boolean;worldDrawn:boolean;pinching:boolean;simulationMs:number;terrainMs:number;publishMs:number;mapPrefetchMs?:number;diagnosticsMs?:number};
/** Frame gaps end at the current callback; its cause can be in the previous one.
 * Emit only hitches/expensive stages, never a console message for every frame. */
export class NativeFrameDiagnostics{
 private previous:{at:number;update:number;render:number;detail:NativeFrameDetail}|null=null;
 private session=-1;
 constructor(private recorder:GamePerformanceRecorder){}
 reset(){this.previous=null}
 frame(at:number,update:number,render:number,detail:NativeFrameDetail){
  if(!this.recorder.recording){this.reset();return}
  if(this.session!==this.recorder.session){this.session=this.recorder.session;this.reset()}
  const previous=this.previous;
  if(previous&&at-previous.at>1000/30)this.recorder.trace(at,'native-frame-gap',0,{
   ...detail,frameMs:at-previous.at,previousUpdateMs:previous.update,previousRenderMs:previous.render,
   previousMapPrefetchMs:previous.detail.mapPrefetchMs??0,previousDiagnosticsMs:previous.detail.diagnosticsMs??0,
   previousAtlasZoom:previous.detail.atlasZoom,previousWorldDrawn:previous.detail.worldDrawn,
   // Includes ordinary frame pacing, uninstrumented JS/native work and scheduling.
   // This is not a measurement of garbage collection or GPU time.
   outsideMeasuredWorkMs:Math.max(0,at-previous.at-previous.update-previous.render-(previous.detail.mapPrefetchMs??0)-(previous.detail.diagnosticsMs??0)),
  });
  if(update>8)this.recorder.trace(at,'native-update',update,{simulationMs:detail.simulationMs,terrainMs:detail.terrainMs,atlasZoom:detail.atlasZoom});
  if(detail.publishMs>4)this.recorder.trace(at+update+render-detail.publishMs,'native-picture-publish',detail.publishMs,{atlasZoom:detail.atlasZoom});
  this.previous={at,update,render,detail};
 }
}
