import type {WorldAsset} from './world-assets';

const root='/survival/camp-hearth-v4';
const editorFrames=Array.from({length:8},(_,index)=>`${root}/flame-${index}.webp`);
export const HEARTH_ANIMATION_IMAGES={
 hearthCharcoal:`${root}/burning-base.webp`,
 hearthRearFire:`${root}/rear-flames.webp`,
 hearthFrontFire:`${root}/front-flames.webp`
};

/** Owner replacements and custom timing continue through the ordinary placed-sprite player. */
export function hasPaintedHearthAnimation(asset:WorldAsset){
 return asset.image===editorFrames[0]&&asset.unlit===`${root}/unlit.webp`&&asset.fps===10&&asset.animationMode!=='step-on'
  &&asset.frames?.length===editorFrames.length&&asset.frames.every((url,i)=>url===editorFrames[i]);
}

// Drafts change the speed of the rising gases independently of the flame at the
// wood. Both clocks advance continuously and return to their phase after 36s.
const turn=Math.PI*2;
const rearTime=(seconds:number)=>seconds+.095*Math.sin(turn*seconds/9)+.048*Math.sin(turn*seconds/4);
const frontTime=(seconds:number)=>seconds+.105*Math.sin(turn*seconds/12)-.037*Math.sin(turn*seconds/6);

/** Same phase as the hot coal texture under the front timber. */
export function hearthFirelight(seconds:number){
 const phase=frontTime(seconds)*17/36;
 return .76+.085*Math.sin(turn*(phase+.12))+.055*Math.sin(turn*(3*phase-.17));
}

type Bounds={x:number;y:number;width:number;height:number};
type Sheet={columns:number;frames:number;fps:number;width:number;height:number;cropX:number;cropY:number;cropWidth:number;cropHeight:number};
const rear:Sheet={columns:8,frames:48,fps:20,width:250,height:280,cropX:227,cropY:64,cropWidth:782,cropHeight:877};
const front:Sheet={columns:6,frames:36,fps:17,width:326,height:292,cropX:256,cropY:365,cropWidth:760,cropHeight:680};
function drawSheet(ctx:CanvasRenderingContext2D,image:HTMLImageElement,sheet:Sheet,b:Bounds,seconds:number){
 const frame=Math.floor(seconds*sheet.fps)%sheet.frames;
 // Each source cell has two transparent pixels of padding on all four sides.
 const sx=(frame%sheet.columns)*(sheet.width+4)+2,sy=Math.floor(frame/sheet.columns)*(sheet.height+4)+2;
 ctx.drawImage(image,sx,sy,sheet.width,sheet.height,b.x+b.width*sheet.cropX/1254,b.y+b.height*sheet.cropY/1254,b.width*sheet.cropWidth/1254,b.height*sheet.cropHeight/1254);
}

/** Rear plumes and cinders rise behind the timber. The front pass carries coal
 * light and flames emerging between individual logs. Their clocks meet every 36s. */
export function drawBurningHearth(ctx:CanvasRenderingContext2D,images:Record<string,HTMLImageElement>,poster:HTMLImageElement,b:Bounds,seconds:number,reducedMotion:boolean){
 const {hearthCharcoal,hearthRearFire,hearthFrontFire}=images;
 if(reducedMotion||!hearthCharcoal||!hearthRearFire||!hearthFrontFire){
  ctx.drawImage(poster,b.x,b.y,b.width,b.height);
  return;
 }
 ctx.drawImage(hearthCharcoal,b.x,b.y,b.width,b.height);
 drawSheet(ctx,hearthRearFire,rear,b,rearTime(seconds));
 drawSheet(ctx,hearthFrontFire,front,b,frontTime(seconds));
}
