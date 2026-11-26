import type {PatchChat} from './patch-chat';
import type {MenuInsets,MenuRect} from './station-menu-layout';

export type PatchReplyStripProps={
 width:number;
 height:number;
 safe:MenuInsets;
 choices:PatchChat['choices'];
 choiceSetKey:string;
 speaker:string;
 command?:string;
 onChoose:(id:string)=>void;
 onClose:()=>void;
};

/** Coordinates are game-view points, shared with the camera exclusion and bubble. */
export function patchReplyStripLayout(width:number,height:number,safe:MenuInsets){
 const margin=Math.round(Math.min(width*.075,Math.max(12,(width-520)*.15)));
 const left=Math.max(safe.left+8,margin),right=Math.max(safe.right+8,margin);
 const bottom=Math.max(safe.bottom+6,Math.min(30,Math.round(height*.047)));
 const row=Math.max(46,Math.min(62,Math.round(height*.128)));
 const labelHeight=21;
 const bounds:MenuRect={x:left,y:height-bottom-row-labelHeight,width:Math.max(1,width-left-right),height:row+labelHeight};
 const gap=Math.max(6,Math.min(12,Math.round(width*.011)));
 const closeWidth=44;
 const listWidth=Math.max(1,bounds.width-gap-closeWidth);
 const fontSize=Math.max(15,Math.min(22,Math.round(width*.0195)));
 return {bounds,row,labelHeight,gap,closeWidth,listWidth,fontSize};
}

/** Leave a glimpse of the following reply when the complete set won't fit. */
export function patchReplyWidth(listWidth:number,gap:number,count:number,fontSize:number){
 const minimum=Math.min(listWidth,Math.ceil(fontSize*10.9));
 const fit=Math.max(1,Math.min(3,Math.floor((listWidth+gap)/(minimum+gap))));
 if(count<=fit){
  return Math.floor(Math.min(fontSize*22,(listWidth-(Math.max(1,count)-1)*gap)/Math.max(1,count)));
 }
 const full=Math.max(1,Math.min(3,Math.floor((listWidth-minimum*.22)/(minimum+gap))));
 return Math.max(minimum,Math.floor((listWidth-full*gap)/(full+.22)));
}

export function isPatchCommand(id:string){return id==='camp'||id==='follow'||id==='stay'}
export function primaryPatchReply(id:string){return id==='diagnose'||id==='recruit'}
