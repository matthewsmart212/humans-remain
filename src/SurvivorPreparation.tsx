import React,{useEffect,useRef,useState} from 'react';
import {AppState,Image,Platform,StyleSheet,View,type ImageSourcePropType} from 'react-native';

/**
 * Play -> expedition: keep the original survivor, camp fire and scenery in
 * their exact 1536x864 registration. This is one opaque pose at a time; never
 * crossfade characters or composite a second survivor over the camp video.
 *
 * Decode both textures while the main menu is still open. The old loader
 * mounted them only *after* Play was pressed, causing the seated character to
 * pop/overlap with the preparation pose on slower phones.
 *
 * The artwork currently ships as a 7x6 atlas. It must be replaced with newly
 * drawn high-resolution, character-registered frames to improve its internal
 * facial and clothing detail; upscaling this texture is not a quality fix.
 */
const SCENE={width:1536,height:864};
const ATLAS={columns:7,rows:6,frames:42};
const FRAME={width:360,height:504};
const OUTPUT={width:384,height:538}; // modest overscan; no aggressive 400x560 upscale
const GROUND={x:497,y:755,withinFrame:513};
const FINAL_POSE_HOLD_MS=380;

const atlas:ImageSourcePropType=Platform.OS==='web'
 ? {uri:'/survival/start-prepare-v4/survivor-prepare.webp'}
 : require('../public/survival/start-prepare-v4/survivor-prepare.webp');
const cleanLayer:ImageSourcePropType=Platform.OS==='web'
 ? {uri:'/survival/start-prepare-v2/remove-seated-survivor.png'}
 : require('../public/survival/start-prepare-v2/remove-seated-survivor.png');

/** Ease into the movement, rise with purpose, then settle into the last pose. */
export function preparationFrameDuration(frame:number):number{
 if(frame<5)return 90;
 if(frame<17)return 68;
 if(frame<28)return 57;
 if(frame<37)return 76;
 return 100;
}
type Props={width:number;height:number;active:boolean;reducedMotion:boolean;onFinished:()=>void};
export default function SurvivorPreparation({width,height,active,reducedMotion,onFinished}:Props){
 const [atlasLoaded,setAtlasLoaded]=useState(false);
 const [matteLoaded,setMatteLoaded]=useState(false);
 const [failed,setFailed]=useState(false);
 const [frame,setFrame]=useState(0);
 const [complete,setComplete]=useState(false);
 const finished=useRef(false);
 const callback=useRef(onFinished);
 callback.current=onFinished;
 const ready=atlasLoaded&&matteLoaded;
 const report=()=>{
  if(finished.current)return;
  finished.current=true;
  setComplete(true);
  callback.current();
 };

 useEffect(()=>{
  if(!active){finished.current=false;setFrame(0);setComplete(false);return;}
  if(failed){report();return;}
  if(!ready)return;

  // A new run always starts from the same anchored original survivor pose.
  setFrame(0);
  if(reducedMotion){
   setFrame(ATLAS.frames-1);
   // Allow the last frame to commit before world transition is permitted.
   const task=setTimeout(report,FINAL_POSE_HOLD_MS);
   return()=>clearTimeout(task);
  }
  let stopped=false,step=0;
  let timeout:ReturnType<typeof setTimeout>;
  const advance=()=>{
   if(stopped)return;
   // Never jump across a block of frames after iOS is suspended or a JS
   // startup task stalls. Holding the current frame is better than a pose pop.
   if(AppState.currentState!=='active'||(Platform.OS==='web'&&typeof document!=='undefined'&&document.hidden)){
    timeout=setTimeout(advance,120);return;
   }
   if(step>=ATLAS.frames-1){
    timeout=setTimeout(()=>{if(!stopped)report();},FINAL_POSE_HOLD_MS);
    return;
   }
   step+=1;
   setFrame(step);
   timeout=setTimeout(advance,preparationFrameDuration(step));
  };
  timeout=setTimeout(advance,preparationFrameDuration(0));
  return()=>{stopped=true;clearTimeout(timeout);};
 },[active,ready,failed,reducedMotion]);

 const scale=Math.max(width/SCENE.width,height/SCENE.height);
 const left=(width-SCENE.width*scale)/2;
 const top=(height-SCENE.height*scale)/2;
 const w=OUTPUT.width*scale,h=OUTPUT.height*scale;
 const x=left+(GROUND.x-OUTPUT.width/2)*scale;
 const y=top+(GROUND.y-GROUND.withinFrame)*scale;
 const frameX=frame%ATLAS.columns;
 const frameY=Math.floor(frame/ATLAS.columns);

 return <View pointerEvents="none" accessibilityElementsHidden importantForAccessibility="no-hide-descendants" style={StyleSheet.absoluteFill}>
  {/* Preload on the menu, not at the moment Play is pressed. */}
  <Image accessible={false} source={atlas} onLoad={()=>setAtlasLoaded(true)} onError={()=>setFailed(true)} style={styles.preload}/>
  <Image accessible={false} source={cleanLayer} onLoad={()=>setMatteLoaded(true)} onError={()=>setFailed(true)} style={styles.preload}/>
  {active&&ready&&!failed&&<>
   {/* Masks only the baked-in seated subject. The scene continues animating. */}
   <Image accessible={false} source={cleanLayer} resizeMode="stretch" style={{position:'absolute',left,top,width:SCENE.width*scale,height:SCENE.height*scale}}/>
   <View style={{position:'absolute',left:x,top:y,width:w,height:h,overflow:'hidden'}}>
    <Image accessible={false} source={atlas} resizeMode="stretch" style={{
     position:'absolute',
     left:-frameX*w,top:-frameY*h,
     width:ATLAS.columns*w,height:ATLAS.rows*h,
    }}/>
   </View>
  </>}
 </View>;
}
const styles=StyleSheet.create({preload:{position:'absolute',width:1,height:1,opacity:0}});
